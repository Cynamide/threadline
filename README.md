# Threadline

Threadline is a local monorepo for turning UI design requests into React changes with guardrails. It keeps the fast, visual parts of a change in the agent's hands and pushes architectural work into explicit handoffs.

## What lives here

- `packages/runtime` - the `handoff()` runtime used inside React projects
- `packages/ast-guard` - AST validation for handoffs, styling scope, and boundary rules
- `packages/cli` - repo setup, validation, and handoff scanning
- `packages/skill-templates` - Markdown instructions copied into agent-facing skills

## How the system is meant to behave

1. A project is initialized with `threadline init`.
2. The agent reads the repo configuration, glossary, and skill files.
3. The agent makes UI and local-state edits directly in the app.
4. Anything architectural becomes a `handoff()` call with stable metadata.
5. Validation runs locally before push.
6. Handoffs are scanned into tracker-ready records for follow-up work.

## Core language

- `handoff` is the boundary marker for work that needs engineer implementation.
- `fallback` is the safe local behavior that keeps the UI usable while the handoff remains unresolved.
- `AST guard` is the local validator that enforces syntax and boundary rules.
- `skill templates` are the agent instructions that shape how the tool behaves in a repo.

## Repo docs

- [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) for the domain map
- [`docs/adr/`](./docs/adr) for decisions that matter later
- [`specs/`](./specs) for the package and workflow contracts

## Current scope

This repo is intentionally React-first, TypeScript-first, and workspace-based. The important product edge is not code generation by itself; it is keeping generated UI work narrow enough that engineers can trust the output.
