import os
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential
import logging

logger = logging.getLogger(__name__)

# Azure Computer Vision credentials
AZURE_CV_ENDPOINT = os.getenv("AZURE_CV_ENDPOINT")
AZURE_CV_KEY = os.getenv("AZURE_CV_KEY")

async def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from an image using Azure Computer Vision OCR.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Extracted text content
    """
    try:
        if not AZURE_CV_ENDPOINT or not AZURE_CV_KEY:
            logger.warning("Azure Computer Vision not configured, skipping OCR")
            return ""
        
        client = ImageAnalysisClient(
            endpoint=AZURE_CV_ENDPOINT,
            credential=AzureKeyCredential(AZURE_CV_KEY)
        )
        
        # Read image file
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        # Analyze image for text
        result = client.analyze(
            image_data=image_data,
            visual_features=[VisualFeatures.READ]
        )
        
        # Extract text from results
        if result.read and result.read.blocks:
            text_lines = []
            for block in result.read.blocks:
                for line in block.lines:
                    text_lines.append(line.text)
            
            extracted_text = "\n".join(text_lines)
            logger.info(f"Extracted {len(extracted_text)} chars from image")
            return extracted_text
        
        return ""
    
    except Exception as e:
        logger.error(f"Image OCR failed: {e}")
        return ""
