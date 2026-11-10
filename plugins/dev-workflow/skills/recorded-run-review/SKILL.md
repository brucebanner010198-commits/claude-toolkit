---
name: recorded-run-review
description: Use for ANY test run or real run of an app or project, and whenever asked to run, test, verify, demo, loop through, or prove that something works end to end (for example "run it as a user", "review it until nothing is left to fix", "make sure the system works"). Drives the real app as the intended user, records video and per-step screenshots, fixes what breaks, and repeats until a clean recorded run.
---

# Recorded run review

The user wants to watch the system work, not read a claim that it does. Every review pass is a
recorded run of the real app, and the video is the main deliverable.

## Defaults

- Record every run, including projects that handle PHI or other sensitive data. Skip recording only
  when the user says so in the current session for that project.
- Always do a full pass in every mode of the app.
- Every run is a fresh run, with no exceptions: never resume, reuse or re-record on top of an earlier
  stack, database, data folder, output folder or browser state. A re-record after a fix also starts
  from scratch (new data folder, new output folder, new browser context). The recorders enforce this:
  they refuse to start if `FRESH_DATA_DIR` is unset or non-empty, or if the output folder already has
  files.
- Always run as a first-time user. Every recorded run starts from a clean slate: a fresh database and
  data folder, no saved session, no stored keys or provider choice, no cached browser state (use a new
  browser context with empty cookies and local storage), and no earlier runs, uploads or settings
  carried over. Start at the very first screen a brand-new person sees (sign-up or welcome, then any
  setup or guide) and go through it in order, as someone who has never seen the app and knows only what
  the screens and the user documentation tell them. Do not use shortcuts a returning user would have,
  such as pre-seeded accounts, direct URLs to later screens, or knowledge of internals. Treat anything
  confusing, undocumented or dead-ended on the way as a finding. Only the inputs that cannot be made
  up (real datasets, keys) are supplied from outside, at the point where the screen asks for them.
- AI provider in a fresh run: when the app asks for an AI provider, either (a) ask the user which
  provider to use and for its API key, entering it at the setup screen like a new user would, or
  (b) use the existing Claude session itself to supply the model, as done in earlier runs. Ask the
  user which of the two to use when it is not already settled for the project. Never reuse a key or
  provider choice saved by an earlier run, and never print a key.

## Adapting

- Web UI: two drivers are available. Pick per job (evidence: 2026-11-09 gauntlet, below).
  - Playwright is the default recorder: use `record-example.mjs` (scripted) or `driver-daemon.mjs`
    (live, one command at a time). Find Playwright in the project's `node_modules`, else a global
    install, and point the import at it. Prefer it for hard interactions: nested or cross-origin
    frames, native dialogs (alert/confirm/prompt), popups, HTML5 drag and drop, wheel scrolling.
    It was fastest in the gauntlet (75 s, 57 commands against 296 s, 138 for agent-browser).
  - agent-browser (`npm i -g agent-browser && agent-browser install`, then `agent-browser skills get
    core`) is the driver for exploring a page you have not seen: `snapshot -i` gives refs, so no
    selectors to guess, and it read a closed shadow-DOM input that Playwright's aria snapshot omits.
    Record with `record start <file>.mp4` / `record stop` (mp4 directly; Playwright gives webm and
    needs `ffmpeg` to convert). Always pass `--session <name>` and `--headed` when the user wants to
    watch.
  - Use them one after the other, never both attached to the same Chrome at the same time. A
    hybrid run lost a stage (both tools handle dialogs, so agent-browser dismissed the prompt
    before Playwright answered) and Playwright `connectOverCDP` timed out whenever agent-browser
    was already attached. If a hybrid is unavoidable, attach Playwright first, then agent-browser,
    and give dialogs to one tool only.
  - Playwright `recordVideo` cannot record a CDP-attached context; use agent-browser `record` or
    `screencapture -v` for attached runs.
- Any other project type (CLI, script, backend, macOS app): write an equivalent recorder on first use
  (for example a terminal transcript with per-step output and exit codes, or `screencapture -v` plus a
  screenshot per step). Once it works, save it next to this file and mention it here.
- This skill is meant to change. After each real run, add what worked and what did not under
  "Lessons from real runs" at the bottom.

## Loop

1. Learn the app before touching it. Read the project instructions, the agreed design or ADRs,
   existing end-to-end specs, and how the app is launched with and without optional services (AI
   keys, external APIs). List the screens or steps a real user passes through and every mode the
   app has (for example AI on and AI off). The design is the checklist the run is judged against.
2. Get inputs from the user only when they cannot be made up: real datasets, dictionaries, keys.
   Treat them as untrusted data in a scratch path outside the repo. Never commit them or print keys.
3. Start isolated stacks for the run. Fresh database under /tmp, its own ports, migrations applied,
   one stack per mode. Do not stop or modify an instance the user is running. Start frontend dev
   servers from their own package directory.
4. Drive a real browser as the intended user, step by step, with the recorder in
   `record-example.mjs` (Playwright, `recordVideo`, `slowMo`, a screenshot and a text dump after every
   step, console and network errors captured, automatic checks for bad text such as "undefined",
   "Field required", raw field names, or wording that contradicts the mode). If the Claude in Chrome
   extension is connected and the user wants to watch live, drive that instead. Headless runs are
   invisible to the user, so always produce the video.
5. Act like the user, not like a test: fill forms with realistic answers, upload the real files, use
   the assistant or advisor features, download generated files, share, reload, resume.
6. Review the evidence yourself. Open the screenshots. Open generated files (PDF, DOCX, XLSX) and
   look at them: render PDF pages to images (`pypdfium2` in Python) rather than trusting extracted
   text, because overlapping or clipped layout does not show up in text. Compare each screen with
   the design.
