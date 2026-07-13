# Tracker adapters instead of a tracker lock-in

Handoff export should stay portable in the core product and be implemented through adapters. GitHub is the default tracker for this repo, but the exported handoff payload should stay generic so Linear or another issue system can be added without rewriting the scanner or the runtime contracts. The core config may carry generic handoff defaults that adapters consume, but tracker-specific API details belong in the adapter layer.
