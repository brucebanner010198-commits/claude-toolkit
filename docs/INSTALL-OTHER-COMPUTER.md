# Install on another computer

The repo is public, so no GitHub login is needed. Paste this into Claude Code on the other machine.

```
Install my personal Claude Code plugin marketplace. Work in this order; stop and report if any step fails. Do not edit settings.json by hand, do not commit anything, do not print tokens.

1. Prerequisites: run `node --version` and `claude --version`. Require Claude Code 2.1.179 or newer (older versions have CVE-2026-86063); if older, tell me to update and stop.
2. Conflicts: list ~/.claude/skills and ~/.claude/agents. If recorded-run-review, model-router or any *-worker agent already exists there, show me and ask before changing anything. Never delete or overwrite without asking.
3. Add the marketplace: `claude plugin marketplace add brucebanner010198-commits/claude-toolkit`. If it fails, report the exact error and stop.
4. Install: `claude plugin install dev-workflow@sj-toolkit`.
5. Read the repo README under ~/.claude/plugins/marketplaces and list any other plugins it offers; install more only after I say which.
6. recorded-run-review needs Node 18+ and Playwright. In a scratch folder outside any repo run `npm install playwright@latest` and tell me the path to use as PW. Install nothing global without asking.
7. Tell me to restart Claude Code, then confirm `claude plugin list` shows dev-workflow and that recorded-run-review and model-router appear in the skill list.
Update later with: `claude plugin marketplace update sj-toolkit`, then restart Claude Code.
```

Driver daemon usage: it needs `FRESH_DATA_DIR`, prints an `X-Driver-Token`, and every request must be a POST with that header and `Content-Type: application/json`.
