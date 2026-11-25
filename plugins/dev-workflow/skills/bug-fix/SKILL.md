---
name: bug-fix
description: Use when the user reports a bug to fix in a project - a defect, regression, crash, wrong output, error message, or a failing or flaky test ("fix this bug", "this is broken", "why does X fail", "it worked yesterday"). Runs a diagnose-first workflow modeled on JetBrains Junie - confirm the bug, find the cause with a debugger before editing any source, write a four-part plan, fix at the cause, prove it, and report per file with a way to revert. Not for new features, refactors, code review or production incident response.
---

# Bug fix

A bug is fixed when the cause is known, the change sits at the cause, and a check that failed
before now passes. A patch that only makes the symptom go away is not a fix.

This skill combines two sources. Each rule is tagged so the origin stays honest:

- **[Junie]** documented by JetBrains for Junie (docs at junie.jetbrains.com/docs, read 2026-11-25).
- **[Owner]** the owner's own rule, kept because Junie documents nothing better.

JetBrains does not document a bug-specific algorithm, a reproduce-first rule, a minimal-change
rule or a flaky-test policy for Junie. Those parts below are [Owner]. Do not describe them to
anyone as Junie behavior.

Other skills own their areas. Use them by name instead of repeating them here:
`recorded-run-review` for any run of the real app, `model-router` for delegation, and
`repo-standard` for the issue, branch, commit and pull request.

## Phases

Work through the phases in order. Phases 1 and 2 are read-only: they change no file in the
project, test files included. The only exception is the temporary logging allowed in phase 2,
which is listed and removed before phase 4.

### 0. Read the project's notes [Junie]

Junie reads a project guidelines file before it acts and runs tests through known run
configurations instead of guessed commands. Do the same:

1. Read the project's instruction files that exist: `CLAUDE.md`, `AGENTS.md`, `.junie/AGENTS.md`.
   Look for a "Bug fixing" section (see "Project notes" below).
2. Take run, test, build and debug commands from those notes. If they are missing, take them
   from the project's own files, in this order: the CI workflow, the task runner (`Makefile`,
   `justfile`, `package.json` scripts, `pyproject.toml`), then the README.
3. Never invent a command. If none of those sources gives one, ask the user.

### 1. Confirm the bug [Owner]

- Reproduce it with the smallest command or steps that show it. Record the exact command and
  the output that is wrong, next to what was expected.
- A bug that shows only in the running app is reproduced through `recorded-run-review`.
- If it does not reproduce, stop and say so with what was tried. Do not fix by guess.
- For a flaky failure, run it enough times to get a failure rate (for example 20 runs) before
  anything else. That rate is the baseline the fix is judged against.

### 2. Diagnose without editing [Junie]

Junie's Debug mode drives a real debugger and does not edit source while it investigates. It
sets line and exception breakpoints, steps, reads variables and call stacks on every thread,
and evaluates expressions in the paused frame. Use the terminal equivalent for the language:

The Bash tool has no interactive terminal, so drive the debugger with a command list, never
as a live prompt:

| Language | Non-interactive form | Checked |
|---|---|---|
| Python | `python3 -m pdb -c 'b file.py:LINE' -c c -c 'p name' -c bt -c q script.py` | ran 2026-11-25 |
| Python | `printf 'b file.py:LINE\nc\np name\nq\n' \| python3 -m pdb script.py` | ran 2026-11-25 |
| C, C++, Swift, Rust | `lldb --batch -o 'breakpoint set --file f.c --line N' -o run -o 'frame variable' -o bt ./binary` | ran 2026-11-25 (C) |
| JavaScript, TypeScript | `node inspect` did not take commands from a pipe; no working form found yet | failed 2026-11-25 |
| Go, Java, Kotlin | `dlv`, `jdb` | not tried |

Where no checked form exists, a one-off read-only probe is the fallback: a short script, kept
outside the project, that imports the code and prints the values in question. When a new form is
proven on a real bug, add it to this table with the date.

- Start from the failing command in phase 1. Break where the wrong value first appears, then
  walk back up the stack until the value is right. The cause is at that boundary.
- An exception breakpoint ("break on raise") is the fastest start for a crash.
- Pick one of Junie's three patterns: run it all yourself; set the breakpoints and let the user
  trigger the flow; or attach to a session the user already has open.
- If a JetBrains IDE is open on the project and its MCP server with the debugger toolset is
  connected to this session, use those tools. Check that they are present before relying on
  them; never assume an IDE.
- [Owner] Where neither a debugger nor a probe can reach the code (a shell script, a remote
  job), temporary logging is allowed. List every line added and remove all of it before phase 4.
- Read with the tools that match an IDE's semantic search: a language server or
  "find references" where one is set up, otherwise grep for every caller and every writer of
  the wrong value.

- [Owner] When reading the source already proves the cause (you can trace the phase 1 input to
  the exact wrong output by hand), skip the debugger and state in the final report that the cause was read from the source, not
  observed in a debugger. Use the
  debugger as soon as the trace depends on a runtime value you would otherwise have to guess.

