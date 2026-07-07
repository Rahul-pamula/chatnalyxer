# Makefile for IEEE Chatnalyxer Paper

DOCNAME = main

all: $(DOCNAME).pdf

$(DOCNAME).pdf: $(DOCNAME).tex
	latexmk -pdf -interaction=nonstopmode -halt-on-error $(DOCNAME).tex

clean:
	latexmk -C
	rm -f *.bbl *.brf *.run.xml *.xdv *.fls *.fdb_latexmk *.synctex.gz
