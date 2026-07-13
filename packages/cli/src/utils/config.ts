import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ThreadlineConfig } from '../types.js';

const defaultConfig: ThreadlineConfig = {
  project: {
    framework: 'custom',
    src_path: 'src',
    component_path: 'components',
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  dev: {
    run_command: 'npm run dev',
    port: 3000,
  },
  boundaries: {
    forbidden_imports: [],
    forbidden_paths: [],
    whitelisted_imports: [],
    whitelisted_components: [],
  },
};

export async function loadConfig(cwd: string): Promise<ThreadlineConfig> {
  let text = '';
  try {
    text = await readFile(join(cwd, '.threadline/config.yaml'), 'utf8');
  } catch {
    return defaultConfig;
  }

  return {
    project: {
      framework: readScalar(text, 'project', 'framework', defaultConfig.project.framework) as ThreadlineConfig['project']['framework'],
      src_path: readScalar(text, 'project', 'src_path', defaultConfig.project.src_path),
      component_path: readScalar(text, 'project', 'component_path', defaultConfig.project.component_path),
      extensions: readList(text, 'project', 'extensions', defaultConfig.project.extensions),
    },
    dev: {
      run_command: readScalar(text, 'dev', 'run_command', defaultConfig.dev.run_command),
      port: Number(readScalar(text, 'dev', 'port', String(defaultConfig.dev.port))),
    },
    styling: {
      strategy: readScalar(text, 'styling', 'strategy', 'plain-css') as ThreadlineConfig['styling']['strategy'],
      enforce_scoping: readScalar(text, 'styling', 'enforce_scoping', 'true') === 'true',
    },
    handoff: {
      create_issues: readScalar(text, 'handoff', 'create_issues', 'true') === 'true',
      status_on_create: readScalar(text, 'handoff', 'status_on_create', 'Backlog'),
      status_on_merge: readScalar(text, 'handoff', 'status_on_merge', 'Ready'),
      default_assignee: readScalar(text, 'handoff', 'default_assignee', ''),
      team_id: readScalar(text, 'handoff', 'team_id', ''),
    },
    boundaries: {
      forbidden_imports: readList(text, 'boundaries', 'forbidden_imports', []),
      forbidden_paths: readList(text, 'boundaries', 'forbidden_paths', []),
      whitelisted_imports: readList(text, 'boundaries', 'whitelisted_imports', []),
      whitelisted_components: readList(text, 'boundaries', 'whitelisted_components', []),
    },
    validation: {
      max_warnings: Number(readScalar(text, 'validation', 'max_warnings', '0')),
    },
    design_system: {
      library: readScalar(text, 'design_system', 'library', 'none') as ThreadlineConfig['design_system']['library'],
      import_path: readScalar(text, 'design_system', 'import_path', ''),
      allow_new_primitives: readScalar(text, 'design_system', 'allow_new_primitives', 'false') === 'true',
    },
  };
}

function readScalar(text: string, section: string, key: string, fallback: string): string {
  const line = sectionLines(text, section).find((candidate) => candidate.startsWith(`  ${key}:`));
  if (!line) return fallback;
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return '';
  return value.replace(/^"|"$/g, '');
}

function readList(text: string, section: string, key: string, fallback: string[]): string[] {
  const lines = sectionLines(text, section);
  const start = lines.findIndex((line) => line.startsWith(`  ${key}:`));
  if (start === -1) return fallback;
  const headerValue = lines[start].slice(lines[start].indexOf(':') + 1).trim();
  if (headerValue === '[]') return [];
  const items: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('  ') && !line.startsWith('    ')) break;
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) items.push(trimmed.slice(2).replace(/^"|"$/g, ''));
  }
  return items;
}

function sectionLines(text: string, section: string): string[] {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line === `${section}:`);
  if (start === -1) return [];
  const result: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^[a-z_]+:/.test(line)) break;
    result.push(line);
  }
  return result;
}
