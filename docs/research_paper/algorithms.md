# Chatnalyxer Pseudocode Algorithms

Below are the formalized pseudocode representations of the core Chatnalyxer operations, structured in the standard IEEE academic algorithm format.

### Algorithm 1: Overall Chat Processing Pipeline

```text
Algorithm 1: Overall Chat Processing Pipeline
Input: Incoming WebSocket payload P
Output: Boolean indicating successful extraction and scheduling
Require: Whitelisted_JIDs (Hash Map of authorized group IDs)

1:  procedure PROCESS_PAYLOAD(P)
2:      JID ← P.metadata.remoteJid
3:      if JID ∉ Whitelisted_JIDs then
4:          return false ▹ Drop unauthorized message
5:      end if
6:      
7:      if isDuplicate(P.messageId) then
8:          return false ▹ Drop duplicated stanza
9:      end if
10:     
11:     T_0 ← extractUnixTimestamp(P)
12:     
13:     if P.type is MEDIA then
14:         text_payload ← MULTIMODAL_PROCESSING(P.media)
15:     else
16:         text_payload ← sanitizeText(P.text)
17:     end if
18:     
19:     extracted_task ← TASK_EXTRACTION(text_payload, T_0)
20:     
21:     if extracted_task ≠ NULL then
22:         priority ← PRIORITY_DETECTION(extracted_task)
23:         extracted_task.priority ← priority
24:         STORE_IN_DATABASE(extracted_task)
25:         NOTIFICATION_SCHEDULING(extracted_task)
26:         return true
27:     end if
28:     
29:     return false
30: end procedure
```

---

### Algorithm 2: Task Extraction

```text
Algorithm 2: Task Extraction with Context Injection and Fallback
Input: text_payload (String), T_0 (UNIX Timestamp)
Output: Valid JSON task object or NULL
Require: MAX_RETRIES (Integer threshold)

1:  procedure TASK_EXTRACTION(text_payload, T_0)
2:      UTC_time ← convertToTimezoneAwareUTC(T_0)
3:      base_prompt ← constructEnvelope(SYSTEM_PERSONA, UTC_time, text_payload)
4:      attempt ← 0
5:      
6:      while attempt < MAX_RETRIES do
7:          if attempt == 0 then
8:              temp_setting ← 0.1 ▹ Greedy decoding
9:          else
10:             temp_setting ← 0.0 ▹ Absolute deterministic state for retries
11:         end if
12:         
13:         raw_response ← call_LLM_API(base_prompt, temperature=temp_setting)
14:         json_object ← parseStringToJson(raw_response)
15:         
16:         if validateSchema(json_object, TASK_SCHEMA) is TRUE then
17:             if json_object.T_due < UTC_time then
18:                 return NULL ▹ Temporal paradox, deadline in the past
19:             end if
20:             return json_object
21:         else
22:             base_prompt ← constructFallbackPrompt(base_prompt, raw_response)
23:             attempt ← attempt + 1
24:         end if
25:     end while
26:     
27:     logSanitizedError("Extraction Failed")
28:     return NULL
29: end procedure
```

---

### Algorithm 3: Priority Detection

```text
Algorithm 3: Priority Detection Heuristic
Input: task (JSON Object containing task_text, T_due, T_0)
Output: Priority String ("HIGH", "MEDIUM", "LOW")

1:  procedure PRIORITY_DETECTION(task)
2:      priority_score ← 0
3:      delta_t ← calculateDeltaHours(task.T_due, task.T_0)
4:      
5:      ▹ Temporal Weighting
6:      if delta_t ≤ 24 then
7:          priority_score ← priority_score + 50
8:      else if delta_t ≤ 72 then
9:          priority_score ← priority_score + 20
10:     end if
11:     
12:     ▹ Linguistic Weighting
13:     HIGH_KEYWORDS ← ["urgent", "exam", "final", "mandatory", "critical"]
14:     LOW_KEYWORDS ← ["optional", "if possible", "read", "reminder"]
15:     
16:     tokenized_text ← tokenize(task.task_text)
17:     
18:     for each word in tokenized_text do
19:         if word ∈ HIGH_KEYWORDS then
20:             priority_score ← priority_score + 30
21:         else if word ∈ LOW_KEYWORDS then
22:             priority_score ← priority_score - 20
23:         end if
24:     end for
25:     
26:     ▹ Classification
27:     if priority_score ≥ 60 then
28:         return "HIGH"
29:     else if priority_score ≥ 20 then
30:         return "MEDIUM"
31:     else
32:         return "LOW"
33:     end if
34: end procedure
```

---

### Algorithm 4: Notification Scheduling

```text
Algorithm 4: Notification Scheduling Daemon
Input: None (Executes continuously)
Output: Dispatches Push Notifications
Require: PostgreSQL Database connection

1:  procedure NOTIFICATION_SCHEDULING()
2:      loop every 60 seconds
3:          current_time ← getCurrentUTC()
4:          
5:          ▹ B-Tree Index Range Query
6:          active_tasks ← SELECT * FROM Tasks 
7:                         WHERE due_date BETWEEN current_time AND (current_time + 48 hours) 
8:                         AND is_completed = FALSE
9:          
10:         for each task in active_tasks do
11:             if task.priority == "HIGH" then
12:                 scheduleAlert(task, (task.due_date - 24h), type="PERSISTENT_ALARM")
13:                 scheduleAlert(task, (task.due_date - 2h), type="PERSISTENT_ALARM")
14:                 scheduleAlert(task, (task.due_date - 15m), type="PERSISTENT_ALARM")
15:             else if task.priority == "MEDIUM" then
16:                 scheduleAlert(task, (task.due_date - 12h), type="STANDARD_PUSH")
17:             else if task.priority == "LOW" then
18:                 scheduleAlert(task, (task.due_date - 2h), type="SILENT_BADGE")
19:             end if
20:         end for
21:     end loop
22: end procedure
```

---

### Algorithm 5: Multi-modal Processing

```text
Algorithm 5: Multi-modal Processing and Decryption
Input: M (Encrypted media payload containing URL, MIME type, and media_key)
Output: Unified flattened text string

1:  procedure MULTIMODAL_PROCESSING(M)
2:      raw_blob ← HTTPS_GET(M.url)
3:      decrypted_buffer ← AES_CBC_DECRYPT(raw_blob, M.media_key)
4:      
5:      if M.type == "IMAGE/JPEG" or M.type == "IMAGE/PNG" then
6:          bounding_boxes ← call_Azure_Vision_OCR(decrypted_buffer)
7:          unified_text ← executeSpatialFlattening(bounding_boxes)
8:          
9:      else if M.type == "APPLICATION/PDF" then
10:         document_elements ← call_Azure_Document_Intelligence(decrypted_buffer)
11:         tables ← extractTablesFromElements(document_elements)
12:         unified_text ← serializeToMarkdown(tables)
13:         
14:      else if M.type == "AUDIO/OGG" then
15:         wav_buffer ← transcodeAudio(decrypted_buffer, target_format="WAV_16KHZ")
16:         unified_text ← call_Azure_Cognitive_Speech(wav_buffer)
17:         
18:      else
19:         unified_text ← NULL
20:      end if
21:      
22:      secure_erase_buffer(decrypted_buffer) ▹ Enforce Ephemeral Processing
23:      return unified_text
24: end procedure
```
