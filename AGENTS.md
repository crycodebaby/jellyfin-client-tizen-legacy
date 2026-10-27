# Agent instructions — Smairys Mediathek

Shared onboarding for Codex, Claude Code, and other coding agents. Product and contributor documentation is in German; keep code identifiers in English.

## Read in this order

1. `README.md` — purpose, audience, current release status.
2. `docs/PROJECT_CONTEXT.md` — hardware, architecture, limits, verification, phase gates.
3. `docs/DECISIONS.md` — accepted decisions and why they were made.
4. `TASKS.md` — actionable backlog and blockers.

`CLAUDE.md` is a short compatibility entry point. Keep project truth in the shared files above; avoid parallel or contradictory instructions.

For visual or remote-navigation work, also read the project design skill in `SKILL.md`.

## Fixed project constraints

- Target: Samsung UE65KU6099, Tizen 2.4.0, WebKit r152340.
- Keep runtime JavaScript ES5-compatible unless the target TV proves a newer feature works.
- Avoid frameworks, bundlers, runtime CDNs, and unverified browser APIs.
- Jellyfin is the single source of truth for users, libraries, metadata, and media.
- Samsung TV web apps use WGT packages. Never claim a build, install, playback, or hardware test succeeded without direct evidence.
- Remote navigation and visible focus are core behavior; mouse interaction is optional.
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
