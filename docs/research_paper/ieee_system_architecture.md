# III. SYSTEM ARCHITECTURE

## A. Overall Architecture Specification

The Chatnalyxer system is designed as a distributed, polyglot microservices architecture to address the fundamental computational challenges of real-time, multi-modal data extraction from high-volume, unstructured communication networks. The architectural design is predicated on the strict separation of concerns, decoupling the high-concurrency, I/O-bound task of network ingestion from the highly intensive, CPU-bound task of semantic artificial intelligence processing. The system is conceptually partitioned into three primary tiers: the Client Presentation and Configuration Tier, the Edge Ingestion Tier, and the Core Intelligence and Persistence Tier. This stratification ensures fault tolerance, enabling the system to gracefully handle massive transient spikes in conversational data without dropping payloads or exceeding external API rate limits. Furthermore, the architecture is constrained by a strict "ephemeral processing" paradigm, wherein raw user data is held exclusively in volatile memory for the duration of the computational lifecycle, ensuring absolute adherence to data privacy principles.

## B. Component Responsibilities

1) **User and Mobile Application (Client Tier):** The React Native Mobile Application functions as the primary user interface and configuration matrix. Its responsibility is to present the extracted temporal data logically, manage the user's explicit consent configuration (whitelisting groups), and securely house the cryptographic tokens required for authentication.

2) **WhatsApp Integration Layer (Edge Ingestion Tier):** Implemented utilizing the `Baileys` library within a Node.js runtime, this layer acts as an authenticated companion device on the WhatsApp network. Its sole responsibility is maintaining a persistent WebSocket connection, decrypting incoming Signal-protocol stanzas in real-time, executing an O(1) whitelist filtration algorithm, and normalizing heterogeneous WhatsApp payloads into a standardized internal schema.

3) **FastAPI Backend and Async Queue (Core Intelligence Tier):** This Python-based tier serves as the central orchestration engine. It exposes the internal WebHooks for data ingestion and the external REST APIs for the mobile client. To prevent blocking the WebSocket listener, it utilizes an Internal Asynchronous Processing Queue, moving the heavy machine learning workloads into background worker threads.

4) **Multi-modal Cloud AI Services:**
   - *Google Gemini API:* The central semantic engine, responsible for executing zero-shot temporal extraction and priority classification on flattened text.
   - *Azure AI Services (OCR, Speech-to-Text, Document Intelligence):* A suite of specialized deep learning models responsible for transforming non-text media (images, audio, and structured PDFs, respectively) into unified plain text, acting as a preprocessing normalization layer for the LLM.

5) **Persistence and Scheduling (Storage Tier):**
   - *PostgreSQL:* The relational database enforcing ACID compliance, tasked with storing only the structured, non-identifying metadata resulting from the LLM extraction.
   - *APScheduler:* An in-process background daemon responsible for continuous B-Tree index polling to trigger temporal events based on approaching task deadlines.
   - *Push Notification Service:* The edge-delivery mechanism for routing critical alerts back to the user's mobile device via OS-level notification channels.

## C. Component Interactions and Data Flow

The interaction paradigm within Chatnalyxer is inherently event-driven and unidirectional during the ingestion phase. The data flow lifecycle is defined as follows:

When a conversational event occurs, the WhatsApp servers broadcast an encrypted binary stanza over a persistent WebSocket Secure (WSS) connection to the Integration Layer. Upon decryption, if the group ID satisfies the whitelist conditions, the Node.js service isolates the payload. This payload is transmitted across the internal network boundary to the FastAPI backend via an asynchronous HTTP POST request. The FastAPI layer immediately returns a 202 Accepted status to ensure the Node.js event loop remains unblocked, pushing the payload into the internal Async Processing Queue.

Worker threads consume this queue. Depending on the payload's MIME type, the data is routed to the appropriate Azure API via HTTPS. For example, a voice note is streamed to Azure Speech-to-Text. The resulting transcript, alongside the precise UNIX timestamp of the original message, is subsequently transmitted to the Google Gemini API. The LLM processes this contextualized prompt and returns a structured JSON object. The worker thread validates this JSON structure; upon successful validation, the raw input data is permanently wiped from volatile memory, and the structured metadata (Task Name, Deadline, Priority) is persisted to PostgreSQL via SQLAlchemy ORM. Finally, the APScheduler continuously polls PostgreSQL; when a task's temporal threshold is crossed, it dispatches an HTTPS request to the Push Notification Service, completing the data lifecycle back to the user.