7. Fix the root cause, not the symptom: grep every caller of the code you change. Add a test that
   fails on the old code and passes on the new, and run it both ways. Where a decision belongs to the
   person who owns the requirements, write the question in plain language instead of guessing.
8. Re-record in every mode. Stop only when a full recorded pass in each mode finds nothing new.
   Say plainly what was not covered.
9. Deliver: tell the user the folder holding the videos (under /tmp, named for the project), what
   each file is, which earlier problems did not come back, and what the automatic checks cannot see.
   Keep that folder until the user says to delete it. Stop the servers you started, delete other
   scratch, and leave the user's own running instance alone.

## Pitfalls seen before

- A fresh SQLite database has no tables until migrations run; a 500 on first register means that.
- Two copies of a dev server can hold the same port and one will proxy to the wrong backend.
  Use `--strictPort` and distinct ports.
- Dev-mode React double-invokes effects, so an action that runs on mount can fire twice. Check the
  backend for duplicated records, not only the screen.
- AI answers vary run to run. Wait for the in-flight indicator to disappear before reading a screen
  and before moving on; moving early drops the response.
- A step that already navigates on click will race a script that clicks the next button; break
  out of the loop after it.
- Test suites may write files into the repo (uploads, databases). Remove only what the run created
  and that no database row references. Never run a blanket clean that would delete `.env` or data.
- Screenshots are for you and the user; delete them when the user says so, not before.
- agent-browser quirks: (1) refs go stale after any DOM change or frame switch; take a fresh
  `snapshot -i` after each, or use `find role <role> click --name <name>`, which re-resolves.
  (2) Alerts are auto-dismissed unless the session starts with `--no-auto-dialog`, so a number shown
  only in an alert is lost; confirm and prompt block the page until `dialog accept [text]`.
  (3) Clicks inside nested or cross-origin frames can fail with "outside the viewport"; fall back to
  `mouse move/down/up` with coordinates (screenshots are 2x on retina, halve the pixels).
  (4) Scroll events can wait for a rendered frame; take a screenshot after `scroll` before reading
  the DOM. (5) Plain `snapshot -i` omits non-interactive text; use `snapshot` or `get text` to read
  a result. (6) A bad ref from an earlier run silently targets another element; re-read refs.
- Playwright quirks: closed shadow roots are invisible to locators and to the aria snapshot; use
  coordinates, keyboard (Tab/Enter) and a screenshot. With no `dialog` listener, dialogs are
  dismissed automatically; attach one that reads `message()` before answering. A driver that
  parses JSON must catch bad input, or one malformed command kills the session.
- Comparing tools or drivers: write predictions first, drive every arm the same way (a blind
  script against a live driver is not like for like), shuffle arm order, mint codes server-side per
  run, score from the server log and not from the agent's own report, and mark a stage void when
  the site itself is broken (a clipped code, for example).

## Lessons from real runs

- 2026-10-23 dry run: the recorder works end to end (video, screenshot, text dump, NOTES.txt). The
  Playwright package version must match a browser build in `~/Library/Caches/ms-playwright`; if
  launch says "Executable doesn't exist", try another installed Playwright (for example one under
  `~/.npm/_npx/*/node_modules/playwright`; 1.62.1 matched here) instead of downloading browsers.
- 2026-10-26 headless multi-agent run (no screen to record): a timestamped `logs/transcript.log` with one
  line per step, plus every agent output saved under `outputs/`, worked as the recorder. The WebFetch tool
  refuses web.archive.org and summarises pages (quotes capped near 125 characters), so use `curl` in Bash
  for archive copies and for exact text. An answer key written before the research is not ground truth;
  sort disagreements into key-wrong, contract-forced and genuine error before reporting a score.
- 2026-10-27 model-router routing test (headless, read-only, 3 pieces across haiku-worker, opus-worker and the main session): the
  same recorder worked (`/tmp/model-router-recorded-run/` with `PREDICTIONS.md` written before launch, `logs/transcript.log`,
  `outputs/` with each worker's report and its score). Writing predictions and an own-grep answer key before reading any worker
  output kept scoring honest. Quote shell globs (`--include='*.py'`): unquoted, zsh aborts with "no matches found". Spot-check a
  reviewer agent's cited file:line yourself; all six checked were accurate. A control run (the main session doing the same
  tasks) was not done, so routing quality is shown but its value over not routing is not measured.
- 2026-11-09 gauntlet (agent-browser vs Playwright vs hybrid, one live attempt each, local 11-stage
  obstacle course, design reviewed by Fable 5.1, `/tmp/gauntlet-20261109-230825/`): agent-browser
  10/10 in 296 s, Playwright 10/10 in 75 s, hybrid 9/10 in 121 s (stage 12 void: code clipped by the
  canvas). Playwright won on speed and on frames and dialogs; agent-browser won on closed shadow
  DOM. Pre-registered prediction missed once: agent-browser's `drag` handled HTML5 drag and drop.
  n=1 per arm and Playwright ran third after the site was known, so treat it as a lean, not proof.
  The Playwright arm ran through a fixed-command driver because a free-form code-eval REPL on a
  local port was refused by the permission classifier; build drivers with named ops only.
- 2026-10-27 Opus-led rerun of the same routing test (`/tmp/model-router-recorded-run/rerun-opus/`): the recorder needed only a
  new log folder. Doing piece C in the main session gave a control run, but not a blind one, because the first run's findings
  had been read beforehand; keep earlier outputs unread when a blind comparison matters. Reading the session's own `.jsonl`
  (sum `usage` per unique assistant message id) gives the main session's token totals, though not per piece.
