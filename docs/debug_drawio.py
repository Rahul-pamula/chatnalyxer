import os
import xml.etree.ElementTree as ET

filepath = "/Users/rahul/Desktop/chatnalyxer/docs/research_paper_diagrams/Fig2_AI_Processing_Pipeline.drawio"
tree = ET.parse(filepath)
root = tree.getroot()

print(f"Analyzing {filepath}")

for cell in root.findall(".//mxCell"):
    geom = cell.find("mxGeometry")
    if geom is not None:
        style = cell.get("style", "")
        print(f"Cell ID: {cell.get('id')}, Value: '{cell.get('value', '')[0:20]}...', IsEdge: {cell.get('edge')}, x: {geom.get('x')}, y: {geom.get('y')}, w: {geom.get('width')}, h: {geom.get('height')}")
        
        for pt in geom.findall(".//mxPoint"):
            print(f"  Point x: {pt.get('x')}, y: {pt.get('y')}")

graph_model = root.find(".//mxGraphModel")
if graph_model is not None:
    print(f"PageWidth: {graph_model.get('pageWidth')}, PageHeight: {graph_model.get('pageHeight')}")
