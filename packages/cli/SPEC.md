# @threadline/cli

`@threadline/cli` is the repo-facing entry point for Threadline. It helps a project get set up, keeps the rules checked locally, and turns handoffs into portable tracker exports.

If you are new to the tool, this is the package you touch first.

## Commands

### `threadline init`

Creates the repo-local configuration under `.threadline/`, detects project conventions, and installs hooks.

### `threadline validate`

Runs the AST guard against staged files or the full source tree and reports violations in text or JSON.

### `threadline scan-handoffs`

Extracts all `handoff()` calls and returns canonical records with source locations and validation state.

### `threadline export-handoffs`

Turns canonical handoff records into tracker-specific issue payloads through the adapter layer.

### `threadline install-hooks`

Writes or updates the local pre-push hook so validation runs before code leaves the machine.

## Detection surfaces

- framework: Next.js, Vite, CRA, Remix, or custom
- styling: Tailwind, styled-components, Emotion, CSS modules, or plain CSS
- design system: shadcn, MUI, Ant Design, Radix, or custom

## Generated files

- `.threadline/config.yaml`
- `.threadline/boundaries.md`
- `.threadline/design-system.md`
- `.threadline/skill.md`

## Config shape

The generated config should keep the important knobs explicit:

- project framework and source paths
- dev server command and port
- styling strategy and scoping rules
- branch prefix and merge preference
- handoff export settings and tracker adapter defaults
- boundary rules for forbidden imports and paths
- design system library and import path

## Example flow

1. Detect the repo shape.
2. Write the configuration files.
3. Install the hook.
4. Let the user validate, scan, and export handoffs locally.

## Why this package exists

The CLI makes Threadline practical in a real repo.

It bridges the gap between the ideas in the docs and the day-to-day workflow: set the repo up once, validate before pushing, and extract handoffs when the team needs a clean list of follow-up work.

## How to use it

1. Run `threadline init` in a fresh repo or one that has not been wired up yet.
2. Run `threadline validate` during development or before a push.
3. Run `threadline scan-handoffs` when you want the outstanding deferred work as canonical records.
4. Run `threadline export-handoffs --tracker github` when you want GitHub-shaped payloads, or `--tracker linear` for the Linear example adapter.
5. Run `threadline install-hooks` if you want validation enforced automatically by git.

## Files to implement

- `src/index.ts`
- `src/commands/init.ts`
- `src/commands/validate.ts`
- `src/commands/scan-handoffs.ts`
- `src/commands/export-handoffs.ts`
- `src/commands/install-hooks.ts`
- `src/trackers/types.ts`
- `src/trackers/github.ts`
- `src/trackers/linear.ts`
- `src/trackers/index.ts`
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
- exports handoffs through a tracker adapter boundary
