# XX. THREATS TO VALIDITY

While the experimental methodology and resulting empirical data rigorously support the efficacy of the Chatnalyxer architecture, it is imperative to acknowledge the systemic biases and constraints that may influence the interpretation of these results. In accordance with standard software engineering research practices, this section details the primary threats to validity and the corresponding mitigation strategies implemented during the experimental design.

## A. Internal Validity

Internal validity concerns the degree to which the experimental design mitigates confounding variables that could artificially skew the observed causal relationships. 

**Threat:** The primary internal threat to this research is the system's architectural reliance on proprietary, black-box external APIs (Google Gemini and Azure Cognitive Services). Because the underlying neural network weights of these SaaS models are controlled by third parties, unannounced "shadow updates" or network degradation could introduce severe inconsistencies in both extraction accuracy and end-to-end latency during longitudinal testing. 
**Mitigation Strategy:** To isolate the system from stochastic variance and enforce deterministic behavior, the LLM inference parameters were strictly constrained. The `temperature` parameter was locked to $0.0$, and `top_k` / `top_p` sampling was disabled. Furthermore, the experiments were executed against a hardcoded, version-locked model endpoint (e.g., `gemini-1.5-pro-001`) rather than a rolling "latest" alias, mathematically ensuring that the ablation studies measured the effectiveness of the prompt engineering, not a spontaneous shift in the foundational model's weights.

## B. External Validity

External validity evaluates the generalizability of the empirical findings beyond the specific constraints of the experimental setup.

**Threat:** The *Chatnalyxer Evaluation Corpus (CEC-10K)* was heavily sampled from academic and university-level demographic cohorts. Consequently, the dataset is densely populated with specific vernacular, slang (e.g., "midterms", "canvas"), and organizational patterns unique to higher education. There is a risk that the zero-shot extraction accuracy may degrade if the system is deployed within a highly specialized, disparate domain, such as a corporate legal firm or a medical scheduling environment, which possess entirely different lexical structures.
**Mitigation Strategy:** While the current validation is constrained to the academic demographic, the underlying architecture of Chatnalyxer is explicitly domain-agnostic. The prompt envelope does not contain domain-specific hardcoding. Future iterations of this research will mitigate external threats by expanding the CEC dataset to include multi-domain professional telemetry, thereby proving the generalized viability of the temporal anchoring strategy across diverse industries.

## C. Construct Validity

Construct validity assesses whether the chosen evaluation metrics accurately measure the theoretical constructs they are intended to represent.

**Threat:** The reliance on the F1 Score (Precision and Recall) to define system "success" presents a construct threat. In traditional Information Retrieval, a high F1 score indicates perfect extraction. However, in the domain of personal productivity, perfectly extracting 100 trivial tasks (e.g., "read chapter 2") and bombarding the user with 100 push notifications will result in severe alert fatigue, leading to application abandonment. Therefore, a high F1 score does not automatically equate to high user satisfaction or systemic utility.
**Mitigation Strategy:** To address this theoretical gap, the experimental design introduced the Priority Classification heuristic and the Notification Activation Score. By measuring not just the *accuracy* of the extraction, but the *relevance* and *urgency* of the resulting alert dispatch, the methodology ensures that the evaluation metrics align closely with the ultimate construct of reducing cognitive overload for the end-user.

## D. Conclusion Validity

Conclusion validity concerns the statistical rigor utilized to determine whether the relationships observed in the data are statistically significant rather than artifacts of random noise.

**Threat:** The asynchronous ingestion layer was stress-tested utilizing simulated Apache JMeter traffic spikes. There is a risk that continuous synthetic load generation does not accurately mirror the highly bursty, Poisson-distributed nature of organic human messaging networks, potentially skewing the latency and queue depth results. Furthermore, the stochastic nature of Large Language Models inherently introduces minor variances across extraction runs.
**Mitigation Strategy:** To prevent the misinterpretation of random variance as architectural success, rigorous statistical boundaries were enforced. The comparison between the baseline model and the temporally-anchored model (Experiment 1) was evaluated using a Paired T-Test. The resulting improvements were only accepted into the findings because they achieved a strict significance threshold ($p\text{-value} < 0.05$). Furthermore, JMeter tests were configured to utilize randomized Gaussian timers rather than static intervals, better simulating the chaotic cadence of organic network traffic.