## D. Security Boundaries and Privacy Considerations

The architecture establishes rigorous, multi-layered security boundaries to mitigate the risks associated with processing highly sensitive personal communication.

1) **Network Cryptography:** The primary ingestion boundary is protected by the Signal protocol, ensuring End-to-End Encryption (E2EE) is preserved from the sender to the Node.js ingestion node. Communication between the internal microservices (Node.js to FastAPI) is isolated within a Virtual Private Cloud (VPC) and secured via internal JSON Web Tokens (JWT) and Mutual TLS (mTLS), preventing unauthorized internal access.
2) **Authentication:** The mobile client utilizes JWTs for stateless REST API authentication. The cryptographic keys required for the WhatsApp WebSocket connection are serialized, encrypted, and stored persistently, ensuring the system can recover from transient crashes without re-initiating the QR code handshake.
3) **Ephemeral Processing Guarantee:** The most critical security boundary is architectural data minimization. The system is computationally constrained from writing raw conversational text or media binaries to persistent disk storage. Once the structured metadata crosses the ORM boundary into PostgreSQL, the originating raw data residing in RAM is aggressively garbage-collected.

## E. Scalability and Deployment Considerations

The microservices architecture of Chatnalyxer ensures superior horizontal scalability. The Node.js ingestion layer is highly memory-efficient due to its event-driven nature, capable of multiplexing thousands of concurrent WebSocket connections per instance. Conversely, the FastAPI processing layer, which is heavily reliant on complex data validation and external API synchronization, is fundamentally I/O bound. By decoupling these layers via the internal message queue, the infrastructure can independently autoscale the Python worker nodes in response to queued payload depth during high-traffic events, without needlessly over-provisioning the lightweight WebSocket listeners.

For deployment, the architecture dictates extensive containerization (e.g., utilizing Docker and Kubernetes orchestration). This enables rapid failover and ensures environmental consistency across the development, testing, and production phases. The reliance on managed cloud AI services (Azure, Google) further shifts the heaviest computational burdens off the primary infrastructure, ensuring that the local cluster remains highly responsive and focused purely on orchestration and state management.

---

## F. System Architecture Diagram

*(The following is the diagram specification for inclusion in the final manuscript).*

### Diagram Specification
The architecture diagram should be constructed utilizing a left-to-right processing flow.
- **Left Pane (Client Edge):** Display the User, React Native App, and the WhatsApp Network.
- **Center-Left Pane (Ingestion):** Display the Node.js service highlighting the WebSocket connection and the `remoteJid` filtration block.
- **Center-Right Pane (Processing Core):** Display the FastAPI backend. Inside, illustrate the Async Queue branching out into a routing decision node (Text, Image, Audio, Document). 
- **Top Right Pane (External Intelligence):** Display the external APIs (Azure suite and Google Gemini), with bidirectional arrows connecting to the routing nodes in the FastAPI block.
- **Bottom Right Pane (Storage & Action):** Display PostgreSQL, the APScheduler, and the Push Notification service, creating a cyclical arrow back to the User on the far left.

### Figure Caption
**Fig. 1.** High-level system architecture of Chatnalyxer, illustrating the decoupled, multi-modal ingestion pipeline, the ephemeral processing flow through cloud-based AI services, and the strict security boundaries between the ingestion, computation, and persistent storage tiers.

### Figure Explanation (For inclusion in the paper text)
As illustrated in Fig. 1, the Chatnalyxer architecture is functionally divided to separate high-frequency network ingestion from CPU-intensive semantic processing. The continuous stream of encrypted data originating from the WhatsApp network is intercepted and filtered at the edge by the Node.js integration layer. To mitigate computational blocking, authorized payloads traverse an internal boundary into an asynchronous queue within the FastAPI backend. Fig. 1 demonstrates the multi-modal routing logic, wherein heterogeneous payloads (images, audio, PDFs) are normalized via specialized Azure AI models before being synthesized and transmitted to the Google Gemini Large Language Model for temporal extraction. Crucially, the diagram delineates the data persistence boundary; while raw multi-modal data flows extensively through the volatile memory of the upper processing tiers, only the final, structured metadata permeates the boundary into the PostgreSQL storage tier, highlighting the system's foundational commitment to privacy-preserving, ephemeral data processing.
