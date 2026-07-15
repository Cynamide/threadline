# Threadline Init Agent-Native Flow

## Goal

Make `threadline init` feel like guided setup for a real repo, not a flag-driven CLI ritual. The tool should use an agent-first flow to detect the repo shape, resolve uncertainty, validate the result, and only then write the local Threadline files.

## Principle

Threadline is agent-native.

That means the init experience should prefer:

- agent-guided reasoning over raw flag entry
- clarification over guessing
- validation over trusting the first answer
- a calm confirmation step before any files are written

The user should help the agent resolve uncertainty, not manually assemble config.

## Customer Experience

### 1. Detect

The user runs `threadline init`.

Threadline inspects the repo and builds a proposed config from what it can infer:

- framework
- styling strategy
- design system
- source root
- component path
- dev command
- port

If the repo is clear enough, the tool proceeds with a compact summary.

### 2. Explain

The CLI shows a short summary of what it believes it found and what it plans to write.

The summary should be readable in a few seconds and should answer:

- what the tool detected
- what it is still unsure about, if anything
- what config files will be written

### 3. Clarify only uncertainty

If detection is uncertain, the CLI should ask only about the ambiguous parts.

The agent should:

- use the repo context to propose the most likely answer
- present a small set of likely choices when possible
- accept a natural-language correction when the user types one
- re-validate the answer before moving on

The user should not be asked to answer every config field.

### 4. Confirm

Before writing files, the CLI should show a final confirmation screen that clearly states what will be written.

This is the last chance to correct a mistaken assumption. It should feel like “yes, this is the config” rather than “please debug the tool.”

### 5. Write

After confirmation, Threadline writes the local config and companion files and installs the hook.

If validation fails at this stage, the tool should explain the problem in plain language and return to clarification rather than writing invalid output.

## What the CLI should show

The CLI should be able to produce messages like:

```text
Detected: nextjs, tailwind, shadcn

I’m not fully sure about:
- component path

Suggested value:
- component path: components

Confirm this config before writing?
```

Or, when the repo is less clear:

```text
I couldn’t reliably detect the styling strategy.

Pick one:
1) tailwind
2) styled-components
3) emotion
4) css-modules
5) plain-css
```

The important thing is that uncertainty becomes a narrow question, not a long form.

## Out of Scope

- A prompt-heavy setup wizard
- A full CLI option matrix as the primary UX
- Raw config editing as the normal first-run path
- `--preview` as a core customer workflow
- Override flags as the main way to use init

## Acceptance Criteria

- A new user can run `threadline init` and understand what the tool thinks the repo looks like.
- If the repo is uncertain, the tool asks only the missing or ambiguous questions.
- User input is interpreted by the agent and validated before any files are written.
- The user sees a final confirmation before write.
- The flow stays calm and low-friction even when the repo shape is unusual.

## Notes

This spec is intentionally customer-facing. It defines the desired interaction model for the init experience, not the implementation details of the detector, parser, or config writer.
