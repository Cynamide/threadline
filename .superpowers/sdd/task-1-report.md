# Task 1 Report

## What I implemented

- Added a shared init-resolution layer in `packages/cli/src/commands/init-resolution.ts`.
- Added `InitOverrides`, `DetectedInitSettings`, and `InitSettings` types in
  `packages/cli/src/types.ts`.
- Threaded `initProject()` through `resolveInitSettings()` while keeping the existing public
  `initProject` and `formatInitResult` surface compatible.
- Kept config generation aligned with `specs/config-schema.md`, including:
  - `version: "1.0"`
  - relative `project.component_path`
  - `allow_new_primitives: false`
  - `validation.pre_push: true`
- Added `docs/adr/0006-init-detection-and-overrides.md` to record the code-driven init decision
  and the explicit-override trade-off.

## What I tested and test results

### Focused resolver test

Command:

```bash
node --test packages/cli/test/init-resolution.test.mjs
```

Result:

- PASS
- 2 tests passed, 0 failed

### CLI package suite

Command:

```bash
npm test --prefix packages/cli
```

Result:

- PASS
- 24 tests passed, 0 failed

### Full repo suite

Command:

```bash
npm test
```

Result:

- Could not run successfully in this checkout
- root script failed immediately with `sh: turbo: command not found`

## TDD Evidence

### RED

Command:

```bash
node --test packages/cli/test/init-resolution.test.mjs
```

Output excerpt:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/arjit/Documents/designer/ui-copilot/packages/cli/dist/commands/init-resolution.js'
...
ℹ pass 0
ℹ fail 1
```

### GREEN

Command:

```bash
node --test packages/cli/test/init-resolution.test.mjs
```

Output excerpt:

```text
✔ mergeInitSettings prefers explicit overrides over detector output
✔ mergeInitSettings keeps componentPath relative to srcPath
ℹ pass 2
ℹ fail 0
```

## Files changed

- `docs/adr/0006-init-detection-and-overrides.md`
- `packages/cli/src/commands/init-resolution.ts`
- `packages/cli/src/commands/init.ts`
- `packages/cli/src/types.ts`
- `packages/cli/test/init-resolution.test.mjs`
- `packages/cli/dist/commands/init.js`
- `packages/cli/dist/commands/init-resolution.js`

## Commits created

- `6233c56 feat(cli): add init resolution layer`

## Self-review findings

- Added one extra focused test beyond the plan to verify the schema-sensitive
  `componentPath` normalization rule.
- Left the CLI-facing preview and override flag surface untouched for Task 2.
- Did not stage unrelated worktree changes under `docs/research/`,
  `docs/superpowers/plans/2026-07-14-threadline-init-customer-experience.md`, or
  `packages/cli/dist/index.js`.

## Issues or concerns

- Root `npm test` is currently not runnable in this checkout because the `turbo` binary is not
  available. The package-level CLI suite passed cleanly after the task changes.

## Fix follow-up

### What I changed

- Corrected `mergeInitSettings()` so detector-derived `componentPath` values are preserved when
  they are already config-relative, which keeps the default detected case `src` +
  `components` as `components`.
- Kept explicit `componentPath` override normalization prefix-aware, so values like
  `app/components` still collapse to `components` while already relative overrides like `ui`
  remain unchanged.
- Added focused resolver coverage for the preserved detected-path case, the prefixed override
  case, and absolute `componentPath` rejection.

### What I tested and the result

- `npm run build && node --test test/init-resolution.test.mjs` in `packages/cli` -> PASS, 6 tests passed, 0 failed
- `npm test` in `packages/cli` -> PASS, 28 tests passed, 0 failed

### Remaining concerns

- Root `npm test` still depends on `turbo`, which is unavailable in this checkout, so verification
  remains scoped to the CLI package suite.
