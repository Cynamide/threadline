# Threadline

Threadline is a small toolkit for teams that want to move fast on UI work without losing track of what still needs human attention. It gives you a shared language for saying, “ship the safe part now, and mark the deeper part clearly for later.”

## Get started

```sh
pnpm add -D @threadline/cli
npx threadline init
```

`init` now follows the repo-first agent-native flow: it detects the repo shape, asks only about unresolved fields, shows the resolved proposal it is about to write, and then installs the pre-push hook so the first run already leaves the repo in a usable state.

## Why it exists

UI work tends to split into two kinds of effort:

1. the part that can be done locally and safely right away
2. the part that needs a fuller implementation pass, product decision, or extra verification

Without a shared system, those boundaries get fuzzy. Work gets scattered across comments, tickets, and half-finished branches. Threadline keeps that split visible in code, in validation, and in the local workflow around the repo.

## The core idea

Threadline centers on a `handoff`:

- `handoff` marks work that should not be implemented directly in the current pass
- `fallback` is the safe local behavior that keeps the UI usable meanwhile
- local validation checks make sure the handoff stays honest and the surrounding code stays inside the repo's rules

That means a developer or agent can ship the safe path immediately, while the deeper work stays clearly labeled and easy to find later.

## How it works

1. Run `threadline init` in a repo.
2. Threadline detects the repo shape and asks only for any unresolved settings.
3. Threadline shows the resolved proposal for confirmation, then writes local config and guidance files.
4. Use `handoff({ ... })` in UI code when a task needs a later implementation pass.
5. Give the handoff a safe `fallback` so the app still works.
6. Run `threadline validate` locally or `threadline validate --staged` before committing to catch boundary issues before they leave the machine.
7. Run `threadline scan-handoffs` when you want a structured list of outstanding handoffs.
8. Run `threadline export-handoffs --tracker github` when you want tracker-shaped payloads for follow-up work.

## Init flow

The default `threadline init` experience is:

1. Detect repo conventions.
2. Clarify only the fields that are still uncertain.
3. Confirm the resolved proposal that will be written.
4. Write `.threadline/` files and install the hook.

Scripted compatibility paths still exist. If you pass explicit init flags, `--json`, or `--preview`, the CLI stays non-interactive and returns or writes the resolved proposal directly.

## Code examples

### Mark deferred UI work

```ts
import { handoff } from '@threadline/runtime';

const onExport = handoff({
  id: 'settings-export-csv',
  title: 'Export Data',
  description: 'CSV export should be implemented against the reporting service',
  fallback: () => alert('Export coming soon'),
});
```

### Validate a repo locally

```sh
threadline validate
```

### Validate only staged files

```sh
threadline validate --staged
```

### Export handoffs for follow-up work

```sh
threadline export-handoffs --tracker github
```

## Typical workflow

1. Build the UI the team can safely ship now.
2. Mark any deeper follow-up as a handoff.
3. Keep the fallback usable and explicit.
4. Let validation catch imports, state, styling, and path issues before push.
5. Export the handoff list when you want the work handed off into a tracker or another follow-up system.

## Packages

- `packages/runtime` - the `handoff()` API used in app code
- `packages/ast-guard` - parsing and validation that keep handoffs and boundaries honest
- `packages/cli` - repo setup, validation, and handoff scanning commands
- `packages/skill-templates` - reusable instruction templates for agent workflows

## Key terms

- `handoff` is the marker for work that needs a deeper implementation pass
- `fallback` is the safe local behavior that runs until that work is done
- `guardrails` are the checks that keep changes aligned with the repo's rules
- `skill templates` are the reusable instructions that help agents behave consistently

## Read next

- [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) for the shared vocabulary map
- [`docs/adr/`](./docs/adr) for the decisions behind the design
- [`specs/`](./specs) for the package and workflow contracts

Threadline is meant to feel clear, local-first, and dependable. The point is not to create more abstraction for its own sake. The point is to make it obvious what is safe to ship now, what needs more work, and how to keep that distinction visible.
