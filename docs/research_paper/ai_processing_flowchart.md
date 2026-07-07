# IX. AI PROCESSING FLOWCHART SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To synthesize the algorithmic progression of the data pipeline from ingestion to dispatch, a sequential AI Processing Flowchart is presented (Fig. X). This flowchart formally maps the ten discrete operational stages governing the Chatnalyxer extraction engine. It visually segregates the deterministic preprocessing operations (Media Detection and Modality Triage) from the stochastic operations housed within the Large Language Model (Temporal Extraction and Priority Detection). Crucially, the flowchart illustrates the "Validation Boundary" (Stage 7), which acts as the ultimate gatekeeper preventing malformed or hallucinated data from contaminating the persistent storage tier. This linear pipeline architecture ensures that regardless of the initial payload modality (image, audio, or text), the data is systematically flattened, semantically evaluated, structured, and scheduled with zero human intervention. 

### Figure Caption
**Fig. X.** Algorithmic flowchart of the Chatnalyxer AI Processing Pipeline. The model illustrates the sequential transformation of raw, multi-modal conversational payloads into structured temporal events, highlighting the integration of Azure Cognitive Services for normalization and the Google Gemini LLM for semantic evaluation, bounded by rigid schema validation constraints.

*(Note: Replace "Fig. X" with the actual figure number in your manuscript).*

---

## B. Flowchart Structure (Visual Specification)

When recreating this flowchart in a visual tool, utilize standard flowchart symbols: Ovals for Terminals (Start/End), Rectangles for Processes, and Diamonds for Decision Nodes. Arrow direction is strictly top-to-bottom.

1.  **[Terminal]** `Incoming Message`
    $\downarrow$
2.  **[Decision Diamond]** `Media Detection (MIME Type Analysis)`
    *Branches to four parallel [Process] blocks:*
    *   $\rightarrow$ `Image OCR Processing (Azure Vision)`
    *   $\rightarrow$ `Speech-to-Text Processing (Azure Cognitive)`
    *   $\rightarrow$ `PDF Structural Parsing (Azure Document Intelligence)`
    *   $\rightarrow$ `Plain Text Bypass`
    *All four branches converge back to:*
    $\downarrow$
3.  **[Process]** `Gemini LLM (Prompt Engineering & Injection)`
    $\downarrow$
4.  **[Process]** `Temporal Extraction (Mathematical Date Resolution)`
    $\downarrow$
5.  **[Process]** `Priority Detection (Linguistic & Temporal Heuristics)`
    $\downarrow$
6.  **[Decision Diamond]** `Validation (JSON Schema Enforcement)`
    *   *If False:* Loop back to `Gemini LLM` (Fallback Prompt Retry).
    *   *If True:* Proceed downward.
    $\downarrow$
7.  **[Data Store]** `Database (PostgreSQL Persistence & Memory Purge)`
    $\downarrow$
8.  **[Process]** `Scheduler (Daemon Polling)`
    $\downarrow$
9.  **[Terminal]** `Notification (Push Delivery)`

---

## C. Academic Stage-by-Stage Explanation

### Stage 1: Incoming Message (Ingestion)
The pipeline initiates when the asynchronous Python worker thread dequeues the normalized internal payload (CIP) previously forwarded by the Node.js ingestion layer. At this stage, the payload resides entirely in volatile memory and consists of the raw user data, the originating Group JID, and the precise UNIX epoch timestamp of message transmission.

### Stage 2: Media Detection (Triage)
The system executes a deterministic triage algorithm based on the payload's MIME type. This is a critical divergence point; treating all payloads uniformly would result in catastrophic parsing errors. If the payload is evaluated as `text/plain`, it bypasses the preprocessing layers entirely to conserve computational resources.

### Stage 3: Multi-modal Preprocessing (OCR / Speech / PDF / Text)
This stage normalizes heterogenous data into a unified, flattened text string. Photographic media is routed to Azure Vision, utilizing a Spatial Flattening algorithm to preserve horizontal reading lines. Audio payloads are transcoded to WAV and processed via Azure Cognitive Speech to resolve acoustic disfluencies. Document payloads are parsed via Azure Document Intelligence, utilizing structural chunking to convert embedded tables into linearized Markdown. The output of any branch in this stage is a unified text string.

### Stage 4: Gemini LLM (Semantic Core)
The flattened text string enters the stochastic processing core. A deterministic prompt envelope is constructed, encapsulating the text within rigid behavioral constraints (the System Persona). The Google Gemini model evaluates the text through a zero-shot binary classification lens to determine if an actionable organizational task exists within the conversational noise.

### Stage 5: Temporal Extraction
If a task is identified, the LLM executes temporal resolution. Utilizing the dynamically injected UTC timestamp (the Temporal Anchor, $t=0$), the model performs implicit chronological mathematics to resolve ambiguous, relative expressions (e.g., "submit by tomorrow night") into a strict, timezone-aware ISO-8601 UTC timestamp.

### Stage 6: Priority Detection
The LLM subsequently evaluates the urgency of the extracted task. This heuristic calculation synthesizes two variables: Linguistic Urgency (e.g., the presence of highly weighted keywords such as "mandatory" or "final exam") and the Temporal Delta (the proximity of the extracted deadline to the current time). The LLM assigns a discrete Priority Classification (`HIGH`, `MEDIUM`, or `LOW`).

### Stage 7: Validation Boundary
Before the stochastic LLM output can be trusted, it must pass through a strict validation layer governed by `Pydantic` models. The system verifies that the output perfectly matches the predefined JSON schema and that the extracted deadline does not represent a temporal paradox (i.e., a deadline residing in the past). If validation fails, the pipeline initiates an autonomous retry loop with a highly constrained Fallback Prompt.

### Stage 8: Database (Persistence and Ephemeral Purge)
Upon successful validation, the pipeline crosses the persistence boundary. The structured JSON metadata is inserted into the PostgreSQL cluster. At the exact millisecond the SQL `INSERT` is confirmed, the Python garbage collector is explicitly invoked, permanently erasing the original raw text and media binaries from volatile memory to comply with ephemeral processing constraints.

### Stage 9: Scheduler (Temporal Polling)
The `APScheduler` daemon operates independently of the ingestion pipeline. Utilizing a logarithmic B-Tree composite index, it continuously polls the PostgreSQL database, executing temporal range queries to identify tasks whose deadlines have crossed the user's predefined notification threshold (e.g., querying for tasks due within the next 24 hours).

### Stage 10: Notification (Dispatch)
When the scheduler identifies an impending deadline, it constructs a routing payload containing the task title and priority flag. This payload is dispatched via HTTPS to the external Push Notification Gateway (e.g., Expo). The pipeline terminates when the mobile client receives the payload and renders the actionable alert on the user's OS-level notification tray.
