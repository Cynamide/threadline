import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseHandoffs, validateHandoffSyntax } from '../../../ast-guard/src/index.js';
import { loadConfig } from '../utils/config.js';
import { findFiles } from '../utils/fs.js';

export interface ScanHandoffsOptions {
  cwd: string;
  json?: boolean;
}

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

export interface ScanHandoffsResult {
  records: HandoffRecord[];
}

export async function scanHandoffs(options: ScanHandoffsOptions): Promise<ScanHandoffsResult> {
  const config = await loadConfig(options.cwd);
  const files = (await findFiles(join(options.cwd, config.project.src_path), {
    extensions: config.project.extensions,
  })).map((file) => `${config.project.src_path.replace(/\/$/, '')}/${file}`);
  const records: HandoffRecord[] = [];

  for (const filePath of files) {
    const source = await readFile(join(options.cwd, filePath), 'utf8');
    for (const handoff of parseHandoffs(source, filePath)) {
      const violations = validateHandoffSyntax(handoff);
      const location = { line: handoff.line, column: handoff.column };
      const title = handoff.title ?? 'Untitled handoff';
      const description = handoff.description ?? '';
      const id = handoff.id ?? '';
      const errors = violations.map((violation) => `${violation.code}: ${violation.message}`);
      records.push({
        id,
        title,
        description,
        filePath,
        line: location.line,
        column: location.column,
        valid: errors.length === 0,
        errors,
      });
    }
  }

  return { records };
}

export function formatScanHandoffsResult(result: ScanHandoffsResult, json = false): string {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  if (result.records.length === 0) return 'No handoffs found.\n';
  const lines = [`Found ${result.records.length} handoff(s):`];
  for (const record of result.records) {
    lines.push(`${record.filePath}:${record.line}:${record.column} ${record.title}`);
  }
  return `${lines.join('\n')}\n`;
}
