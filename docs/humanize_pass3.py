import os

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

rewrites = {
    "experimental_evaluation.tex": [
        ("The system was evaluated against two primary axes:", 
         "We benchmarked the system across two primary vectors:")
    ],
    "ablation_study.tex": [
        ("To mathematically validate the architectural necessity of individual components, a rigorous ablation study was conducted.", 
         "To empirically isolate and validate the necessity of each architectural component, we conducted a targeted ablation study.")
    ],
    "results_discussion.tex": [
        ("The empirical evaluation over the CEC-10K dataset validates the fundamental viability of the Chatnalyxer architecture.", 
         "Testing against the CEC-10K corpus confirms that Chatnalyxer's passive ingestion model is fundamentally viable.")
    ],
    "comparative_analysis.tex": [
        ("Furthermore, these commercial architectures universally lack native algorithmic priority heuristics", 
         "Moreover, these commercial platforms lack native algorithmic triage")
    ],
    "threats_to_validity.tex": [
        ("While the experimental methodology supports the efficacy of the architecture, specific threats to validity must be recognized.", 
         "Although our empirical results validate the core pipeline, several structural threats to validity require acknowledgment.")
    ],
    "conclusion.tex": [
        ("Furthermore, the introduction of UTC-Anchored Zero-Shot Inference effectively resolved the semantic ambiguity of deictic temporal expressions natively within the LLM envelope.", 
         "By integrating UTC-Anchored Zero-Shot Inference, we also resolved the classic semantic ambiguity surrounding deictic temporal expressions without requiring complex fine-tuning.")
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

print("Pass 3 humanizations applied successfully.")
