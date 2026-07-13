# Monorepo workspace for the tool

Threadline is implemented as a workspace monorepo so the runtime, validation engine, CLI, and skill templates can evolve at different speeds without being forced into one release unit. That split keeps the runtime small, keeps validation focused, and lets the repo ship docs and tooling changes independently when needed.
