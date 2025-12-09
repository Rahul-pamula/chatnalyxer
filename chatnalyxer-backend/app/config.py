from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_KEY: str = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4"
    GEMINI_API_KEY: str = "AIzaSyBfimXeiq0_OkUmHdA1wG6Hp661Z4M27qg"

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }


settings = Settings()
