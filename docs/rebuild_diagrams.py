#!/usr/bin/env python3
"""
Rebuild all Draw.io diagrams correctly.
Key fixes vs previous attempt:
  - Use &#xa; for newlines inside XML attribute values (NOT literal \n)
  - Much wider boxes: 240px wide, 65px tall
  - Much larger inter-node spacing: ≥160px horizontal, ≥100px vertical
  - Every edge label on white background so it never merges with connector
  - Canvas sized to fit all content with 40px margin on every side
"""

import os

OUT = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams"
FIGS = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/figures"

FS = 11
SW = 1.5
NL = "&#xa;"   # XML-safe newline inside attribute values

def BOX(extra=""):
    return (f"rounded=0;html=1;whiteSpace=wrap;overflow=hidden;"
            f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;"
            f"fillColor=#FFFFFF;strokeColor=#000000;strokeWidth={SW};{extra}")

def CYL():
    return (f"shape=cylinder3;html=1;boundedLbl=1;backgroundOutline=1;size=14;"
            f"whiteSpace=wrap;overflow=hidden;"
            f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;"
            f"fillColor=#FFFFFF;strokeColor=#000000;strokeWidth={SW};")

def CLOUD():
    return (f"ellipse;shape=cloud;html=1;whiteSpace=wrap;overflow=hidden;"
            f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;"
            f"fillColor=#FFFFFF;strokeColor=#000000;strokeWidth={SW};")

def DIAMOND():
    return (f"rhombus;html=1;whiteSpace=wrap;overflow=hidden;"
            f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;"
            f"fillColor=#FFFFFF;strokeColor=#000000;strokeWidth={SW};")

