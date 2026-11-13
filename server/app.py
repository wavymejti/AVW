"""Sniffer backend. Stage 0: health check and config; /api/chat arrives in stage 3."""
from fastapi import FastAPI
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"


settings = Settings()
app = FastAPI(title="Sniffer API")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "model": settings.openai_model, "openai_key_set": bool(settings.openai_api_key)}
