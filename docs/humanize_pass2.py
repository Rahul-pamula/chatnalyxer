import os

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

rewrites = {
    "ai_processing_pipeline.tex": [
        ("The AI processing pipeline forms the cognitive engine of Chatnalyxer.", 
         "The AI processing pipeline drives the core semantic extraction logic of Chatnalyxer.")
    ],
    "database_layer.tex": [
        ("Crucially, the original \\texttt{Group ID} is hashed using a non-reversible cryptographic function. This architectural boundary physically prohibits the reconstruction of conversational histories, mitigating the primary security vector associated with background messaging listeners", 
         "By hashing the original \\texttt{Group ID} with a non-reversible cryptographic function, the schema mathematically guarantees that conversational histories cannot be reconstructed, neutralizing the primary security vector associated with background messaging listeners")
    ],
    "methodology.tex": [
        ("The core methodology of Chatnalyxer is centered on the transformation of highly ambiguous, deictic conversational text into deterministic JSON metadata", 
         "Chatnalyxer's primary objective is to reliably transform ambiguous, deictic chat logs into structured JSON metadata"),
        ("To resolve this, we formalized the \\textbf{UTC-Anchored Prompting Strategy}", 
         "To resolve this relative time ambiguity, we introduce a \\textbf{UTC-Anchored Prompting Strategy}")
    ],
    "algorithms.tex": [
        ("The efficiency of the Chatnalyxer pipeline is dictated by its underlying heuristic and scheduling algorithms.", 
         "To maintain system efficiency and prevent user alert fatigue, Chatnalyxer relies on dynamic heuristic algorithms.")
    ],
    "prompt_engineering.tex": [
        ("In high-volume networks, this guarantees user notification fatigue.", 
         "In high-volume social networks, this rigid approach inevitably causes severe notification fatigue.")
    ],
    "mathematical_formulations.tex": [
        ("Furthermore, the end-to-end system latency $L_{total}$ is defined as the sum of sequential processing vectors:", 
         "Finally, the end-to-end system latency $L_{total}$ is calculated as the sum of sequential processing vectors:")
    ]
}

for filename, changes in rewrites.items():
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'r') as f:
        content = f.read()
    
    for orig, new in changes:
        content = content.replace(orig, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Pass 2 humanizations applied successfully.")
