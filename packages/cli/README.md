# @threadline/cli

Threadline CLI sets up a React repo for local handoff validation. It detects the repo shape, writes `.threadline/` guidance files, installs a pre-push hook, validates boundaries, scans `handoff()` calls, and exports tracker-shaped follow-up payloads.

## Install

```sh
pnpm add -D @threadline/cli
```

## Initialize

```sh
pnpm exec threadline init
```

`init` is interactive by design. It inspects the repo first, asks only about unresolved settings, shows the resolved config, and writes files only after confirmation.

## Validate

```sh
pnpm exec threadline validate
pnpm exec threadline validate --staged
```

The installed pre-push hook runs full validation before code leaves the machine.

## Handoffs

```sh
pnpm exec threadline scan-handoffs
pnpm exec threadline export-handoffs --tracker github
```

Use handoffs for UI work that needs a later implementation pass while keeping the current app path safe through a fallback.
