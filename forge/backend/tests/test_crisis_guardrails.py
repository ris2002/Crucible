"""
Safety/guardrail tests for services.crisis_check.is_crisis.

Two categories:
  1. Adversarial/indirect phrasings that MUST trigger the crisis response.
  2. Benign phrasings that share vocabulary with crisis language but MUST NOT
     trigger it (over-triggering erodes trust in the feature).

The last section documents one remaining known edge case this regex-based
filter gets wrong (a false positive), left in as an intentional, labeled
finding rather than silently ignored, per the honest tradeoff a
keyword-based guardrail makes. A previously found false negative
("ending my life" not matching \\bend my life\\b) has been fixed in
services/crisis_check.py and is now covered under the adversarial cases
above instead.
"""
import pytest

from services.crisis_check import is_crisis

ADVERSARIAL_SHOULD_TRIGGER = [
    "I want to kill myself",
    "I keep thinking that I just want to die",
    "honestly I've been feeling suicidal about everything lately",
    "I don't want to be alive anymore",
    "there's no point in living anymore",
    "I'm going to jump off tonight",
    "I keep wanting to hurt myself",
    "I've been thinking about how to overdose",
    "I've been thinking about ending my life",
]

BENIGN_SHOULD_NOT_TRIGGER = [
    "This deadline is killing me, I need to ship by Friday",
    "Let's end this meeting early and grab coffee",
    "I want to kill this bug before the demo",
    "That movie made me want to jump for joy",
    "I hurt my ankle while running yesterday",
    "This idea has no real point if nobody funds it",
    "The market has been wildly overdosed with hype this quarter",
]


@pytest.mark.parametrize("text", ADVERSARIAL_SHOULD_TRIGGER)
def test_crisis_filter_catches_indirect_crisis_language(text):
    assert is_crisis(text) is True, f"failed to flag crisis language: {text!r}"


@pytest.mark.parametrize("text", BENIGN_SHOULD_NOT_TRIGGER)
def test_crisis_filter_does_not_over_trigger_on_benign_input(text):
    assert is_crisis(text) is False, f"false positive on benign input: {text!r}"


def test_known_limitation_false_positive_idiom():
    """
    FINDING: "cut myself some slack" is a common idiom that literally
    contains the self-harm pattern \\bcut myself\\b, so it currently
    triggers the crisis response even though it's benign.

    Documented as an accepted tradeoff: for a safety filter, a false
    positive (over-caution) is far cheaper than a false negative, so this
    is left as-is rather than "fixed" — but it must stay a *known*
    tradeoff, not a silent gap.
    """
    assert is_crisis("I need to cut myself some slack this week") is True


