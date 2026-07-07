import os
import xml.etree.ElementTree as ET
import glob

src_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams"

for filepath in glob.glob(os.path.join(src_dir, "*.drawio")):
    tree = ET.parse(filepath)
    root = tree.getroot()
    
    # 1. Remove embedded titles
    nodes_to_remove = []
    # We need to find the parent to remove children
    for parent in root.iter():
        for child in list(parent):
            if child.tag == "mxCell":
                val = child.get("value", "")
                if val.startswith("<b>Figure") or val.startswith("<b>Fig"):
                    nodes_to_remove.append((parent, child))
                    
    for p, c in nodes_to_remove:
        p.remove(c)
        
    # 2. Refine layout
    for cell in root.findall(".//mxCell"):
        style = cell.get("style", "")
        is_vertex = cell.get("vertex") == "1"
        is_edge = cell.get("edge") == "1"
        
        if is_edge:
            # Maybe bump font size on edge labels too if they exist, but edge styles are usually minimal.
            if "fontSize=14" in style:
                cell.set("style", style.replace("fontSize=14", "fontSize=16"))
        elif is_vertex:
            new_style_parts = []
            for part in style.split(";"):
                if not part: continue
                if part.startswith("fontSize="):
                    new_style_parts.append("fontSize=16")
                elif part.startswith("spacing="):
                    new_style_parts.append("spacing=8")
                else:
                    new_style_parts.append(part)
                    
            if "fontSize=16" not in new_style_parts:
                new_style_parts.append("fontSize=16")
            if "spacing=8" not in new_style_parts:
                new_style_parts.append("spacing=8")
                
            cell.set("style", ";".join(new_style_parts) + ";")
            
            # Increase box padding
            geom = cell.find("mxGeometry")
            if geom is not None and "text" not in style:
                w = float(geom.get("width", "0"))
                h = float(geom.get("height", "0"))
                
                if 0 < w < 180:
                    geom.set("width", "180")
                if 0 < h < 70:
                    geom.set("height", "70")

    tree.write(filepath, encoding="utf-8", xml_declaration=True)

print("Draw.io refinement completed.")
