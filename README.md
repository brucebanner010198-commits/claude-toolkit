# claude-toolkit

Personal Claude Code plugin marketplace (`sj-toolkit`). One plugin per theme; every skill and agent lives inside a plugin.

## Install

```
claude plugin marketplace add brucebanner010198-commits/claude-toolkit
claude plugin install dev-workflow@sj-toolkit
```

Update: `claude plugin marketplace update sj-toolkit`, then restart Claude Code.

## Reference

| Plugin | Skill | Invoked by | What it does |
|---|---|---|---|
| dev-workflow | recorded-run-review | model | Drives the real app as a user, records video and per-step screenshots, fixes what breaks, repeats until a clean run. Needs Node 18+ and Playwright (`PW` env var). |
| dev-workflow | model-router | model | Decides whether to delegate a task and to which model (Haiku, Sonnet, Opus, Fable). Uses the four `*-worker` agents. |
| dev-workflow | bug-fix | model | Diagnose-first bug workflow modeled on JetBrains Junie: confirm the bug, find the cause with a debugger before editing, write a four-part plan, fix at the cause, prove it, report per file. Reads a "Bug fixing" section in the project's CLAUDE.md or AGENTS.md. |

Agents in `dev-workflow`: haiku-worker, sonnet-worker, opus-worker, fable-worker.

Skills are namespaced by plugin, for example `dev-workflow:model-router`.

## Layout

See CONTRIBUTING.md for where each kind of item goes.
