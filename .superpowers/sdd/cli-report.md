# CLI Package Implementation Report

## Scope

Implemented `@threadline/cli` end to end under `packages/cli/**`, plus this report. I did not edit runtime, ast-guard, or skill-template files.

## Package Shape

- Added `packages/cli/package.json` with publish metadata, public publish config, `threadline` bin, and package exports.
- Added `packages/cli/tsconfig.json` for the package contract.
- Added a dependency-free build script at `packages/cli/scripts/build.mjs` that uses Node 26's built-in TypeScript stripping API to emit `dist/**`.
- Committed generated `dist/**` files because the publishing spec calls for generated artifacts to be present.

## Commands

- `threadline init`
  - Detects framework, styling strategy, and design system.
  - Writes `.threadline/config.yaml`, `.threadline/boundaries.md`, `.threadline/design-system.md`, and `.threadline/skill.md`.
  - Installs the pre-push hook when `.git/` is present.

- `threadline validate`
  - Loads `.threadline/config.yaml` with a minimal schema-focused YAML reader.
  - Scans staged files with `--staged`, otherwise scans the configured source tree.
  - Reports forbidden import/global usage and forbidden path violations.
  - Supports text output and `--json`.

- `threadline scan-handoffs`
  - Scans configured source files for code-level `handoff({ ... })` calls.
  - Returns canonical records with `id`, `title`, `description`, `filePath`, `line`, `column`, `valid`, and `errors`.
  - Adds tracker-neutral issue payloads with Threadline labels and Linear-style status from config.
  - Ignores handoff-like text inside strings and comments.

- `threadline install-hooks`
  - Writes an executable `.git/hooks/pre-push` hook that runs `threadline validate --staged`.
  - Is idempotent and reports when `.git/` is absent.

## Detection And Generation

- Framework detection covers Next.js, Vite, CRA, Remix, and custom.
- Styling detection covers Tailwind, styled-components, Emotion, CSS modules, and plain CSS.
- Design system detection covers shadcn, MUI, Ant Design, Radix, and none.
- Generated YAML follows `specs/config-schema.md`, including explicit project, dev, styling, git, handoff, boundary, design system, and validation knobs.

## Tests

Added Node built-in test runner coverage for:

- common framework/style/design-system detection
- schema-aligned config generation
- generated Markdown files
- `init` writing all repo-local files and installing hooks
- `validate` reporting forbidden imports, paths, globals, and staged-file scope
- `scan-handoffs` producing tracker-ready records with locations
- scanner ignoring strings/comments
- hook installation idempotency and executable mode

Verification command run:

```sh
npm test --prefix packages/cli
```

Result: 10 tests passed, 0 failed.

## Concerns

- The build uses Node's experimental `stripTypeScriptTypes` API because the environment has no installed TypeScript dependency. Tests pass, but Node prints the expected experimental warning during build.
- The validator and handoff scanner are dependency-free lexical scanners. They satisfy the documented CLI contract and tests, but they are intentionally not a full AST replacement for the ast-guard package.
