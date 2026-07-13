import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
  rule: 'forbidden-import' | 'forbidden-path';
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
  const violations: ValidationViolation[] = [];

  for (const filePath of files) {
    violations.push(...pathViolations(filePath, config));
    if (!(await exists(join(options.cwd, filePath)))) continue;
    const source = await readFile(join(options.cwd, filePath), 'utf8');
    violations.push(...importViolations(filePath, source, config));
  }

  return {
    valid: violations.length === 0,
    filesChecked: files,
    violations,
    warnings: [],
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
  const extensions = config.project.extensions;
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

function pathViolations(filePath: string, config: ThreadlineConfig): ValidationViolation[] {
  if (isWhitelisted(filePath, config.boundaries.whitelisted_components)) return [];
  return config.boundaries.forbidden_paths
    .filter((pattern) => matchesPath(filePath, pattern))
    .map((pattern) => ({
      filePath,
      line: 1,
      column: 1,
      rule: 'forbidden-path' as const,
      message: `source file matches forbidden path ${pattern}`,
    }));
}

function importViolations(filePath: string, source: string, config: ThreadlineConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const forbidden = config.boundaries.forbidden_imports.filter(
    (name) => !config.boundaries.whitelisted_imports.includes(name),
  );

  for (const name of forbidden) {
    const matches = [...matchForbiddenUse(source, name)];
    for (const match of matches) {
      violations.push({
        filePath,
        ...locationForOffset(source, match),
        rule: 'forbidden-import',
        message: `uses forbidden import or global ${name}`,
      });
    }
  }

  return violations;
}

function locationForOffset(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, offset);
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function matchesPath(filePath: string, pattern: string): boolean {
  if (pattern.endsWith('/')) return filePath.startsWith(pattern);
  if (pattern.includes('*')) {
    const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
    return regex.test(filePath);
  }
  return filePath === pattern || filePath.startsWith(`${pattern}/`);
}

function isWhitelisted(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPath(filePath, pattern));
}

function matchForbiddenUse(source: string, name: string): number[] {
  const offsets: number[] = [];
  const modulePattern = new RegExp(`(?:from\\s+['"]${escapeRegExp(name)}['"]|import\\s*\\(\\s*['"]${escapeRegExp(name)}['"]\\s*\\))`, 'g');
  for (const match of source.matchAll(modulePattern)) {
    offsets.push(match.index ?? 0);
  }
  if (offsets.length > 0 && !isBrowserGlobal(name)) return offsets.slice(0, 1);

  if (isBrowserGlobal(name) || /^use[A-Z]/.test(name)) {
    const identifierPattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');
    for (const match of source.matchAll(identifierPattern)) {
      offsets.push(match.index ?? 0);
    }
  }

  return [...new Set(offsets)];
}

function isBrowserGlobal(name: string): boolean {
  return name === 'localStorage' || name === 'sessionStorage' || name === 'fetch';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
