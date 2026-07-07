# XI. UML STATE MACHINE DIAGRAM SPECIFICATION

## A. IEEE Manuscript Explanation (To be embedded in the paper)

**Figure Explanation:**
To rigorously define the complete operational lifecycle of a single extracted entity within the Chatnalyxer ecosystem, a Unified Modeling Language (UML) State Machine Diagram was constructed (Fig. X). This model isolates a generic "Task Payload" as a discrete object, charting its progression across nine distinct operational states, from initial edge detection to terminal archival or deletion. The diagram explicitly defines the precise transition triggers—such as API responses, temporal thresholds, and explicit user interactions—that drive the object from a state of volatile volatility into persistent storage, and ultimately, into a terminal resolution. By mapping the error-handling transitions (e.g., routing a payload to the `Deleted` state upon validation failure) alongside the standard operational path, the model formally proves the system's capacity for autonomous state resolution without requiring manual administrative intervention during edge-case anomalies.

### Figure Caption
**Fig. X.** UML State Machine Diagram mapping the chronological lifecycle of a Chatnalyxer task entity. The model illustrates the transitional triggers driving the payload through the ingestion, evaluation, persistence, and scheduling phases, culminating in one of three terminal states: Completed, Expired, or Deleted.

*(Note: Replace "Fig. X" with the actual figure number in your manuscript).*

---

## B. State Machine Visual Specification

When recreating this diagram, utilize standard UML State notation: rounded rectangles for *States*, solid arrows for *Transitions*, a solid black circle for the *Initial Pseudostate*, and an encircled black dot for the *Final State*.

**[Initial Pseudostate]** $\rightarrow$ `Detected`

1.  **State:** `Detected`
    *   **Transition $\rightarrow$ `Processing`:** Triggered by `forward_to_fastapi()` WebHook.
2.  **State:** `Processing`
    *   **Transition $\rightarrow$ `Deleted` (Terminal):** Triggered by LLM identifying NO task present (`is_task == null`).
    *   **Transition $\rightarrow$ `Validated`:** Triggered by LLM output matching JSON schema.
3.  **State:** `Validated`
    *   **Transition $\rightarrow$ `Deleted` (Terminal):** Triggered by JSON validation failing `MAX_RETRIES`.
    *   **Transition $\rightarrow$ `Stored`:** Triggered by successful SQL `INSERT`.
4.  **State:** `Stored`
    *   **Transition $\rightarrow$ `Scheduled`:** Triggered by `APScheduler` calculating $(T_{due} - T_{current}) \le Threshold$.
    *   **Transition $\rightarrow$ `Deleted` (Terminal):** Triggered by user deleting their account (`CASCADE DELETE`).
    *   **Transition $\rightarrow$ `Completed` (Terminal):** Triggered by user prematurely completing the task via the UI.
5.  **State:** `Scheduled`
    *   **Transition $\rightarrow$ `Reminder Sent`:** Triggered by temporal trigger `$send_at` being reached.
6.  **State:** `Reminder Sent`
    *   **Transition $\rightarrow$ `Completed` (Terminal):** Triggered by explicit user interaction (swipe to complete).
    *   **Transition $\rightarrow$ `Expired` (Terminal):** Triggered by passing the absolute $T_{due}$ without user interaction.
    *   **Transition $\rightarrow$ `Deleted` (Terminal):** Triggered by user explicitly deleting the task.

**Terminal States** (`Completed`, `Expired`, `Deleted`) $\rightarrow$ **[Final State]**

---

## C. Academic Explanation of State Transitions

### 1. `Detected` $\rightarrow$ `Processing`
The payload enters the `Detected` state the millisecond the Node.js integration layer intercepts a stanza from a whitelisted WhatsApp group. The transition to `Processing` is an asynchronous handoff; the payload crosses the internal Virtual Private Cloud (VPC) boundary via an HTTP POST request and is enqueued within the FastAPI backend worker threads, awaiting external AI evaluation.

### 2. `Processing` $\rightarrow$ `Validated` OR `Deleted`
While in the `Processing` state, the payload is highly volatile and consumes intensive computational resources (Azure OCR/Speech and Google Gemini LLM). The system relies on the LLM's zero-shot classification to trigger the transition. If the LLM determines the conversational text lacks a genuine, actionable deadline, it returns `null`. This triggers an immediate transition to the terminal `Deleted` state, purging the payload from memory. Conversely, if the LLM successfully extracts structured temporal metadata, the state advances to `Validated`.

### 3. `Validated` $\rightarrow$ `Stored`
The `Validated` state is a transient checkpoint enforcing structural integrity. The `Pydantic` models verify the JSON schema. If validation holds, the system executes an SQL `INSERT` operation, transitioning the task to the `Stored` state. This transition is architecturally significant because it represents the Ephemeral Processing boundary; transitioning to `Stored` triggers the garbage collection of the raw conversational data in the upper memory tiers.

### 4. `Stored` $\rightarrow$ `Scheduled`
Tasks may rest in the `Stored` state inside the PostgreSQL database for weeks or months (e.g., a final exam schedule extracted on the first day of the semester). The transition to `Scheduled` occurs passively via continuous background polling by the `APScheduler` daemon. When the temporal delta between the current UTC time and the task's $T_{due}$ crosses the notification threshold (e.g., 48 hours), the database lock elevates the task to the `Scheduled` state, inserting parallel records into the internal `Notifications` table.

### 5. `Scheduled` $\rightarrow$ `Reminder Sent`
This transition is dictated by precise temporal triggers. When the localized OS time aligns with the notification `$send_at` timestamp, the FastAPI backend dispatches the payload via the Expo Push Gateway. The task elevates to the `Reminder Sent` state, moving from passive backend storage to an active, visually rendered alert on the user's mobile device screen.

### 6. `Reminder Sent` $\rightarrow$ Terminal States (`Completed`, `Expired`, `Deleted`)
Once the reminder is delivered, the state machine awaits explicit user interaction or the passage of absolute time to reach terminal resolution. 
*   If the user acknowledges the alert and executes a swipe interaction within the React Native client, an API call forces the transition to the **`Completed`** state.
*   If the user actively dismisses or removes the task from their dashboard, the state transitions to **`Deleted`**. 
*   Crucially, if the user ignores the alert entirely, the system autonomously forces the transition to the **`Expired`** state once the absolute $T_{due}$ timestamp is passed. 

Upon reaching any of these three terminal states, the task lifecycle concludes, and the data is subjected to archival or permanent eradication protocols based on the system's data retention policies.
