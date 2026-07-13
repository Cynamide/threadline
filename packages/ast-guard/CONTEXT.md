# AST Guard Context

This package defines the vocabulary for local code validation.

## Language

**Validation**:
The local process that parses code and reports rule violations before a push.
_Avoid_: scanning, linting, review

**Violation**:
A structured rule break with a code, file location, and human-readable message.
_Avoid_: error, failure, warning

**Whitelist**:
A deliberate exception that allows a specific import or component to bypass a rule.
_Avoid_: ignore list, skip list, exemption

**Scope**:
The boundary that decides whether styling or state belongs to a local component or a shared surface.
_Avoid_: reach, range, area
