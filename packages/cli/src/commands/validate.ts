import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runValidation as runAstValidation } from '../vendor/ast-guard/src/index.js';
import { loadConfig } from '../utils/config.js';
import { exists, findFiles } from '../utils/fs.js';
import { stagedFiles } from '../utils/git.js';
import type { ThreadlineConfig } from '../types.js';

export interface ValidateOptions {
  cwd: string;
  json?: boolean;
  staged?: boolean;
}

export interface ValidationViolation {
  filePath: string;
  line: number;
  column: number;
  rule: string;
  message: string;
}

export interface ValidateResult {
  valid: boolean;
  filesChecked: string[];
  violations: ValidationViolation[];
  warnings: string[];
}

export async function validateProject(options: ValidateOptions): Promise<ValidateResult> {
  const config = await loadConfig(options.cwd);
  const files = await filesToValidate(options.cwd, config, Boolean(options.staged));
  const fileEntries = await Promise.all(
    files.map(async (filePath) => ({
      filePath,
      source: (await exists(join(options.cwd, filePath)))
        ? await readFile(join(options.cwd, filePath), 'utf8')
        : '',
    })),
  );

  const validation = runAstValidation({
    files: fileEntries,
    config: {
      project: config.project,
      styling: config.styling,
      boundaries: config.boundaries,
      validation: config.validation,
    },
  });
  const violations = validation.violations.map((violation) => ({
    filePath: violation.filePath,
    line: violation.line ?? 1,
    column: violation.column ?? 1,
    rule: violation.code,
    message: violation.message,
  }));

  return {
    valid: validation.passed,
    filesChecked: files,
    violations,
    warnings: validation.violations
      .filter((violation) => violation.severity === 'warning')
      .map((violation) => violation.message),
  };
}

export function formatValidateResult(result: ValidateResult, json = false): string {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  if (result.valid) return `Threadline validation passed for ${result.filesChecked.length} file(s).\n`;
  const lines = [`Threadline validation failed with ${result.violations.length} violation(s):`];
  for (const violation of result.violations) {
    lines.push(
      `${violation.filePath}:${violation.line}:${violation.column} ${violation.rule} ${violation.message}`,
    );
  }
  return `${lines.join('\n')}\n`;
}

async function filesToValidate(cwd: string, config: ThreadlineConfig, staged: boolean): Promise<string[]> {
  const extensions = [...config.project.extensions, '.css', '.scss', '.sass'];
  const sourcePrefix = `${config.project.src_path.replace(/\/$/, '')}/`;
  const candidates = staged ? await stagedFiles(cwd) : await findFiles(join(cwd, config.project.src_path), { extensions });
  const normalized = staged
    ? candidates
    : candidates.map((file) => `${sourcePrefix}${file}`);

  return normalized
    .filter((file) => file.startsWith(sourcePrefix))
    .filter((file) => extensions.some((extension) => file.endsWith(extension)))
    .sort();
}
