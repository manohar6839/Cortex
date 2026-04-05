"""LLM Service - MiniMax API client (OpenAI-compatible)."""
import json
from typing import Any, AsyncGenerator

from openai import AsyncOpenAI

from ..config import config


class LLMService:
    """MiniMax API client using OpenAI-compatible interface."""

    def __init__(self, api_key: str | None = None, base_url: str | None = None, model: str | None = None):
        llm_config = config.llm
        self.client = AsyncOpenAI(
            api_key=api_key or llm_config.get("api_key", ""),
            base_url=base_url or llm_config.get("base_url", "https://api.minimax.chat/v1"),
        )
        self.model = model or llm_config.get("model", "MiniMax-Text-01")

    async def complete(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a completion from the LLM."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def complete_json(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """Generate a JSON completion from the LLM."""
        text = await self.complete(prompt, system=system, temperature=temperature)
        # Try to extract JSON from the response
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        return json.loads(text)

    async def stream_complete(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream a completion from the LLM."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


# Default instance
llm_service = LLMService()
