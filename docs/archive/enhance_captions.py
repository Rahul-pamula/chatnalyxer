import os
import glob

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

caption_replacements = {
    "system_architecture.tex": (
        r"\caption{The Chatnalyxer high-level system architecture, illustrating the asynchronous decoupling boundary.}",
        r"\caption{High-level system architecture of the Chatnalyxer pipeline. The Node.js edge ingestion layer is asynchronously decoupled from the FastAPI processing core via an HTTP 202 WebHook, guaranteeing $\mathcal{O}(1)$ ingestion latency under burst traffic conditions.}"
    ),
    "ai_processing_pipeline.tex": (
        r"\caption{The internal AI processing pipeline, depicting the multi-modal flattening process.}",
        r"\caption{Detailed block diagram of the asynchronous AI processing pipeline. The architecture incorporates Azure Cognitive Services for multi-modal flattening (OCR and ASR) before injecting the normalized telemetry into the Google Gemini LLM for zero-shot UTC-anchored temporal extraction.}"
    ),
    "methodology.tex": (
        r"\caption{Data Flow Diagram illustrating the stateless extraction pipeline.}",
        r"\caption{Data Flow Diagram detailing the stateless information trajectory. Raw E2EE payloads are cryptographically unwrapped, semantically triaged, and destructively parsed. No persistent memory caches exist outside of the final structured PostgreSQL payload.}"
    ),
    "whatsapp_integration.tex": (
        r"\caption{UML Sequence Diagram representing the E2EE WebHook edge dispatch.}",
        r"\caption{UML Sequence Diagram representing the End-to-End Encrypted (E2EE) WebHook edge dispatch mechanism, which aggressively filters non-actionable status updates and reaction noise prior to inference.}"
    ),
    "database_layer.tex": (
        r"\caption{Entity-Relationship specification for the ephemeral PostgreSQL storage.}",
        r"\caption{Entity-Relationship (ER) specification for the ephemeral PostgreSQL storage cluster. The schema enforces strict privacy boundaries by hashing group identifiers and isolating temporal metadata from the raw conversational text.}"
    )
}

for filename, (old_cap, new_cap) in caption_replacements.items():
    filepath = os.path.join(base_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            content = f.read()
        
        if old_cap in content:
            content = content.replace(old_cap, new_cap)
            with open(filepath, "w") as f:
                f.write(content)
            print(f"Updated caption in {filename}")

print("LaTeX captions enhanced.")
