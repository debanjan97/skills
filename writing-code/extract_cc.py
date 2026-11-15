#!/usr/bin/env python3
"""Extract text the user actually typed from Claude Code transcripts.

Usage: python3 extract_cc.py [~/.claude/projects] > corpus/claude-code.jsonl
Emits one JSON object per prompt: {source, register, date, id, text}.
"""
import hashlib, json, re, sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "~/.claude/projects").expanduser()

SKIP_PREFIXES = (
    "<command-name>", "<command-message>", "<local-command-stdout>",
    "<local-command-stderr>", "<bash-input>", "<bash-stdout>", "<bash-stderr>",
    "Caveat: The messages below were generated",
    "This session is being continued from a previous conversation",
    "[Request interrupted", "<task-notification>", "<user-prompt-submit-hook>",
)
TAG_BLOCK = re.compile(r"<(system-reminder|ide_selection|ide_opened_file|command-[a-z]+)>.*?</\1>", re.S)
FENCE = re.compile(r"```.*?```", re.S)


def typed_text(content):
    if isinstance(content, str):
        return content
    parts = []
    for block in content or []:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
        elif isinstance(block, dict) and block.get("type") == "tool_result":
            return None  # tool output, not the user
    return "\n".join(parts)


def clean(text):
    text = TAG_BLOCK.sub("", text)
    text = FENCE.sub("[code]", text)  # pasted code is not prose
    kept = []
    for line in text.splitlines():
        s = line.strip()
        # pasted logs/stack traces: long lines with little prose
        if len(s) > 300 and s.count(" ") < len(s) / 12:
            continue
        kept.append(line)
    return "\n".join(kept).strip()


seen = set()
for path in sorted(root.rglob("*.jsonl")):
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("type") != "user" or rec.get("isSidechain") or rec.get("isMeta") \
                    or rec.get("isCompactSummary"):
                continue  # sidechain = subagent prompts written by Claude
            msg = rec.get("message") or {}
            if msg.get("role") != "user":
                continue
            text = typed_text(msg.get("content"))
            if not text or text.lstrip().startswith(SKIP_PREFIXES):
                continue
            text = clean(text)
            if len(text) < 15:
                continue
            key = hashlib.sha1(text.encode()).hexdigest()
            if key in seen:  # resumed sessions copy earlier history
                continue
            seen.add(key)
            print(json.dumps({
                "source": "claude-code", "register": "prompt",
                "date": (rec.get("timestamp") or "")[:10],
                "id": rec.get("uuid") or key[:12], "text": text,
            }, ensure_ascii=False))
