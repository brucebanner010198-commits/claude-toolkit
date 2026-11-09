# Install on another computer

Paste this into Claude Code on the other machine.

```
Install my personal Claude Code plugin marketplace from my private GitHub repo. Work in this order; stop and report if any step fails. Do not edit settings.json by hand, do not commit anything, do not print tokens.

1. Prerequisites: run `git --version`, `gh --version`, `node --version`, `claude --version`. If git, gh or claude is missing, tell me and stop. Require Claude Code 2.1.179 or newer (older versions have CVE-2026-86063) and the latest Node security release for my line; if older, tell me to update and stop.
2. Auth: run `gh auth status`. If brucebanner010198-commits is not logged in, tell me to run `! gh auth login` (GitHub.com, HTTPS, repo scope) and stop. Never use `gh auth switch`. Check access: `GH_TOKEN=$(gh auth token --user brucebanner010198-commits) gh repo view brucebanner010198-commits/claude-toolkit`.
3. Conflicts: list ~/.claude/skills and ~/.claude/agents. If recorded-run-review, model-router or any *-worker agent already exists there, show me and ask before changing anything. Never delete or overwrite without asking.
4. Add the marketplace with the owner token (the repo is private): `GH_TOKEN=$(gh auth token --user brucebanner010198-commits) GITHUB_TOKEN=$GH_TOKEN claude plugin marketplace add brucebanner010198-commits/claude-toolkit`. If it fails, report the exact error and stop.
5. Install with the same env vars: `GH_TOKEN=$(gh auth token --user brucebanner010198-commits) GITHUB_TOKEN=$GH_TOKEN claude plugin install dev-workflow@sj-toolkit`.
6. Read the repo README under ~/.claude/plugins/marketplaces and list any other plugins it offers; install more only after I say which.
7. recorded-run-review needs Node 18+ and Playwright. In a scratch folder outside any repo run `npm install playwright@latest` and tell me the path to use as PW. Install nothing global without asking.
8. Tell me to restart Claude Code, then confirm `claude plugin list` shows dev-workflow and that recorded-run-review and model-router appear in the skill list.
Update later with: `GH_TOKEN=$(gh auth token --user brucebanner010198-commits) GITHUB_TOKEN=$GH_TOKEN claude plugin marketplace update sj-toolkit`, then restart Claude Code.
```

Driver daemon usage: it needs `FRESH_DATA_DIR`, prints an `X-Driver-Token`, and every request must be a POST with that header and `Content-Type: application/json`.
