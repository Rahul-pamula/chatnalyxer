import os
import xml.etree.ElementTree as ET
import glob
import math

src_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams"

def snap(val, base=50):
    return round(val / base) * base

def clean_style(style_str, is_edge=False, is_text=False):
    parts = [p for p in style_str.split(";") if p]
    new_parts = []
    for p in parts:
        if p.startswith("fontFamily=") or p.startswith("fontSize=") or p.startswith("fontColor="):
            continue
        if p.startswith("fillColor=") or p.startswith("strokeColor=") or p.startswith("strokeWidth="):
            continue
        if is_edge and (p.startswith("edgeStyle=") or p.startswith("rounded=") or p.startswith("jumpStyle=")):
            continue
        new_parts.append(p)
        
    # Apply standard IEEE style
    new_parts.append("fontFamily=Helvetica")
    new_parts.append("fontSize=14")
    new_parts.append("fontColor=#000000")
    
    if is_edge:
        new_parts.extend(["edgeStyle=orthogonalEdgeStyle", "rounded=0", "strokeColor=#000000", "strokeWidth=1.5", "labelBackgroundColor=#FFFFFF"])
    elif not is_text:
        # Standard vertex
        new_parts.extend(["fillColor=#FFFFFF", "strokeColor=#000000", "strokeWidth=1.5", "whiteSpace=wrap", "spacing=8"])
    else:
        # Text node
        new_parts.extend(["fillColor=none", "strokeColor=none"])
        
    return ";".join(new_parts) + ";"

for filepath in glob.glob(os.path.join(src_dir, "Fig*.drawio")):
    tree = ET.parse(filepath)
    root = tree.getroot()
    
    for cell in root.findall(".//mxCell"):
        style = cell.get("style", "")
        is_vertex = cell.get("vertex") == "1"
        is_edge = cell.get("edge") == "1"
        is_text = "text;" in style
        is_uml = "umlLifeline" in style or "umlActor" in style or "table" in style or "swimlane" in style
        
        # Strip manual routing waypoints to force orthogonal auto-routing
        if is_edge:
            geom = cell.find("mxGeometry")
            if geom is not None:
                array_tag = geom.find("Array")
                if array_tag is not None:
                    geom.remove(array_tag)
                    
        # Apply standard style
        if style:
            new_style = clean_style(style, is_edge=is_edge, is_text=is_text)
            cell.set("style", new_style)
            
        # Snap and Resize Vertices
        if is_vertex:
            geom = cell.find("mxGeometry")
            if geom is not None:
                x_str = geom.get("x")
                y_str = geom.get("y")
                w_str = geom.get("width")
                h_str = geom.get("height")
                
                if x_str and y_str:
                    # Snap to 50px grid
                    snapped_x = snap(float(x_str), 50)
                    snapped_y = snap(float(y_str), 50)
                    geom.set("x", str(snapped_x))
                    geom.set("y", str(snapped_y))
                    
                # Standardize dimensions unless it's a specific UML structural shape or text
                if not is_uml and not is_text and w_str and h_str:
                    geom.set("width", "180")
                    geom.set("height", "70")

    # Final mathematical crop algorithm (inline)
    padding = 20
    min_x, min_y = float('inf'), float('inf')
    max_x, max_y = float('-inf'), float('-inf')
    
    for geom in root.findall(".//mxGeometry"):
        x_str = geom.get("x")
        y_str = geom.get("y")
        w_str = geom.get("width")
        h_str = geom.get("height")
        if x_str and y_str and w_str and h_str:
            x, y, w, h = float(x_str), float(y_str), float(w_str), float(h_str)
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x + w)
            max_y = max(max_y, y + h)
            
        for pt in geom.findall(".//mxPoint"):
            px_str = pt.get("x")
            py_str = pt.get("y")
            if px_str and py_str:
                px, py = float(px_str), float(py_str)
                min_x = min(min_x, px)
                min_y = min(min_y, py)
                max_x = max(max_x, px)
                max_y = max(max_y, py)
                
    if min_x != float('inf'):
        offset_x = min_x - padding
        offset_y = min_y - padding
        
        for geom in root.findall(".//mxGeometry"):
            x_str = geom.get("x")
            y_str = geom.get("y")
            if x_str and y_str:
                geom.set("x", str(float(x_str) - offset_x))
                geom.set("y", str(float(y_str) - offset_y))
                
            for pt in geom.findall(".//mxPoint"):
                px_str = pt.get("x")
                py_str = pt.get("y")
                if px_str and py_str:
                    pt.set("x", str(float(px_str) - offset_x))
                    pt.set("y", str(float(py_str) - offset_y))
                    
        graph_model = root.find(".//mxGraphModel")
        if graph_model is not None:
            new_width = max_x - min_x + (padding * 2)
            new_height = max_y - min_y + (padding * 2)
            graph_model.set("page", "1")
            graph_model.set("pageWidth", str(int(new_width)))
            graph_model.set("pageHeight", str(int(new_height)))
            graph_model.set("background", "#FFFFFF")

    tree.write(filepath, encoding="utf-8", xml_declaration=True)

print("Algorithmic redesign complete. Diagrams grid-snapped, normalized, and strictly styled.")
