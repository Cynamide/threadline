# Tracker adapters instead of a tracker lock-in

Handoff export should stay portable in the core product and be implemented through adapters. `scan-handoffs` remains the canonical record source, while `export-handoffs` resolves a tracker adapter and turns those records into issue-shaped payloads. GitHub is the default tracker for this repo, and Linear is the canonical second adapter example. The core config may carry generic handoff defaults that adapters consume, but tracker-specific API details belong in the adapter layer.

The adapter contract is intentionally small:

- handoff records stay stable and scanner-owned
- adapters shape `title`, `description`, `location`, `labels`, `priority`, and `status`
- `github` and `linear` are the initial supported adapter names
- new trackers should be added without changing the scanner output
