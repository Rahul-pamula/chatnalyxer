import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)

class TrainingDataCollector:
    def __init__(self, data_file: str = "training_data.jsonl"):
        self.data_path = Path(data_file)
        
    def save_example(self, 
                    input_text: str, 
                    user_type: str, 
                    analysis_result: Dict[str, Any], 
                    model_used: str):
        """
        Save a training example: Input (text + context) -> Output (Analysis)
        """
        try:
            entry = {
                "timestamp": datetime.now().isoformat(),
                "input": {
                    "text": input_text,
                    "user_type": user_type
                },
                "output": analysis_result,
                "metadata": {
                    "model": model_used
                }
            }
            
            # Append as JSONL (line-delimited JSON)
            with open(self.data_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
                
            logger.info(f"💾 Saved training example to {self.data_path}")
            
        except Exception as e:
            logger.error(f"Failed to save training data: {e}")

# Global instance
collector = TrainingDataCollector()
