# XIII. IEEE ALGORITHM SPECIFICATIONS

This section formally defines the critical operational logic of the Chatnalyxer system. Each algorithm is presented using standard IEEE pseudocode conventions, accompanied by a rigorous computational complexity analysis, a theoretical explanation, and the underlying architectural design rationale.

---

### Algorithm 1: Message Monitoring and Edge Filtration

```text
Algorithm 1: Message Monitoring and Edge Filtration
Input: Incoming WebSocket event payload `E`
Output: Boolean indicating whether to process or drop `E`
Require: `whitelist_set` (In-memory Hash Set of authorized JIDs)

1:  procedure EDGE_MONITOR(E)
2:      if E.type ≠ "messages.upsert" then
3:          return false
4:      end if
5:      
6:      msg_metadata ← parseBinaryStanza(E.data)
7:      origin_jid ← msg_metadata.key.remoteJid
8:      
9:      if whitelist_set.contains(origin_jid) then
10:         enqueueToBackend(msg_metadata)
11:         return true
12:     else
13:         secureDrop(msg_metadata)
14:         return false
15:     end if
16: end procedure
```

**Complexity Analysis:** 
*   **Time Complexity:** $\mathcal{O}(1)$. The lookup operation (`whitelist_set.contains`) against a highly optimized Hash Set executes in constant time, regardless of the number of groups the user has whitelisted.
*   **Space Complexity:** $\mathcal{O}(W)$, where $W$ is the number of whitelisted JIDs stored in memory per user session.

**Explanation:** This algorithm intercepts the continuous stream of binary stanzas arriving over the WhatsApp WebSocket connection. It parses the minimal metadata required to extract the originating Jabber ID (JID). It then validates this JID against the user's explicit consent configuration. If unauthorized, the payload is immediately dropped from memory.

**Design Rationale:** This algorithm acts as the primary privacy firewall. By utilizing an $O(1)$ Hash Set rather than querying the database for authorization on every incoming message, the ingestion layer maintains near-zero latency and prevents the backend orchestration cluster from being overwhelmed by conversational noise originating from unauthorized personal chats.

---

### Algorithm 2: Duplicate Detection (Sliding Window)

```text
Algorithm 2: Edge Duplicate Detection
Input: `message_id` (String)
Output: Boolean indicating if message is unique
Require: `lru_cache` (Least Recently Used memory cache with 60-second TTL)

1:  procedure DETECT_DUPLICATE(message_id)
2:      if lru_cache.exists(message_id) then
3:          return true ▹ Duplicate detected
4:      else
5:          lru_cache.insert(message_id, current_time)
6:          return false ▹ Unique message
7:      end if
8: end procedure
```

**Complexity Analysis:**
*   **Time Complexity:** $\mathcal{O}(1)$. Inserting and querying an LRU cache operates in constant time.
*   **Space Complexity:** $\mathcal{O}(N)$, where $N$ is the maximum number of unique messages received across all active sessions within the 60-second Time-To-Live (TTL) window.

**Explanation:** Due to eventual consistency properties in distributed messaging networks, duplicate message stanzas are frequently broadcast. This algorithm intercepts the unique `message_id` and checks it against an LRU cache. If a collision occurs, the message is flagged as a duplicate.

**Design Rationale:** Processing duplicate payloads through the multi-modal pipeline and the Google Gemini LLM incurs significant financial API costs and degrades system throughput. Implementing a sliding window cache at the extreme edge of the network algorithmically guarantees that exactly one payload per unique message ever enters the intensive computational queue.

---

### Algorithm 3: Media Classification and Triage

```text
Algorithm 3: Media Classification Triage
Input: `payload` (Decrypted Internal Object)
Output: Flattened text string `T_unified`

1:  procedure MEDIA_TRIAGE(payload)
2:      mime_type ← extractMimeType(payload)
3:      
4:      switch mime_type do
5:          case "text/plain":
6:              return payload.raw_text
7:              
8:          case "image/jpeg" or "image/png":
9:              bounding_boxes ← Azure_Vision_OCR(payload.blob)
10:             return executeSpatialFlattening(bounding_boxes)
11:             
12:         case "audio/ogg":
13:             wav_buffer ← transcodeToWav(payload.blob)
14:             return Azure_Cognitive_Speech(wav_buffer)
15:             
16:         case "application/pdf":
17:             elements ← Azure_Doc_Intelligence(payload.blob)
18:             return executeMarkdownSerialization(elements)
19:             
20:         default:
21:             return NULL ▹ Unsupported format
22:      end switch
23: end procedure
```

