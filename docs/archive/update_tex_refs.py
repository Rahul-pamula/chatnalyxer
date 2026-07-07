import os
import glob

base_dir = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/sections"

name_mapping = {
    "system_architecture.pdf": "Fig1_System_Architecture.pdf",
    "ai_processing_flowchart.pdf": "Fig2_AI_Processing_Pipeline.pdf",
    "dfd_specification.pdf": "Fig3_Data_Flow_Diagram.pdf",
    "uml_sequence_diagram.pdf": "Fig4_Sequence_Diagram.pdf",
    "er_diagram_specification.pdf": "Fig5_Entity_Relationship.pdf",
    "uml_class_diagram.pdf": "Fig6_Class_Diagram.pdf",
    "uml_component_diagram.pdf": "Fig7_Component_Diagram.pdf",
    "uml_activity_diagram.pdf": "Fig8_Activity_Diagram.pdf",
    "uml_state_machine_diagram.pdf": "Fig9_State_Machine.pdf",
    "uml_deployment_diagram.pdf": "Fig10_Deployment_Diagram.pdf",
    "ieee_system_architecture.pdf": "Fig11_IEEE_Architecture.pdf"
}

for filepath in glob.glob(os.path.join(base_dir, "*.tex")):
    with open(filepath, 'r') as f:
        content = f.read()
    
    modified = False
    for old_name, new_name in name_mapping.items():
        if old_name in content:
            content = content.replace(old_name, new_name)
            modified = True
            
    if modified:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated references in {os.path.basename(filepath)}")

print("All LaTeX files updated successfully.")
