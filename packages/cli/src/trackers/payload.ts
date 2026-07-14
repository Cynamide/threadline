import type { HandoffRecord, TrackerIssuePayload } from './types.js';

export function buildIssuePayload(record: HandoffRecord): TrackerIssuePayload {
  return {
    title: `Handoff: ${record.title}`,
    description: record.description,
    location: `${record.filePath}:${record.line}`,
    labels: ['threadline', 'handoff'],
    priority: record.valid ? 'medium' : 'high',
    status: 'Backlog',
  };
}
