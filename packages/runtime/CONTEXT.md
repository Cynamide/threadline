# Runtime Context

This package defines the vocabulary for the handoff runtime.

## Language

**Handoff**:
A callable boundary marker for work the agent should not implement directly.
_Avoid_: placeholder, TODO, comment

**Fallback**:
The safe local behavior that runs when a handoff is triggered.
_Avoid_: stub, mock, no-op

**Stable ID**:
The persistent identifier attached to a handoff so it can be tracked across edits.
_Avoid_: random ID, generated name, ephemeral key
