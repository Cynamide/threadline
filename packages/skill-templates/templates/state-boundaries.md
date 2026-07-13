# State Boundaries

Treat the boundary rule as a hard line.
Edit local UI and local state only.
Do not move network access, persistence, or shared state into a component when the repo keeps that work elsewhere.
If a change needs state outside the boundary rule, create a handoff instead of widening the edit.
When a file already depends on shared state, keep the change local to the allowed surface and preserve the existing boundary.
