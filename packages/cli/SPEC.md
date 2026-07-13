# @ui-copilot/cli

The CLI package sets up a repo, validates it, and scans source files for handoffs.

## Commands

### `ui-copilot init`

Creates the repo-local configuration under `.ui-copilot/`, detects project conventions, and installs hooks.

### `ui-copilot validate`

Runs the AST guard against staged files or the full source tree and reports violations in text or JSON.

### `ui-copilot scan-handoffs`

Extracts all `handoff()` calls and returns structured records for issue tracker export.

### `ui-copilot install-hooks`

Writes or updates the local pre-push hook so validation runs before code leaves the machine.

## Detection surfaces

- framework: Next.js, Vite, CRA, Remix, or custom
- styling: Tailwind, styled-components, Emotion, CSS modules, or plain CSS
- design system: shadcn, MUI, Ant Design, Radix, or custom

## Generated files

- `.ui-copilot/config.yaml`
- `.ui-copilot/boundaries.md`
- `.ui-copilot/design-system.md`
- `.ui-copilot/skill.md`

## Config shape

The generated config should keep the important knobs explicit:

- project framework and source paths
- dev server command and port
- styling strategy and scoping rules
- branch prefix and merge preference
- handoff export settings
- boundary rules for forbidden imports and paths
- design system library and import path

## Example flow

1. Detect the repo shape.
2. Write the configuration files.
3. Install the hook.
4. Let the user validate and scan locally.

## Files to implement

- `src/index.ts`
- `src/commands/init.ts`
- `src/commands/validate.ts`
- `src/commands/scan-handoffs.ts`
- `src/commands/install-hooks.ts`
- `src/detectors/framework.ts`
- `src/detectors/styling.ts`
- `src/detectors/components.ts`
- `src/generators/config.ts`
- `src/generators/boundaries.ts`
- `src/generators/design-system.ts`
- `src/generators/skill.ts`

## Tests

- detects common React frameworks
- detects styling strategy from dependencies and files
- generates valid YAML and Markdown
- validates staged files
- scans handoffs with file and line metadata
