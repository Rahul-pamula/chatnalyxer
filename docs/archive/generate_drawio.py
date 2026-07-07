import os
import xml.etree.ElementTree as ET
from xml.dom import minidom

diagrams = {
    "dfd_specification.drawio": {
        "nodes": [
            ("User", 100, 200, 80, 40, "ellipse"),
            ("WhatsApp", 250, 200, 100, 40, "rectangle"),
            ("Baileys Node.js", 400, 200, 120, 40, "rectangle"),
            ("FastAPI Orchestrator", 600, 200, 140, 40, "rectangle"),
            ("PostgreSQL Database", 850, 200, 140, 60, "cylinder"),
            ("Gemini AI", 600, 100, 100, 40, "cloud"),
            ("Azure AI", 400, 100, 100, 40, "cloud"),
            ("Notification Service", 600, 300, 140, 40, "rectangle")
        ],
        "edges": [
            ("User", "WhatsApp", "Send Message"),
            ("WhatsApp", "Baileys Node.js", "WSS"),
            ("Baileys Node.js", "FastAPI Orchestrator", "WebHook"),
            ("FastAPI Orchestrator", "Azure AI", "Pre-process"),
            ("FastAPI Orchestrator", "Gemini AI", "Extract"),
            ("FastAPI Orchestrator", "PostgreSQL Database", "Store Metadata"),
            ("FastAPI Orchestrator", "Notification Service", "Dispatch Alert"),
            ("Notification Service", "User", "Push Notification")
        ]
    },
    "ai_processing_flowchart.drawio": {
        "nodes": [
            ("Incoming Msg", 300, 50, 120, 40, "ellipse"),
            ("Media Detection", 300, 150, 120, 60, "rhombus"),
            ("OCR/Speech/PDF", 100, 250, 120, 40, "rectangle"),
            ("Text Bypass", 500, 250, 120, 40, "rectangle"),
            ("Gemini LLM", 300, 350, 120, 40, "rectangle"),
            ("Temporal Ext.", 300, 450, 120, 40, "rectangle"),
            ("Priority Detect", 300, 550, 120, 40, "rectangle"),
            ("Validation", 300, 650, 120, 60, "rhombus"),
            ("Database", 300, 750, 120, 60, "cylinder"),
            ("Scheduler", 300, 850, 120, 40, "rectangle"),
            ("Notification", 300, 950, 120, 40, "ellipse")
        ],
        "edges": [
            ("Incoming Msg", "Media Detection", ""),
            ("Media Detection", "OCR/Speech/PDF", "Media"),
            ("Media Detection", "Text Bypass", "Text"),
            ("OCR/Speech/PDF", "Gemini LLM", ""),
            ("Text Bypass", "Gemini LLM", ""),
            ("Gemini LLM", "Temporal Ext.", ""),
            ("Temporal Ext.", "Priority Detect", ""),
            ("Priority Detect", "Validation", ""),
            ("Validation", "Gemini LLM", "Retry Loop"),
            ("Validation", "Database", "Valid JSON"),
            ("Database", "Scheduler", ""),
            ("Scheduler", "Notification", "")
        ]
    },
    "er_diagram_specification.drawio": {
        "nodes": [
            ("Users", 400, 300, 100, 40, "rectangle"),
            ("Authentication", 400, 150, 100, 40, "rectangle"),
            ("Preferences", 400, 450, 100, 40, "rectangle"),
            ("Groups", 200, 300, 100, 40, "rectangle"),
            ("Tasks", 650, 300, 100, 40, "rectangle"),
            ("Notifications", 900, 300, 100, 40, "rectangle"),
            ("Media", 650, 150, 100, 40, "rectangle"),
            ("Logs", 650, 450, 100, 40, "rectangle")
        ],
        "edges": [
            ("Users", "Authentication", "1:1"),
            ("Users", "Preferences", "1:1"),
            ("Users", "Groups", "1:M"),
            ("Users", "Tasks", "1:M"),
            ("Groups", "Tasks", "1:M"),
            ("Tasks", "Notifications", "1:M"),
            ("Tasks", "Media", "1:1"),
            ("Users", "Logs", "1:M")
        ]
    },
    "uml_component_diagram.drawio": {
        "nodes": [
            ("React Native Client", 100, 100, 140, 60, "component"),
            ("WhatsApp Baileys", 100, 300, 140, 60, "component"),
            ("FastAPI Orchestrator", 400, 200, 140, 60, "component"),
            ("PostgreSQL Cluster", 700, 200, 140, 60, "component"),
            ("Google Gemini SaaS", 400, 50, 140, 60, "component"),
            ("Azure Cognitive SaaS", 400, 350, 140, 60, "component"),
            ("Expo Push Gateway", 700, 350, 140, 60, "component")
        ],
        "edges": [
            ("React Native Client", "FastAPI Orchestrator", "HTTPS REST"),
            ("WhatsApp Baileys", "FastAPI Orchestrator", "Internal WebHook"),
            ("FastAPI Orchestrator", "PostgreSQL Cluster", "TCP 5432"),
            ("FastAPI Orchestrator", "Google Gemini SaaS", "HTTPS JSON"),
            ("FastAPI Orchestrator", "Azure Cognitive SaaS", "HTTPS Binary"),
            ("FastAPI Orchestrator", "Expo Push Gateway", "HTTPS Push")
        ]
    },
    "uml_deployment_diagram.drawio": {
        "nodes": [
            ("Mobile Device", 100, 100, 120, 120, "cube"),
            ("Backend Cluster", 400, 200, 120, 120, "cube"),
            ("Database Server", 700, 200, 120, 120, "cube"),
            ("Gemini Cloud", 400, 50, 120, 60, "cloud"),
            ("Azure Cloud", 400, 400, 120, 60, "cloud"),
            ("Notification Server", 700, 400, 120, 60, "cloud")
        ],
        "edges": [
            ("Mobile Device", "Backend Cluster", "HTTPS"),
            ("Backend Cluster", "Database Server", "TCP 5432 (VPC)"),
            ("Backend Cluster", "Gemini Cloud", "HTTPS"),
            ("Backend Cluster", "Azure Cloud", "HTTPS"),
            ("Backend Cluster", "Notification Server", "HTTPS")
        ]
    },
    "uml_sequence_diagram.drawio": {
        "nodes": [
            ("User", 100, 50, 80, 40, "rectangle"),
            ("Baileys", 250, 50, 80, 40, "rectangle"),
            ("FastAPI", 400, 50, 80, 40, "rectangle"),
            ("Gemini", 550, 50, 80, 40, "rectangle"),
            ("Database", 700, 50, 80, 40, "rectangle"),
            ("Mobile App", 850, 50, 80, 40, "rectangle")
        ],
        "edges": [
            ("User", "Baileys", "Encrypted Message"),
            ("Baileys", "FastAPI", "WebHook (Async)"),
            ("FastAPI", "Baileys", "HTTP 202 Accepted"),
            ("FastAPI", "Gemini", "Extract Task (Sync)"),
            ("Gemini", "FastAPI", "JSON Metadata"),
            ("FastAPI", "Database", "SQL INSERT"),
            ("Database", "FastAPI", "Temporal Poll"),
            ("FastAPI", "Mobile App", "Push Alert")
        ]
    },
    "uml_class_diagram.drawio": {
        "nodes": [
            ("User", 400, 100, 100, 60, "rectangle"),
            ("Task", 400, 250, 100, 60, "rectangle"),
            ("Notification", 400, 400, 100, 60, "rectangle"),
            ("Chat", 200, 250, 100, 60, "rectangle"),
            ("Media", 200, 400, 100, 60, "rectangle"),
            ("Settings", 600, 100, 100, 60, "rectangle"),
            ("Authentication", 200, 100, 120, 60, "rectangle"),
            ("Scheduler", 600, 250, 100, 60, "rectangle")
        ],
        "edges": [
            ("User", "Task", "Composition"),
            ("Task", "Notification", "Composition"),
            ("Task", "Chat", "Aggregation"),
            ("Chat", "Media", "Inheritance"),
            ("User", "Settings", "Composition"),
            ("User", "Authentication", "Composition"),
            ("Scheduler", "Task", "Aggregation")
        ]
    },
    "uml_state_machine_diagram.drawio": {
        "nodes": [
            ("Detected", 100, 100, 100, 40, "rounded"),
            ("Processing", 300, 100, 100, 40, "rounded"),
            ("Validated", 500, 100, 100, 40, "rounded"),
            ("Stored", 700, 100, 100, 40, "rounded"),
            ("Scheduled", 700, 250, 100, 40, "rounded"),
            ("Reminder Sent", 700, 400, 120, 40, "rounded"),
            ("Completed", 400, 400, 100, 40, "rounded"),
            ("Expired", 400, 500, 100, 40, "rounded"),
            ("Deleted", 400, 250, 100, 40, "rounded")
        ],
        "edges": [
            ("Detected", "Processing", ""),
            ("Processing", "Validated", "Valid JSON"),
            ("Processing", "Deleted", "Null / Invalid"),
            ("Validated", "Stored", "SQL INSERT"),
            ("Validated", "Deleted", "Retry Limit Hit"),
            ("Stored", "Scheduled", "Due < Threshold"),
            ("Scheduled", "Reminder Sent", "Time Trigger"),
            ("Reminder Sent", "Completed", "User Swipe"),
            ("Reminder Sent", "Expired", "Timeout"),
            ("Stored", "Deleted", "User Delete")
        ]
    },
    "uml_activity_diagram.drawio": {
        "nodes": [
            ("Login", 100, 100, 80, 40, "rounded"),
            ("WhatsApp Connect", 250, 100, 120, 40, "rounded"),
            ("Fork Sync Bar", 450, 100, 20, 100, "rectangle"),
            ("Monitoring", 550, 50, 100, 40, "rounded"),
            ("Dashboard", 550, 150, 100, 40, "rounded"),
            ("Extraction", 700, 50, 100, 40, "rounded"),
            ("Database", 850, 50, 100, 40, "rounded")
        ],
        "edges": [
            ("Login", "WhatsApp Connect", ""),
            ("WhatsApp Connect", "Fork Sync Bar", ""),
            ("Fork Sync Bar", "Monitoring", "Thread A"),
            ("Fork Sync Bar", "Dashboard", "Thread B"),
            ("Monitoring", "Extraction", "Msg Found"),
            ("Extraction", "Database", "Insert"),
            ("Database", "Monitoring", "Loop")
        ]
    },
    "system_architecture.drawio": {
        "nodes": [
            ("Mobile Interface", 100, 200, 120, 60, "rectangle"),
            ("Edge Ingestion", 300, 200, 120, 60, "rectangle"),
            ("FastAPI Core", 550, 200, 120, 60, "rectangle"),
            ("PostgreSQL DB", 800, 200, 120, 60, "cylinder"),
            ("Azure APIs", 550, 50, 120, 60, "cloud"),
            ("Gemini AI", 550, 350, 120, 60, "cloud")
        ],
        "edges": [
            ("Mobile Interface", "Edge Ingestion", "WhatsApp Network"),
            ("Mobile Interface", "FastAPI Core", "REST API"),
            ("Edge Ingestion", "FastAPI Core", "Internal Async WebHook"),
            ("FastAPI Core", "Azure APIs", "Media Processing"),
            ("FastAPI Core", "Gemini AI", "Semantic Task Extraction"),
            ("FastAPI Core", "PostgreSQL DB", "Normalized Metadata")
        ]
    },
    "ieee_system_architecture.drawio": {
        "nodes": [
            ("Mobile Interface", 100, 200, 120, 60, "rectangle"),
            ("Edge Ingestion", 300, 200, 120, 60, "rectangle"),
            ("FastAPI Core", 550, 200, 120, 60, "rectangle"),
            ("PostgreSQL DB", 800, 200, 120, 60, "cylinder"),
            ("Azure APIs", 550, 50, 120, 60, "cloud"),
            ("Gemini AI", 550, 350, 120, 60, "cloud")
        ],
        "edges": [
            ("Mobile Interface", "Edge Ingestion", "WhatsApp Network"),
            ("Mobile Interface", "FastAPI Core", "REST API"),
            ("Edge Ingestion", "FastAPI Core", "Internal Async WebHook"),
            ("FastAPI Core", "Azure APIs", "Media Processing"),
            ("FastAPI Core", "Gemini AI", "Semantic Task Extraction"),
            ("FastAPI Core", "PostgreSQL DB", "Normalized Metadata")
        ]
    }
}

