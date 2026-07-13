# Safe fallback only

`handoff()` fallbacks are meant to keep the UI usable while a deferred task remains unresolved, not to smuggle the real implementation into the component. That means the fallback should stay on the safe, local side of the boundary and should not become a second place where network calls, global state writes, or routing logic hide out.
