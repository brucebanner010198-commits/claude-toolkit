# Changelog

## dev-workflow 0.1.0
- Initial release: recorded-run-review, model-router, and the haiku/sonnet/opus/fable worker agents.

## dev-workflow 0.1.1
- driver-daemon: require X-Driver-Token, reject Origin/bad Host, POST+JSON only, restrict upload/download paths, sanitize shot names.

## dev-workflow 0.1.2
- recorded-run-review: Playwright plus agent-browser driver guidance, tool quirks, tool-comparison rules and the 2026-11-09 gauntlet lessons.

## dev-workflow 0.1.3
- model-router: route by class (Haiku, Sonnet, Opus, Fable) and class alias, never a pinned version, so each new release is picked up automatically. The session model is no longer assumed to be Opus.

## dev-workflow 0.1.4
- bug-fix: new skill. Diagnose-first bug workflow modeled on JetBrains Junie (read-only diagnosis with a debugger when reading is not enough, a four-part plan for multi-file or hard fixes, known run commands, per-file report with revert), combined with the existing rules for root-cause tests, targeted reruns and recorded runs. Adds a project notes template.
