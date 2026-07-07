# VI. UML SEQUENCE DIAGRAM SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To elucidate the chronological execution and asynchronous decoupling of the Chatnalyxer pipeline, a Unified Modeling Language (UML) Sequence Diagram is presented (Fig. X). This model traces the absolute lifecycle of a multi-modal conversational event, originating from a user's transmission on the WhatsApp network to the ultimate delivery of a scheduled, actionable alert on the end-user's mobile device. The sequence explicitly highlights the critical architectural divergence between synchronous blocking calls (e.g., external API inference generation) and asynchronous non-blocking handoffs (e.g., the internal WebHook). By utilizing `alt` (alternative) and `opt` (optional) UML interaction fragments, the diagram maps the conditional routing of non-text media through the Azure Cognitive preprocessing layer prior to Large Language Model evaluation. Furthermore, the sequence mathematically illustrates the Ephemeral Processing constraint: the raw conversational payload ceases to exist in volatile memory immediately following the successful database `INSERT` operation, completely isolating the external persistence and scheduling daemons from the sensitive conversational origin.

### Figure Caption
**Fig. X.** UML Sequence Diagram illustrating the chronological, asynchronous data lifecycle of a Chatnalyxer extraction event. The sequence demonstrates the progression from Edge Ingestion (Node.js) through Multi-modal Preprocessing (Azure) and Semantic Extraction (Gemini), culminating in continuous temporal polling and push notification dispatch.

*(Note: Replace "Fig. X" with the actual figure number in your manuscript).*

---

## B. Lifelines (Actors & Components Left-to-Right)

When reconstructing this UML Sequence Diagram in software (e.g., Mermaid.js, PlantUML, draw.io), establish the following vertical lifelines:

1.  `User` (Actor)
2.  `WhatsApp_Servers` (External Network)
3.  `Baileys_NodeJS` (Edge Ingestion Layer)
4.  `FastAPI_Backend` (Core Orchestrator & Queue)
5.  `Azure_AI` (Cognitive Preprocessor)
6.  `Google_Gemini` (Semantic LLM)
7.  `PostgreSQL_DB` (Persistence & Indexing)
8.  `Push_Service` (Notification Gateway)
9.  `Mobile_App` (React Native Client)

---

## C. The Sequence (Chronological Execution Flow)

### Phase 1: Ingestion and Edge Filtration
1.  **Message:** `Send Group Message(Media/Text)`
    *   **From:** `User` $\rightarrow$ **To:** `WhatsApp_Servers`
2.  **Message:** `WSS: Encrypted Stanza Broadcast`
    *   **From:** `WhatsApp_Servers` $\rightarrow$ **To:** `Baileys_NodeJS`
3.  **Self-Message (Activation):** `Signal Protocol Decryption()`
    *   **On:** `Baileys_NodeJS`
4.  **Self-Message (Activation):** `Check Whitelist(Group JID)`
    *   **On:** `Baileys_NodeJS`
    *   *(Note: Assume JID is authorized; if unauthorized, flow terminates here).*

### Phase 2: Asynchronous Handoff (The Decoupling Boundary)
5.  **Message (Async):** `HTTP POST: Forward CIP (Payload + Timestamp)`
    *   **From:** `Baileys_NodeJS` $\rightarrow$ **To:** `FastAPI_Backend`
6.  **Return Message:** `HTTP 202 Accepted`
    *   **From:** `FastAPI_Backend` $\rightarrow$ **To:** `Baileys_NodeJS`
    *   *(Critical Note: This immediate return unblocks the Node.js event loop, allowing it to continue listening for new WhatsApp messages while the heavy AI processing occurs downstream).*
7.  **Self-Message (Activation):** `Enqueue Task()`
    *   **On:** `FastAPI_Backend`

### Phase 3: Multi-modal Triage & Preprocessing (`opt` Fragment)
*   **[UML Fragment: `opt` (Condition: payload.type == MEDIA)]**
    8.  **Message (Sync):** `HTTP POST: Binary Blob`
        *   **From:** `FastAPI_Backend` $\rightarrow$ **To:** `Azure_AI`
    9.  **Self-Message (Activation):** `Execute ML Model (OCR/Speech/Doc)`
        *   **On:** `Azure_AI`
    10. **Return Message:** `HTTP 200: Return Flattened Text`
        *   **From:** `Azure_AI` $\rightarrow$ **To:** `FastAPI_Backend`