**Complexity Analysis:**
*   **Time Complexity:** The routing logic is $\mathcal{O}(1)$. However, the overall execution time is bound by the specific external API called. For audio, it is $\mathcal{O}(L)$, where $L$ is the length of the audio file in seconds.
*   **Space Complexity:** $\mathcal{O}(S)$, where $S$ is the size in bytes of the decrypted media blob loaded into RAM for HTTP transmission.

**Explanation:** This algorithm inspects the MIME type of the normalized payload to route the binary data to the appropriate specialized Azure deep learning model. The objective of every branch within this `switch` statement is to normalize heterogeneous visual or acoustic data into a single, unified text string.

**Design Rationale:** A monolithic AI model capable of natively processing images, audio, PDFs, and text simultaneously is computationally prohibitive and prone to hallucination. By utilizing a deterministic triage algorithm to route specific modalities to specialized, narrow-domain preprocessors (like OCR or ASR), the system significantly increases the accuracy of the downstream LLM semantic extraction.

---

### Algorithm 4: Temporal Resolution and Date Mathematics

```text
Algorithm 4: LLM Temporal Resolution
Input: `T_0` (UNIX Epoch Integer), `conversational_text` (String)
Output: `T_due` (ISO-8601 UTC Timestamp) or NULL

1:  procedure RESOLVE_TEMPORAL(T_0, conversational_text)
2:      anchor_utc ← convertEpochToISO8601(T_0, "UTC")
3:      
4:      prompt_envelope ← "You are an extraction engine. \n" +
5:                        "The current absolute time is: " + anchor_utc + " (t=0).\n" +
6:                        "Evaluate this text and output the deadline in ISO-8601 relative to t=0: \n" +
7:                        conversational_text
8:                        
9:      llm_response ← call_Gemini_API(prompt_envelope)
10:     
11:     T_due ← parseJSON(llm_response).datetime
12:     
13:     if isValidISO8601(T_due) and (T_due > anchor_utc) then
14:         return T_due
15:     else
16:         return NULL ▹ Invalid format or temporal paradox (deadline in past)
17:     end if
18: end procedure
```

**Complexity Analysis:**
*   **Time Complexity:** The deterministic construction and validation are $\mathcal{O}(1)$. The LLM generation scales loosely as $\mathcal{O}(K)$, where $K$ is the number of generated output tokens.
*   **Space Complexity:** $\mathcal{O}(C)$, where $C$ is the character length of the constructed prompt payload.

**Explanation:** This algorithm constructs the contextual prompt required to solve relative temporal expressions. It calculates the absolute UTC representation of the moment the message was sent ($T_0$). By injecting $T_0$ into the LLM prompt, the model uses its zero-shot reasoning capabilities to mathematically calculate the future absolute date ($T_{due}$) based on relative conversational clues (e.g., "in 3 days"). It finally validates that the resulting date is not in the past.

**Design Rationale:** Traditional Natural Language Processing (NLP) parsers fail spectacularly when attempting to resolve deictic terms (like "tomorrow") without external context. Instead of building a highly complex, custom Python parsing tree to calculate date offsets, this algorithm leverages the emergent logical reasoning capabilities of modern LLMs, guided by strict chronometadata injection, to achieve superior temporal accuracy.

---

### Algorithm 5: Priority Classification Heuristic

```text
Algorithm 5: Priority Classification
Input: `T_due` (Timestamp), `T_0` (Timestamp), `task_title` (String)
Output: Priority String ("HIGH", "MEDIUM", "LOW")

1:  procedure CLASSIFY_PRIORITY(T_due, T_0, task_title)
2:      score ← 0
3:      delta_hours ← calculateDeltaHours(T_due, T_0)
4:      
5:      if delta_hours ≤ 24 then score ← score + 50
6:      else if delta_hours ≤ 72 then score ← score + 20
7:      
8:      tokens ← lowercaseAndTokenize(task_title)
9:      high_weight_words ← ["urgent", "exam", "final", "mandatory"]
10:     low_weight_words ← ["optional", "draft", "read"]
11:     
12:     for each word in tokens do
13:         if word ∈ high_weight_words then score ← score + 30
14:         if word ∈ low_weight_words then score ← score - 20
15:     end for
16:     
17:     if score ≥ 60 then return "HIGH"
18:     else if score ≥ 20 then return "MEDIUM"
19:     else return "LOW"
20: end procedure
```

**Complexity Analysis:**
*   **Time Complexity:** $\mathcal{O}(T)$, where $T$ is the number of word tokens in the `task_title`. The array lookups can be optimized to $\mathcal{O}(1)$ by converting the weighted word lists into Hash Sets.
*   **Space Complexity:** $\mathcal{O}(T)$ to hold the array of string tokens in memory.