styles = {
    "rectangle": "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontFamily=Helvetica;fontSize=12;",
    "rounded": "rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontFamily=Helvetica;fontSize=12;",
    "ellipse": "ellipse;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontFamily=Helvetica;fontSize=12;",
    "rhombus": "rhombus;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontFamily=Helvetica;fontSize=12;",
    "cylinder": "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#e1d5e7;strokeColor=#9673a6;fontFamily=Helvetica;fontSize=12;",
    "cloud": "ellipse;shape=cloud;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontFamily=Helvetica;fontSize=12;",
    "cube": "shape=cube;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;darkOpacity=0.05;darkOpacity2=0.1;fillColor=#f5f5f5;fontColor=#333333;strokeColor=#666666;",
    "component": "shape=module;align=left;spacingLeft=20;align=center;verticalAlign=top;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontFamily=Helvetica;fontSize=12;"
}

def generate_drawio(diagram_data, filename):
    mxfile = ET.Element("mxfile", version="21.0.0")
    diagram = ET.SubElement(mxfile, "diagram", id="page-1", name="Page-1")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1000", dy="1000", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1169", pageHeight="827", math="0", shadow="0")
    root = ET.SubElement(mxGraphModel, "root")
    
    ET.SubElement(root, "mxCell", id="0")
    ET.SubElement(root, "mxCell", id="1", parent="0")
    
    node_ids = {}
    
    # Add nodes
    for i, (name, x, y, w, h, shape) in enumerate(diagram_data["nodes"]):
        node_id = f"node_{i}"
        node_ids[name] = node_id
        style = styles.get(shape, styles["rectangle"])
        cell = ET.SubElement(root, "mxCell", id=node_id, value=name, style=style, vertex="1", parent="1")
        ET.SubElement(cell, "mxGeometry", x=str(x), y=str(y), width=str(w), height=str(h), **{"as": "geometry"})
        
    # Add edges
    for i, (src, tgt, label) in enumerate(diagram_data["edges"]):
        edge_id = f"edge_{i}"
        src_id = node_ids.get(src)
        tgt_id = node_ids.get(tgt)
        
        if not src_id or not tgt_id:
            continue
            
        style = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;fontFamily=Helvetica;fontSize=11;labelBackgroundColor=#ffffff;"
        
        cell = ET.SubElement(root, "mxCell", id=edge_id, value=label, style=style, edge="1", parent="1", source=src_id, target=tgt_id)
        ET.SubElement(cell, "mxGeometry", relative="1", **{"as": "geometry"})
        
    xml_str = minidom.parseString(ET.tostring(mxfile)).toprettyxml(indent="  ")
    out_path = f"/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams/{filename}"
    with open(out_path, "w") as f:
        f.write(xml_str)
        
os.makedirs("/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams", exist_ok=True)

for filename, data in diagrams.items():
    generate_drawio(data, filename)

print("Diagram generation completed.")
