"""
Cost/production-safety tests for services.anthropic_service.get_forge_response.

Real latency/cost numbers aren't meaningful against a mocked client, so
instead we test the *mechanisms* that actually bound cost in production:
  - the tool-use loop is hard-capped at max_iterations=8, so a model stuck
    calling tools can't run away and burn unbounded tokens/spend
  - token usage is correctly summed across every iteration, which is what
    a real budget/rate-limit check would be built on
  - a lightweight "budget" assertion pattern: fail loudly if a single
    request's aggregated usage exceeds a sane cap
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

from services import anthropic_service


def fake_response(stop_reason, content_blocks, input_tokens, output_tokens):
    return SimpleNamespace(
        stop_reason=stop_reason,
        content=content_blocks,
        usage=SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens),
    )


def text_block(text):
    return SimpleNamespace(text=text)


def tool_use_block(name="web_search", tool_id="tool_1", tool_input=None):
    return SimpleNamespace(type="tool_use", id=tool_id, name=name, input=tool_input or {})


def test_tool_loop_is_capped_at_max_iterations(monkeypatch):
    """A model that never stops calling tools must not run away indefinitely."""
    always_tool_use = fake_response("tool_use", [tool_use_block()], input_tokens=10, output_tokens=5)
    mock_create = MagicMock(return_value=always_tool_use)
    monkeypatch.setattr(anthropic_service.client.messages, "create", mock_create)

    text, in_tok, out_tok = anthropic_service.get_forge_response(
        messages=[{"role": "user", "content": "find me something obscure"}],
        domain="Technology",
        genre="Question",
    )

    assert mock_create.call_count == 8, "loop must stop at max_iterations, not run forever"
    assert text == "I need more information to continue. What would you like to explore further?"
    assert in_tok == 10 * 8
    assert out_tok == 5 * 8


def test_token_usage_aggregates_across_tool_iterations(monkeypatch):
    responses = [
        fake_response("tool_use", [tool_use_block()], input_tokens=100, output_tokens=20),
        fake_response("end_turn", [text_block("Final answer.")], input_tokens=50, output_tokens=30),
    ]
    mock_create = MagicMock(side_effect=responses)
    monkeypatch.setattr(anthropic_service.client.messages, "create", mock_create)

    text, in_tok, out_tok = anthropic_service.get_forge_response(
        messages=[{"role": "user", "content": "what's new in fusion research?"}],
        domain="Science",
        genre="Question",
    )

    assert mock_create.call_count == 2
    assert text == "Final answer."
    assert in_tok == 150
    assert out_tok == 50


def test_single_request_stays_within_token_budget(monkeypatch):
    """
    Lightweight cost-guard pattern: assert aggregated usage for one
    request stays under a sane cap. In production this threshold would
    back an actual alert/kill-switch, not just a test.
    """
    MAX_TOTAL_TOKENS_PER_REQUEST = 5000

    responses = [
        fake_response("tool_use", [tool_use_block()], input_tokens=300, output_tokens=100),
        fake_response("end_turn", [text_block("Final answer.")], input_tokens=200, output_tokens=150),
    ]
    mock_create = MagicMock(side_effect=responses)
    monkeypatch.setattr(anthropic_service.client.messages, "create", mock_create)

    _, in_tok, out_tok = anthropic_service.get_forge_response(
        messages=[{"role": "user", "content": "pressure test this idea"}],
        domain="Technology",
        genre="Solution",
    )

    assert in_tok + out_tok <= MAX_TOTAL_TOKENS_PER_REQUEST
