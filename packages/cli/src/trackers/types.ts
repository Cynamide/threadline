export type TrackerName = 'github' | 'linear';

export interface HandoffRecord {
  id: string;
  title: string;
  description: string;
  filePath: string;
  line: number;
  column: number;
  valid: boolean;
  errors: string[];
}

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
