# IV. METHODOLOGY

This section systematically details the methodological framework and the specific algorithmic implementations underpinning the Chatnalyxer system. The methodology is structured to elucidate the precise sequence of operations required to transform unstructured, multi-modal, and highly informal conversational data into structured, actionable organizational intelligence, while simultaneously preserving user privacy and ensuring system fault tolerance.

## A. Data Collection and Dataset Engineering

The foundational step in developing and refining the Chatnalyxer extraction engine involved the rigorous collection and engineering of training and evaluation datasets. Given the strict privacy constraints of the system, raw user data from live, organic WhatsApp groups could not be indiscriminately harvested for model training. Therefore, a dual-pronged methodology was employed, utilizing both controlled, consented real-world data and highly engineered synthetic datasets.

**Step 1: Consented Organic Data Harvesting.** A limited cohort of beta testers explicitly consented to have a subset of their academic group chats monitored for a defined two-week period. The Node.js ingestion layer was modified to temporarily log the decrypted payloads of these specific, whitelisted `remoteJid` groups into an encrypted, isolated repository. This yielded a corpus of approximately 5,000 raw conversational messages, characterized by extreme informality, heavy use of slang, multi-lingual code-switching, and inherent conversational fragmentation. 

**Step 2: Synthetic Data Generation and Augmentation.** To augment the organic dataset and train the system against edge cases not naturally observed during the beta period, a synthetic data generation pipeline was constructed. We utilized an isolated LLM instance to generate simulated group chat transcripts based on predefined academic scenarios (e.g., "Group project coordination," "Exam study session," "Syllabus changes"). 

**Step 3: Noise Injection Algorithm.** The synthetic data was computationally too "clean." To mirror the reality of instant messaging, a Noise Injection Algorithm was applied to the synthetic corpus. This algorithm programmatically iterated through the synthetic text, executing three primary transformations: 
1. *Typographical Perturbation*: Randomly swapping adjacent characters or omitting vowels based on standard QWERTY keyboard proximity matrices to simulate rapid, error-prone typing (e.g., transforming "tomorrow" to "tmrw" or "tomorow").
2. *Punctuation Eradication*: Systematically stripping terminal punctuation and capitalization to simulate casual text flows.
3. *Disfluency Insertion*: Randomly injecting conversational fillers ("um," "like," "wait no") specifically into simulated voice note transcripts to mimic acoustic hesitation.

This combined dataset of organic and augmented synthetic messages, annotated with ground-truth temporal events, formed the baseline for iteratively refining the subsequent prompt engineering and extraction algorithms.

## B. Message Flow and Ingestion Algorithms

The operational lifecycle of data within Chatnalyxer follows a strict, unidirectional Message Flow algorithm designed to maximize ingestion speed while guaranteeing edge-level privacy enforcement. This flow begins the millisecond a message is broadcast across the WhatsApp WebSocket network.

**Step 1: Cryptographic Interception and Decryption.** The Node.js `Baileys` socket listener detects an incoming `messages.upsert` binary stanza. The system applies the user's stored session keys to decrypt the Signal protocol payload in memory, yielding a raw, highly nested JSON object.

**Step 2: Edge-Filtering (Whitelist Validation).** Before any further processing occurs, the system executes the Edge-Filtering Algorithm. The algorithm extracts the `remoteJid` string from the decrypted JSON metadata. It performs an O(1) temporal complexity lookup against an in-memory Hash Map containing the user's explicitly authorized group IDs. 
*Algorithm logic:* `if (authorizedJids.has(message.remoteJid)) { proceed(); } else { dropPayloadAndTriggerGarbageCollection(); }`
This step mathematically guarantees that unauthorized personal chats are never parsed or transmitted.

**Step 3: Deduplication and Normalization.** Due to the eventual consistency of distributed networks, duplicate stanzas occasionally arrive. The system extracts the unique `messageId` and checks it against a sliding-window cache (containing IDs from the last 60 seconds). If a collision is detected, the message is dropped. If unique, the message enters the Normalization Phase. Here, a recursive parsing algorithm traverses the nested WhatsApp schema (which differs drastically depending on whether the message is a text, image, or document) and flattines the critical metadata (Sender ID, Group ID, UNIX Timestamp, MIME Type) into a standardized Chatnalyxer Internal Payload (CIP).

