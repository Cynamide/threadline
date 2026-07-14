# Threadline

Threadline is a small toolkit for teams that want to move fast on UI work without losing track of what still needs human attention. It gives you a shared language for saying, “ship the safe part now, and mark the deeper part clearly for later.”

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
2. Threadline detects the repo shape and writes local config and guidance files.
3. Use `handoff({ ... })` in UI code when a task needs a later implementation pass.
4. Give the handoff a safe `fallback` so the app still works.
5. Run `threadline validate` locally or through the pre-push hook to catch boundary issues before they leave the machine.
6. Run `threadline scan-handoffs` when you want a structured list of outstanding handoffs.
7. Run `threadline export-handoffs --tracker github` when you want tracker-shaped payloads for follow-up work.

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
