# ADR 0006: Agent-Native Init Detection and Clarification

- Status: Accepted
- Date: 2026-07-14

## Context

`threadline init` needs to feel like guided setup for a real repository. The tool already has
useful detectors for framework, styling, and design-system conventions, but detection alone is not
enough when a repo is only partly legible. The customer flow should tell the user what Threadline
thinks it found, narrow any ambiguity to a short clarification, validate the answer, and confirm
the config before writing local files.

The config schema remains intentionally constrained:

- `version` stays `"1.0"`
- `project.component_path` stays relative to `project.src_path`
- `design_system.allow_new_primitives` stays `false`
- `validation.pre_push` stays the default enforcement point
- required fields stay present, enum values stay valid, paths stay relative, and ports stay numeric

## Decision

`threadline init` is agent-native and interactive.

We will use a shared init-flow helper that:

- runs the existing detectors for framework, styling, and design system
- builds a proposal with confident defaults plus a narrow list of uncertain fields
- accepts short user clarifications, including natural-language corrections
- validates the proposed config before final confirmation
- produces summary lines that explain what was detected, what is uncertain, and what will be
  written

The primary customer flow is:

1. detect
2. clarify only uncertainty
3. confirm
4. write

`--preview` and init override flags are not part of the normal customer path.

## Consequences

### Positive

- new users get a calm first-run flow that explains what Threadline inferred
- uncertainty becomes a short interaction instead of a large option surface
- detection, clarification, confirmation, and file generation share one validated config proposal

### Negative

- init now needs lightweight interaction state instead of a purely one-shot resolver
- unusual repositories still require careful clarification prompts to avoid over-asking

## Trade-off

We are choosing an agent-guided confirmation loop over a flag-first init ritual. That adds a small
amount of interaction, but it keeps the common path focused on understanding and validating the repo
shape instead of forcing users to assemble config manually.

## Verification Notes

Read against `docs/superpowers/specs/2026-07-14-threadline-init-agent-native-flow.md` and
`specs/config-schema.md`, this decision keeps the required constraints intact:

- the proposal must validate before write
- component paths are normalized relative to the selected source root
- required enum fields remain explicit in the config
- the final confirmation happens before `.threadline/config.yaml` and companion files are written
