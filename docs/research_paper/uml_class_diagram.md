# VII. UML CLASS DIAGRAM SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To formalize the Object-Oriented domain model and database schema structure underlying the Chatnalyxer ecosystem, a Unified Modeling Language (UML) Class Diagram is provided (Fig. X). This structural diagram delineates the primary software entities, encapsulating their internal attributes and operational methods. The model explicitly maps the structural relationships—including Composition, Aggregation, and Inheritance—that dictate data integrity and referential constraints within the FastAPI ORM and PostgreSQL backend. Notably, the diagram illustrates the strict Compositional hierarchy cascading from the root `User` class; this design mathematically guarantees that the invocation of a user deletion method propagates destructively through the `Task`, `Settings`, and `Notification` branches, fulfilling the absolute data erasure requirements mandated by strict privacy frameworks. Furthermore, the model demonstrates polymorphic extraction capabilities via the `Media` subclass inheriting from the base `Chat` class.

### Figure Caption
**Fig. X.** UML Class Diagram of the Chatnalyxer domain model, detailing the Object-Oriented structure, attributes, methods, and relational multiplicity (Composition, Aggregation, and Inheritance) governing the core AI orchestration and persistent storage tiers.

*(Note: Replace "Fig. X" with the actual figure number in your manuscript).*

---

## B. Class Definitions, Attributes, and Methods

When reconstructing this UML Class Diagram in software, represent the following classes as standard UML boxes partitioned into three horizontal sections (Class Name, Attributes, Methods).

### 1. `User` (Root Entity)
**Design Rationale:** The foundational entity in the relational architecture. Every configuration, authentication state, and extracted data point must ultimately resolve back to a single, unique `User` to enforce Row-Level Security (RLS) in the multi-tenant architecture.
*   **Attributes:**
    *   `- user_id: UUID (Primary Key)`
    *   `- email: String`
    *   `- created_at: DateTime`
*   **Methods:**
    *   `+ create_account()`
    *   `+ delete_account_cascade()`

### 2. `Settings`
**Design Rationale:** Extracted from the `User` class to normalize the database schema. It houses the user's explicit consent parameters, dictating precisely which external WhatsApp groups the system is legally permitted to intercept.
*   **Attributes:**
    *   `- settings_id: UUID`
    *   `- whitelisted_jids: Array[String]`
    *   `- notification_lead_time: Integer`
    *   `- do_not_disturb_enabled: Boolean`
*   **Methods:**
    *   `+ update_whitelist(jid: String)`
    *   `+ toggle_dnd()`

### 3. `Authentication`
**Design Rationale:** Isolated from the `User` class to prevent the accidental exposure of sensitive cryptographic material during standard data serialization. It manages the dual-layer authentication (internal JWTs and external WhatsApp session keys).
*   **Attributes:**
    *   `- auth_id: UUID`
    *   `- hashed_password: String`
    *   `- push_token: String`
    *   `- serialized_baileys_session: Blob`
*   **Methods:**
    *   `+ verify_password(raw_pass: String): Boolean`
    *   `+ regenerate_session_keys()`

### 4. `Task` (Core Transactional Entity)
**Design Rationale:** The fundamental product of the AI extraction pipeline. It represents a normalized, deterministic temporal event stripped of its original conversational context, optimized for high-speed chronological polling.
*   **Attributes:**
    *   `- task_id: UUID (Primary Key)`
    *   `- title: String`
    *   `- due_date: DateTime (ISO-8601 UTC)`
    *   `- priority: Enum (HIGH, MEDIUM, LOW)`
    *   `- source_jid: String`
    *   `- is_completed: Boolean`
*   **Methods:**
    *   `+ mark_complete()`
    *   `+ calculate_time_remaining(): Integer`

### 5. `Notification`
**Design Rationale:** An independent class to prevent notification duplication and track the delivery state of scheduled alerts across unreliable mobile networks.
*   **Attributes:**
    *   `- notification_id: UUID`
    *   `- send_at: DateTime`
    *   `- status: Enum (SCHEDULED, SENT, FAILED)`
    *   `- payload_type: String`
*   **Methods:**
    *   `+ dispatch_payload()`
    *   `+ handle_delivery_failure()`

### 6. `Chat` (Abstract Base Class)
**Design Rationale:** Represents the incoming ephemeral payload. Because this data is never persisted to the database, this class exists purely in volatile RAM during the FastAPI processing lifecycle to standardize the normalization algorithm.
*   **Attributes:**
    *   `- message_id: String`
    *   `- timestamp: UNIX_Integer`
    *   `- raw_text: String`
*   **Methods:**
    *   `+ normalize_metadata()`
    *   `+ destruct_from_memory()`

### 7. `Media` (Subclass of Chat)
**Design Rationale:** Exists to handle the specialized, heavy computational requirements of non-text payloads (Images, Audio, PDFs) prior to LLM semantic extraction.
*   **Attributes:**
    *   `- mime_type: String`
    *   `- media_key: String (AES)`
    *   `- binary_blob: Buffer`
*   **Methods:**
    *   `+ decrypt_buffer()`
    *   `+ route_to_azure_cognitive()`

### 8. `Scheduler` (Service Class / Singleton)
**Design Rationale:** An autonomous daemon class that operates independently of user interaction. It acts as the bridge between the dormant data in the `Task` table and the active execution of the `Notification` alerts.
*   **Attributes:**
    *   `- polling_interval: Integer (Seconds)`
    *   `- active_queue_size: Integer`
*   **Methods:**
    *   `+ poll_database()`
    *   `+ enqueue_notifications(task: Task)`

---

## C. Relational Topologies

Draw lines between the classes utilizing the following standard UML notations:

### 1. Composition (Filled Diamond)
*Indicates a strict "part-of" relationship where the child cannot exist without the parent. If the parent is destroyed, the child is destroyed.*
*   `User` $\blacklozenge$--- `Settings` (1 to 1)
*   `User` $\blacklozenge$--- `Authentication` (1 to 1)
*   `User` $\blacklozenge$--- `Task` (1 to 0..*) 
    *   *(Rationale: If a user deletes their account, all their tasks must be cascadingly eradicated to comply with privacy mandates).*
*   `Task` $\blacklozenge$--- `Notification` (1 to 0..*)
    *   *(Rationale: If a task is completed or deleted, all pending future notifications for that specific task must be destroyed).*

### 2. Aggregation (Hollow Diamond)
*Indicates a "has-a" relationship where the child can exist independently of the parent class lifecycle.*
*   `Scheduler` $\lozenge$--- `Task` (1 to 0..*)
    *   *(Rationale: The `Scheduler` daemon temporarily holds references to `Task` objects in its memory queue to process them. However, if the `Scheduler` crashes or restarts, the `Task` objects are not destroyed; they persist safely in the database).*

### 3. Inheritance / Generalization (Hollow Triangle)
*Indicates an "is-a" relationship.*
*   `Media` $\vartriangle$--- `Chat`
    *   *(Rationale: A `Media` payload is fundamentally a `Chat` message, sharing its `message_id` and `timestamp`, but contains extended attributes (binary blob) and specialized methods (decryption) requiring overriding logic).*

### 4. Directed Association (Simple Arrow)
*   `Task` $\rightarrow$ `Chat` (0..* to 1)
    *   *(Rationale: A `Task` is derived from a `Chat` payload. While the `Chat` object itself is ephemerally purged, the `Task` retains the `source_jid` reference to know where it originated).*