**Step 4: Asynchronous WebHook Transmission.** The normalized CIP, alongside the raw text or binary media buffer, is packaged into a `multipart/form-data` object. A non-blocking asynchronous HTTP POST request transmits this object to the internal Python FastAPI backend. The Node.js event loop immediately returns to listening for new socket frames, ensuring zero ingestion latency regardless of downstream AI processing delays.

## C. Multi-modal Processing Algorithms

Upon arrival at the FastAPI backend, the CIP enters the Multi-modal Processing layer. The objective of this phase is to execute modality-specific transformations to reduce heterogeneous payloads (images, PDFs, audio) into a single, unified, flat text string suitable for LLM consumption.

**Step 1: Modality Triage.** A routing algorithm inspects the MIME type of the CIP. Payloads identified as `text/plain` bypass this layer entirely. Images (`image/jpeg`, `image/png`) are routed to the OCR Pipeline. Documents (`application/pdf`) are routed to the Document Pipeline. Audio (`audio/ogg`) is routed to the Voice Pipeline.

**Step 2: Spatial Flattening Algorithm (OCR Pipeline).** When an image is processed by the Azure Vision API, the API returns an array of bounding boxes, each containing a word string and its four X/Y corner coordinates. Translating this 2D visual data into a logical 1D text string requires a custom Spatial Flattening Algorithm. 
1. The algorithm first calculates the average vertical height of all bounding boxes to determine a baseline "line height."
2. It sorts the bounding boxes primarily by their Y-coordinate (top-to-bottom).
3. If two bounding boxes possess Y-coordinates within a threshold of 0.5 * `line_height`, the algorithm classifies them as residing on the same horizontal line.
4. It then sorts the bounding boxes on that specific line by their X-coordinate (left-to-right).
5. Finally, it concatenates the strings, inserting space characters between words on the same line, and newline characters (`\n`) when transitioning to a new Y-coordinate grouping. This preserves the logical visual reading order of the original image (e.g., ensuring a two-column list is read coherently rather than jumbled together).

**Step 3: Structural Chunking Algorithm (PDF Pipeline).** Unlike images, PDFs contain deep structural metadata. The Azure Document Intelligence API returns identified elements such as `paragraphs`, `headers`, and `tables`. The Structural Chunking Algorithm parses this output to maximize token efficiency. It prioritizes data structures labeled as `tables`, executing a serialization loop that converts the 2D array of table cells into a linear Markdown representation (e.g., formatting rows separated by pipe `|` characters). Boilerplate text (headers, footers) is aggressively pruned, synthesizing a multi-page syllabus down to a few hundred tokens containing only the critical scheduling data.

**Step 4: Acoustic Transcoding and Smoothing (Voice Pipeline).** Audio payloads arrive as highly compressed `.ogg` files. The transcoding algorithm buffers the file into memory and utilizes the `ffmpeg` library to decode and resample the audio to a 16kHz, mono-channel `.wav` format, optimizing it for the Azure Cognitive Speech API. The resulting transcription is passed forward, relying on the downstream LLM to execute semantic smoothing over the inherent acoustic disfluencies and lack of punctuation.

## D. AI Decision Making and Prompt Engineering

The unified text string, regardless of its original modality, is subsequently fed into the AI Decision Making core, powered by the Google Gemini Large Language Model. The methodology here eschews fine-tuning in favor of highly constrained, zero-shot Prompt Engineering.

**Step 1: Contextual Envelope Construction.** The algorithm constructs a massive string payload consisting of three concatenated blocks. 
- *Block A (System Persona)*: Sets absolute behavioral constraints, demanding deterministic behavior and forbidding conversational output.
- *Block B (Chronometadata)*: Injects the precise message timestamp (detailed extensively in Section IV.E).
- *Block C (The Unified Text)*: The actual content extracted from the message or media.

**Step 2: Binary Classification Sub-task.** The first logical operation the LLM is instructed to perform is binary classification: Does this text contain an actionable organizational task, deadline, or event? (True/False). The prompt provides semantic boundaries, instructing the model to ignore hypothetical discussions (e.g., "What if we make the deadline Friday?") or emotional expressions regarding existing tasks. If the internal classification yields False, the model is instructed to return `null`, terminating the processing loop instantly and saving computational resources.

