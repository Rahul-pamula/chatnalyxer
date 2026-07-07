import os
import glob
import re

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

def extract_figures(content):
    figures = []
    # Match both figure and figure* environments
    pattern = re.compile(r"(\\begin{figure\*?}.*?\\end{figure\*?})", re.DOTALL)
    matches = pattern.finditer(content)
    
    for match in matches:
        fig_block = match.group(1)
        
        # Extract label
        label_match = re.search(r"\\label\{(.*?)\}", fig_block)
        label = label_match.group(1) if label_match else None
        
        # Update float specifier
        if "\\begin{figure*}" in fig_block:
            fig_block = re.sub(r"\\begin\{figure\*\}\[.*?\]", r"\\begin{figure*}[!t]", fig_block)
            if "[!t]" not in fig_block:
                fig_block = fig_block.replace("\\begin{figure*}", "\\begin{figure*}[!t]")
        else:
            fig_block = re.sub(r"\\begin\{figure\}\[.*?\]", r"\\begin{figure}[!ht]", fig_block)
            if "[!ht]" not in fig_block:
                fig_block = fig_block.replace("\\begin{figure}", "\\begin{figure}[!ht]")
                
        # Inject caption compression
        if "\\setlength{\\abovecaptionskip}" not in fig_block:
            fig_block = fig_block.replace("\\caption{", "\\setlength{\\abovecaptionskip}{4pt}\n    \\setlength{\\belowcaptionskip}{-4pt}\n    \\caption{")
            
        figures.append({
            'block': fig_block,
            'label': label
        })
        
    # Remove original figures from content
    clean_content = pattern.sub("", content)
    return clean_content, figures

for filepath in glob.glob(os.path.join(base_dir, "*.tex")):
    with open(filepath, 'r') as f:
        content = f.read()
        
    clean_content, figures = extract_figures(content)
    
    if not figures:
        continue
        
    # Split content into paragraphs
    paragraphs = re.split(r'\n\s*\n', clean_content)
    
    # Re-inject figures after the first valid paragraph
    new_paragraphs = []
    figures_injected = False
    
    for i, p in enumerate(paragraphs):
        p_stripped = p.strip()
        new_paragraphs.append(p)
        
        # Identify first valid paragraph (not empty, not a section header)
        if not figures_injected and p_stripped and not p_stripped.startswith('\\section') and not p_stripped.startswith('\\subsection'):
            # This is the intro paragraph. Inject cross references and then the figures.
            for fig in figures:
                if fig['label'] and f"\\ref{{{fig['label']}}}" not in clean_content:
                    # Append cross reference
                    if new_paragraphs[-1].endswith('.'):
                        new_paragraphs[-1] = new_paragraphs[-1][:-1] + f" (illustrated in Fig.~\\ref{{{fig['label']}}})."
                    else:
                        new_paragraphs[-1] += f" (illustrated in Fig.~\\ref{{{fig['label']}}})."
                
                # Append figure block as next paragraph
                new_paragraphs.append(fig['block'])
                
            figures_injected = True
            
    # If no valid paragraph found (rare), just append to end
    if not figures_injected:
        for fig in figures:
            new_paragraphs.append(fig['block'])
            
    new_content = "\n\n".join(new_paragraphs)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
        
    print(f"Relocated and anchored figures in {os.path.basename(filepath)}")

print("Figure placement optimization complete.")
