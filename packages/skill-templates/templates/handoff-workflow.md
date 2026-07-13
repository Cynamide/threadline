# Handoff Workflow

Use `handoff()` when the work should not be implemented in this repo now.
Create the handoff in the same file where the deferred work appears.
Make the handoff object explicit. Include the title, description, fallback, and the repo-local context needed to finish later.
Keep the fallback safe and local. It should preserve the current UI state and avoid hidden side effects.
If the deferred work crosses a tracker boundary, keep the payload tracker-neutral and let the adapter handle export format.
