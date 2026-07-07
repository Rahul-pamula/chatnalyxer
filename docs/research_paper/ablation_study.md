# XIX. ABLATION STUDY DESIGN

To rigorously isolate and quantify the empirical contribution of each architectural component within the Chatnalyxer system, a comprehensive Ablation Study was designed. An ablation study systematically removes or disables specific modules of the pipeline to measure the resultant degradation in system performance. By observing the system's failure modes when a component is absent, researchers can mathematically validate the necessity of that component's inclusion in the final architecture.

The ablation experiments are evaluated across the primary Information Retrieval metrics (Accuracy, Precision, Recall) and Systemic Performance metrics (Latency, Throughput).

---

## A. Experiment 1: Ablation of the Gemini LLM
*   **Modification:** The Google Gemini API is completely removed from the semantic core. It is replaced with a baseline, traditional Natural Language Processing (NLP) pipeline utilizing standard Named Entity Recognition (NER) models (e.g., spaCy) and regex-based date parsers.
*   **Measured Impact:** 
    *   *Accuracy/Precision/Recall:* The F1 Score will experience a catastrophic collapse, primarily driven by a plunge in Recall.
    *   *Latency:* End-to-end latency will decrease significantly (improving from ~1.5s to ~100ms) due to the removal of the external cloud API call.
*   **Demonstrates:** This ablation proves the fundamental premise of the research. Traditional NER models cannot resolve the extreme conversational ambiguity, code-switching, and relative deictic temporal expressions (e.g., "tomorrow") inherent to WhatsApp chats. The massive drop in accuracy validates that the high latency cost of the LLM is an absolute architectural necessity for semantic extraction in this specific domain.

## B. Experiment 2: Ablation of Azure OCR
*   **Modification:** The Azure Vision OCR pipeline is disabled. Any incoming image payload is treated as conversational noise and dropped.
*   **Measured Impact:**
    *   *Accuracy/Recall:* Recall on the multi-modal subset of the CEC-10K corpus drops to 0%. Overall system Recall drops proportionally to the frequency of image usage in the dataset.
    *   *Latency:* Average system latency improves, as the heavy image-flattening algorithms are bypassed.
*   **Demonstrates:** This experiment quantifies the exact value of visual extraction. In academic demographics, sharing schedules via screenshots or whiteboard photographs is ubiquitous. Removing OCR demonstrates the volume of critical organizational data that traditional text-only parsers inherently miss, justifying the computational overhead of the visual processing layer.

## C. Experiment 3: Ablation of Azure Speech Recognition
*   **Modification:** The Azure Cognitive Speech pipeline is disabled. `.ogg` voice notes are ignored.
*   **Measured Impact:**
    *   *Accuracy/Recall:* Recall on the audio subset drops to 0%.
    *   *Latency:* Maximum system latency drops significantly (as ASR transcription is the slowest component in the architecture).
*   **Demonstrates:** Similar to the OCR ablation, this proves the necessity of multi-modal support. Voice notes are heavily utilized for rapid, on-the-go coordination. This experiment justifies the inclusion of the audio transcoding and ASR pipeline by measuring the exact percentage of deadlines lost without it.

## D. Experiment 4: Ablation of Priority Detection
*   **Modification:** The heuristic Priority Classification algorithm is bypassed. All extracted tasks are assigned a static `DEFAULT` priority level.
*   **Measured Impact:**
    *   *Accuracy:* The F1 score of the actual task extraction remains unchanged. However, the *User Experience Accuracy* (the relevance of the notifications) degrades severely.
    *   *Latency:* Negligible change.
*   **Demonstrates:** This ablation validates the necessity of the triage system. If all tasks are treated equally, the notification engine will spam the user with alerts for trivial events (e.g., "Read chapter 4"), leading directly to user notification fatigue and application abandonment. The Priority Detection engine is proven necessary to filter the signal from the noise at the UX layer.

## E. Experiment 5: Ablation of the APScheduler
*   **Modification:** The persistent `APScheduler` daemon (which polls the PostgreSQL database) is removed. It is replaced with standard, in-memory asynchronous sleep timers (e.g., `await asyncio.sleep(delta)`) triggered immediately upon task extraction.
*   **Measured Impact:**
    *   *Accuracy:* Extraction accuracy remains identical. 
    *   *System Reliability:* The system crash-fail rate spikes. If the FastAPI server is restarted or crashes, all pending in-memory timers are instantly destroyed, resulting in a 100% failure rate for scheduled notifications.
*   **Demonstrates:** This experiment proves the architectural necessity of database-backed temporal polling. By proving that in-memory timers are fatally fragile in production environments, it justifies the complexity and database I/O overhead introduced by the `APScheduler` indexing methodology.

## F. Experiment 6: Ablation of the Asynchronous Queue
*   **Modification:** The internal `Celery`/`Asyncio` message queue decoupling the Node.js ingestion layer from the FastAPI processing layer is removed. The pipeline is forced into a strictly synchronous execution model (i.e., Node.js waits for the LLM to finish before returning).
*   **Measured Impact:**
    *   *Latency:* Edge ingestion latency spikes from $O(1)$ (milliseconds) to the duration of the entire LLM API call (seconds).
    *   *Throughput/Recall:* During simulated viral traffic spikes (e.g., 50 messages/sec), the synchronous pipeline will violently bottleneck. The WebSocket connection will saturate, resulting in a massive spike in dropped messages and a corresponding catastrophic plunge in overall system Recall.
*   **Demonstrates:** This is the most critical infrastructural ablation. It mathematically proves that synchronous pipelines cannot survive the bursty, high-velocity nature of instant messaging networks. It validates the design decision to utilize an asynchronous WebHook (the HTTP 202 decoupling boundary) to preserve edge ingestion speed and ensure fault tolerance under duress.
