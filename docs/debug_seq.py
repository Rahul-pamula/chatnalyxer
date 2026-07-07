import xml.etree.ElementTree as ET

tree = ET.parse("/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams/Fig4_Sequence_Diagram.drawio")
graph_model = tree.getroot().find(".//mxGraphModel")
pw = graph_model.get("pageWidth")
ph = graph_model.get("pageHeight")
print(f"Fig4 Bounds - PageWidth: {pw}, PageHeight: {ph}")

# Let's also check the actual min/max of geometry to see if it's empty
min_x, max_x = float('inf'), float('-inf')
for cell in tree.getroot().findall(".//mxCell"):
    geom = cell.find("mxGeometry")
    if geom is not None:
        x_str = geom.get("x")
        w_str = geom.get("width")
        if x_str and w_str:
            x, w = float(x_str), float(w_str)
            min_x = min(min_x, x)
            max_x = max(max_x, x+w)

print(f"Geometry X bounds: {min_x} to {max_x}")
