---
name: claude-mem
description: Create, update, and use concise Claude/Cursor memory notes for persistent project or user preferences. Use when the user asks to remember something, update memory, inspect memory, preserve workflow preferences, or maintain CLAUDE.md, AGENTS.md, .cursor rules, or similar memory files.
---

# Claude Mem

## Purpose

Maintain useful memory that helps future agent sessions act consistently without bloating context or storing sensitive material.

## What To Save

Save only stable, reusable information:

- User preferences that should apply in future sessions.
- Project conventions not already obvious from code.
- Repeated commands, setup notes, or validation requirements.
- Important architectural decisions and their current rationale.

Do not save:

- Secrets, credentials, tokens, or private keys.
- Temporary task state that will be stale soon.
- Large transcripts, raw logs, or speculative notes.
- Personal information unless the user explicitly asks and it is clearly useful.

## Workflow

1. Locate the active memory surface: `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`, `.cursor/skills`, or another user-specified file.
2. Read existing memory before editing.
3. Add the smallest durable note that will help future work.
4. Keep notes factual, dated only when the date affects interpretation.
5. Remove or revise stale conflicting notes when the user asks.
6. Verify the edited file and summarize the memory change.

## Style

- Use short bullets or compact sections.
- Write instructions in imperative form.
- Prefer project-specific facts over generic agent advice.
- Preserve the file's existing tone and structure.
