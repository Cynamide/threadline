import { githubAdapter } from './github.js';
import { linearAdapter } from './linear.js';
import type { TrackerAdapter, TrackerName } from './types.js';

export { githubAdapter, linearAdapter };
export type {
  ExportHandoffsOptions,
  ExportHandoffsResult,
  TrackerAdapter,
  TrackerIssuePayload,
  TrackerName,
} from './types.js';
export type { HandoffRecord } from '../commands/scan-handoffs.js';

export function resolveTrackerAdapter(name: TrackerName): TrackerAdapter {
  if (name === 'linear') {
    return linearAdapter;
  }
  return githubAdapter;
}
