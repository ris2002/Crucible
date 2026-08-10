"""
Eval/regression tests for LLM-shaped output.

We can't assert exact-match on generated text, so instead we assert on
*structure*: does the parser correctly extract a well-formed idea block,
does the system prompt still contain the safety-critical clauses, and does
malformed/absent output degrade gracefully instead of raising.

Each entry in GOLDEN_CASES stands in for a "known good" model response.
If a future prompt-engineering change breaks the CRUCIBLE_READY contract,
these fail immediately instead of surfacing as silent data corruption.
"""
from services.anthropic_service import (
    build_system_prompt_text,
    parse_forge_ready,
)

GOLDEN_CASES = [
    {
        "domain": "Technology",
        "genre": "Solution",
        "raw_output": (
            "That's a sharp framing of the tradeoff.\n\n"
            "---CRUCIBLE_READY---\n"
            "TITLE: Rate limiting should be pushed to the client, not just the server\n"
            "SUMMARY: " + (" ".join(["word"] * 350)) + "\n"
            "TAGS: infra, backend, ratelimiting, systemsdesign, reliability\n"
            "---END---"
        ),
    },
    {
        "domain": "Philosophy",
        "genre": "Contradiction",
        "raw_output": (
            "You've resolved the tension well.\n\n"
            "---CRUCIBLE_READY---\n"
            "TITLE: Free will and determinism are not actually in conflict\n"
            "SUMMARY: " + (" ".join(["claim"] * 400)) + "\n"
            "TAGS: #philosophy, #freewill, #determinism, #ethics, #metaphysics\n"
            "---END---"
        ),
    },
]


def test_parse_forge_ready_extracts_well_formed_schema():
    for case in GOLDEN_CASES:
        result, preamble = parse_forge_ready(case["raw_output"])

        assert result is not None, f"failed to detect ready-block for {case['genre']}"
        assert isinstance(preamble, str) and preamble.strip() != ""

        # required fields present
        assert set(result.keys()) == {"title", "summary", "tags"}

        # TITLE: non-empty, roughly declarative length (10-15 words per prompt spec)
        title_words = result["title"].split()
        assert 1 <= len(title_words) <= 20
        assert "?" not in result["title"], "title must be declarative, not a question"

        # SUMMARY: non-trivial length (prompt asks for 330-480 words)
        summary_words = result["summary"].split()
        assert len(summary_words) >= 100, "summary suspiciously short for a full argument"

        # TAGS: exactly up to 5, lowercase-friendly, no leading '#' leaked through
        assert 1 <= len(result["tags"]) <= 5
        assert all(not t.startswith("#") for t in result["tags"]), "tags must strip leading #"


def test_parse_forge_ready_returns_none_when_absent():
    plain_text = "That idea still needs more evidence. What data backs the claim?"
    result, preamble = parse_forge_ready(plain_text)
    assert result is None
    assert preamble == plain_text


def test_parse_forge_ready_does_not_raise_on_truncated_block():
    truncated = "Some preamble.\n\n---CRUCIBLE_READY---\nTITLE: Cut off mid"
    result, preamble = parse_forge_ready(truncated)
    assert result["title"] == "Cut off mid"
    assert result["summary"] == ""
    assert result["tags"] == []


def test_system_prompt_regression_safety_clauses_present():
    """
    Locks in the safety-critical instructions so a future prompt edit
    can't silently drop crisis handling or the anti-markdown rule.
    """
    text = build_system_prompt_text("Technology", "Problem")
    assert "CRISIS PROTOCOL" in text
    assert "No markdown" in text
    assert "GENRE: PROBLEM" in text
    assert "DOMAIN: Technology" in text


def test_system_prompt_includes_build_context_when_provided():
    text = build_system_prompt_text("Technology", "Problem", build_context="prior draft notes")
    assert "BUILD CONTEXT: prior draft notes" in text

    text_without = build_system_prompt_text("Technology", "Problem")
    assert "BUILD CONTEXT" not in text_without


def test_system_prompt_unknown_genre_degrades_gracefully():
    # Should not raise even if genre isn't in the known instruction set.
    text = build_system_prompt_text("Technology", "NotARealGenre")
    assert "DOMAIN: Technology" in text
    assert "GENRE: NotARealGenre" in text