**Step 3: Entity Extraction and Priority Scoring.** If the classification yields True, the model proceeds to extraction. It isolates the core task description, condensing rambling sentences into concise titles. Concurrently, it calculates a Priority Score (HIGH, MEDIUM, or LOW). This calculation is based on a multi-variable heuristic instructed within the prompt:
- *Variable 1 (Linguistic Urgency)*: The presence of highly weighted keywords (e.g., "final," "urgent," "mandatory").
- *Variable 2 (Temporal Delta)*: The mathematical difference between the injected current time and the extracted deadline. Smaller deltas exponentially increase the priority weight.
The LLM synthesizes these variables to output a final priority string.

**Step 4: JSON Schema Enforcement.** The absolute final directive in the prompt mandates that the extracted entities (Task Title, ISO-8601 Datetime, and Priority String) must be formatted exactly according to a provided JSON schema structure. 

## E. Temporal Resolution and Chronometadata Injection

The resolution of relative temporal expressions (e.g., "next Tuesday," "tomorrow afternoon") represents the most mathematically complex algorithmic challenge in conversational extraction. A traditional Natural Language Processing parser cannot resolve a relative term without an absolute reference point. 

**Step 1: Chronometadata Capture.** When the Node.js layer intercepts the message, it extracts the precise UNIX epoch timestamp embedded in the WhatsApp protocol metadata (representing the exact millisecond the message hit the WhatsApp server). 

**Step 2: UTC Conversion Algorithm.** The FastAPI backend receives this UNIX integer and executes a timezone conversion algorithm. Because users may travel across timezones, relying on the server's local time is perilous. The system converts the UNIX integer into a strict, timezone-aware UTC string (e.g., `2026-07-07T09:00:00Z`). 

**Step 3: Contextual Injection.** This precise UTC string is dynamically injected into the Prompt Envelope (Block B) immediately before LLM transmission. The prompt explicitly commands: *"The current absolute time is [UTC_STRING]. You MUST use this exact time as t=0 to calculate any relative dates."*

**Step 4: LLM Temporal Arithmetic.** By possessing the absolute `t=0` reference, the LLM utilizes its zero-shot reasoning capabilities to perform date math. If the message reads, "Submit the code in three days," and the injected `t=0` is `2026-07-07T09:00:00Z`, the LLM calculates $t_{due} = t_0 + (3 \times 24 \text{ hours})$, outputting `2026-07-10T09:00:00Z`. It effortlessly handles complex conversational nuances, understanding that "tonight" implies a time generally between 18:00 and 23:59 on the same calendar day as $t_0$.

**Step 5: Post-Processing Validation.** After the LLM returns the structured JSON, the pipeline executes a sanity-check validation algorithm. It parses the returned ISO-8601 string and compares it against the original $t_0$. If $t_{due} < t_0$ (i.e., the extracted deadline is in the past), the system flags a temporal paradox error, triggering the Error Recovery mechanisms, as it is logically impossible for a new actionable deadline to exist in the past.

## F. Notification Scheduling Algorithms

The translation of extracted temporal data into proactive user engagement is managed by the Notification Scheduling Service, driven by the APScheduler library. This service relies on highly optimized algorithmic polling rather than continuous event loops.

**Step 1: B-Tree Polling Algorithm.** An asynchronous daemon executes a parameterized SQL query against the PostgreSQL database every 60 seconds. The query leverages the composite B-Tree index on the `due_date` column. 
*Algorithm logic:* `SELECT task_id, user_id, priority FROM Tasks WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours' AND is_completed = false;`
This logarithmic time-complexity search ensures the database is not overwhelmed by continuous full-table scans.

**Step 2: Priority-Based Branching.** For every task returned by the polling query, the service executes a branching algorithm based on the AI-derived `priority_level`.
- *If Priority == LOW*: The algorithm schedules a single, silent push notification precisely 2 hours before the `due_date`, designed merely to update the application badge icon without interrupting the user.
- *If Priority == MEDIUM*: The algorithm schedules a standard push notification 12 hours before the `due_date`.
- *If Priority == HIGH*: The algorithm generates a cascading schedule array: $[t_{due} - 24h, t_{due} - 2h, t_{due} - 15m]$. It interfaces with the Notification Table in the database, inserting three distinct alert records. These payloads are specifically flagged with OS-level high-priority markers, instructing the mobile device to trigger an audible alarm, overriding standard 'Do Not Disturb' settings if OS permissions allow.