**Explanation:** This algorithm calculates a discrete priority value by synthesizing two distinct vectors. The Temporal Vector assigns massive weight to tasks possessing deadlines within the immediate 24-48 hours. The Linguistic Vector tokenizes the extracted task title and adjusts the score based on the presence of heuristically defined urgency keywords.

**Design Rationale:** While an LLM is capable of guessing priority, relying exclusively on an LLM for classification introduces stochastic variance. By decoupling the priority calculation into a deterministic, programmatic algorithm utilizing defined heuristics, the system guarantees predictable, mathematically consistent priority assignments across all users.

---

### Algorithm 6: Task Extraction and Schema Validation (Retry Loop)

```text
Algorithm 6: Task Extraction with Fallback Prompting
Input: `prompt_envelope` (String)
Output: Validated JSON Task Object or NULL
Require: `MAX_RETRIES = 3`

1:  procedure EXTRACT_AND_VALIDATE(prompt_envelope)
2:      attempt ← 0
3:      current_prompt ← prompt_envelope
4:      
5:      while attempt < MAX_RETRIES do
6:          raw_llm_string ← call_LLM(current_prompt, temperature=0.1)
7:          
8:          try
9:              json_obj ← pydantic.parse_and_validate(raw_llm_string, TaskSchema)
10:             return json_obj
11:         catch ValidationError as err:
12:             current_prompt ← constructFallbackPrompt(current_prompt, raw_llm_string, err)
13:             attempt ← attempt + 1
14:         end try
15:     end while
16:     
17:     return NULL ▹ Exhausted retries
18: end procedure
```

**Complexity Analysis:**
*   **Time Complexity:** $\mathcal{O}(R \times I)$, where $R$ is the number of retries executed and $I$ is the latency of a single LLM inference call.
*   **Space Complexity:** $\mathcal{O}(P)$, where $P$ is the character length of the prompt string (which grows slightly with each retry as the error trace is appended).

**Explanation:** This algorithm executes the core LLM semantic extraction. Critically, it implements a fault-tolerance loop. If the LLM generates output that violates the strict JSON schema required by the downstream PostgreSQL database, the algorithm catches the parsing error, appends the specific error trace to the prompt, and forces the LLM to regenerate its response, autonomously attempting to correct the structural hallucination.

**Design Rationale:** LLMs are conversational by design and occasionally prepend boilerplate text (e.g., "Here is your JSON: { ... }") which crashes standard code parsers. Rather than dropping a potentially critical deadline due to a transient formatting anomaly, the Fallback Prompting loop provides the system with robust resilience, significantly increasing the overall extraction yield.

---

### Algorithm 7: Notification Scheduling (Temporal Polling)

```text
Algorithm 7: Notification Scheduling Daemon
Input: None (Executes continuously)
Output: Dispatches internal push payloads
Require: PostgreSQL database connection

1:  procedure TEMPORAL_POLLING_DAEMON()
2:      loop every 60 seconds
3:          current_utc ← getCurrentUTC()
4:          
5:          target_tasks ← SQL_QUERY(
6:              "SELECT * FROM Tasks 
7:               WHERE due_date BETWEEN $current_utc AND ($current_utc + INTERVAL '48 hours') 
8:               AND is_completed = FALSE"
9:          )
10:         
11:         for each task in target_tasks do
12:             if task.priority == "HIGH" then
13:                 dispatchAlert(task, target_time=(task.due_date - 24 hours))
14:                 dispatchAlert(task, target_time=(task.due_date - 2 hours))
15:             else if task.priority == "MEDIUM" then
16:                 dispatchAlert(task, target_time=(task.due_date - 12 hours))
17:             end if
18:         end for
19:     end loop
20: end procedure
```

**Complexity Analysis:**
*   **Time Complexity:** $\mathcal{O}(\log N + K)$ per polling cycle, where $N$ is the total number of tasks in the database and $K$ is the number of active tasks returned within the 48-hour temporal window, assuming a B-Tree index on the `due_date` column.
*   **Space Complexity:** $\mathcal{O}(K)$ to hold the array of returned task records in RAM during the dispatch loop.

**Explanation:** This algorithm represents an autonomous background daemon. Every 60 seconds, it calculates the current absolute time and queries the persistence layer for uncompleted tasks whose deadlines fall within an impending temporal threshold. It then executes a branching logic tree based on the `priority` classification, determining the frequency and urgency of the outbound push notifications.

**Design Rationale:** Scheduling thousands of dynamic timers directly in volatile Node.js or Python memory creates a massive systemic vulnerability; if the server crashes, the timers are lost, and deadlines are missed. By utilizing an autonomous polling algorithm against persistent, indexed database storage, the system ensures perfect fault tolerance. If the daemon crashes, it simply re-queries the database upon restart and immediately resumes dispatching alerts without any data loss.
