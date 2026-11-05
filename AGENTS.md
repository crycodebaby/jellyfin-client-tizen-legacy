# Agent instructions — Smairys Mediathek

Shared onboarding for Codex, Claude Code, and other coding agents. Product and contributor documentation is in German; keep code identifiers in English.

## Read in this order

1. `docs/PROJECT_CONTEXT.md` — current overview, architecture and evidence boundaries.
2. `TASKS.md` — open work and blockers.
3. Read `README.md` for product and setup; consult `docs/DECISIONS.md` and detailed guides when relevant.

`CLAUDE.md` is a short compatibility entry point. Keep project truth in the shared files above; avoid parallel or contradictory instructions.

## Context-efficient work

- Start with the current state and open tasks in the shared documents; use their links to load detailed audits, build history, or design guidance only when relevant. Read targeted code and tests instead of dumping whole files or logs.
- Treat source code and current test results as evidence, and `docs/PROJECT_CONTEXT.md` as the concise current overview, `TASKS.md` as the open work list, `docs/DECISIONS.md` as the decision record, and `docs/TIZEN_BUILD.md` as build and device-test history. Update the authoritative entry when facts change; link to detail rather than copying long histories.
- Distinguish implemented, simulated, built, installed, and user-confirmed on TV. State exact limitations and the tested version; do not turn a past observation into a current connection guarantee.
- When subagents are explicitly requested and model selection is supported, prefer the available lightweight Terra model with low reasoning effort for bounded, suitable subtasks. Give each agent a narrow goal, relevant paths, constraints, and expected concise output. Check its findings and preserve stronger models or reasoning for tasks that require them; do not spawn agents merely to save tokens.
- Never put passwords, tokens, private addresses, device identifiers, certificate data, or personal media information in handoffs, reports, prompts, or tracked documentation. Keep meaningful verification and security context even when reducing output.

For visual or remote-navigation work, also read the project design skill in `SKILL.md`.

## Fixed project constraints

- Target: Samsung UE65KU6099, Tizen 2.4.0, WebKit r152340.
- Keep runtime JavaScript ES5-compatible unless the target TV proves a newer feature works.
- Avoid frameworks, bundlers, runtime CDNs, and unverified browser APIs.
- Jellyfin is the single source of truth for users, libraries, metadata, and media.
- Samsung TV web apps use WGT packages. Never claim a build, install, playback, or hardware test succeeded without direct evidence.
- Remote navigation and visible focus are core behavior; mouse interaction is optional.
- Keep on-screen copy minimal: remove repeated headings and explanatory filler, but preserve labels and actionable status, error, and navigation information.
- Branding assets live under `branding/`. Preserve their filenames so another user can rebrand by replacing those files only.
- Logos are excluded from the MIT license. Do not imply permission to reuse them or delete the exclusion.
- External contributions are closed during development; do not invite issues, pull requests, or discussions without the owner's explicit decision.
- Never commit credentials, server tokens, certificate files, private keys, or personal media data.
- LAN IPs are temporary development values. The server address must remain editable.

## Working agreement

- Check `git status` before edits; preserve unrelated changes.
- The user explicitly requested the visual prototype before Phase 0 passed. Keep Phase 0 as an open release gate and do not present the preview as a validated TV client.
- Make small, reviewable changes. Update `TASKS.md` and the context/decision docs when project facts change.
- Run checks appropriate to edited files and state their limits accurately. Desktop checks do not prove TV compatibility.
- If a prerequisite is missing, record the exact observed blocker and continue work that does not depend on it.
