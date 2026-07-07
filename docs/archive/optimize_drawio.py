import os
import xml.etree.ElementTree as ET
import glob
import shutil

src_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams"

name_mapping = {
    "system_architecture": "Fig1_System_Architecture",
    "ai_processing_flowchart": "Fig2_AI_Processing_Pipeline",
    "dfd_specification": "Fig3_Data_Flow_Diagram",
    "uml_sequence_diagram": "Fig4_Sequence_Diagram",
    "er_diagram_specification": "Fig5_Entity_Relationship",
    "uml_class_diagram": "Fig6_Class_Diagram",
    "uml_component_diagram": "Fig7_Component_Diagram",
    "uml_activity_diagram": "Fig8_Activity_Diagram",
    "uml_state_machine_diagram": "Fig9_State_Machine",
    "uml_deployment_diagram": "Fig10_Deployment_Diagram",
    "ieee_system_architecture": "Fig11_IEEE_Architecture"
}

def get_color_style(value):
    val = str(value).lower()
    if any(k in val for k in ["client", "whatsapp", "user", "mobile", "app"]):
        return "fillColor=#D5E8D4;strokeColor=#82B366;" # Green
    if any(k in val for k in ["ai", "gemini", "llm", "ocr", "speech", "temporal"]):
        return "fillColor=#E1D5E7;strokeColor=#9673A6;" # Purple
    if any(k in val for k in ["backend", "node", "fastapi", "core", "webhook"]):
        return "fillColor=#DAE8FC;strokeColor=#6C8EBF;" # Blue
    if any(k in val for k in ["database", "db", "storage", "postgres", "sql"]):
        return "fillColor=#FFE6CC;strokeColor=#D79B00;" # Yellow
    if any(k in val for k in ["priority", "notification", "triage", "alert", "validation"]):
        return "fillColor=#F8CECC;strokeColor=#B85450;" # Red
    return "fillColor=#f5f5f5;strokeColor=#666666;" # Gray default

for filepath in glob.glob(os.path.join(src_dir, "*.drawio")):
    filename = os.path.basename(filepath).replace(".drawio", "")
    new_filename = name_mapping.get(filename, filename)
    
    # Title extraction (e.g. "Fig1_System_Architecture" -> "Figure 1: System Architecture")
    if new_filename.startswith("Fig"):
        parts = new_filename.split("_", 1)
        fig_num = parts[0].replace("Fig", "")
        fig_title = parts[1].replace("_", " ") if len(parts) > 1 else ""
        display_title = f"Figure {fig_num}: {fig_title}"
    else:
        display_title = new_filename.replace("_", " ")

    tree = ET.parse(filepath)
    root = tree.getroot()
    
    # Find mxGraphModel
    graph_model = root.find(".//mxGraphModel")
    if graph_model is not None:
        graph_model.set("page", "0") # disable page snapping for clean crop
        graph_model.set("math", "0")
        graph_model.set("shadow", "0")
    
    min_x = 9999
    min_y = 9999
    max_id = 0
    
    parent_node_id = "1"
    
    for cell in root.findall(".//mxCell"):
        # track max id
        try:
            cid = int(cell.get("id", "0"))
            if cid > max_id: max_id = cid
        except:
            pass
            
        style = cell.get("style", "")
        is_edge = cell.get("edge") == "1"
        is_vertex = cell.get("vertex") == "1"
        value = cell.get("value", "")
        
        # update styles
        new_style_parts = []
        for part in style.split(";"):
            if not part: continue
            if "fontFamily=" in part or "fontSize=" in part or "whiteSpace=" in part or "overflow=" in part:
                continue
            if is_edge and ("edgeStyle=" in part or "rounded=" in part or "jumpStyle=" in part):
                continue
            if is_vertex and ("fillColor=" in part or "strokeColor=" in part):
                continue
            new_style_parts.append(part)
            
        if is_edge:
            new_style_parts.extend(["edgeStyle=orthogonalEdgeStyle", "rounded=1", "jumpStyle=arc", "fontFamily=Times New Roman", "fontSize=14"])
        elif is_vertex and "text" not in style:
            # Nodes
            color_st = get_color_style(value)
            new_style_parts.extend([color_st.strip(";"), "whiteSpace=wrap", "html=1", "overflow=width", "fontFamily=Times New Roman", "fontSize=14", "fontColor=#000000", "spacing=4"])
            
            # Geometry resizing for readability
            geom = cell.find("mxGeometry")
            if geom is not None:
                w = float(geom.get("width", "0"))
                h = float(geom.get("height", "0"))
                x = float(geom.get("x", "0"))
                y = float(geom.get("y", "0"))
                
                if x < min_x: min_x = x
                if y < min_y: min_y = y
                
                if w > 0 and w < 160:
                    geom.set("width", "160")
                if h > 0 and h < 60:
                    geom.set("height", "60")
        
        cell.set("style", ";".join(new_style_parts) + ";")
    
    # Add title node
    # Find the root layer where parent="1"
    layer = root.find('.//mxCell[@id="1"]')
    if layer is not None:
        title_id = str(max_id + 100)
        title_cell = ET.Element("mxCell", {
            "id": title_id,
            "value": f"<b>{display_title}</b>",
            "style": "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Times New Roman;fontSize=20;fontColor=#000000;",
            "vertex": "1",
            "parent": "1"
        })
        geom = ET.Element("mxGeometry", {
            "x": str(min_x),
            "y": str(min_y - 60) if min_y != 9999 else "0",
            "width": "300",
            "height": "40",
            "as": "geometry"
        })
        title_cell.append(geom)
        
        # We need to insert this into the model.
        # Find the parent of mxCell id="1"
        for p in root.iter():
            for child in p:
                if child.tag == "mxCell" and child.get("id") == "1":
                    p.append(title_cell)
                    break
                    
    # Save as new file
    new_filepath = os.path.join(src_dir, new_filename + ".drawio")
    tree.write(new_filepath, encoding="utf-8", xml_declaration=True)
    
    # Remove old file if name changed
    if new_filepath != filepath:
        os.remove(filepath)

print("Diagrams successfully optimized, restyled, and renamed.")