Diagnosis is done when you can state the cause as one sentence with a `file:line`, and explain
why the phase 1 command produces exactly the wrong output seen.

### 3. Plan [Junie]

In Plan mode Junie writes a plan before it edits, in four parts, and keeps it current when facts
change. Plan mode is something the Junie user turns on for a prompt, not a step on every task.
So a plan is required here when the fix touches more than one file, the cause took real
digging, or the user asks for one. For a one-file fix whose cause is plain, go to phase 4. The
four parts:

1. **Requirements**: expected behavior, actual behavior, the reproduction.
2. **Technical design**: the cause (`file:line`), the change, and every caller checked.
3. **Testing**: the new test that fails now, and which existing tests cover the touched code.
4. **Delivery steps**: the ordered edits.

- Save the plan as `.scratch/plans/<yyyy-mm-dd>-<slug>.md`. Junie stores plans in
  `.junie/plans`; `.scratch/` replaces that here because the owner's repo standard keeps
  working files there.
- The plan is living: when a later phase proves part of it wrong, update the plan first, then
  carry on.
- [Junie] When the expected behavior is unclear, ask before editing, as a multiple-choice
  question where the options are known. Wrong output is a bug only against a stated
  expectation.

### 4. Fix [Owner]

- Add the test first and watch it fail for the reason named in the plan. A test that fails for
  another reason is testing something else.
- Change the code at the cause. Keep the change as small as the cause allows, and leave
  unrelated code, formatting and names alone.
- Fix every caller the plan listed. A fix in one call site with the same fault left in two
  others is not done.

### 5. Verify [Junie + Owner]

- Rerun the phase 1 reproduction. It must now give the expected output.
- The new test passes on the new code. If it was written after the fix, prove it fails on the
  old code too (`git stash` the fix, run, restore).
- [Owner] Run only the tests that cover the changed code, plus any that failed. Do not rerun a
  suite that already passed and covers nothing that changed; name what was skipped.
- [Owner] Run the project's linter and type checker on the changed files only. JetBrains lists
  code inspections as something Junie gets from the IDE, but does not document how it uses them
  to verify a fix.
- For a flaky bug, rerun the same number of times as the baseline and compare the rates.
- If the bug was seen in the running app, the last check is a `recorded-run-review` pass.

### 6. Report [Junie]

Junie ends with a list of changed files, a diff for each, and the choice to keep or revert
each one. End the same way:

- The cause in one sentence, with `file:line`.
- Each changed file: what changed and why, and how to undo it (`git restore <path>`).
- The evidence: each command run and its result, before and after.
- What was not verified, and what was skipped as unchanged.
- Leave the changes uncommitted unless the user asked for a commit. Issue, branch, commit and
  pull request follow `repo-standard`.
- If the project has no "Bug fixing" section yet, end with the offer described under
  "Project notes".

## Stop and ask

Stop and tell the user, instead of pushing on, when:

- the bug does not reproduce;
- the expected behavior is unclear;
- the fix needs a change to a public interface, a data migration, a new dependency or a
  deleted test;
- two fix attempts in a row fail verification. Go back to phase 2: the diagnosis is wrong, and
  a third patch on the same theory wastes the run;
- the cause is outside the project (a dependency, a service, the environment). Report it with
  the evidence and offer a workaround as a separate, labeled choice.

## Delegation

A bug is one dependent chain, so it stays in the main session (`model-router`, step 1).
Delegate only the noisy parts whose result is a short summary: trawling long logs, bisecting a
range of commits, or running a slow suite.

## Project notes [Junie]

Junie can onboard itself to a project and write what it learned into a guidelines file. Do the
same for bugs. After the first bug fixed in a project that has no "Bug fixing" section, offer
to add one to the instruction file the project already has (`CLAUDE.md`, else `AGENTS.md`).
Use `project-notes-template.md` in this folder, filled only with commands that were actually
run in this session and worked. Never create a second instruction file just for this.

## Lessons from real runs

Add a dated line here after each real use: what worked, what did not, and any rule that should
change.

- 2026-11-25 three trials (fresh headless Sonnet sessions, each on a fresh copy of a throwaway
  Python project with a mutable-default bug, given the bug report only). All three loaded the
  skill unprompted, reproduced, named the cause with a line, wrote the failing test before the
  fix, and reported per file with revert commands. After trial 1 the project notes offer and the
  "read from source, no debugger" statement were made explicit, and both then appeared. A written
  plan was skipped in all three, even when the skill made it a gate for every bug: on a one-file
  bug the model goes straight from cause to test. The plan is therefore required only for
  multi-file or hard bugs, which also matches Junie's opt-in Plan mode. A rule that must hold on
  every bug needs a hook, not wording.
- 2026-11-25 trial 4 (same setup, a bug that shows only in a 500-row data file: ids reused
  across regions and overwritten in a dict). The session probed the data with a read-only
  one-off script before any edit, found the cause, wrote the failing test, fixed and reported.
  It chose the probe over pdb. The pdb and lldb command lists in phase 2 were run by hand and
  work, but no trial session has yet chosen a debugger on its own.
