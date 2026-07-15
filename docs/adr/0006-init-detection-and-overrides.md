# ADR 0006: Init Detection and Overrides

- Status: Accepted
- Date: 2026-07-14

## Context

`threadline init` already detects framework, styling, and design-system conventions from the
repository and writes `.threadline/config.yaml` plus companion docs. The next customer-experience
slice needs a shared resolution layer so the init flow can consistently reuse the same detected
state for config generation, summary output, and a future small set of CLI override flags.

The config schema is intentionally constrained:

- `version` stays `"1.0"`
- `project.component_path` stays relative to `project.src_path`
- `design_system.allow_new_primitives` stays `false`
- `validation.pre_push` stays the default enforcement point
- required fields stay present, enum values stay valid, paths stay relative, and ports stay numeric

## Decision

`threadline init` stays code-driven.

We will add a shared init-resolution helper that:

- runs the existing detectors for framework, styling, and design system
- merges only a small set of explicit overrides for high-value knobs
- normalizes the resolved config input so it stays valid against `specs/config-schema.md`
- produces concise summary lines that describe detection, applied overrides, and the config target

The public `initProject` and `formatInitResult` interfaces remain compatible during this slice.
Task 1 threads the new resolution layer underneath the current init command implementation without
introducing preview mode or new CLI flags yet.

## Consequences

### Positive

- detection, override handling, and summary text all share one source of truth
- the init path stays fast and deterministic for first-run users
- later CLI wiring can reuse the same resolved state instead of rebuilding config decisions in
  multiple places

### Negative

- users do not get a prompt-heavy wizard for unusual repositories
- only the chosen override knobs are supported through the shared layer

## Trade-off

We are explicitly choosing a concise, code-driven init flow over a prompt-heavy wizard. That gives
new users a clearer and faster first-run path, while still leaving room for targeted overrides when
the detector guess is wrong or the repository shape is unusual.

## Verification Notes

The resolver shape aligns with the current config schema constraints:

- resolved config still renders with `version: "1.0"`
- component paths are normalized relative to the selected source path
- design-system and validation defaults stay in config generation, not in ad hoc command logic
- override handling is limited to the common knobs needed for init UX work
