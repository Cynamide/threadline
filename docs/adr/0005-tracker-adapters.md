# Tracker adapters instead of a tracker lock-in

Handoff export should be tracker-neutral in the core product and implemented through adapters. GitHub is the default tracker for this repo, but the exported handoff payload should stay portable so Linear or another issue system can be added without rewriting the scanner or the runtime contracts.