### Phase 4: Semantic Extraction & Temporal Resolution
11. **Self-Message (Activation):** `Construct Prompt(System + UTC_Anchor + Text)`
    *   **On:** `FastAPI_Backend`
12. **Message (Sync):** `HTTPS POST: LLM Inference Request`
    *   **From:** `FastAPI_Backend` $\rightarrow$ **To:** `Google_Gemini`
13. **Return Message:** `HTTP 200: Validated JSON Task Schema`
    *   **From:** `Google_Gemini` $\rightarrow$ **To:** `FastAPI_Backend`
    *   *(Note: This represents the "Happy Path." A secondary `alt` fragment could loop here for fallback prompting if validation fails).*

### Phase 5: Persistence and Ephemeral Purge
14. **Message (Sync):** `SQL INSERT: Task Metadata (Title, Date, Priority)`
    *   **From:** `FastAPI_Backend` $\rightarrow$ **To:** `PostgreSQL_DB`
15. **Return Message:** `SQL SUCCESS`
    *   **From:** `PostgreSQL_DB` $\rightarrow$ **To:** `FastAPI_Backend`
16. **Self-Message (Activation):** `Trigger Garbage Collection (Purge Raw Data)`
    *   **On:** `FastAPI_Backend`
    *   *(At this precise step on the timeline, the original conversational text and media are permanently erased from volatile RAM).*

### Phase 6: Temporal Polling and Edge Delivery
*   **[UML Fragment: `loop` (Condition: Every 60 seconds)]**
    17. **Self-Message (Activation):** `APScheduler Polling Daemon`
        *   **On:** `FastAPI_Backend`
    18. **Message (Sync):** `SQL SELECT: approaching_deadlines()`
        *   **From:** `FastAPI_Backend` $\rightarrow$ **To:** `PostgreSQL_DB`
    19. **Return Message:** `Return Task Records`
        *   **From:** `PostgreSQL_DB` $\rightarrow$ **To:** `FastAPI_Backend`
    *   **[UML Fragment: `opt` (Condition: Task deadline is within threshold)]**
        20. **Message (Async):** `Dispatch Payload(Task_ID, Title)`
            *   **From:** `FastAPI_Backend` $\rightarrow$ **To:** `Push_Service`
        21. **Message (Sync):** `OS-Level Push Notification`
            *   **From:** `Push_Service` $\rightarrow$ **To:** `Mobile_App`
        22. **Message:** `Render Urgent UI Alert / Alarm`
            *   **From:** `Mobile_App` $\rightarrow$ **To:** `User`

---

## D. Academic Analysis of the Chronological Sequence

The sequential mapping provided above explicitly isolates the computational bottlenecks inherent to the Chatnalyxer architecture. 

The most critical architectural maneuver occurs between Steps 5 and 6. If the architecture were entirely synchronous, the Node.js `Baileys` layer would remain blocked, waiting for Steps 8 through 15 (Azure, Gemini, and PostgreSQL) to complete before processing the next WhatsApp message. In high-velocity group chats, this would instantly result in catastrophic queue saturation and dropped payloads. By immediately returning an HTTP 202 Accepted (Step 6) and shifting the remainder of the lifeline onto background worker threads, the sequence guarantees $O(1)$ ingestion latency at the edge.

Furthermore, the sequence diagram formally validates the Ephemeral Processing methodology discussed in Section IV. The primary conversational data (Step 2) traverses the lifelines, branching into the external AI services (Steps 8 and 12). However, only the LLM-synthesized metadata—devoid of original personal identifiers or raw conversational text—crosses the boundary into the persistence tier (Step 14). Step 16 (Garbage Collection) is the terminal chronometric point for the existence of the raw user payload. Consequently, Steps 17 through 22 operate completely isolated from the original, sensitive context, executing purely on the normalized, anonymized scheduling metadata.
