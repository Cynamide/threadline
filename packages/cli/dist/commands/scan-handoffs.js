import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseHandoffs, validateHandoffSyntax } from '@threadline/ast-guard';
import { loadConfig } from '../utils/config.js';
import { findFiles } from '../utils/fs.js';

export async function scanHandoffs(options                     )                              {
  const config = await loadConfig(options.cwd);
  const files = (await findFiles(join(options.cwd, config.project.src_path), {
    extensions: config.project.extensions,
  })).map((file) => `${config.project.src_path.replace(/\/$/, '')}/${file}`);
  const records                  = [];

  for (const filePath of files) {
    const source = await readFile(join(options.cwd, filePath), 'utf8');
    for (const handoff of parseHandoffs(source, filePath)) {
      const violations = validateHandoffSyntax(handoff);
      records.push(toHandoffRecord(handoff, filePath, violations));
    }
  }

  return { records };
}

export function formatScanHandoffsResult(result                    , json = false)         {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  if (result.records.length === 0) return 'No handoffs found.\n';
  const lines = [`Found ${result.records.length} handoff(s):`];
  for (const record of result.records) {
    lines.push(`${record.filePath}:${record.line}:${record.column} ${record.title}`);
  }
  return `${lines.join('\n')}\n`;
}

function toHandoffRecord(
  handoff                                          ,
  filePath        ,
  violations                                          ,
)                {
  const errors = violations.map((violation) => `${violation.code}: ${violation.message}`);
  return {
    id: handoff.id ?? '',
    title: handoff.title ?? 'Untitled handoff',
    description: handoff.description ?? '',
    filePath,
    line: handoff.line,
    column: handoff.column,
    valid: errors.length === 0,
    errors,
  };
}
