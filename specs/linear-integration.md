# Issue Tracker Integration

Threadline exports handoff records into an issue tracker so the missing implementation can be picked up by an engineer or downstream agent.

## Repository stance

This repo itself uses GitHub Issues for its own work tracking. The product can still export handoffs to external trackers when a target project configures one, and the CLI keeps the tracker choice behind an adapter boundary.

## Canonical handoff record

`scan-handoffs` should produce a stable record with at least:

- `id`
- `title`
- `description`
- `filePath`
- `line`
- `column`
- `valid`
- `errors`

## Tracker payload

The tracker adapter should be able to turn a canonical record into an issue-like payload without changing the scan format:

```json
{
  "title": "Handoff: Export Data",
  "description": "Trigger CSV export of the current table view",
  "location": "src/components/Settings.tsx:42",
  "labels": ["threadline", "handoff"],
  "priority": "high",
  "status": "Backlog"
}
```

## Tracker adapters

GitHub is the default tracker example for this repo, and Linear is the canonical second adapter because it has a clear issue model and a predictable status flow.

Suggested lifecycle:

1. create the issue in `Backlog`
2. link it back to the PR or change set
3. move it to `Ready` once the UI PR lands

The CLI should keep the record producer and adapter layer separate:

1. `threadline scan-handoffs` returns canonical records.
2. `threadline export-handoffs --tracker github` maps those records to GitHub-shaped payloads.
3. `threadline export-handoffs --tracker linear` uses the Linear adapter with the same canonical input.

## PR output

When handoffs are exported, the PR description should summarize:

- how many handoffs were found
- where they live
- what each handoff is asking for
- which tracker adapter was used for the export

## Notes

- Keep tracker export separate from repo setup
- Do not let the tracker adapter own the UI code
- Treat tracker payloads as structured output, not free-form prose
