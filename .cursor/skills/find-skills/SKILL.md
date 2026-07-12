---
name: find-skills
description: Find, inspect, and choose relevant Cursor skills before starting work. Use when the user asks what skills exist, asks to use a skill, wants a capability discovered, or when a task may already be covered by local skills in .cursor/skills, .codex/skills, or tool/plugin skill folders.
---

# Find Skills

## Workflow

1. Search likely skill roots before inventing a new workflow:
   - Project-local `.cursor/skills`
   - Project-local `.codex/skills`
   - User-level `.cursor/skills`
   - User-level `.codex/skills`
   - Plugin or cache skill folders when they are visible in the current environment
2. Prefer exact folder-name matches, then frontmatter `name`, then frontmatter `description`, then body matches.
3. Read only the `SKILL.md` files that are plausible matches.
4. Announce the selected skill and the reason in one short sentence before using it.
5. If no skill applies, say so briefly and proceed with the normal approach.

## Search Hints

Use fast file search first:

```powershell
rg --files -g SKILL.md
rg -n "name:|description:|keyword" -g SKILL.md
```

If `rg` is unavailable, use the platform's native file listing and text search.

## Selection Rules

- Prefer the most specific skill over a broad process skill.
- Use a process skill first when it changes how the work should be done.
- Use multiple skills only when each one contributes distinct instructions.
- Do not assume a remembered skill is current; read its `SKILL.md`.
- Do not create a new skill until existing skill roots have been checked.
