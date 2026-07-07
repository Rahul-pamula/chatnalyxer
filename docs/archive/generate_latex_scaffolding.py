import os

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex"

makefile_content = """\
# Makefile for IEEE Chatnalyxer Paper

DOCNAME = main

all: $(DOCNAME).pdf

$(DOCNAME).pdf: $(DOCNAME).tex
	latexmk -pdf -interaction=nonstopmode -halt-on-error $(DOCNAME).tex

clean:
	latexmk -C
	rm -f *.bbl *.brf *.run.xml *.xdv *.fls *.fdb_latexmk *.synctex.gz
"""

latexmkrc_content = """\
$pdf_mode = 1;
$pdflatex = 'pdflatex -interaction=nonstopmode -halt-on-error %O %S';
$bibtex_use = 2;
"""

readme_content = """\
# Chatnalyxer IEEE Research Paper

This is a production-ready IEEE LaTeX repository. 
Every section has been semantically converted from Markdown.

## Compilation
Ensure `latexmk` and `pdflatex` are installed.
Run:
```bash
make
```

## Structure
- `sections/`: Contains individual `.tex` files for the manuscript.
- `figures/`: PDF exports of diagrams.
- `bibliography/`: BibTeX references.
"""

main_tex_content = r"""\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts

% Packages
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage[ruled,vlined]{algorithm2e}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage{booktabs}
\usepackage{hyperref}

\def\BibTeX{{\rm B\kern-.05em{\sc i\kern-.025em b}\kern-.08em
    T\kern-.1667em\lower.7ex\hbox{E}\kern-.125emX}}

\begin{document}

\title{Chatnalyxer: Autonomous Temporal Task Extraction and Priority Triage in Multi-Modal Instant Messaging Networks}

\author{\IEEEauthorblockN{1\textsuperscript{st} Given Name Surname}
\IEEEauthorblockA{\textit{dept. name of organization (of Affiliation)} \\
\textit{name of organization (of Affiliation)}\\
City, Country \\
email address or ORCID}
\and
\IEEEauthorblockN{2\textsuperscript{nd} Given Name Surname}
\IEEEauthorblockA{\textit{dept. name of organization (of Affiliation)} \\
\textit{name of organization (of Affiliation)}\\
City, Country \\
email address or ORCID}
}

\maketitle

% Insert Frontmatter
\input{sections/abstract}

\begin{IEEEkeywords}
Natural Language Processing, Large Language Models, Multi-modal Extraction, WhatsApp, Ephemeral Processing, Task Management.
\end{IEEEkeywords}

% Insert Core Sections
\input{sections/introduction}
\input{sections/related_work}
\input{sections/system_architecture}
\input{sections/methodology}
\input{sections/algorithms}
\input{sections/mathematical_formulations}
\input{sections/experimental_methodology}
\input{sections/experimental_evaluation}
\input{sections/ablation_study}
\input{sections/comparative_analysis}
\input{sections/threats_to_validity}
\input{sections/future_work}
\input{sections/conclusion}

% Bibliography
\bibliographystyle{IEEEtran}
\bibliography{bibliography/references}

\end{document}
"""

references_bib_content = """\
@article{attention2017,
  title={Attention is all you need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N and Kaiser, {\L}ukasz and Polosukhin, Illia},
  journal={Advances in neural information processing systems},
  volume={30},
  year={2017}
}

@inproceedings{bert2019,
  title={BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding},
  author={Devlin, Jacob and Chang, Ming-Wei and Lee, Kenton and Toutanova, Kristina},
  booktitle={Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics},
  pages={4171--4186},
  year={2019}
}

@article{touvron2023llama,
  title={Llama 2: Open foundation and fine-tuned chat models},
  author={Touvron, Hugo and Martin, Louis and Stone, Kevin and Albert, Peter and Almahairi, Amjad and Babaei, Yasmine and Bashlykov, Nikolay and Batra, Soumya and Bhargava, Prajjwal and Bhosale, Shruti and others},
  journal={arXiv preprint arXiv:2307.09288},
  year={2023}
}

@article{radford2021learning,
  title={Learning transferable visual models from natural language supervision},
  author={Radford, Alec and Kim, Jong Wook and Hallacy, Chris and Ramesh, Aditya and Goh, Gabriel and Agarwal, Sandhini and Sastry, Girish and Askell, Amanda and Mishkin, Pamela and Clark, Jack and others},
  journal={International conference on machine learning},
  pages={8748--8763},
  year={2021},
  organization={PMLR}
}
"""

with open(os.path.join(base_dir, "Makefile"), "w") as f:
    f.write(makefile_content)

with open(os.path.join(base_dir, "latexmkrc"), "w") as f:
    f.write(latexmkrc_content)

with open(os.path.join(base_dir, "README.md"), "w") as f:
    f.write(readme_content)

with open(os.path.join(base_dir, "main.tex"), "w") as f:
    f.write(main_tex_content)

with open(os.path.join(base_dir, "bibliography", "references.bib"), "w") as f:
    f.write(references_bib_content)

print("Scaffolding completed.")
