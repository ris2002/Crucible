"""
Unified streaming AI router for Alchemist tier.
Dispatches to Anthropic, OpenAI, or Google Gemini based on the user's stored provider.
Returns (text_chunk_async_generator, get_token_counts_fn).
"""
import asyncio
from services.anthropic_service import build_system_prompt_text, parse_forge_ready, MODEL as DEFAULT_MODEL

PROVIDERS = {
    "anthropic": {
        "label": "Anthropic (Claude)",
        "models": [
            {"id": "claude-opus-4-7", "label": "Claude Opus 4.7 — most powerful"},
            {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6 — balanced"},
            {"id": "claude-haiku-4-5-20251001", "label": "Claude Haiku 4.5 — fast"},
        ],
    },
    "openai": {
        "label": "OpenAI (ChatGPT)",
        "models": [
            {"id": "gpt-4o", "label": "GPT-4o — most capable"},
            {"id": "gpt-4o-mini", "label": "GPT-4o Mini — fast & cheap"},
        ],
    },
    "google": {
        "label": "Google (Gemini)",
        "models": [
            {"id": "gemini-2.0-flash", "label": "Gemini 2.0 Flash — fast"},
            {"id": "gemini-1.5-pro", "label": "Gemini 1.5 Pro — powerful"},
            {"id": "gemini-1.5-flash", "label": "Gemini 1.5 Flash — balanced"},
        ],
    },
}


async def stream_anthropic(api_key: str, model: str, system_text: str, messages: list):
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=api_key)
    system = [{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}]
    input_tokens = output_tokens = 0
    accumulated = ""
    async with client.messages.stream(
        model=model or DEFAULT_MODEL,
        max_tokens=1000,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            accumulated += text
            yield text, None, None
        final = await stream.get_final_message()
        input_tokens = getattr(final.usage, "input_tokens", 0)
        output_tokens = getattr(final.usage, "output_tokens", 0)
    yield "", input_tokens, output_tokens


async def stream_openai(api_key: str, model: str, system_text: str, messages: list):
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key)
    oai_messages = [{"role": "system", "content": system_text}] + [
        {"role": m["role"], "content": m["content"]} for m in messages
    ]
    input_tokens = output_tokens = 0
    stream = await client.chat.completions.create(
        model=model or "gpt-4o",
        messages=oai_messages,
        max_tokens=1000,
        stream=True,
        stream_options={"include_usage": True},
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content, None, None
        if hasattr(chunk, "usage") and chunk.usage:
            input_tokens = chunk.usage.prompt_tokens or 0
            output_tokens = chunk.usage.completion_tokens or 0
    yield "", input_tokens, output_tokens


async def stream_google(api_key: str, model: str, system_text: str, messages: list):
    import google.generativeai as genai
    genai.configure(api_key=api_key)

    history = []
    for m in messages[:-1]:
        role = "user" if m["role"] == "user" else "model"
        history.append({"role": role, "parts": [m["content"]]})
    last_msg = messages[-1]["content"] if messages else ""

    gemini_model = genai.GenerativeModel(
        model_name=model or "gemini-2.0-flash",
        system_instruction=system_text,
    )
    chat = gemini_model.start_chat(history=history)

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: chat.send_message(last_msg, stream=True)
    )

    input_tokens = output_tokens = 0
    for chunk in response:
        if chunk.text:
            yield chunk.text, None, None
    try:
        usage = response.usage_metadata
        input_tokens = getattr(usage, "prompt_token_count", 0) or 0
        output_tokens = getattr(usage, "candidates_token_count", 0) or 0
    except Exception:
        pass
    yield "", input_tokens, output_tokens


async def stream_for_user(provider: str, api_key: str, model: str,
                          domain: str, genre: str, messages: list, build_context: str = None):
    system_text = build_system_prompt_text(domain, genre, build_context)
    if provider == "openai":
        gen = stream_openai(api_key, model, system_text, messages)
    elif provider == "google":
        gen = stream_google(api_key, model, system_text, messages)
    else:
        gen = stream_anthropic(api_key, model, system_text, messages)
    async for chunk, in_tok, out_tok in gen:
        yield chunk, in_tok, out_tok
