import type { TrackerAdapter } from './types.js';

export const githubAdapter: TrackerAdapter = {
  name: 'github',
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
