# Testing Specification

This document describes the test shape for the whole monorepo.

## Test layers

Run these package suites directly when you want to verify the shipped behavior:

- `npm test --prefix packages/runtime`
- `npm test --prefix packages/ast-guard`
- `npm test --prefix packages/cli`
- `npm test --prefix packages/skill-templates`

### Runtime

The runtime package needs focused tests around:

- fallback execution
- development warnings
- production silence
- async fallback support
- object-form-only `handoff()` behavior

### AST guard

The validation package needs tests for:

- parsing handoffs from source
- line and column extraction
- styling violations
- forbidden imports and boundary rules
- validation output formatting

### CLI

The CLI package needs tests for:

- project detection
- config generation
- hook installation
- staged-file validation
- handoff scanning

## Integration tests

Use small fixture repositories to exercise the real workflows:

1. `init` writes the repo-local config files
2. `validate` catches boundary violations
3. `scan-handoffs` returns tracker-ready records
4. the pre-push hook blocks invalid code

## End-to-end coverage

The most important E2E case is the full path from initialization to validation to handoff export.

That flow should prove that:

- the repo initializes cleanly
- the agent can create a handoff in a React component
- the validator sees the change
- the scanner can collect the handoff metadata

## Fixtures

Fixture projects should represent the common stacks the CLI detects:

- Next.js + Tailwind
- Vite + styled-components
- CRA + CSS modules

## Quality bar

- tests should be fast enough to run locally
- tests should be deterministic
- test names should describe the behavior, not the implementation trick
