"""Settings router - configuration management."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import config

router = APIRouter()


class LLMProvider(BaseModel):
    name: str
    api_key: str
    base_url: str
    model: str
    connected: bool = False


class ModelAssignment(BaseModel):
    ingest: str
    compile: str
    qa: str
    lint: str


class SettingsUpdate(BaseModel):
    llm_provider: LLMProvider | None = None
    model_assignment: ModelAssignment | None = None
    general: dict | None = None


@router.get("")
async def get_settings():
    """Get current settings."""
    llm_config = config.llm

    return {
        "llm_provider": {
            "name": llm_config.get("provider", "minimax"),
            "api_key": "***" + llm_config.get("api_key", "")[-4:] if llm_config.get("api_key") else "",
            "base_url": llm_config.get("base_url", ""),
            "model": llm_config.get("model", ""),
        },
        "model_assignment": {
            "ingest": llm_config.get("models", {}).get("ingest", llm_config.get("model", "")),
            "compile": llm_config.get("models", {}).get("compile", llm_config.get("model", "")),
            "qa": llm_config.get("models", {}).get("qa", llm_config.get("model", "")),
            "lint": llm_config.get("models", {}).get("lint", llm_config.get("model", "")),
        },
        "general": {
            "theme": "dark",
            "data_path": str(config.data.get("base_path", "./backend/data")),
            "auto_compile": config.compile.get("auto_on_ingest", True),
            "batch_size": config.compile.get("batch_size", 5),
        },
    }


@router.put("")
async def update_settings(settings: SettingsUpdate):
    """Update settings and persist to config.yaml."""
    try:
        if settings.llm_provider:
            if settings.llm_provider.api_key and not settings.llm_provider.api_key.startswith("***"):
                config.set("llm.api_key", settings.llm_provider.api_key)
            if settings.llm_provider.base_url:
                config.set("llm.base_url", settings.llm_provider.base_url)
            if settings.llm_provider.model:
                config.set("llm.model", settings.llm_provider.model)

        if settings.model_assignment:
            models = {}
            if settings.model_assignment.ingest:
                models["ingest"] = settings.model_assignment.ingest
            if settings.model_assignment.compile:
                models["compile"] = settings.model_assignment.compile
            if settings.model_assignment.qa:
                models["qa"] = settings.model_assignment.qa
            if settings.model_assignment.lint:
                models["lint"] = settings.model_assignment.lint
            if models:
                config.set("llm.models", models)

        if settings.general:
            if settings.general.get("auto_compile") is not None:
                config.set("compile.auto_on_ingest", settings.general["auto_compile"])
            if settings.general.get("batch_size") is not None:
                config.set("compile.batch_size", settings.general["batch_size"])
            if settings.general.get("data_path") is not None:
                config.set("data.base_path", settings.general["data_path"])

        config.save()

        return {"status": "updated", "message": "Settings saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")


@router.get("/models")
async def list_models():
    """List available models for the configured provider."""
    # Return a list of models available for MiniMax
    # In reality, this would call the API to get model list
    return {
        "providers": [
            {
                "name": "MiniMax",
                "models": [
                    {"id": "MiniMax-Text-01", "name": "MiniMax Text 01"},
                    {"id": "abab6.5s-chat", "name": "ABAB 6.5S Chat"},
                    {"id": "abab6-chat", "name": "ABAB 6 Chat"},
                ],
            }
        ]
    }
