import os
import xml.etree.ElementTree as ET
import glob

src_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams"
padding = 20

for filepath in glob.glob(os.path.join(src_dir, "Fig*.drawio")):
    tree = ET.parse(filepath)
    root = tree.getroot()
    
    min_x, min_y = float('inf'), float('inf')
    max_x, max_y = float('-inf'), float('-inf')
    
    # 1. Find bounding box
    for geom in root.findall(".//mxGeometry"):
        # Node coordinates
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
            
        # Point coordinates (for edge routing)
        for pt in geom.findall(".//mxPoint"):
            px_str = pt.get("x")
            py_str = pt.get("y")
            if px_str and py_str:
                px, py = float(px_str), float(py_str)
                min_x = min(min_x, px)
                min_y = min(min_y, py)
                max_x = max(max_x, px)
                max_y = max(max_y, py)
                
    if min_x == float('inf') or min_y == float('inf'):
        print(f"Skipping {filepath}, no geometry found.")
        continue
        
    # Calculate offset
    offset_x = min_x - padding
    offset_y = min_y - padding
    
    # 2. Translate coordinates
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
                
    # 3. Update Page Canvas bounds
    graph_model = root.find(".//mxGraphModel")
    if graph_model is not None:
        new_width = max_x - min_x + (padding * 2)
        new_height = max_y - min_y + (padding * 2)
        graph_model.set("page", "1")
        graph_model.set("pageWidth", str(int(new_width)))
        graph_model.set("pageHeight", str(int(new_height)))
        
    tree.write(filepath, encoding="utf-8", xml_declaration=True)

print("Canvas bounding boxes mathematically cropped.")
