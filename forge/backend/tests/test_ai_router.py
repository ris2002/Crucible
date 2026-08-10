"""
Routing tests for services.ai_router.stream_for_user.

We never hit a real Anthropic/OpenAI/Google endpoint here: each provider's
streaming function is monkeypatched with a fake async generator so the test
is fast, free, and deterministic. What we're actually verifying is:
  - the correct provider function is dispatched based on the `provider` arg
  - an unrecognized/missing provider falls back to Anthropic (the only
    fallback path that exists in the current implementation)
  - a failure inside the provider stream propagates instead of being
    swallowed silently
"""
import pytest

from services import ai_router


def make_fake_stream(marker, should_raise=False):
    async def _fake(api_key, model, system_text, messages):
        if should_raise:
            raise RuntimeError(f"{marker} provider is down")
        yield f"{marker}-chunk", None, None
        yield "", 42, 7
    return _fake


@pytest.mark.asyncio
async def test_routes_to_openai_when_provider_is_openai(monkeypatch):
    monkeypatch.setattr(ai_router, "stream_openai", make_fake_stream("openai"))
    monkeypatch.setattr(ai_router, "stream_anthropic", make_fake_stream("anthropic"))
    monkeypatch.setattr(ai_router, "stream_google", make_fake_stream("google"))

    chunks = [c async for c, _, _ in ai_router.stream_for_user(
        "openai", "key", "gpt-4o", "Technology", "Problem", [{"role": "user", "content": "hi"}]
    )]

    assert "openai-chunk" in chunks


@pytest.mark.asyncio
async def test_routes_to_google_when_provider_is_google(monkeypatch):
    monkeypatch.setattr(ai_router, "stream_google", make_fake_stream("google"))
    monkeypatch.setattr(ai_router, "stream_anthropic", make_fake_stream("anthropic"))
    monkeypatch.setattr(ai_router, "stream_openai", make_fake_stream("openai"))

    chunks = [c async for c, _, _ in ai_router.stream_for_user(
        "google", "key", "gemini-2.0-flash", "Technology", "Problem", [{"role": "user", "content": "hi"}]
    )]

    assert "google-chunk" in chunks


@pytest.mark.asyncio
@pytest.mark.parametrize("unknown_provider", ["anthropic", "", "not-a-real-provider", None])
async def test_unrecognized_provider_falls_back_to_anthropic(monkeypatch, unknown_provider):
    monkeypatch.setattr(ai_router, "stream_anthropic", make_fake_stream("anthropic"))
    monkeypatch.setattr(ai_router, "stream_openai", make_fake_stream("openai"))
    monkeypatch.setattr(ai_router, "stream_google", make_fake_stream("google"))

    chunks = [c async for c, _, _ in ai_router.stream_for_user(
        unknown_provider, "key", "some-model", "Technology", "Problem", [{"role": "user", "content": "hi"}]
    )]

    assert "anthropic-chunk" in chunks


@pytest.mark.asyncio
async def test_provider_failure_propagates_instead_of_being_swallowed(monkeypatch):
    monkeypatch.setattr(ai_router, "stream_openai", make_fake_stream("openai", should_raise=True))

    with pytest.raises(RuntimeError, match="openai provider is down"):
        async for _ in ai_router.stream_for_user(
            "openai", "key", "gpt-4o", "Technology", "Problem", [{"role": "user", "content": "hi"}]
        ):
            pass


@pytest.mark.asyncio
async def test_final_chunk_carries_token_usage(monkeypatch):
    monkeypatch.setattr(ai_router, "stream_anthropic", make_fake_stream("anthropic"))

    results = [(c, i, o) async for c, i, o in ai_router.stream_for_user(
        "anthropic", "key", "claude-sonnet-4-6", "Technology", "Problem", [{"role": "user", "content": "hi"}]
    )]

    text_chunk, in_tok, out_tok = results[0]
    final_chunk, final_in, final_out = results[-1]
    assert text_chunk == "anthropic-chunk"
    assert final_chunk == ""
    assert (final_in, final_out) == (42, 7)
