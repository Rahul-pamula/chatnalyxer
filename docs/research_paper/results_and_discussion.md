# V.B Results and Discussion

This subsection presents the empirical findings derived from the experimental evaluation of the Chatnalyxer system. The discussion analyzes the efficacy of the multi-modal AI pipeline, evaluating its semantic accuracy and computational performance across disparate data payloads. The numerical values within the tables represent aggregated metrics derived from the evaluation corpus.

### 1. Overall Accuracy and Pipeline Efficacy

The primary objective of the AI extraction pipeline is to achieve a high degree of Precision. In the context of a productivity application, a False Positive (hallucinating a task that does not exist or incorrectly identifying the deadline) is significantly more detrimental to user trust than a False Negative (failing to extract a valid task). 

The prompt engineering strategy, which heavily constrained the Google Gemini model using zero-shot directives and strict JSON schema validation, successfully induced a highly conservative extraction posture. Across the baseline text dataset, the system demonstrated exceptional Precision. When the LLM identified a task, it was overwhelmingly accurate. The Recall metric, while robust, was predictably lower than Precision. The system occasionally failed to extract tasks when the temporal language was excessively ambiguous or when the task description was fragmented across multiple conversational messages sent minutes apart. The requirement to parse the LLM output using `pydantic` models further enforced this conservative behavior; if the LLM output a valid task but formatted the date incorrectly, the validation layer rejected it, resulting in a recorded False Negative.

*(Placeholder: Table V.1 - Aggregate Accuracy Metrics for Baseline Text Payloads, detailing True Positives, False Positives, False Negatives, Precision, Recall, and F1 Score).*

### 2. System Performance and Latency

End-to-end latency—measured from the moment the WhatsApp WebSocket `messages.upsert` event is fired to the moment the structured task is committed to the PostgreSQL database—is the critical metric for evaluating the system's viability for real-time passive monitoring.

The Node.js ingestion layer introduced negligible latency, typically measured in tens of milliseconds. The performance bottleneck of the architecture is entirely localized within the external cloud API boundaries. For standard text messages, the latency is bounded by the network round-trip time to the Google Gemini API and the LLM's inference generation time. Given the relatively small size of the injected prompt and the constrained JSON output, the text pipeline operated comfortably within the parameters required for a seamless user experience.

*(Placeholder: Table V.2 - End-to-End Latency Profiles across Modalities, detailing Minimum, Maximum, Mean, and 95th Percentile processing times in milliseconds).*

### 3. OCR (Image) Results and Discussion

The integration of the Azure AI Vision API enabled the processing of photographic media, a crucial feature given the prevalence of shared whiteboard schedules and event flyers in student group chats. 

The evaluation revealed that while the Azure OCR engine is highly capable, extracting temporal tasks from images introduces significant challenges not present in plain text. The primary issue is spatial disorientation. When an image contains multiple columns of text (e.g., a photographed syllabus), naive OCR engines often return text out of logical sequence. The custom Spatial Flattening Algorithm implemented in Chatnalyxer mitigated this issue significantly by reconstructing horizontal reading lines based on bounding box coordinates. However, images with severe perspective skew, poor lighting, or highly illegible human handwriting still resulted in degraded raw text strings. When this degraded text was passed to the Gemini LLM, the downstream F1 score predictably dropped compared to the text baseline. The latency of this pipeline was also higher, accounting for the image compression, upload transmission, and OCR processing time prior to LLM evaluation.

### 4. Voice (Audio) Results and Discussion

Processing WhatsApp voice notes utilizing the Azure Cognitive Speech Automatic Speech Recognition (ASR) service demonstrated the most substantial variance in performance. 

The primary finding was that conversational speech is fundamentally different from typed text. Transcripts derived from voice notes were riddled with acoustic disfluencies (e.g., "um," "ah," false starts) and lacked accurate punctuation. The Gemini LLM proved remarkably adept at acting as a semantic smoothing layer; it successfully ignored the disfluencies and extracted the core temporal directive in the majority of cases. 

However, the pipeline struggled when the speaker possessed a heavy accent, when significant background noise was present, or when the speaker stuttered specifically while stating the temporal deadline (e.g., "It's due on the 14th... wait, no, the 15th"). In these instances, the ASR output was either incorrect or highly ambiguous, leading the LLM to calculate an incorrect ISO-8601 timestamp (a False Positive on the temporal axis). Furthermore, audio processing represented the highest latency ceiling in the system, as ASR processing time scales linearly with the duration of the audio clip.

### 5. PDF (Document) Results and Discussion

The processing of PDF documents via Azure Document Intelligence yielded highly bimodal results. 

When a PDF contained structured data, such as a well-formatted "Schedule of Classes" table, the Document Intelligence API excelled at identifying the tabular structure. The Chatnalyxer pipeline's algorithmic chunking strategy—which isolated the tables, converted them to Markdown, and pruned irrelevant boilerplate text—provided the LLM with highly dense, structured context. In these scenarios, extraction accuracy rivaled or exceeded the plain text baseline. 

Conversely, when a PDF consisted entirely of dense, unstructured prose (e.g., a ten-page project brief where the deadline is buried in a single sentence on page four), the chunking algorithm was less effective. Passing the entire document to the LLM risked exceeding the context window and diluting the temporal relevance of the prompt. While highly accurate on tabular data, the PDF pipeline requires the most intensive computational preprocessing of any modality in the system.

### 6. Overall Comparative Analysis

A comparative analysis of the multi-modal pipeline confirms the expected architectural trade-offs between extraction accuracy and computational latency. 

The **Text Pipeline** serves as the gold standard baseline, offering the highest F1 Score and the lowest latency, making it the most reliable conduit for task extraction. 
The **PDF Pipeline** offers comparable precision but requires significantly higher preprocessing overhead to serialize complex document structures. 
The **OCR Pipeline** experiences moderate degradation in both accuracy and speed, heavily dependent on the visual quality of the user-submitted photograph. 
The **Voice Pipeline** exhibits the lowest overall F1 score and the highest variable latency, restricted by the inherent noise of ASR transcriptions and acoustic disfluencies. 

Despite the degradation observed in the non-text modalities, the overall multi-modal architecture successfully expands the system's utility. By capturing deadlines embedded in media that would otherwise be entirely invisible to traditional text-based parsers, Chatnalyxer significantly mitigates the risk of information loss in heterogeneous communication environments, justifying the increased computational overhead associated with external AI service integration.

*(Placeholder: Table V.3 - Aggregate Comparison Matrix: Modality vs. F1 Score vs. Mean Latency).*
