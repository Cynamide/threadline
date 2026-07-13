# Domain Docs

This repo uses a multi-context layout.

## Layout

- The root `CONTEXT-MAP.md` points to each package or domain `CONTEXT.md`
- Each package gets its own `CONTEXT.md` glossary file
- Shared repo-level decisions can live in `docs/adr/`

## Reading Rules

- Read the root `CONTEXT-MAP.md` first
- Then read the relevant package `CONTEXT.md`
- Prefer the most specific context file available
- If a package-local context exists, use it before any broader guidance

## Authoring Rules

- Keep context files short, specific, and glossary-only
- Put cross-cutting decisions in ADRs under `docs/adr/`
- Put package-local decisions next to the package when they only apply there
