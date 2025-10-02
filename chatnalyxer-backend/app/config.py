from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_KEY: str = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4"

    class Config:
        env_file = ".env"

settings = Settings()