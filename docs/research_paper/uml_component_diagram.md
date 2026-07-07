# V. UML COMPONENT DIAGRAM SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To structurally formalize the modularity, interface dependencies, and communication topologies of the Chatnalyxer ecosystem, a Unified Modeling Language (UML) Component Diagram was developed (Fig. X). Unlike process-oriented models, this component diagram emphasizes the principles of encapsulation and service-oriented architecture (SOA) inherent to the system's design. The diagram illustrates how high-level subsystems (Components) interact exclusively through rigidly defined boundaries (Interfaces), designated by UML standard "lollipop" (provided) and "socket" (required) notation. The architectural rationale behind this extreme modularity is robust fault tolerance and technological agnosticism; by coupling components solely through RESTful and gRPC interfaces rather than shared memory space, any individual component—such as the Node.js WhatsApp Ingestion Layer—can be hot-swapped, rewritten, or horizontally scaled without necessitating cascading modifications to the upstream FastAPI Orchestration layer or the downstream client interfaces. 

### Figure Caption
**Fig. X.** UML Component Diagram of the Chatnalyxer system architecture, demonstrating the strict decoupling of the Client, Ingestion, and Orchestration tiers. The diagram maps the directional dependency of required interfaces (sockets) upon provided interfaces (lollipops), illustrating the system's reliance on asynchronous internal WebHooks and external HTTPS cognitive cloud services.

*(Note: Replace "Fig. X" with the actual figure number in your manuscript).*

---

## B. Diagram Specification (Visual Structure)

When recreating this UML Component Diagram in software (e.g., draw.io, Enterprise Architect), utilize standard UML 2.0 component notation (rectangles with the component icon in the top right corner). 

### 1. Client Tier Components
*   **Component:** `<<Mobile Client>> React Native Application`
    *   **Requires (Socket):** `I_TaskAPI`, `I_AuthAPI`, `I_PushNotification`
    *   **Dependency Arrow:** Points downward to the Core Orchestration Tier.

### 2. Edge Ingestion Tier Components
*   **Component:** `<<Edge Gateway>> WhatsApp Integration Layer (Baileys Node.js)`
    *   **Requires (Socket):** `I_WhatsApp_WSS` (from external WhatsApp servers), `I_Internal_WebHook` (to FastAPI).
    *   **Provides (Lollipop):** `I_QR_Handshake` (for client pairing).
    *   **Dependency Arrow:** Points inward toward the Core Orchestration Tier.

### 3. Core Orchestration Tier Components
*   **Component:** `<<Orchestrator>> FastAPI Backend`
    *   **Provides (Lollipop):** `I_TaskAPI`, `I_AuthAPI`, `I_Internal_WebHook`.
    *   **Requires (Socket):** `I_SQL_Dialect`, `I_LLM_Inference`, `I_Cognitive_Media`.
    *   **Internal Sub-component:** `<<Queue>> Async Celery/Asyncio Workers`.

### 4. Persistence and Dispatch Tier Components
*   **Component:** `<<Database>> PostgreSQL Cluster`
    *   **Provides (Lollipop):** `I_SQL_Dialect`.
*   **Component:** `<<Daemon>> APScheduler Service`
    *   **Requires (Socket):** `I_SQL_Dialect`, `I_Push_Dispatch`.
*   **Component:** `<<Gateway>> Expo Notification Service`
    *   **Provides (Lollipop):** `I_Push_Dispatch`.
    *   **Provides (Lollipop):** `I_PushNotification` (back to the React Native Client).

### 5. Cloud Intelligence Tier Components (External)
*   **Component:** `<<SaaS>> Google Gemini LLM`
    *   **Provides (Lollipop):** `I_LLM_Inference`.
*   **Component:** `<<SaaS>> Azure Cognitive Services`
    *   *(Encapsulates OCR, Speech, Document Intelligence)*
    *   **Provides (Lollipop):** `I_Cognitive_Media`.

---

## C. Interface Definitions and Communication Protocols

The structural integrity of the Chatnalyxer component architecture relies entirely on the strict enforcement of these communication interfaces. 

*   **`I_TaskAPI` & `I_AuthAPI` (RESTful HTTPS / JSON):** These interfaces represent the public-facing boundary of the FastAPI backend. They are strictly synchronous, stateless REST endpoints utilized by the React Native client to fetch dashboard state and manage authentication tokens.
*   **`I_Internal_WebHook` (mTLS HTTPS / Multipart Form-Data):** This is the critical internal bridge between the Ingestion Layer and Orchestration Layer. By design, this interface is unidirectional and highly asynchronous. The FastAPI component provides this endpoint, accepting heavy, decrypted media blobs from the Baileys component, returning an HTTP 202 Accepted instantly to free the ingestion thread.
*   **`I_WhatsApp_WSS` (WebSocket Secure / Signal Protocol):** An external interface providing the continuous, full-duplex stream of encrypted binary chat data to the ingestion node.
*   **`I_LLM_Inference` (HTTPS / JSON):** Provided by Google, this interface requires a strictly formatted prompt envelope (containing the temporal anchor and zero-shot directives) and returns the validated JSON extraction schema.
*   **`I_SQL_Dialect` (TCP Port 5432 / SQLAlchemy ORM):** The persistence interface. Crucially, the FastAPI Orchestrator and the APScheduler *both* require this interface, acting as competing readers/writers, necessitating row-level locking mechanisms within the PostgreSQL component to prevent race conditions during task state updates.

## D. Design Rationale

The primary rationale for this specific component topology is to enforce **High Cohesion and Low Coupling**, a fundamental principle in software engineering designed to maximize system resilience. 

For example, the task of connecting to the WhatsApp network and decrypting the Signal protocol is entirely encapsulated within the `WhatsApp Integration Layer` component. The `FastAPI Backend` component is entirely oblivious to the existence of WhatsApp; it merely knows that it receives normalized JSON/Binary payloads via its `I_Internal_WebHook`. 

This design rationale future-proofs the research. If, in future iterations, the system expands to ingest data from Telegram or Discord, the core AI orchestration logic within FastAPI remains completely untouched. The engineering team merely deploys a new `Telegram Integration` component that adheres to the established `I_Internal_WebHook` interface contract. Similarly, if a more advanced, open-source LLM replaces Google Gemini, only the module interacting with the `I_LLM_Inference` interface requires modification. This plug-and-play component architecture ensures that the system can rapidly evolve alongside the cutting-edge of AI research without requiring catastrophic, ground-up system rewrites.
