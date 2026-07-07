import os
import re

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

# 1. AI Processing Pipeline (Fig 3) -> Convert from figure* to figure, set width to 0.95\columnwidth (Very tall)
ai_file = os.path.join(base_dir, "ai_processing_pipeline.tex")
with open(ai_file, 'r') as f:
    content = f.read()
content = content.replace(r"\begin{figure*}[!t]", r"\begin{figure}[tbp]")
content = content.replace(r"\end{figure*}", r"\end{figure}")
content = re.sub(r"\\includegraphics\[width=.*?\]", r"\\includegraphics[width=0.95\\columnwidth,keepaspectratio]", content)
with open(ai_file, 'w') as f:
    f.write(content)

# 2. Database Layer (Fig 4 ER) -> Change [!ht] to [tbp] to prevent isolated float page
db_file = os.path.join(base_dir, "database_layer.tex")
with open(db_file, 'r') as f:
    content = f.read()
content = content.replace(r"\begin{figure}[!ht]", r"\begin{figure}[tbp]")
content = re.sub(r"\\includegraphics\[width=.*?\]", r"\\includegraphics[width=0.95\\columnwidth,keepaspectratio]", content)
with open(db_file, 'w') as f:
    f.write(content)

# 3. WhatsApp Integration (Fig 2 Seq) -> Change [!ht] to [tbp]
wa_file = os.path.join(base_dir, "whatsapp_integration.tex")
with open(wa_file, 'r') as f:
    content = f.read()
content = content.replace(r"\begin{figure}[!ht]", r"\begin{figure}[tbp]")
content = re.sub(r"\\includegraphics\[width=.*?\]", r"\\includegraphics[width=0.95\\columnwidth,keepaspectratio]", content)
with open(wa_file, 'w') as f:
    f.write(content)

# 4. Methodology (Fig 5 DFD) -> Keep figure* because it's wide, but change [!t] to [tbp] and width to 0.9\textwidth
meth_file = os.path.join(base_dir, "methodology.tex")
with open(meth_file, 'r') as f:
    content = f.read()
content = content.replace(r"\begin{figure*}[!t]", r"\begin{figure*}[tbp]")
content = re.sub(r"\\includegraphics\[width=.*?\]", r"\\includegraphics[width=0.90\\textwidth,keepaspectratio]", content)
with open(meth_file, 'w') as f:
    f.write(content)

# 5. System Architecture (Fig 1) -> Keep figure*, change [!t] to [tbp]
sys_file = os.path.join(base_dir, "system_architecture.tex")
with open(sys_file, 'r') as f:
    content = f.read()
content = content.replace(r"\begin{figure*}[!t]", r"\begin{figure*}[tbp]")
with open(sys_file, 'w') as f:
    f.write(content)

print("Final PDF layout tuning executed based on visual analysis.")
