"""Cortex Configuration Loader."""
import os
from pathlib import Path
from typing import Any

import yaml


class Config:
    """Cortex configuration loaded from config.yaml."""

    def __init__(self, config_path: str | None = None):
        if config_path is None:
            config_path = Path(__file__).parent.parent / "config.yaml"
        else:
            config_path = Path(config_path)
        self._config_path = config_path

        with open(config_path) as f:
            self._raw = yaml.safe_load(f)

        self._resolve_env_vars(self._raw)

    def _resolve_env_vars(self, obj: Any) -> None:
        """Recursively resolve ${ENV_VAR} references."""
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
                    env_var = value[2:-1]
                    obj[key] = os.environ.get(env_var, "")
                else:
                    self._resolve_env_vars(value)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                if isinstance(item, str) and item.startswith("${") and item.endswith("}"):
                    env_var = item[2:-1]
                    obj[i] = os.environ.get(env_var, "")
                else:
                    self._resolve_env_vars(item)

    def set(self, key: str, value: Any) -> None:
        """Set a config value using dot notation (e.g., 'llm.api_key')."""
        keys = key.split(".")
        obj = self._raw
        for k in keys[:-1]:
            if k not in obj:
                obj[k] = {}
            obj = obj[k]
        obj[keys[-1]] = value

    def save(self) -> None:
        """Save configuration back to YAML file."""
        with open(self._config_path, "w") as f:
            yaml.safe_dump(self._raw, f, default_flow_style=False, sort_keys=False)

    @property
    def app(self) -> dict:
        return self._raw.get("app", {})

    @property
    def data(self) -> dict:
        return self._raw.get("data", {})

    @property
    def llm(self) -> dict:
        return self._raw.get("llm", {})

    @property
    def compile(self) -> dict:
        return self._raw.get("compile", {})

    @property
    def search(self) -> dict:
        return self._raw.get("search", {})

    @property
    def lint(self) -> dict:
        return self._raw.get("lint", {})

    def get_llm_config(self, task: str | None = None) -> dict:
        """Get LLM configuration for a specific task."""
        llm_config = self.llm.copy()
        if task:
            model = self.llm.get("models", {}).get(task)
            if model:
                llm_config["model"] = model
        return llm_config

    @property
    def data_base_path(self) -> Path:
        base = self.data.get("base_path", "./backend/data")
        return Path(__file__).parent.parent / base

    @property
    def raw_dir(self) -> Path:
        return self.data_base_path / self.data.get("raw_dir", "raw")

    @property
    def wiki_dir(self) -> Path:
        return self.data_base_path / self.data.get("wiki_dir", "wiki")

    @property
    def output_dir(self) -> Path:
        return self.data_base_path / self.data.get("output_dir", "output")


# Global config instance
config = Config()
