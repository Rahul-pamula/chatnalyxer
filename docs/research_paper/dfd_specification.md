# IV. DATA FLOW DIAGRAM SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To rigorously formalize the lifecycle, transformation, and storage boundaries of information within the proposed architecture, a hierarchical Data Flow Diagram (DFD) methodology was employed. As illustrated in the cascading DFD models (Figs. X-Y), the architecture is fundamentally designed to transform high-entropy, unstructured communication into normalized, deterministic temporal events. The Level 0 Context Diagram establishes the system's boundary, highlighting the unidirectional flow of raw conversational data from the external WhatsApp network into the Chatnalyxer engine, culminating in actionable alerts dispatched to the User and bidirectional synchronization with external Calendar APIs. The subsequent Level 1 and Level 2 diagrams deconstruct the monolithic system process into granular sub-processes, explicitly mapping the trajectory of sensitive payloads. Crucially, these lower-level models mathematically verify the ephemeral processing constraint: raw conversational strings and media binaries exclusively traverse transient processing nodes (e.g., Node 3.0) and external AI computation boundaries, but are structurally prohibited from entering the persistent data stores (D2), which are strictly reserved for the synthesized metadata outputs of the Large Language Model.

*(Note: Replace "Figs. X-Y" with the actual figure numbers in your manuscript).*

---

## B. Level 0: Context Diagram Specification

The Level 0 Context Diagram represents the entire Chatnalyxer system as a single, macroscopic process, mapping its interactions with all external entities.

### 1. Process
*   **0.0 Chatnalyxer System:** The monolithic representation of the entire extraction, processing, and scheduling engine.

### 2. External Entities (Sources and Sinks)
*   **E1: User:** The human operator utilizing the mobile client.
*   **E2: WhatsApp Network:** The external global messaging infrastructure originating the conversational data.
*   **E3: Push Notification Gateway:** The external OS-level delivery network (e.g., Apple APNs, Firebase Cloud Messaging).
*   **E4: External Calendar System:** Third-party enterprise calendars (e.g., Google Calendar, Microsoft Outlook).

### 3. Data Movement (Flows)
*   *E1 (User) $\rightarrow$ 0.0:* Auth Credentials, QR Code Scan Data, Whitelist Configuration.
*   *0.0 $\rightarrow$ E1 (User):* Visual Dashboard State (Tasks, Priorities).
*   *E2 (WhatsApp Network) $\rightarrow$ 0.0:* Continuous stream of Encrypted Binary Stanzas (Messages, Images, Audio).
*   *0.0 $\rightarrow$ E3 (Notification Gateway):* Formatted Alert Payloads (Title, Due Date, Priority Flag).
*   *0.0 $\leftrightarrow$ E4 (External Calendar):* Bidirectional synchronization (Event Creation, Event Modification parameters).

---

## C. Level 1: System Sub-processes Specification

The Level 1 DFD decomposes the monolithic Process 0.0 into its primary functional sub-processes and introduces the internal persistent data stores.

### 1. Processes
*   **1.0 Client Authentication & Configuration:** Manages user identity and group whitelisting.
*   **2.0 Network Ingestion & Filtration:** Intercepts, decrypts, and filters the raw WhatsApp stream.
*   **3.0 Multi-modal AI Processing:** Transforms raw media into text and extracts structured temporal metadata.
*   **4.0 Persistence & Scheduling Engine:** Manages database insertion and polling for upcoming deadlines.
*   **5.0 Synchronization Router:** Handles outbound communication to external enterprise calendars.

### 2. Data Stores
*   **D1: User Identity & Config Store:** Persistent storage for encrypted JWTs, session keys, and the authorized group JID array.
*   **D2: Task Metadata Database:** Persistent storage for the extracted JSON objects (Title, ISO-8601 Date, Priority, Status).

### 3. Data Movement (Flows)
*   *E1 (User) $\rightarrow$ 1.0:* Login credentials, toggle switches for group whitelisting.
*   *1.0 $\rightarrow$ D1:* Store authorized group JIDs and session keys.
*   *E2 (WhatsApp) $\rightarrow$ 2.0:* Encrypted WebSocket stream.
*   *D1 $\rightarrow$ 2.0:* Fetch authorized group JIDs to execute the filtering algorithm.
*   *2.0 $\rightarrow$ 3.0:* Normalized internal payload (Decrypted Text/Media + Message UNIX Timestamp).
*   *3.0 $\rightarrow$ 4.0:* Validated, structured JSON object (The extracted task).
*   *4.0 $\rightarrow$ D2:* Insert task record.
*   *D2 $\rightarrow$ 4.0:* Poll active tasks approaching deadline threshold.
*   *4.0 $\rightarrow$ E3 (Notification Gateway):* Dispatch scheduled push notification.
*   *4.0 $\rightarrow$ 5.0:* Forward new task creation event.
*   *5.0 $\leftrightarrow$ E4 (External Calendar):* Execute OAuth 2.0 API call to sync event.

---

## D. Level 2: Deep Dive into Process 3.0 (AI Processing)

The Level 2 DFD decomposes Process 3.0 (Multi-modal AI Processing) to explicitly map the data transformation lifecycle through the external cloud intelligence services.

### 1. Processes (Sub-processes of 3.0)
*   **3.1 Modality Triage:** Analyzes MIME type and routes the payload.
*   **3.2 Media Preprocessing (Azure):** Converts Images/Audio/PDFs into flattened text strings.
*   **3.3 Prompt Engineering Engine:** Constructs the contextual envelope and injects the UTC Temporal Anchor.
*   **3.4 LLM Semantic Extraction:** The stochastic processing core determining if a task exists and extracting its parameters.
*   **3.5 Schema Validation & Recovery:** Validates output against the Pydantic JSON schema; triggers fallback loops if malformed.

### 2. External Entities (Cloud AI)
*   **E5: Azure Cognitive Services:** Cloud APIs for OCR, Document Intelligence, and Speech-to-Text.
*   **E6: Google Gemini API:** The Large Language Model.

### 3. Data Movement (Flows)
*   *Process 2.0 $\rightarrow$ 3.1:* Normalized internal payload (Raw Data + Timestamp).
*   *3.1 $\rightarrow$ 3.3 (If Text):* Routes plain text directly, bypassing preprocessing.
*   *3.1 $\rightarrow$ 3.2 (If Media):* Routes image blobs, PDF buffers, or OGG audio files.
*   *3.2 $\rightarrow$ E5 (Azure):* Encrypted HTTP POST of binary media.
*   *E5 (Azure) $\rightarrow$ 3.2:* Return JSON bounding boxes, Markdown tables, or string transcripts.
*   *3.2 $\rightarrow$ 3.3:* Forward the unified, flattened text string.
*   *3.3 $\rightarrow$ 3.4:* Forward the fully constructed Prompt (System Instructions + Context + Temporal Anchor + Text).
*   *3.4 $\rightarrow$ E6 (Gemini):* Execute LLM Inference API call.
*   *E6 (Gemini) $\rightarrow$ 3.4:* Return raw LLM string output.
*   *3.4 $\rightarrow$ 3.5:* Forward LLM output for parsing.
*   *3.5 $\rightarrow$ 3.4 (On Error):* Loop back with Fallback Prompt containing the specific parsing error (Retry Loop).
*   *3.5 $\rightarrow$ Process 4.0 (On Success):* Forward the strictly validated JSON Task object.
*   *3.5 $\rightarrow$ Garbage Collector:* Issue explicit `del` command to purge raw text/media from volatile memory immediately after successful validation.
