import type { TrackerAdapter } from './types.js';

export const linearAdapter: TrackerAdapter = {
  name: 'linear',
  toIssuePayload(record) {
    return {
      title: `Handoff: ${record.title}`,
      description: record.description,
      location: `${record.filePath}:${record.line}`,
      labels: ['threadline', 'handoff'],
      priority: 'high',
      status: 'Backlog',
    };
  },
};
