import os
import glob

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

# 1. Update major figures to use figure* (Two column span)
major_files = [
    "system_architecture.tex",
    "ai_processing_pipeline.tex",
    "methodology.tex"
]

for filename in major_files:
    filepath = os.path.join(base_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
            
        content = content.replace(r"\begin{figure}[htbp]", r"\begin{figure*}[t]")
        content = content.replace(r"\begin{figure}", r"\begin{figure*}[t]")
        content = content.replace(r"\end{figure}", r"\end{figure*}")
        
        with open(filepath, 'w') as f:
            f.write(content)
            
# 2. Add keepaspectratio to all \includegraphics
for filepath in glob.glob(os.path.join(base_dir, "*.tex")):
    with open(filepath, 'r') as f:
        content = f.read()
        
    if r"\includegraphics[width=\linewidth]" in content:
        content = content.replace(
            r"\includegraphics[width=\linewidth]", 
            r"\includegraphics[width=\linewidth,keepaspectratio]"
        )
        with open(filepath, 'w') as f:
            f.write(content)
            
print("LaTeX files formatted for IEEE two-column structures.")