**Step 3: Payload Dispatch and Edge Timezone Conversion.** When the APScheduler triggers a specific notification job, it constructs a JSON payload containing the task title and the deep-link URI. The push notification is transmitted via the Expo Push API. Crucially, the system does not attempt to convert the UTC timestamp into the user's local timezone on the server. Because mobile users frequently cross timezones, server-side localization is prone to error. Instead, the backend sends the absolute UTC string in the payload. The React Native mobile application intercepts the notification and utilizes local OS libraries to dynamically convert the UTC timestamp into the user's current device timezone at the exact moment of rendering, ensuring perfect temporal accuracy regardless of geographical displacement.

## G. Privacy Preservation and Ephemeral Processing

Given the highly sensitive nature of personal instant messaging, traditional data retention methodologies represent an unacceptable privacy risk. Chatnalyxer is engineered utilizing an Ephemeral Processing Algorithm, guaranteeing total data minimization.

**Step 1: Volatile Memory Confinement.** From the moment a message is decrypted by the Node.js ingestion layer to the moment it is analyzed by the FastAPI LLM pipeline, the raw conversational text and the binary media blobs are confined strictly to volatile Random Access Memory (RAM). The system architecture explicitly forbids the writing of unencrypted payloads to any physical disk or persistent caching layer (such as Redis).

**Step 2: Immediate Garbage Collection Execution.** The lifecycle of the raw data is inextricably linked to the LLM extraction request. The moment the Gemini API returns a successful HTTP 200 response containing the structured JSON task data, a synchronous command is issued to explicitly `del` the variables holding the raw message string and the decoded media buffers within the Python environment. This action immediately drops the reference count of the objects to zero, aggressively triggering the Python Garbage Collector to overwrite the memory addresses, ensuring the raw conversation ceases to exist within milliseconds of extraction.

**Step 3: Telemetry Sanitization Algorithm.** While extensive logging is required for system monitoring, logging raw user payloads constitutes a severe data breach. The application utilizes a custom middleware algorithm that intercepts all output bound for `stdout`, `stderr`, or file-based logs. This algorithm utilizes regular expressions and object key filtering to actively scrub any string matching the payload schema, replacing it with a `[REDACTED_PAYLOAD]` flag. Thus, if a critical system crash occurs, the administrative logs will display the stack trace and the error code, but the sensitive contents of the user's WhatsApp message remain entirely opaque.

## H. Error Recovery and Fault Tolerance

Distributed systems interfacing with multiple external cloud APIs are inherently prone to transient failures. The Chatnalyxer methodology incorporates robust fault-tolerance algorithms to ensure system resilience and prevent data loss.

**Step 1: API Throttling and Exponential Backoff.** High-velocity group chats can generate traffic spikes that exceed the rate limits of the Azure AI or Google Gemini APIs, resulting in HTTP 429 (Too Many Requests) errors. When the pipeline encounters a 429 response, it initiates an Exponential Backoff Algorithm. 
*Algorithm logic:* The current payload is paused. The thread sleeps for $T_{wait} = Base \times 2^N$ seconds, where $N$ is the number of previous failed attempts, plus a random jitter variable to prevent thundering herd problems. This algorithm ensures the system gracefully absorbs traffic spikes by temporarily slowing down processing, rather than crashing or dropping tasks.

**Step 2: LLM Hallucination Retry Loop.** If the Gemini model returns a response that fails the rigorous `pydantic` JSON schema validation (e.g., generating malformed JSON or prepending conversational text), the system executes a specialized Retry Loop. 
1. The malformed output is discarded.
2. The prompt is programmatically reformulated. A strict warning clause is prepended: *"SYSTEM ERROR: Your previous output was invalid. You MUST output ONLY valid JSON format."*
3. The API request parameters are mutated. Specifically, the model's `temperature` variable (which controls creativity/randomness) is programmatically reduced from its default to near `0.0`, forcing the model into a highly deterministic, predictable state.
4. The API call is re-executed. If validation fails after three consecutive retry loops, the payload is ultimately discarded to prevent infinite loops, and a sanitized telemetry error is logged.

**Step 3: WebSocket Reconnection State Machine.** If the underlying TCP connection to the WhatsApp servers is severed due to network instability, the Node.js ingestion layer utilizes a robust State Machine algorithm to recover. It instantly detects the `connection.close` event. It retrieves the serialized cryptographic session state from the PostgreSQL database, injects it into a fresh Baileys instance, and initiates a reconnection sequence with a linear backoff delay. Because the session state was persistently saved, the system can autonomously re-establish the authenticated connection and resume listening for messages without requiring any manual intervention from the user, ensuring continuous passive monitoring.
