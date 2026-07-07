# XVIII. PERFORMANCE EVALUATION METHODOLOGY

To empirically validate the production-readiness of the Chatnalyxer architecture, a rigorous performance evaluation methodology was designed. This framework quantifies the system's operational boundaries across three primary vectors: Computational Efficiency, Semantic Accuracy, and Systemic Scalability. The following sections detail the specific metrics evaluated, the academic rationale for their inclusion, and recommendations for their visual presentation in publication.

## A. Computational Efficiency Metrics

The viability of a passive monitoring system is intrinsically linked to its ability to operate silently without bottlenecking internal networks or monopolizing server hardware.

**1. Latency (End-to-End)**
*   **Definition:** The absolute temporal delta between the WhatsApp WebSocket intercept (`messages.upsert`) and the successful SQL `INSERT` of the extracted task metadata.
*   **Importance:** High latency queues indicate a saturated worker pool. If processing latency exceeds the influx rate of new messages, the internal queue will eventually overflow, resulting in dropped payloads and missed deadlines.

**2. Response Time**
*   **Definition:** The round-trip time (RTT) for synchronous operations, specifically evaluating the time required for the FastAPI orchestrator to return an HTTP 202 Accepted status back to the Node.js ingestion layer.
*   **Importance:** This is the critical decoupling metric. If the Response Time spikes, the Node.js event loop blocks, potentially causing the WhatsApp server to sever the WSS connection due to presumed client unresponsiveness.

**3. CPU and Memory Usage**
*   **Definition:** The percentage of CPU cycles and Megabytes (MB) of RAM consumed by the containerized microservices (Node.js and FastAPI), monitored via Docker cgroups.
*   **Importance:** Quantifying these metrics is essential to determining the economic viability of the platform. A highly efficient architecture requires less horizontal scaling, directly lowering cloud computing costs.

**4. GPU Utilization**
*   **Definition:** The percentage of CUDA cores and VRAM capacity consumed during AI processing.
*   **Importance:** In the current cloud-reliant architecture, local GPU utilization is technically 0%, as inference is offloaded to Azure and Google. However, for future work evaluating Edge AI deployments utilizing local Small Language Models (SLMs), profiling VRAM consumption is critical to proving whether the system can run on consumer-grade mobile hardware (e.g., Apple Neural Engine or Snapdragon NPUs) without causing thermal throttling or severe battery drain.

## B. Semantic Accuracy Metrics

Accuracy evaluation in a multi-modal pipeline must be stratified to identify exactly which node is responsible for data degradation.

**5. OCR Accuracy**
*   **Definition:** Measured utilizing the Character Error Rate (CER), mathematically derived from the Levenshtein distance between the Azure Vision OCR output and the human-transcribed ground truth.
*   **Importance:** High CER indicates severe spatial disorientation. If the OCR engine severely garbles text, the downstream LLM cannot possibly extract a valid deadline.

**6. Speech Accuracy**
*   **Definition:** Measured utilizing the Word Error Rate (WER) against the Azure Cognitive Speech transcripts of the synthesized voice note corpus.
*   **Importance:** WER exposes the limitations of acoustic processing. Identifying whether errors stem from background noise or specific accents helps researchers determine if acoustic preprocessing filters (e.g., active noise cancellation algorithms) must be added to the pipeline.

**7. LLM Accuracy (Formatting)**
*   **Definition:** The ratio of Gemini outputs that pass the rigid `Pydantic` JSON schema validation on the first attempt without triggering the fallback retry loop.
*   **Importance:** High LLM Accuracy proves the efficacy of the prompt engineering strategy. Low accuracy forces retry loops, exponentially increasing API costs and latency.

**8. Task Extraction Accuracy (Semantic)**
*   **Definition:** The ultimate measure of systemic success, calculated via Precision, Recall, and F1 Score (as detailed in Section XIV).
*   **Importance:** This metric synthesizes the entire pipeline. It proves whether the system fundamentally achieves its primary objective: accurately finding deadlines without hallucinating false positives.

## C. Systemic Flow Metrics

**9. Notification Delay**
*   **Definition:** The temporal delta between the mathematically calculated exact trigger time (e.g., exactly 24 hours before $T_{due}$) and the moment the Expo Push API acknowledges delivery.
*   **Importance:** A severe notification delay renders the system useless. If a 15-minute warning alert takes 20 minutes to process through the background daemon, the user will miss the deadline. This metric validates the efficiency of the APScheduler's B-Tree indexing.

**10. Scalability (Throughput)**
*   **Definition:** Measured in Requests Per Second (RPS) processed through the ingestion WebHook during simulated viral traffic spikes (e.g., generated via Apache JMeter).
*   **Importance:** Scalability proves fault tolerance. It validates the Exponential Backoff algorithms and the resilience of the async worker queue under duress.

---

## D. Recommended Visualizations for Publication

To effectively communicate these complex metrics in an IEEE manuscript, the following specific visualizations are recommended:

*   **Figure A: Latency Distribution by Modality (Box-and-Whisker Plot)**
    *   *Rationale:* A box plot effectively displays the variance in latency. The X-axis should list the four modalities (Text, Image, Audio, PDF), and the Y-axis should be Latency (seconds). This will vividly illustrate that while Text latency is tightly clustered around ~1.5s, Audio latency possesses a massive interquartile range due to varying audio clip durations.
*   **Figure B: System Scaling Dynamics (Dual-Axis Line Graph)**
    *   *Rationale:* The X-axis represents Simulated Concurrent Messages Per Second (10 to 500 RPS). The Left Y-axis plots System Latency (ms), and the Right Y-axis plots Node.js RAM usage (MB). This proves the elasticity of the ingestion layer; ideally, the RAM usage line remains relatively flat even as throughput spikes.
*   **Table A: Multi-modal Accuracy Degradation Matrix**
    *   *Rationale:* A comprehensive table comparing the base modalities against OCR CER, ASR WER, and final F1 Extraction Scores. This mathematically proves the hypothesis that upstream preprocessing noise directly correlates to degraded downstream semantic extraction.
*   **Figure C: Priority Classification Heatmap (Confusion Matrix)**
    *   *Rationale:* A $3 \times 3$ grid mapping Human-Annotated Priority (Ground Truth) against the LLM's Heuristic Priority. This visualizes whether the priority heuristic leans toward over-classification (marking low-priority events as urgent) or under-classification.
