import type { TrackerAdapter } from './types.js';
import { buildIssuePayload } from './payload.js';

export const linearAdapter: TrackerAdapter = {
  name: 'linear',
  toIssuePayload: buildIssuePayload,
};
