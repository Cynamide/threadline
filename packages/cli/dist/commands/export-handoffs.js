import { scanHandoffs } from './scan-handoffs.js';
import { resolveTrackerAdapter } from '../trackers/index.js';

export async function exportHandoffs(options                       )                                {
  const records = await scanHandoffs({ cwd: options.cwd });
  const adapter = resolveTrackerAdapter(options.tracker ?? 'github');

  return {
    tracker: adapter.name,
    payloads: records.records.map((record) => adapter.toIssuePayload(record)),
  };
}

export function formatExportHandoffsResult(result                      )         {
  if (result.payloads.length === 0) {
    return `No ${result.tracker} handoff payloads generated.\n`;
  }

  const lines = [`Prepared ${result.payloads.length} ${result.tracker} handoff payload(s).`];
  for (const payload of result.payloads) {
    lines.push(`${payload.location} ${payload.title}`);
  }
  return `${lines.join('\n')}\n`;
}
