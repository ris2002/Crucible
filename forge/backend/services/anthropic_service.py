import os
import re
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", "sk-ant-dummy"))

MODEL = "claude-sonnet-4-6"

FORGE_SYSTEM_PROMPT = """You are the Forge — a rigorous intellectual thinking partner on a platform designed exclusively for the constructive exchange of ideas. This is a hate-free, curiosity-first space.

CORE RULES:
- Ask ONE sharp probing question per turn. Never multiple questions.
- Do not validate weak ideas. Push back honestly.
- Do not write the user's idea for them. Ever.
- Do not suggest how to phrase things.
- Be direct. No filler phrases. No 'great question!'
- Use web search to find counterarguments, examples, and evidence.
- Write in plain prose only. No markdown. No bold, italic, bullet points, or headers. No ** or * symbols.

GENRE BEHAVIOUR:
- Problem: diagnose root cause, ask who is affected, demand evidence it is real
- Solution: stress-test feasibility, ask what has been tried, find failure modes
- Observation: ask what it implies, who else has noticed, what changes if true
- Question: probe the question itself, what assumptions are buried in it
- Prediction: demand evidence, find the strongest counterargument
- Contradiction: verify it is real, explore who benefits from the contradiction
- Concept: test usefulness, ask for a concrete example, find edge cases
- Challenge: play devil's advocate, find the best version of the opposing view

HATE/INFLAMMATORY CONTENT:
If the user brings rage, personal attacks, or content designed to inflame rather than illuminate — do not lecture. Simply say:
'That framing is more heat than light. What is the underlying question you are actually trying to work through?'
Then continue. Do not moralize further.

WHEN THE IDEA IS READY:
After 4-8 genuine exchanges, if the idea is genuinely sharp, end your message with EXACTLY this block — nothing after it:

---FORGE_READY---
TITLE: [declarative, 10-15 words, no clickbait, no question marks]
SUMMARY: [exactly 3 sentences: claim, reasoning, implication. No hedging.]
TAGS: [5 lowercase hashtags, comma separated, no # symbol]
---END---

Only append this block when the idea genuinely earns it.
If still shallow after 8 turns, say so honestly.
The user will edit this draft before posting — it is a starting point."""


def build_system_prompt(domain: str, genre: str, build_context: str = None) -> str:
    system = FORGE_SYSTEM_PROMPT
    system += f"\n\nDOMAIN: {domain}\nGENRE: {genre}"
    if build_context:
        system += f"\n\nBUILD CONTEXT: {build_context}"
    return system


def parse_forge_ready(text: str):
    if "---FORGE_READY---" not in text:
        return None, text

    parts = text.split("---FORGE_READY---")
    preamble = parts[0].strip()
    block = parts[1] if len(parts) > 1 else ""
    block = block.split("---END---")[0].strip()

    title_match = re.search(r"TITLE:\s*(.+)", block)
    summary_match = re.search(r"SUMMARY:\s*((?:.|\n)+?)(?=TAGS:|$)", block)
    tags_match = re.search(r"TAGS:\s*(.+)", block)

    title = title_match.group(1).strip() if title_match else ""
    summary = summary_match.group(1).strip() if summary_match else ""
    tags_raw = tags_match.group(1).strip() if tags_match else ""
    tags = [t.strip().lstrip('#') for t in tags_raw.split(",") if t.strip()][:5]

    return {"title": title, "summary": summary, "tags": tags}, preamble


def get_forge_response(messages: list, domain: str, genre: str, build_context: str = None) -> tuple:
    system = build_system_prompt(domain, genre, build_context)
    conversation = list(messages)
    max_iterations = 8
    total_input_tokens = 0
    total_output_tokens = 0

    for _ in range(max_iterations):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=600,
                system=system,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                messages=conversation,
            )
        except Exception as e:
            print(f"[Anthropic error] {type(e).__name__}: {e}")
            raise

        total_input_tokens += getattr(response.usage, "input_tokens", 0)
        total_output_tokens += getattr(response.usage, "output_tokens", 0)

        if response.stop_reason == "end_turn":
            text_parts = [b.text for b in response.content if hasattr(b, "text") and b.text is not None]
            return "\n".join(text_parts), total_input_tokens, total_output_tokens

        if response.stop_reason == "tool_use":
            assistant_content = []
            tool_uses = []
            for block in response.content:
                if hasattr(block, "text"):
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
                    tool_uses.append(block)

            conversation.append({"role": "assistant", "content": assistant_content})
            tool_results = [{"type": "tool_result", "tool_use_id": tu.id, "content": "Search completed."} for tu in tool_uses]
            conversation.append({"role": "user", "content": tool_results})
            continue

        text_parts = [b.text for b in response.content if hasattr(b, "text") and b.text is not None]
        return "\n".join(text_parts), total_input_tokens, total_output_tokens

    return "I need more information to continue. What would you like to explore further?", total_input_tokens, total_output_tokens


def generate_seed_idea(domain: str, genre: str, hint: str = "") -> dict:
    hint_text = f"Topic hint: {hint}." if hint else ""
    prompt = f"Generate a complete sharp intellectual idea for the Forge feed. Domain: {domain}. Genre: {genre}. {hint_text}\nReturn ONLY:\nTITLE: [declarative, 10-15 words]\nSUMMARY: [exactly 3 sentences, claim, reasoning, implication, no hedging]\nTAGS: [5 lowercase hashtags comma separated, no # symbol]\nNothing else. No preamble."

    response = client.messages.create(
        model=MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text if response.content else ""
    result = parse_forge_ready("---FORGE_READY---\n" + text.replace("TITLE:", "TITLE:").replace("SUMMARY:", "SUMMARY:").replace("TAGS:", "TAGS:") + "\n---END---")
    if result[0]:
        return result[0]
    title_match = re.search(r"TITLE:\s*(.+)", text)
    summary_match = re.search(r"SUMMARY:\s*((?:.|\n)+?)(?=TAGS:|$)", text)
    tags_match = re.search(r"TAGS:\s*(.+)", text)
    return {
        "title": title_match.group(1).strip() if title_match else "",
        "summary": summary_match.group(1).strip() if summary_match else "",
        "tags": [t.strip().lstrip('#') for t in tags_match.group(1).split(",") if t.strip()][:5] if tags_match else [],
    }
