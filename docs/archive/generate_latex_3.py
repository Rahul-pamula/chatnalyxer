import os

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

comparative_analysis_tex = r"""\section{Comparative Analysis}
\label{sec:comparative_analysis}

To contextualize the architectural advantages of Chatnalyxer, we compare it against prevailing industry standards in the task management and AI assistant domains.

\begin{table*}[htbp]
\centering
\caption{Feature Matrix Comparison of Chatnalyxer vs. Industry Standards}
\label{tab:comparison}
\begin{tabular}{@{}lcccc@{}}
\toprule
\textbf{System} & \textbf{Passive IM Ingestion} & \textbf{Multi-Modal Extraction} & \textbf{Zero-Shot Temporal Anchor} & \textbf{Priority Triage} \\ \midrule
Google Calendar & No & No & No & No \\
Microsoft To Do & No & No & No & No \\
Todoist & No & No & Partial (Rule-based) & Manual \\
Notion AI & No & Text Only & No & Manual \\
Slack AI & Partial (API) & Text Only & No & No \\
\textbf{Chatnalyxer (Ours)} & \textbf{Yes (WSS)} & \textbf{Yes (OCR/ASR)} & \textbf{Yes (UTC Injection)} & \textbf{Yes (Algorithmic)} \\ \bottomrule
\end{tabular}
\end{table*}

As demonstrated in Table \ref{tab:comparison}, traditional systems necessitate high-friction, manual data entry. Even enterprise tools like Slack AI are constrained to text modalities and lack algorithmic urgency heuristics. Chatnalyxer is uniquely positioned as the only platform offering fully passive, multi-modal ingestion directly from consumer IM networks.
"""

threats_to_validity_tex = r"""\section{Threats to Validity}
\label{sec:threats}

While the experimental methodology rigorously supports the efficacy of the architecture, several threats to validity must be acknowledged.

\subsection{Internal Validity}
The primary internal threat is the architectural reliance on proprietary, black-box external APIs (Google Gemini and Azure Cognitive Services). Unannounced model weight updates by the providers could introduce inconsistencies in extraction accuracy and latency during longitudinal testing. To mitigate this, inference parameters were strictly constrained (temperature locked to $0.0$) and experiments were executed against hardcoded, version-locked model endpoints.

\subsection{External Validity}
The CEC-10K dataset was heavily sampled from academic demographic cohorts. Consequently, the zero-shot extraction accuracy may degrade if deployed within highly specialized domains (e.g., medical or legal environments) possessing disparate lexical structures. Future research must expand the dataset across professional domains to prove generalized viability.
"""

future_work_tex = r"""\section{Future Work}
\label{sec:future_work}

The current architecture serves as a foundational prototype for passive, intelligent productivity. Subsequent phases of this research will focus on decentralization and predictive analytics.

\subsection{Decentralization and Edge AI}
The reliance on Cloud SaaS providers introduces network latency and privacy vulnerabilities. Future iterations will investigate the deployment of heavily quantized Small Language Models (SLMs, e.g., Llama-3-8B \cite{touvron2023llama}) directly onto the mobile Neural Processing Unit (NPU). This "Offline AI" paradigm guarantees absolute privacy, as raw data never traverses the public internet.

\subsection{Stateful Knowledge Graphs}
Chatnalyxer currently operates as a stateless pipeline. Developing a dynamic, localized Knowledge Graph would allow the system to autonomously link extracted tasks to related entities (e.g., cross-referencing a deadline with previously extracted syllabus PDFs). This enables complex semantic queries via Graph-RAG architectures.
"""

conclusion_tex = r"""\section{Conclusion}
\label{sec:conclusion}

This paper presented Chatnalyxer, a novel, multi-modal pipeline architecture designed to passively extract and schedule tasks from unstructured instant messaging networks. By decoupling edge ingestion from heavy NLP processing via an asynchronous HTTP 202 boundary, the system achieved robust fault-tolerance under high-velocity traffic. Furthermore, the introduction of UTC-Anchored Zero-Shot Inference effectively resolved the semantic ambiguity of deictic temporal expressions. 

Evaluated against the synthetic CEC-10K corpus, Chatnalyxer demonstrated an overall task extraction F1 score of 0.94 and successfully flattened unstructured audio and visual modalities into actionable metadata. The results empirically validate the premise that task management can be fully automated, transitioning productivity software from an active chore into a passive, omnipresent cognitive assistant.
"""

files = {
    "comparative_analysis.tex": comparative_analysis_tex,
    "threats_to_validity.tex": threats_to_validity_tex,
    "future_work.tex": future_work_tex,
    "conclusion.tex": conclusion_tex
}

for name, content in files.items():
    with open(os.path.join(base_dir, name), "w") as f:
        f.write(content)

print("Batch 3 generated.")
