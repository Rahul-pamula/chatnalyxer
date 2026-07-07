import os
import glob
import re

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex"
sections_dir = os.path.join(base_dir, "sections")

# 1. Update main.tex with float tuning
main_tex_path = os.path.join(base_dir, "main.tex")
float_tuning = """
% IEEE Float Optimization Parameters
\\setlength{\\textfloatsep}{10pt plus 1.0pt minus 2.0pt}
\\setlength{\\floatsep}{8pt plus 1.0pt minus 2.0pt}
\\setlength{\\intextsep}{8pt plus 1.0pt minus 2.0pt}
\\setlength{\\dbltextfloatsep}{12pt plus 2.0pt minus 2.0pt}
\\setlength{\\dblfloatsep}{12pt plus 2.0pt minus 2.0pt}
\\setcounter{topnumber}{2}
\\setcounter{bottomnumber}{2}
\\setcounter{totalnumber}{4}
\\renewcommand{\\topfraction}{0.9}
\\renewcommand{\\bottomfraction}{0.9}
\\renewcommand{\\textfraction}{0.1}
\\renewcommand{\\floatpagefraction}{0.85}

\\begin{document}
"""

with open(main_tex_path, "r") as f:
    main_content = f.read()

if "% IEEE Float Optimization" not in main_content:
    main_content = main_content.replace("\\begin{document}", float_tuning.strip() + "\n")
    with open(main_tex_path, "w") as f:
        f.write(main_content)
    print("Injected IEEE float tuning into main.tex")

# 2. Update figures in sections
for filepath in glob.glob(os.path.join(sections_dir, "*.tex")):
    with open(filepath, "r") as f:
        content = f.read()
        
    original = content
    
    # Standardize float placement for single-column figures
    content = re.sub(r"\\begin{figure}\[.*?\]", r"\\begin{figure}[tbp]", content)
    
    # We need to process line by line or use a state machine to know if we are in figure* or figure
    lines = content.split('\n')
    in_figure_star = False
    in_figure_normal = False
    
    for i in range(len(lines)):
        line = lines[i]
        if r"\begin{figure*}" in line:
            in_figure_star = True
            in_figure_normal = False
        elif r"\begin{figure}" in line:
            in_figure_normal = True
            in_figure_star = False
        elif r"\end{figure*}" in line:
            in_figure_star = False
        elif r"\end{figure}" in line:
            in_figure_normal = False
            
        if r"\includegraphics" in line:
            # Replace widths intelligently
            if in_figure_star:
                # Replace any width=\linewidth or width=\textwidth with 0.85\textwidth
                line = re.sub(r"width=\\linewidth", r"width=0.85\\textwidth", line)
                line = re.sub(r"width=\\textwidth", r"width=0.85\\textwidth", line)
            elif in_figure_normal:
                # Replace width=\linewidth with 0.90\columnwidth
                line = re.sub(r"width=\\linewidth", r"width=0.90\\columnwidth", line)
                
            lines[i] = line

    new_content = '\n'.join(lines)
    
    if new_content != original:
        with open(filepath, "w") as f:
            f.write(new_content)
        print(f"Optimized floats and image scales in {os.path.basename(filepath)}")

print("LaTeX optimization complete.")
