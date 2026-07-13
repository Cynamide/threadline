# Threadline

Threadline helps turn UI ideas into real product updates without losing the thread. It is built for teams who want to move quickly on design changes, keep the experience consistent, and hand off the deeper work in a way that stays clear and organized.

## What lives here

- `packages/runtime` - the small runtime that supports Threadline in app code
- `packages/ast-guard` - checks that keep changes inside the right boundaries
- `packages/cli` - setup and validation commands for the workspace
- `packages/skill-templates` - reusable instructions for the agents that work with Threadline

## How it works

1. A project starts with `threadline init`.
2. Threadline learns the shape of the repo and the product language in use.
3. Day-to-day UI work stays fast and direct.
4. Bigger changes are clearly marked so they can be picked up later.
5. Checks run locally before anything is shared.
6. Follow-up work is captured in a format that is easy to track.

## Product language

- `handoff` is the marker for work that needs a deeper implementation pass.
- `fallback` is the safe behavior that keeps the experience usable in the meantime.
- `guardrails` are the checks that keep changes aligned with the repo's rules.
- `skill templates` are the instructions that help the system behave consistently.

## Repo docs

- [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) for the domain map
- [`docs/adr/`](./docs/adr) for decisions that matter later
- [`specs/`](./specs) for the package and workflow contracts

## Current scope

Threadline is meant to feel focused, dependable, and easy to adopt. The goal is not to generate more code for its own sake. The goal is to help teams move from idea to working UI with less confusion and a cleaner handoff when human attention is needed.
