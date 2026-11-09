---
name: model-router
description: Decides whether a task should be delegated and which Claude model should do it (Haiku 5.5, Sonnet 5.5, Opus 5.5 or Fable 5.1), including how to run pieces in parallel. Use at the start of any task longer than one or two tool calls, when the user mentions picking a model, delegating, subagents or parallel work, or when a task looks too big, too noisy or too hard for the main session.
---

# Model router

The session runs on Opus 5.5 and acts as the router: it does the work that needs its judgment itself and hands cheaper pieces down. The session model cannot change mid-session, so routing means starting a fresh subagent with a `model` override. A fork cannot switch models; it shares the main session's model, history and cache.

## Step 1: decide whether to delegate at all

Anthropic found that a subagent on the same model gives parallelism or a fresh pair of eyes, not a smarter answer, and a fresh subagent must first gather context the main session already has, so it can end up slower. Its cost measurements found delegation saved money in only two cases: routine work with a long cost tail (many independent easy pieces) and work larger than one context window. For one dependent chain, or work that fits in one context, the main model alone at lower effort came out ahead. Multi-agent runs typically use 3-10x the tokens of a single agent.

Stay in the main session when:
- the task needs back-and-forth, or its phases share a lot of context (plan, implement, test);
- it is a quick, targeted change, or latency matters;
- it is one dependent chain, or fits in one context;
- it is one or two tool calls.

Delegate when:
- the work fans out into independent pieces (parallelism buys thoroughness more than speed);
- the output is verbose (over ~1,000 tokens) and only a summary is needed, such as test runs, logs, or large searches;
- an independent reviewer with no memory of how the work was done is wanted;
- a different model is clearly better for the piece (Step 2).

Split by context, not by role: do not split planner, implementer and tester across agents; the agent that builds a feature also tests it. Split only where context can be truly isolated.

## Step 2: pick the tier

Routing itself costs Opus tokens, so hand a piece down only when Step 1 says to delegate and the piece is clearly cheaper-tier work. Anthropic's "orchestrator delegates bulk work to lower-cost workers" pattern fits independent, well-specified pieces, not small or dependent ones.

1. **Opus 5.5** (this session, the default): work that needs judgment, shares context, or is a dependent chain, plus every routing decision. Anthropic: most workloads start at Opus 5.5, which on one coding benchmark matched Fable 5.1 at about a fifth of the cost. Security, privacy and audit work stays here. Effort `medium` is Anthropic's default; raise it for harder work.
2. **Sonnet 5.5** (`sonnet-worker`): independent, well-specified pieces that need solid but not top-tier judgment, especially parallel or background ones. Effort `medium` for well-specified work, `high` for longer work.
3. **Haiku 5.5** (`haiku-worker`): high-volume work with output that is quick to check: classification, extraction, routing, bulk scans, triage. Start at `medium`; at `low` it more often stops early, skips a search or reports done without a check. Anthropic says to measure it on your own workload before relying on it.
4. **Fable 5.1** (`fable-worker`): demanding reasoning and long-horizon agentic work, or when Opus 5.5 at `xhigh` or `max` still falls short. It does the work itself; the `advisor` tool is the separate advice path.
   - Ask the user first, with a one-line cost note (about 2.5x Opus per token; on long research loops it can also cost more per task).
   - Fable requests carry 30-day data retention and are not available under zero data retention unless Anthropic authorizes it. Never send sensitive or regulated data (personal, health, customer or confidential data) or anything derived from it, unless the user confirms that is allowed. Claude Managed Agents is also not eligible for zero data retention or HIPAA coverage.
   - Handle an empty or refused result.

## Effort before escalation

Tune effort on the current model before moving up a tier. If a delegated result fails verification, retry once at higher effort; re-running only the failures is cheaper than running everything at high. Save `max` for hard problems, since on ordinary tasks it tends to overthink. For an isolated piece, `opus-worker` (Opus at `xhigh`) is that higher-effort retry or a parallel hard piece; this session handles everything else directly. Escalate to Fable only after that.

## Parallel work

- Split into independent pieces first, then pick a model per piece with Step 2. Scale the fan-out to the task: a simple lookup needs one agent, a comparison two to four, a broad sweep more.
- Send all Agent calls in one message so they run concurrently. The default cap is 20 running at once; use about five. Ten parallel agents use quota roughly ten times as fast.
- Reports return later as notifications. Track which are outstanding, check and merge every one, then answer.
- Use `sonnet-worker` for parallel or background pieces that need no conversation context and not Opus-level judgment. For pieces that need this context, a fork (Opus, shared cache) is cheaper.
- Keep workers read-only unless a piece owns its own files. Never let two workers edit the same file. For parallel edits use `isolation: "worktree"`, which by default branches from the default branch, not this session's HEAD (setting `worktree.baseRef` to `"head"` changes that), so uncommitted or branch-local work is missing; commit first or prefer sequential edits.
- Do not parallelize dependent steps or tasks too small to cover the handoff cost. Agent teams and dynamic workflows exist for larger fan-outs but cost far more tokens and need the user's opt-in.

## Handoff rules

- Print one line before every handoff, for example: `Routing to Haiku: scanning 40 files for X`.
- Write a self-contained brief with four parts: the objective, the output format (ask for a short, bounded result with evidence such as the command and its output), which tools or sources to use, and clear task boundaries. The worker has no conversation history. Anthropic publishes no brief template for these models, so this follows its multi-agent research guidance.
- Put what this session already knows into the brief: the file paths and line ranges to read, the callers or call sites already found, and the exact text of any rule the work is judged against, so the worker reads instead of searching. Leave out your own conclusions or expected findings, or a review stops being independent. In one measured security review (2026-10-27, one run) this cut an `opus-worker` from 70,714 to 57,391 tokens and from 214.6 s to 161.3 s, with one more finding. A fresh worker's fixed startup cost remains, so this narrows the handoff cost but does not remove it.
- Workers do not delegate. The worker files remove the `Agent` tool.
- Workers may load `CLAUDE.md`, but restate any project or user rule that must hold (language, data handling, testing or review requirements).
- For review or verification workers, give concrete pass criteria and say what to skip; a reviewer told to find problems will always find something, and a verifier without criteria stops after one passing test.
- Verify the result (read the diff, spot-check claims, rerun the check) before relaying it.
- A rule that must hold every time belongs in a hook or permission rule, not in this skill.

## Measuring a routing choice

Anthropic's method: take a few real tasks, write an outcome check for each (tests pass, count correct), record cost beside the score, and compare tiers across effort levels, not only the default. A multi-model setup must beat the single model's whole score-versus-cost curve. Judge cost per solved task, not per token. Changing effort or the system prompt mid-conversation breaks the prompt cache, so set a worker's effort once, in its definition.

## Evidence and limits

Anthropic's cost measurements are internal and directional, were run with Sonnet 5 workers, and prices drift. Recheck the routing after each model release, and measure on real tasks in the current project. Third-party benchmark numbers are not used here.

Sources: platform.claude.com docs (choosing-a-model, optimizing-for-cost-and-intelligence, effort, models overview, the four what's-new pages and the four prompting guides, data retention) and code.claude.com docs (sub-agents, model-config, agent-view, costs, worktrees, skills, best-practices), plus Anthropic's multi-agent engineering posts.
