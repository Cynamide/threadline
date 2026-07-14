import type { HandoffRecord } from '../commands/scan-handoffs.js';

export type TrackerName = 'github' | 'linear';

export interface TrackerIssuePayload {
  title: string;
  description: string;
  location: string;
  labels: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'Backlog' | 'Ready' | 'Done';
}

export interface TrackerAdapter {
  name: TrackerName;
  toIssuePayload(record: HandoffRecord): TrackerIssuePayload;
  summarize?(records: HandoffRecord[]): string;
}

export interface ExportHandoffsOptions {
  cwd: string;
  tracker?: TrackerName;
}

export interface ExportHandoffsResult {
  tracker: TrackerName;
  payloads: TrackerIssuePayload[];
}
