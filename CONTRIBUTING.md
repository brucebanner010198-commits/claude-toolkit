# Where things go

- A theme is one plugin: `plugins/<theme>/` with `.claude-plugin/plugin.json`. Create a new theme with `scripts/new-plugin.sh <theme> "<description>"`.
- A skill is `plugins/<theme>/skills/<kebab-name>/SKILL.md`. Create with `scripts/new-skill.sh <theme> <name> "<description>"`.
- An agent is one file: `plugins/<theme>/agents/<kebab-name>.md`.
- Hooks bundled with a plugin go in `plugins/<theme>/hooks/hooks.json`. Anything a plugin cannot carry (global CLAUDE.md, settings snippets) goes in `config/`, only after a secrets review.
- Third-party plugins are never copied here. List them in the README only.
- Every new plugin gets an entry in `.claude-plugin/marketplace.json`; every new skill gets a README table row.
- Every change bumps the plugin version in `plugin.json` and `marketplace.json`, and adds a CHANGELOG line.
- Source files are English and ASCII only. No keys, tokens or personal paths.
- Run `bash scripts/check.sh` before committing; CI runs it on every push.
