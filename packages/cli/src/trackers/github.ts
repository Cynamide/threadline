import type { TrackerAdapter } from './types.js';
import { buildIssuePayload } from './payload.js';

export const githubAdapter: TrackerAdapter = {
  name: 'github',
  toIssuePayload: buildIssuePayload,
};
