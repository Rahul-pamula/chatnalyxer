import os

pdf_content = b"%PDF-1.1\n%\xc2\xa5\xc2\xb1\xc3\xab\n1 0 obj\n<< /Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<< /Type /Pages\n/Kids [3 0 R]\n/Count 1\n/MediaBox [0 0 300 144]\n>>\nendobj\n3 0 obj\n<<  /Type /Page\n/Parent 2 0 R\n/Resources\n<< /Font\n<< /F1\n<< /Type /Font\n/Subtype /Type1\n/BaseFont /Times-Roman\n>>\n>>\n>>\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT\n/F1 18 Tf\n0 0 Td\n(Dummy PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000018 00000 n \n0000000077 00000 n \n0000000178 00000 n \n0000000457 00000 n \ntrailer\n<<  /Root 1 0 R\n/Size 5\n>>\nstartxref\n565\n%%EOF\n"

filenames = [
    "system_architecture.pdf",
    "ai_processing_flowchart.pdf"
]
os.makedirs("/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/figures", exist_ok=True)

for fn in filenames:
    with open(f"/Users/rahul/Desktop/chatnalyxer/docs/research_paper_tex/figures/{fn}", "wb") as f:
        f.write(pdf_content)

print("Dummy PDFs created.")
