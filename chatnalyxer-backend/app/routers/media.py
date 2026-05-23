"""
Media Analysis Router
Handles PDF and image analysis using Azure AI services.
Processes media in-memory without saving files.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.azure_media_analyzer import get_media_analyzer
import logging

router = APIRouter(prefix="/media", tags=["Media Analysis"])
logger = logging.getLogger(__name__)


@router.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Analyze PDF file and extract text using Azure Document Intelligence.
    File is processed in-memory - not saved to disk.
    """
    try:
        # Read file to memory
        contents = await file.read()
        logger.info(f"Received PDF: {file.filename}, {len(contents)} bytes")
        
        # Get Azure media analyzer
        analyzer = get_media_analyzer()
        
        # Extract text from PDF buffer
        extracted_text = analyzer.analyze_pdf(contents)
        
        if not extracted_text:
            raise HTTPException(status_code=500, detail="Failed to extract text from PDF")
        
        logger.info(f"Extracted {len(extracted_text)} characters from PDF")
        
        return {
            "success": True,
            "extracted_text": extracted_text,
            "filename": file.filename,
            "size_bytes": len(contents)
        }
        
    except Exception as e:
        logger.error(f"PDF analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {str(e)}")


@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze image and extract text + caption using Azure Vision API.
    File is processed in-memory - not saved to disk.
    """
    try:
        # Read file to memory
        contents = await file.read()
        logger.info(f"Received image: {file.filename}, {len(contents)} bytes")
        
        # Get Azure media analyzer
        analyzer = get_media_analyzer()
        
        # Extract text and caption from image buffer
        extracted_text = analyzer.analyze_image(contents)
        
        if not extracted_text:
            raise HTTPException(status_code=500, detail="Failed to analyze image")
        
        logger.info(f"Extracted {len(extracted_text)} characters from image")
        
        return {
            "success": True,
            "extracted_text": extracted_text,
            "filename": file.filename,
            "size_bytes": len(contents)
        }
        
    except Exception as e:
        logger.error(f"Image analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")
