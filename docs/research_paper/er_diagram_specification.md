# VIII. ENTITY-RELATIONSHIP (ER) DIAGRAM SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To rigorously define the persistence architecture and relational integrity of the Chatnalyxer storage tier, an Entity-Relationship (ER) Diagram was constructed (Fig. X). This model delineates the normalized schema utilized by the PostgreSQL backend. The design adheres strictly to the Third Normal Form (3NF), minimizing data redundancy and mitigating insert/update anomalies. The diagram explicitly maps the propagation of Foreign Keys (FK) radiating outward from the central `Users` entity, establishing a strict relational hierarchy. Crucially, this schema mathematically enforces the system's ephemeral processing and privacy constraints; the `Media` and `Logs` entities are explicitly designed to store only sanitized telemetry and file metadata (e.g., MIME types, inference latency), completely omitting any columns capable of housing raw text payloads or binary media blobs. Furthermore, the model illustrates the strategic deployment of composite B-Tree indexes on the `Tasks` entity, optimizing the database for high-frequency temporal polling executed by the internal scheduling daemon.

### Figure Caption
**Fig. X.** Entity-Relationship (ER) model of the Chatnalyxer PostgreSQL database, illustrating the Third Normal Form (3NF) schema, Primary/Foreign Key constraints, and the strict relational hierarchy radiating from the central `Users` table. 

*(Note: Replace "Fig. X" with the actual figure number in your manuscript).*

---

## B. Entities and Schema Definition

When reconstructing this ER Diagram, utilize standard Crow's Foot notation to represent the relationships. Below is the strict schema definition for each table, including Primary Keys (PK) and Foreign Keys (FK).

### 1. `Users` Table (Core Entity)
*   **Attributes:**
    *   `user_id` [PK, UUID, Not Null]: Cryptographic unique identifier.
    *   `email` [String(255), Unique, Not Null]
    *   `created_at` [Timestamp, Default NOW()]

### 2. `Authentication` Table
*   **Attributes:**
    *   `auth_id` [PK, UUID]
    *   `user_id` [FK $\rightarrow$ Users.user_id, Unique, On Delete Cascade]
    *   `hashed_password` [String(255), Not Null]
    *   `push_token` [String(255)]
    *   `encrypted_session_state` [JSONB]

### 3. `Preferences` Table
*   **Attributes:**
    *   `pref_id` [PK, UUID]
    *   `user_id` [FK $\rightarrow$ Users.user_id, Unique, On Delete Cascade]
    *   `dnd_start_time` [Time]
    *   `dnd_end_time` [Time]
    *   `default_alert_offset` [Integer]

### 4. `Groups` Table
*   **Attributes:**
    *   `group_jid` [PK, String(255)]: The native WhatsApp Group ID.
    *   `group_name` [String(255)]
    *   `is_whitelisted` [Boolean, Default False]
    *   `user_id` [FK $\rightarrow$ Users.user_id, On Delete Cascade]: Maps which user authorized this group.

### 5. `Tasks` Table
*   **Attributes:**
    *   `task_id` [PK, UUID]
    *   `user_id` [FK $\rightarrow$ Users.user_id, On Delete Cascade]
    *   `group_jid` [FK $\rightarrow$ Groups.group_jid, Nullable]
    *   `title` [String(255), Not Null]
    *   `due_date` [TimestampTZ, Not Null]: Timezone-aware UTC timestamp.
    *   `priority_level` [Enum('HIGH', 'MEDIUM', 'LOW')]
    *   `is_completed` [Boolean, Default False]

### 6. `Notifications` Table
*   **Attributes:**
    *   `notification_id` [PK, UUID]
    *   `task_id` [FK $\rightarrow$ Tasks.task_id, On Delete Cascade]
    *   `send_at` [TimestampTZ, Not Null]
    *   `status` [Enum('SCHEDULED', 'DELIVERED', 'FAILED')]

### 7. `Media` (Telemetry) Table
*   **Design Note:** This table *does not* store media. It logs metadata for analytical profiling of the Azure AI pipelines.
*   **Attributes:**
    *   `media_id` [PK, UUID]
    *   `task_id` [FK $\rightarrow$ Tasks.task_id, Nullable]
    *   `mime_type` [String(50)]
    *   `processing_latency_ms` [Integer]
    *   `azure_confidence_score` [Float]

### 8. `Logs` Table
*   **Attributes:**
    *   `log_id` [PK, UUID]
    *   `user_id` [FK $\rightarrow$ Users.user_id, Nullable, On Delete Set Null]
    *   `event_type` [String(100)]
    *   `timestamp` [TimestampTZ]
    *   `sanitized_message` [Text]

---

## C. Relationships and Multiplicity (Crow's Foot Notation)

*   **Users to Authentication (1 : 1):** A user has exactly one authentication record. The `Unique` constraint on the FK enforces this.
*   **Users to Preferences (1 : 1):** A user has exactly one preference configuration profile.
*   **Users to Groups (1 : M):** A single user can configure/whitelist multiple WhatsApp groups.
*   **Users to Tasks (1 : M):** A single user will generate an infinite number of extracted tasks over time.
*   **Groups to Tasks (1 : M):** A single WhatsApp group can be the source of multiple extracted tasks.
*   **Tasks to Notifications (1 : M):** A single high-priority task triggers a cascading schedule of multiple notifications (e.g., 24h, 2h, 15m warnings).
*   **Tasks to Media (1 : 0..1):** A task *may* have originated from a media payload, resulting in a single telemetry record.

---

## D. Database Architecture Principles

### 1. Normalization
The schema is rigorously normalized to the **Third Normal Form (3NF)**. Every non-prime attribute is strictly dependent on the primary key, eliminating transitive dependencies. For example, instead of storing `push_token` repeatedly in the `Notifications` table, it is isolated in the `Authentication` table and linked via the `user_id` relationship, ensuring that if a user changes their mobile device, the token is updated in exactly one place.

### 2. Indexes and Performance
Because the `APScheduler` daemon continuously polls the database for approaching deadlines, sequential table scans would severely degrade system performance as the `Tasks` table grows. To mitigate this, a **Composite B-Tree Index** is applied to the `Tasks` table on `(user_id, due_date)`. This allows the PostgreSQL query optimizer to perform logarithmic ($O(\log N)$) range queries, ensuring the scheduling engine remains highly performant regardless of dataset volume. Secondary indexes are applied to the `Notifications` table on `(status, send_at)`.

### 3. Data Integrity and Security Constraints
Data integrity is enforced natively at the database level utilizing **Cascading Deletes**. Every Foreign Key pointing to the central `Users` table (or deriving from it, such as `Tasks` $\rightarrow$ `Notifications`) is configured with the `ON DELETE CASCADE` constraint. From a privacy and regulatory compliance perspective (e.g., GDPR), if a user invokes their "Right to be Forgotten" via the mobile application, deleting their row in the `Users` table automatically triggers a database-level chain reaction, instantly obliterating their configurations, tasks, and pending notifications without requiring complex, error-prone application-layer logic.
