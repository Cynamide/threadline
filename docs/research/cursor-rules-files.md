# Cursor repo instructions and rules files

First-party sources used:

- Cursor Rules docs: https://docs.cursor.com/context/rules-for-ai
- Cursor CLI docs: https://docs.cursor.com/en/cli/using
- Cursor changelog entry for `.cursor/rules`: https://cursor.com/changelog/0-45-x

## Findings

- Project rules live in `.cursor/rules/` and are version-controlled. Cursor says each rule is a file in that directory, with nested `.cursor/rules/` directories allowed under subfolders for scoped rules.
- Rule files are MDC files, typically with the `.mdc` extension. Cursor documents four rule behaviors: `Always`, `Auto Attached`, `Agent Requested`, and `Manual`.
- Discovery behavior for project rules:
  - `Always` rules are always included.
  - `Auto Attached` rules are included when files matching the rule glob are referenced.
  - `Agent Requested` rules are available for the AI to pull in, but need a description.
  - `Manual` rules are only included when explicitly referenced with `@ruleName`.
  - Nested rules are automatically attached when files in their directory are referenced.
- The legacy repo-level `.cursorrules` file in the project root is still supported, but Cursor marks it deprecated and recommends migrating to `.cursor/rules/`.
- For the Cursor CLI, Cursor says it loads the same rule system as the IDE, automatically applies rules from `.cursor/rules/`, and also reads `AGENTS.md` and `CLAUDE.md` at the project root if present.
- `AGENTS.md` is the plain-markdown alternative to `.cursor/rules/`. Cursor documents it as root-level only, with no scoping and no multi-file split.

## Exact paths

- Project rules: `.cursor/rules/`
- Project rule files: `.cursor/rules/*.mdc`
- Nested scoped rules: `<subdir>/.cursor/rules/`
- Legacy project-wide file: `.cursorrules` at the project root
- Alternative root instruction file: `AGENTS.md` at the project root
- CLI-only extra root instruction file: `CLAUDE.md` at the project root

## Short take

If you are looking for Cursor’s repo instruction files today, the primary path is `.cursor/rules/` with `.mdc` files. Cursor still honors a root `.cursorrules` file for legacy projects, and the CLI also picks up root `AGENTS.md` and `CLAUDE.md` when present.
