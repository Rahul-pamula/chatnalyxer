import os

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

def append_to_file(filename, text):
    with open(os.path.join(base_dir, filename), "a") as f:
        f.write("\n" + text + "\n")

# System Architecture
sys_arch_fig = r"""
\begin{figure}[htbp]
    \centering
    \includegraphics[width=\linewidth]{figures/system_architecture.pdf}
    \caption{The Chatnalyxer high-level system architecture, illustrating the asynchronous decoupling boundary.}
    \label{fig:sys_arch}
\end{figure}
"""
append_to_file("system_architecture.tex", sys_arch_fig)

# AI Processing
ai_flow_fig = r"""
\begin{figure}[htbp]
    \centering
    \includegraphics[width=\linewidth]{figures/ai_processing_flowchart.pdf}
    \caption{The internal AI processing pipeline, depicting the multi-modal flattening process.}
    \label{fig:ai_flow}
\end{figure}
"""
append_to_file("ai_processing_pipeline.tex", ai_flow_fig)

# Database
er_diagram = r"""
\begin{figure}[htbp]
    \centering
    \includegraphics[width=\linewidth]{figures/er_diagram_specification.pdf}
    \caption{Entity-Relationship specification for the ephemeral PostgreSQL storage.}
    \label{fig:er_diagram}
\end{figure}
"""
append_to_file("database_layer.tex", er_diagram)

# WhatsApp Integration
sequence_diagram = r"""
\begin{figure}[htbp]
    \centering
    \includegraphics[width=\linewidth]{figures/uml_sequence_diagram.pdf}
    \caption{UML Sequence Diagram representing the E2EE WebHook edge dispatch.}
    \label{fig:uml_sequence}
\end{figure}
"""
append_to_file("whatsapp_integration.tex", sequence_diagram)

# Methodology (DFD)
dfd_diagram = r"""
\begin{figure}[htbp]
    \centering
    \includegraphics[width=\linewidth]{figures/dfd_specification.pdf}
    \caption{Data Flow Diagram illustrating the stateless extraction pipeline.}
    \label{fig:dfd}
\end{figure}
"""
append_to_file("methodology.tex", dfd_diagram)

print("Added figures to LaTeX files.")
