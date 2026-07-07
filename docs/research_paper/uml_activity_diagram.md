# X. UML ACTIVITY DIAGRAM SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To formalize the behavioral workflow and concurrent operational states of the Chatnalyxer system, a Unified Modeling Language (UML) Activity Diagram was developed (Fig. X). This model transcends the static structural constraints of component diagrams by mapping the dynamic control flow from the initial user onboarding sequence through the continuous, asynchronous background monitoring loop. The diagram utilizes standard UML concurrency notation—specifically *fork* and *join* synchronization bars—to explicitly delineate the precise moment the system diverges into two parallel operational states: the passive, autonomous AI extraction loop running on the backend infrastructure, and the active, user-facing triage environment running on the mobile client. This segregation of control flows demonstrates how the system maintains high UI responsiveness on the client device while simultaneously orchestrating heavy, long-running machine learning workloads in the background.

### Figure Caption
**Fig. X.** UML Activity Diagram illustrating the behavioral control flow of the Chatnalyxer system. The model maps the sequential onboarding process before utilizing a synchronization fork to demonstrate the concurrent execution of the autonomous background extraction loop and the active user dashboard state.

*(Note: Replace "Fig. X" with the actual figure number in your manuscript).*

---

## B. Activity Diagram Visual Specification

When recreating this UML Activity Diagram, utilize standard notation: solid black circles for the *Initial Node*, rounded rectangles for *Action Nodes*, horizontal black bars for *Fork/Join Nodes*, and an encircled black dot for the *Activity Final Node*.

1.  **[Initial Node]** $\rightarrow$ `Begin Session`
2.  **[Action Node]** `User Login & Authentication`
3.  **[Action Node]** `Execute WhatsApp Cryptographic Connection`
4.  **[Action Node]** `Configure Group Selection (Whitelisting)`
5.  **[Fork Node]** `Synchronization Bar (Split into concurrent threads)`
    *   **Branch A (Background Daemon Loop):**
        1.  **[Action Node]** `Execute Passive Message Monitoring`
        2.  **[Decision Diamond]** `Message Received?`
            *   *(If No, loop back to Monitoring).*
            *   *(If Yes, proceed down).*
        3.  **[Action Node]** `Execute Multi-modal AI Processing`
        4.  **[Action Node]** `Execute Task Semantic Extraction`
        5.  **[Decision Diamond]** `Valid Task Found?`
            *   *(If No, loop back to Monitoring).*
            *   *(If Yes, proceed down).*
        6.  **[Action Node]** `Commit to Database (Persistence)`
        7.  **[Action Node]** `Dispatch Scheduled Notification`
        8.  $\rightarrow$ *(Loops indefinitely back to Message Monitoring)*.
    *   **Branch B (Foreground Client State):**
        1.  **[Action Node]** `Render Dashboard UI`
        2.  **[Action Node]** `Fetch Task Metadata`
        3.  **[Action Node]** `Execute Triage Actions (Complete/Snooze)`
        4.  $\rightarrow$ *(Loops indefinitely back to Render Dashboard)*.

---

## C. Academic Explanation of Activities

### 1. User Login & Authentication
The control flow initiates with user authentication. This action represents the cryptographic gateway into the system, validating the user's identity via the FastAPI backend and issuing the JWTs required to establish a secure, stateful session across the distributed microservices.

### 2. Execute WhatsApp Cryptographic Connection
Following authentication, the control flow mandates the establishment of the external data ingestion pipeline. The user links their primary WhatsApp device by scanning a dynamically generated matrix barcode (QR Code). This action triggers the `Baileys` Node.js layer to generate and exchange the necessary identity keys required by the Signal Protocol, effectively granting the backend authorized, decrypted access to the user's network traffic.

### 3. Configure Group Selection (Whitelisting)
To ensure compliance with strict data minimization principles, the workflow forces the user to explicitly define the boundaries of the monitoring system. The user is presented with a complete array of their active group chats. By toggling specific JIDs (Jabber IDs), the user defines the operational parameters of the edge filtration algorithm.

### 4. Synchronization Fork (Concurrent Execution)
Upon completion of the configuration phase, the workflow hits a UML Fork Node. The system diverges into two parallel threads of execution. This is a critical architectural requirement; if the workflow remained entirely sequential, the mobile application would freeze while waiting for the backend to process incoming messages.

### 5. Execute Passive Message Monitoring (Branch A)
The background thread enters a continuous polling state. The Node.js integration layer silently monitors the established WebSocket connection, listening for incoming binary stanzas originating exclusively from the whitelisted group JIDs configured in Action 3.

### 6. Execute Multi-modal AI Processing
When a stanza satisfies the filtration criteria, the control flow shifts to the preprocessing stage. Depending on the payload's MIME type, the system executes the necessary spatial flattening (OCR), transcription (Speech-to-Text), or structural chunking (PDF) via Azure Cognitive Services to normalize the data into a unified string format.

### 7. Execute Task Semantic Extraction
The normalized payload enters the central stochastic processing core. The Google Gemini Large Language Model analyzes the text, utilizing zero-shot contextual injection to evaluate the presence of an organizational directive and execute the requisite temporal date math (converting relative terms to absolute ISO-8601 timestamps).

### 8. Commit to Database (Persistence)
If the validation layer confirms the structural integrity of the extracted JSON output, the control flow crosses the persistence boundary. The structured metadata is inserted into the PostgreSQL cluster, and the Python garbage collector is synchronously triggered to obliterate the raw conversational data residing in RAM.

### 9. Dispatch Scheduled Notification
Operating on a separate temporal polling loop, the `APScheduler` evaluates the persistent data. When a task approaches its calculated deadline, the system dispatches an outbound alert via the Expo Push Notification Gateway, routing the data out of the background loop and back to the physical device.

### 10. Render Dashboard and Triage (Branch B)
Concurrent with the entire background extraction loop, Branch B governs the active user state. The mobile client renders a dynamic, chronologically sorted dashboard. The user fetches the persistent metadata generated by Branch A and performs triage actions (swiping to mark tasks complete or snoozing alerts), continuously interacting with the processed intelligence without ever interrupting the passive monitoring loop.
