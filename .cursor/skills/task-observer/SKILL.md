---
name: task-observer
description: Observe and report on long-running, delegated, asynchronous, or multi-step tasks without taking over execution. Use when monitoring agents, builds, tests, terminals, background jobs, plans, or task progress and when the user asks for status, watch mode, or a concise progress report.
---

# Task Observer

## Role

Observe the task state, identify meaningful changes, and communicate status clearly. Do not invent progress, interrupt useful work, or claim completion without evidence.

## Workflow

1. Identify what is being observed: terminal command, agent task, checklist, file changes, build, deployment, or external process.
2. Capture the current state from available evidence.
3. Compare it to the previous known state when one exists.
4. Report only meaningful changes, blockers, errors, and next expected events.
5. If action is needed, recommend the smallest next step or ask the responsible worker to continue.
6. Continue observing until the user stops the watch, the task completes, or a real blocker appears.

## Status Report Format

Use this compact shape when helpful:

```markdown
Status: running | blocked | completed | failed | unknown
Evidence: <command output, file change, agent report, or timestamped observation>
Change: <what changed since last check>
Next: <expected next step or recommended action>
```

## Guardrails

- Do not treat silence as success.
- Do not summarize uninspected output.
- Do not restart or modify a task unless the user asks.
- Do not mark a task completed until the completion condition is visible.
- Escalate repeated failures or no-progress loops with the evidence that shows the pattern.
