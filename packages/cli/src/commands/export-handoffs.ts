import { scanHandoffs } from './scan-handoffs.js';
import { resolveTrackerAdapter } from '../trackers/index.js';
import type { ExportHandoffsOptions, ExportHandoffsResult } from '../trackers/types.js';

export async function exportHandoffs(options: ExportHandoffsOptions): Promise<ExportHandoffsResult> {
  const records = await scanHandoffs({ cwd: options.cwd });
  const adapter = resolveTrackerAdapter(options.tracker ?? 'github');

  return {
    tracker: adapter.name,
    payloads: records.records.map((record) => adapter.toIssuePayload(record)),
  };
}

export function formatExportHandoffsResult(result: ExportHandoffsResult): string {
  if (result.payloads.length === 0) {
    return `No ${result.tracker} handoff payloads generated.\n`;
  }

  const lines = [
    `Tracker: ${result.tracker}`,
    `Handoffs found: ${result.payloads.length}`,
    '',
    'Prepared payloads:',
  ];
  for (const payload of result.payloads) {
    lines.push(`- ${payload.location} ${payload.title}`);
    lines.push(`  ${payload.description}`);
    lines.push(`  labels: ${payload.labels.join(', ')}; priority: ${payload.priority}; status: ${payload.status}`);
  }
  return `${lines.join('\n')}\n`;
}
