import fitz  # PyMuPDF
import logging
import os

logger = logging.getLogger(__name__)

class PDFProcessor:
    """
    Service to handle PDF text extraction for RAG Chatbot
    """

    def extract_text_from_file(self, file_path: str) -> str:
        """
        Extracts all text from a PDF file.
        
        Args:
            file_path: Absolute path to the PDF file
            
        Returns:
            Extracted text content or empty string if failed
        """
        if not os.path.exists(file_path):
            logger.error(f"PDF file not found: {file_path}")
            return ""

        try:
            doc = fitz.open(file_path)
            full_text = []

            for page_num, page in enumerate(doc):
                text = page.get_text()
                if text.strip():
                    full_text.append(f"--- Page {page_num + 1} ---\n{text}")
            
            doc.close()
            return "\n".join(full_text)

        except Exception as e:
            logger.error(f"Failed to extract text from PDF {file_path}: {e}")
            return ""

    def extract_text_from_bytes(self, file_bytes: bytes) -> str:
        """
        Extracts text from PDF bytes (for in-memory processing)
        """
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            full_text = []

            for page_num, page in enumerate(doc):
                text = page.get_text()
                if text.strip():
                    full_text.append(f"--- Page {page_num + 1} ---\n{text}")
            
            doc.close()
            return "\n".join(full_text)

        except Exception as e:
            logger.error(f"Failed to extract text from PDF bytes: {e}")
            return ""

pdf_processor = PDFProcessor()
