"""
Azure Media Analyzer Service
Processes PDFs and images in-memory using Azure AI services.
No files are saved - only extracted text is returned.
"""

from io import BytesIO
import os
from typing import Optional
import logging

# Optional Azure imports - gracefully degrade if not available
try:
    from azure.ai.documentintelligence import DocumentIntelligenceClient
    DOCUMENT_INTELLIGENCE_AVAILABLE = True
except ImportError:
    DOCUMENT_INTELLIGENCE_AVAILABLE = False
    DocumentIntelligenceClient = None

try:
    from azure.ai.vision.imageanalysis import ImageAnalysisClient
    from azure.core.credentials import AzureKeyCredential
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False
    ImageAnalysisClient = None
    AzureKeyCredential = None

logger = logging.getLogger(__name__)


class AzureMediaAnalyzer:
    """
    Analyzes media files (PDFs, images) using Azure AI services.
    All processing is done in-memory - no files are saved.
    """
    
    def __init__(self):
        # Document Intelligence for PDFs
        self.doc_endpoint = os.getenv("AZURE_DOC_INTELLIGENCE_ENDPOINT")
        self.doc_key = os.getenv("AZURE_DOC_INTELLIGENCE_KEY")
        
        # Vision API for images
        self.vision_endpoint = os.getenv("AZURE_VISION_ENDPOINT")
        self.vision_key = os.getenv("AZURE_VISION_KEY")
        
        if not all([self.doc_endpoint, self.doc_key, self.vision_endpoint, self.vision_key]):
            logger.warning("Azure AI credentials not fully configured. Media analysis will be limited.")
    
    def analyze_pdf(self, buffer: bytes) -> Optional[str]:
        """
        Extract text from PDF buffer using Azure Document Intelligence.
        
        Args:
            buffer: PDF file as bytes (in-memory)
            
        Returns:
            Extracted text content or None if failed
        """
        try:
            if not DOCUMENT_INTELLIGENCE_AVAILABLE:
                logger.warning("Azure Document Intelligence package not installed")
                return None
            
            if not self.doc_endpoint or not self.doc_key:
                logger.error("Azure Document Intelligence not configured")
                return None
            
            client = DocumentIntelligenceClient(
                endpoint=self.doc_endpoint,
                credential=AzureKeyCredential(self.doc_key)
            )
            
            # Analyze document from buffer
            poller = client.begin_analyze_document(
                model_id="prebuilt-read",
                analyze_request=BytesIO(buffer),
                content_type="application/pdf"
            )
            
            result = poller.result()
            
            # Extract all text content
            full_text = result.content if hasattr(result, 'content') else ""
            
            logger.info(f"Extracted {len(full_text)} characters from PDF")
            return full_text
            
        except Exception as e:
            logger.error(f"PDF analysis failed: {str(e)}")
            return None
    
    def analyze_image(self, buffer: bytes) -> Optional[str]:
        """
        Extract text and generate caption from image using Azure Vision API.
        
        Args:
            buffer: Image file as bytes (in-memory)
            
        Returns:
            Combined caption and OCR text or None if failed
        """
        try:
            if not VISION_AVAILABLE:
                logger.warning("Azure Vision API package not installed")
                return None
            
            if not self.vision_endpoint or not self.vision_key:
                logger.error("Azure Vision API not configured")
                return None
            
            client = ImageAnalysisClient(
                endpoint=self.vision_endpoint,
                credential=AzureKeyCredential(self.vision_key)
            )
            
            # Analyze image for both caption and text
            result = client.analyze(
                image_data=buffer,
                visual_features=["READ", "CAPTION"]
            )
            
            # Combine caption and OCR text
            parts = []
            
            # Add caption if available
            if hasattr(result, 'caption') and result.caption:
                parts.append(f"Image: {result.caption.text}")
            
            # Add OCR text if available
            if hasattr(result, 'read') and result.read:
                ocr_lines = []
                for block in result.read.blocks:
                    for line in block.lines:
                        ocr_lines.append(line.text)
                if ocr_lines:
                    parts.append("Text in image:")
                    parts.extend(ocr_lines)
            
            full_text = "\n".join(parts)
            logger.info(f"Extracted {len(full_text)} characters from image")
            return full_text
            
        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}")
            return None
    
    def analyze_media(self, buffer: bytes, media_type: str) -> Optional[str]:
        """
        Analyze media buffer based on type.
        
        Args:
            buffer: Media file as bytes
            media_type: 'pdf' or 'image'
            
        Returns:
            Extracted text content or None if failed
        """
        if media_type == "pdf":
            return self.analyze_pdf(buffer)
        elif media_type == "image":
            return self.analyze_image(buffer)
        else:
            logger.warning(f"Unsupported media type: {media_type}")
            return None


# Singleton instance
_analyzer = None

def get_media_analyzer() -> AzureMediaAnalyzer:
    """Get or create the media analyzer instance"""
    global _analyzer
    if _analyzer is None:
        _analyzer = AzureMediaAnalyzer()
    return _analyzer