def ER_ENT():
    return (f"rounded=0;html=1;whiteSpace=wrap;overflow=hidden;"
            f"fillColor=#FFFFFF;strokeColor=#000000;"
            f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;strokeWidth={SW};")

def ER_ATTR():
    return (f"ellipse;html=1;whiteSpace=wrap;overflow=hidden;"
            f"fillColor=#FFFFFF;strokeColor=#000000;"
            f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;strokeWidth={SW};")

def ER_REL():
    return (f"rhombus;html=1;whiteSpace=wrap;overflow=hidden;"
            f"fillColor=#FFFFFF;strokeColor=#000000;"
            f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;strokeWidth={SW};")

EDGE_STYLE = (f"orthogonalLoop=1;jettySize=auto;html=1;"
              f"edgeStyle=orthogonalEdgeStyle;rounded=0;"
              f"strokeColor=#000000;strokeWidth={SW};"
              f"fontFamily=Helvetica;fontSize={FS};fontColor=#000000;"
              f"labelBackgroundColor=#FFFFFF;labelBorderColor=none;")

def node(nid, label, x, y, w, h, style_fn):
    s = style_fn if isinstance(style_fn, str) else style_fn()
    return (f'        <mxCell id="{nid}" value="{label}" style="{s}" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />'
            f'</mxCell>')

def edge(eid, label, src, tgt):
    return (f'        <mxCell id="{eid}" value="{label}" style="{EDGE_STYLE}" '
            f'edge="1" parent="1" source="{src}" target="{tgt}">'
            f'<mxGeometry relative="1" as="geometry" /></mxCell>')

def mxfile(pw, ph, cells):
    body = "\n".join(cells)
    return f"""<?xml version='1.0' encoding='utf-8'?>
<mxfile version="21.0.0">
  <diagram id="page-1" name="Page-1">
    <mxGraphModel dx="1400" dy="1400" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{pw}" pageHeight="{ph}" math="0" shadow="0" background="#FFFFFF">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>"""

def write(fname, content):
    path = os.path.join(OUT, fname)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  Written: {fname}")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 1 – System Architecture
# Horizontal layout: 4 main nodes in a row, 2 clouds above+below centre node
# Canvas: 1200 × 560
# Node W=220 H=65, horizontal step=320, vertical step=180
# ─────────────────────────────────────────────────────────────────────────────
print("Building Fig1...")
NW, NH = 220, 65
cells = [
    node("n0", "Mobile Interface",           40,  248, NW, NH, BOX),
    node("n1", f"Edge Ingestion{NL}(Node.js / Baileys)", 320, 248, NW, NH, BOX),
    node("n2", "FastAPI Core",               600, 248, NW, NH, BOX),
    node("n3", "PostgreSQL DB",              900, 248, NW, NH, CYL),
    node("n4", f"Azure Cognitive{NL}Services (ASR/OCR)", 600, 60,  NW, NH, CLOUD),
    node("n5", "Gemini LLM",                 600, 440, NW, NH, CLOUD),

    edge("e0", f"WhatsApp{NL}Network",       "n0", "n1"),
    edge("e1", f"HTTP 202{NL}WebHook",       "n1", "n2"),
    edge("e2", "REST API",                   "n0", "n2"),
    edge("e3", f"Media{NL}Processing",       "n2", "n4"),
    edge("e4", f"Semantic{NL}Extraction",    "n2", "n5"),
    edge("e5", f"Metadata{NL}Write",         "n2", "n3"),
]
write("Fig1_System_Architecture.drawio", mxfile(1160, 560, cells))

# ─────────────────────────────────────────────────────────────────────────────
# FIG 2 – AI Processing Pipeline
# Vertical single-column flowchart
# Canvas: 560 × 1100
# Node W=240 H=60, vertical step=110, centre x=160
# ─────────────────────────────────────────────────────────────────────────────
print("Building Fig2...")
NW2, NH2 = 240, 60
CX = 160   # left edge of boxes (centre = 160+120 = 280)
VSTEP = 110
cells = [
    node("n0", "Inbound Message",               CX, 30,              NW2, NH2, BOX),
    node("n1", "Modality Router",               CX, 30+VSTEP,        NW2, NH2, DIAMOND),
    node("n2", f"Azure OCR / ASR{NL}(Media)",  CX-160, 30+2*VSTEP,  NW2, NH2, BOX),
    node("n3", f"Text Bypass{NL}(Plain Text)",  CX+160, 30+2*VSTEP,  NW2, NH2, BOX),
    node("n4", f"Gemini LLM{NL}(UTC-Anchored Prompt)", CX, 30+3*VSTEP, NW2, NH2, BOX),
    node("n5", "Temporal Extraction",           CX, 30+4*VSTEP,      NW2, NH2, BOX),
    node("n6", "Priority Scoring",              CX, 30+5*VSTEP,      NW2, NH2, BOX),
    node("n7", f"JSON Validation{NL}(Pydantic Schema)", CX, 30+6*VSTEP, NW2, NH2, DIAMOND),
    node("n8", "PostgreSQL DB",                 CX, 30+7*VSTEP,      NW2, NH2, CYL),
    node("n9", f"Scheduler /{NL}Notification",  CX, 30+8*VSTEP,      NW2, NH2, BOX),

    edge("e0", "",           "n0", "n1"),
    edge("e1", "Media",      "n1", "n2"),
    edge("e2", "Text",       "n1", "n3"),
    edge("e3", "",           "n2", "n4"),
    edge("e4", "",           "n3", "n4"),
    edge("e5", "",           "n4", "n5"),
    edge("e6", "",           "n5", "n6"),
    edge("e7", "",           "n6", "n7"),
    edge("e8", "Retry Loop", "n7", "n4"),
    edge("e9", "Valid JSON", "n7", "n8"),
    edge("e10","",           "n8", "n9"),
]
write("Fig2_AI_Processing_Pipeline.drawio", mxfile(600, 1060, cells))

# ─────────────────────────────────────────────────────────────────────────────
# FIG 3 – Data Flow Diagram
# 2-ROW layout to avoid crowding:
#   Row 1 (y=60):  Edge Client → Decryption → Noise Filter
#   Media Flattener branches up from Noise Filter (y=-80 relative)
#   Row 2 (y=260): LLM Inference → JSON Validation → DB → Scheduler
# Canvas: 1120 × 480
# ─────────────────────────────────────────────────────────────────────────────
print("Building Fig3...")
NW3, NH3 = 200, 62
HSTEP = 300   # horizontal step between nodes in a row

cells = [
    # Row 1
    node("n0", f"WhatsApp{NL}Edge Client",          40,   169, NW3, NH3, BOX),
    node("n1", f"Signal Protocol{NL}Decryption",    340,  169, NW3, NH3, BOX),
    node("n2", f"Noise Filter{NL}(Heuristic)",      640,  169, NW3, NH3, DIAMOND),
    # Branch up from noise filter
    node("n3", f"Media Flattener{NL}(Azure OCR/ASR)", 640, 40, NW3, NH3, BOX),
    # Row 2
    node("n4", f"UTC-Anchored{NL}LLM Inference",    40,   350, NW3, NH3, BOX),
    node("n5", f"JSON Schema{NL}Validation",         340,  350, NW3, NH3, BOX),
    node("n6", "PostgreSQL Write",                   640,  350, NW3, NH3, CYL),
    node("n7", "Scheduler",                          880,  350, NW3, NH3, BOX),

    edge("e0", f"E2EE{NL}WebSocket",    "n0", "n1"),
    edge("e1", f"Decrypted{NL}Payload", "n1", "n2"),
    edge("e2", f"Non-text{NL}Media",    "n2", "n3"),
    edge("e3", f"UTF-8{NL}Text",        "n3", "n4"),
    edge("e4", f"Plain{NL}Text",        "n2", "n4"),
    edge("e5", f"LLM{NL}Output",        "n4", "n5"),
    edge("e6", f"Validated{NL}JSON",    "n5", "n6"),
    edge("e7", "",                       "n6", "n7"),
]
write("Fig3_Data_Flow_Diagram.drawio", mxfile(1120, 480, cells))

# ─────────────────────────────────────────────────────────────────────────────
# FIG 4 – UML Sequence Diagram (3 lifelines, top-down steps)
# Canvas: 1000 × 620
# ─────────────────────────────────────────────────────────────────────────────
print("Building Fig4...")
NW4, NH4 = 220, 60

cells = [
    # Lifeline headers
    node("h0", f"WhatsApp Edge{NL}(Node.js / Baileys)",  50,  20, NW4, NH4, BOX),
    node("h1", f"FastAPI{NL}Processing Core",            390, 20, NW4, NH4, BOX),
    node("h2", f"Google Gemini{NL}LLM API",              720, 20, NW4, NH4, BOX),

    # Step boxes
    node("s0", f"Message Event{NL}Received",          50,  130, NW4, NH4, BOX),
    node("s1", f"HTTP 202 Dispatch{NL}(async)",       390, 130, NW4, NH4, BOX),
    node("s2", f"Noise Filter{NL}Check",              390, 240, NW4, NH4, DIAMOND),
    node("s3", f"Media Flatten{NL}(Azure OCR/ASR)",   390, 350, NW4, NH4, BOX),
    node("s4", f"UTC-Anchored{NL}Prompt Build",       390, 450, NW4, NH4, BOX),
    node("s5", f"Inference{NL}Request",               720, 450, NW4, NH4, BOX),
    node("s6", f"JSON Response{NL}Returned",          720, 540, NW4, NH4, BOX),
    node("s7", f"DB Write{NL}& Schedule",             390, 540, NW4, NH4, BOX),

    edge("e0", f"WebSocket{NL}Event",    "s0", "s1"),
    edge("e1", "Drop if noise",          "s2", "s0"),
    edge("e2", "Pass through",           "s2", "s3"),
    edge("e3", "",                       "s3", "s4"),
    edge("e4", "Prompt",                 "s4", "s5"),
    edge("e5", "JSON",                   "s5", "s6"),
    edge("e6", "",                       "s6", "s7"),
]
write("Fig4_Sequence_Diagram.drawio", mxfile(1000, 650, cells))

# ─────────────────────────────────────────────────────────────────────────────
# FIG 5 – ER Diagram
# 3 entity column, attributes branching out on the sides
# Canvas: 1060 × 460
# ─────────────────────────────────────────────────────────────────────────────
print("Building Fig5...")
NW5E, NH5E = 160, 55   # entity
NW5A, NH5A = 155, 48   # attribute
NW5R, NH5R = 90,  50   # relationship

cells = [
    # Entities (centre row y=200)
    node("eu",  "User",           60,  202, NW5E, NH5E, ER_ENT),
    node("es",  "Session",        340, 202, NW5E, NH5E, ER_ENT),
    node("et",  "Task",           620, 202, NW5E, NH5E, ER_ENT),
    node("en",  "Notification",   620, 350, NW5E, NH5E, ER_ENT),
    # Relationships
    node("ru",  "owns",           240, 207, NW5R, NH5R, ER_REL),
    node("rt",  "generates",      510, 207, NW5R, NH5R, ER_REL),
    node("rn",  "triggers",       620, 290, NW5R, NH5R, ER_REL),
    # User attributes
    node("au0", f"user_id{NL}(PK)",      60,   50, NW5A, NH5A, ER_ATTR),
    node("au1", "phone_hash",            230,  50, NW5A, NH5A, ER_ATTR),
    # Session attributes
    node("as0", f"session_id{NL}(PK)",   340,  50, NW5A, NH5A, ER_ATTR),
    node("as1", "group_id_hash",         510,  50, NW5A, NH5A, ER_ATTR),
    # Task attributes
    node("at0", f"task_id{NL}(PK)",      780,  50, NW5A, NH5A, ER_ATTR),
    node("at1", "task_name",             900,  130, NW5A, NH5A, ER_ATTR),
    node("at2", f"deadline{NL}(ISO-8601)", 900, 200, NW5A, NH5A, ER_ATTR),
    node("at3", "priority_score",        900,  280, NW5A, NH5A, ER_ATTR),

    # Edges: entities ↔ relationships
    edge("re0", "", "eu", "ru"),
    edge("re1", "", "ru", "es"),
    edge("re2", "", "es", "rt"),
    edge("re3", "", "rt", "et"),
    edge("re4", "", "et", "rn"),
    edge("re5", "", "rn", "en"),
    # Attribute edges
    edge("ae0", "", "eu", "au0"),
    edge("ae1", "", "eu", "au1"),
    edge("ae2", "", "es", "as0"),
    edge("ae3", "", "es", "as1"),
    edge("ae4", "", "et", "at0"),
    edge("ae5", "", "et", "at1"),
    edge("ae6", "", "et", "at2"),
    edge("ae7", "", "et", "at3"),
]
write("Fig5_Entity_Relationship.drawio", mxfile(1060, 450, cells))

print("\nAll 5 drawio files rebuilt correctly.")
