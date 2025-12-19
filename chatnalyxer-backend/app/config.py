from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_KEY: str = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4"
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Azure AI Settings
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_KEY: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4"
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    
    AZURE_VISION_ENDPOINT: str = ""
    AZURE_VISION_KEY: str = ""
    
    AZURE_SPEECH_KEY: str = ""
    AZURE_SPEECH_REGION: str = "eastus"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
