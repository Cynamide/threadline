# Agent-Native Repo Context Patterns

Research scope: first-party docs and source for how major agent tools discover repo instructions, skills, and project context.

## OpenAI / Codex

- Codex uses `AGENTS.md` as the project-instruction scaffold. The help docs say `/init` in the ChatGPT desktop app while using Codex generates an `AGENTS.md` scaffold for the current project, using the same flow as the CLI.
  Source: [OpenAI Help Center](https://help.openai.com/en/articles/11369540-use-the-codex-app-for-enabling-multiple-codex-agents-in-parallel)
- Codex skills are packaged as folders of instructions, scripts, and resources. In the OpenAI skills catalog, skills in `.system` are automatically installed, and curated or experimental skills are installed through `$skill-installer`.
  Source: [openai/skills README](https://github.com/openai/skills)
- The Codex app-server docs show that skills are discoverable per `cwd` through `skills/list`, and that the recommended invocation path is to pass a `skill` input item with the `path` to `SKILL.md`. If the input item is omitted, the model can still resolve the `$skill-name` marker, but the docs explicitly say that adds latency.
  Source: [codex app-server README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)

## Anthropic / Claude Code

- Claude Code treats `CLAUDE.md` as the project memory file. The docs say a project file can live at `./CLAUDE.md` or `./.claude/CLAUDE.md`, while user-wide instructions live at `~/.claude/CLAUDE.md`.
  Source: [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- Claude Code also supports `CLAUDE.local.md` for project-specific personal notes, and it loads `CLAUDE.md` and `CLAUDE.local.md` files in the directory hierarchy above the working directory at launch.
  Source: [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- The docs recommend using `CLAUDE.md` for always-on facts like build commands and project conventions, and moving multi-step or narrow-scope procedures into skills or path-scoped rules.
  Source: [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- Claude Code can import additional files from `CLAUDE.md` with `@path/to/import`, and the docs show that if a repo already uses `AGENTS.md`, a `CLAUDE.md` can import it so both tools share the same instructions.
  Source: [Claude Code memory docs](https://code.claude.com/docs/en/memory)

## Cursor

- Cursor’s primary project-instruction system is `.cursor/rules`. The rules docs say project rules are stored in `.cursor/rules`, version-controlled, and scoped to the codebase.
  Source: [Cursor Rules docs](https://docs.cursor.com/context/rules)
- Cursor also supports root-level `AGENTS.md` as a simple markdown alternative to project rules. The rules docs say it is a plain markdown file at the project root and is good for straightforward use cases.
  Source: [Cursor Rules docs](https://docs.cursor.com/context/rules-for-ai)
- Cursor CLI docs say the CLI reads `AGENTS.md` and `CLAUDE.md` at the project root, if present, and applies them alongside `.cursor/rules`.
  Source: [Cursor CLI docs](https://docs.cursor.com/en/cli/using)

## Gemini CLI

- Gemini CLI’s default context file is `GEMINI.md`.
  Source: [Gemini CLI README](https://github.com/google-gemini/gemini-cli/blob/main/GEMINI.md)
- The Gemini CLI docs describe a hierarchical context model: `~/.gemini/GEMINI.md` for global defaults, project-root and ancestor `GEMINI.md` files for project context, and subdirectory scanning for more local context.
  Source: [Gemini CLI GEMINI.md guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md)
- Gemini CLI extensions can declare a `contextFileName`, and if omitted, a `GEMINI.md` inside the extension directory is loaded.
  Source: [Gemini CLI extensions reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md)

## What the docs actually converge on

- There is no single universal filename across agent tools.
- The most common repo-root instruction-file pattern is a plain markdown file at the root: `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`, depending on the tool family.
- Hidden directories are used when the tool wants structure or scoping:
  - `.cursor/rules`
  - `.claude/rules/`
  - `.claude/CLAUDE.md` and `CLAUDE.local.md`
  - `.gemini/`-scoped config and hierarchical `GEMINI.md`
- Codex and Cursor both explicitly support `AGENTS.md` at the repo root, while Claude can import `AGENTS.md` into `CLAUDE.md` and Cursor CLI reads `CLAUDE.md` too.

## Practical takeaway for Threadline

If Threadline wants the most interoperable “agent-native” default, the evidence points to:

1. a root `AGENTS.md` for shared repo instructions,
2. a hidden directory for tool-specific structured state when needed,
3. and tool-specific adapters only when the ecosystem requires them.

That is not because one tool invented it first; it is because the major agent tools already agree on reading a root markdown instruction file and treating hidden directories as the place for richer structure.

