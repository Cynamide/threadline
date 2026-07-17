# Claude Code repo-local instructions

Sources used:
- [Claude Code docs: How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)

## Findings

- Claude Code treats `CLAUDE.md` as the project instruction file. The docs say a project CLAUDE file can live at either `./CLAUDE.md` or `./.claude/CLAUDE.md`, so the root file and the hidden `.claude` location are both supported rather than one being preferred. Source: [memory docs](https://code.claude.com/docs/en/memory).
- For project-level loading, Claude walks up the directory tree from the current working directory and loads any `CLAUDE.md` and `CLAUDE.local.md` files it finds. The docs say the discovered files are concatenated into context, and that closer files are read later in the order. Source: [memory docs](https://code.claude.com/docs/en/memory).
- Claude Code also supports `.claude/rules/*.md` for modular rules. The docs say these files are loaded every session or when matching files are opened, which makes them a companion mechanism to `CLAUDE.md` rather than a replacement. Source: [memory docs](https://code.claude.com/docs/en/memory).
- Claude Code does not read `AGENTS.md` directly. The docs say to create `CLAUDE.md` and import `AGENTS.md` if a repo already uses it for other agents. Source: [memory docs](https://code.claude.com/docs/en/memory).
- Additional directories passed with `--add-dir` do not contribute memory by default. The docs say `CLAUDE.md` loading from those directories is opt-in via `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`, and the changelog records that support as a 2.1.20 addition. Sources: [memory docs](https://code.claude.com/docs/en/memory), [changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).

## Short answer

Claude Code does not appear to prefer root markdown over hidden directories. It accepts both `./CLAUDE.md` and `./.claude/CLAUDE.md`, then layers in parent-directory `CLAUDE.md` and `CLAUDE.local.md` files as it walks upward from the working directory. Hidden `.claude/rules/` is the main place for modular rule files.
