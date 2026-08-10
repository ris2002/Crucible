import re

_PATTERNS = [
    r"\bkill myself\b",
    r"\bkilling myself\b",
    r"\bend(?:ing)? my life\b",
    r"\btake my life\b",
    r"\bend it all\b",
    r"\bwant to die\b",
    r"\bwanting to die\b",
    r"\bdon'?t want to (be )?alive\b",
    r"\bnot want to (be )?alive\b",
    r"\bno reason to live\b",
    r"\bnot worth living\b",
    r"\blife (is(n'?t)?|isn'?t) worth (living|it)\b",
    r"\bsuicidal\b",
    r"\bsuicide\b",
    r"\bself[- ]harm\b",
    r"\bcut myself\b",
    r"\bhurt myself\b",
    r"\bharm myself\b",
    r"\boverdose\b",
    r"\bhang myself\b",
    r"\bslit my (wrists?|throat)\b",
    r"\bjump off\b",
    r"\bdon'?t want to (be here|exist|live)\b",
    r"\bno point (in )?living\b",
    r"\bno point (in )?(being )?alive\b",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _PATTERNS]

CRISIS_RESPONSE = """What you are describing is beyond what the Crucible is built for, and it sounds like you may be going through something serious. Please reach out to someone who can actually help right now.

If you are in the UK: Samaritans — call or text 116 123 (free, 24/7) or text SHOUT to 85258.
If you are in the US: call or text 988 (Suicide & Crisis Lifeline, 24/7).
If you are in India: iCall — 9152987821 (Mon-Sat, 8am-10pm).
If you are in Australia: Lifeline — 13 11 14 (24/7).
If you are elsewhere: visit findahelpline.com — it lists crisis lines for every country.

You do not have to be alone with this."""


def is_crisis(text: str) -> bool:
    return any(p.search(text) for p in _COMPILED)
