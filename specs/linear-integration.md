# Issue Tracker Integration

UI Copilot exports handoff records into an issue tracker so the missing implementation can be picked up by an engineer or downstream agent.

## Repository stance

This repo itself uses GitHub Issues for its own work tracking. The product can still export handoffs to external trackers when a target project configures one.

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

The tracker adapter should be able to turn a handoff into an issue-like payload:

```json
{
  "title": "Handoff: Export Data",
  "description": "Trigger CSV export of the current table view",
  "location": "src/components/Settings.tsx:42",
  "labels": ["ui-copilot", "handoff"],
  "priority": "high",
  "status": "Backlog"
}
```

## Linear as an adapter example

Linear is the canonical external example because it has a clear issue model and a predictable status flow.

Suggested lifecycle:

1. create the issue in `Backlog`
2. link it back to the PR or change set
3. move it to `Ready` once the UI PR lands

## PR output

When handoffs are exported, the PR description should summarize:

- how many handoffs were found
- where they live
- what each handoff is asking for

## Notes

- Keep tracker export separate from repo setup
- Do not let the tracker adapter own the UI code
- Treat tracker payloads as structured output, not free-form prose
