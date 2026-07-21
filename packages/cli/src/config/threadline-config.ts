import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { ConfigInput, ThreadlineConfig } from '../types.js';
const TEMPLATE_PATH = new URL('./threadline-config.template.yaml', import.meta.url);
let cachedTemplate: string | null = null;

const DEFAULT_CONFIG: ThreadlineConfig = {
  version: '1.0',
  project: {
    framework: 'custom',
    src_path: 'src',
    component_path: 'components',
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  dev: {
    run_command: 'npm run dev',
    port: 3000,
    startup_timeout: 10000,
  },
  boundaries: {
    forbidden_imports: [],
    forbidden_paths: [],
    whitelisted_imports: [],
    whitelisted_components: [],
  },
  git: {
    branch_prefix: 'design/',
    commit_style: 'conventional',
    squash_merge: true,
    pr_title_format: 'ui: {description}',
  },
  handoff: {
    create_issues: true,
    status_on_create: 'Backlog',
    status_on_merge: 'Ready',
    default_assignee: null,
    team_id: null,
  },
  validation: {
    pre_push: true,
    pre_commit: false,
    auto_fix: true,
    max_warnings: 0,
  },
  design_system: {
    library: 'none',
    import_path: '',
    allow_new_primitives: false,
    component_aliases: {},
  },
};

export function createDefaultThreadlineConfig(): ThreadlineConfig {
  return cloneConfig(DEFAULT_CONFIG);
}

export function buildThreadlineConfig(input: ConfigInput): ThreadlineConfig {
  return {
    version: '1.0',
    project: {
      framework: input.framework,
      src_path: input.srcPath,
      component_path: input.componentPath,
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
    dev: {
      run_command: input.devCommand,
      port: input.port,
      startup_timeout: 10000,
    },
    styling: {
      strategy: input.styling,
      enforce_scoping: true,
      tailwind_config: input.tailwindConfig ?? '',
    },
    git: {
      branch_prefix: 'design/',
      commit_style: 'conventional',
      squash_merge: true,
      pr_title_format: 'ui: {description}',
    },
    handoff: {
      create_issues: true,
      status_on_create: 'Backlog',
      status_on_merge: 'Ready',
      default_assignee: null,
      team_id: null,
    },
    boundaries: {
      forbidden_imports: [
        'fetch',
        'axios',
        'useSWR',
        'useQuery',
        'useDispatch',
        'useSelector',
        'useNavigate',
        'localStorage',
        'sessionStorage',
      ],
      forbidden_paths: ['src/api/', 'src/store/', 'src/hooks/useAuth*', 'src/services/'],
      whitelisted_imports: [],
      whitelisted_components: ['src/providers/**', 'src/layouts/**'],
    },
    validation: {
      pre_push: true,
      pre_commit: false,
      auto_fix: true,
      max_warnings: 0,
    },
    design_system: {
      library: input.designSystem,
      import_path: input.designSystemImportPath,
      allow_new_primitives: false,
      component_aliases: {
        Button: 'PrimaryButton',
        Input: 'TextInput',
      },
    },
  };
}

export function renderThreadlineConfig(config: ThreadlineConfig): string {
  const resolved = normalizeThreadlineConfig(config);
  return loadTemplate().replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (_match, token: string) => {
    switch (token) {
      case 'framework':
        return yamlString(resolved.project.framework);
      case 'srcPath':
        return yamlString(resolved.project.src_path);
      case 'componentPath':
        return yamlString(resolved.project.component_path);
      case 'devCommand':
        return yamlString(resolved.dev.run_command);
      case 'port':
        return String(resolved.dev.port);
      case 'styling':
        return yamlString(resolved.styling?.strategy ?? 'plain-css');
      case 'tailwindConfig':
        return yamlNullableString(resolved.styling?.tailwind_config ?? '');
      case 'designSystem':
        return yamlString(resolved.design_system?.library ?? 'none');
      case 'designSystemImportPath':
        return yamlString(resolved.design_system?.import_path ?? '');
      default:
        throw new Error(`Unknown config template placeholder: ${token}`);
    }
  });
}

export async function loadThreadlineConfig(cwd: string): Promise<ThreadlineConfig> {
  try {
    const text = await readFile(join(cwd, '.threadline/config.yaml'), 'utf8');
    return parseThreadlineConfig(text);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
      return createDefaultThreadlineConfig();
    }
    throw error;
  }
}

export function parseThreadlineConfig(text: string): ThreadlineConfig {
  const data = parseYamlConfig(text);
  const project = {
    framework: readYamlEnum(data, 'project', 'framework', ['nextjs', 'vite', 'cra', 'remix', 'custom'], DEFAULT_CONFIG.project.framework, true),
    src_path: readYamlScalar(data, 'project', 'src_path', DEFAULT_CONFIG.project.src_path, true),
    component_path: readYamlScalar(data, 'project', 'component_path', DEFAULT_CONFIG.project.component_path, true),
    extensions: readYamlList(data, 'project', 'extensions', DEFAULT_CONFIG.project.extensions, true),
  };
  const dev = {
    run_command: readYamlScalar(data, 'dev', 'run_command', DEFAULT_CONFIG.dev.run_command, true),
    port: readYamlNumber(data, 'dev', 'port', DEFAULT_CONFIG.dev.port, true),
    startup_timeout: readYamlNumber(data, 'dev', 'startup_timeout', DEFAULT_CONFIG.dev.startup_timeout, true),
  };
  const styling = {
    strategy: readYamlEnum(data, 'styling', 'strategy', ['tailwind', 'styled-components', 'emotion', 'css-modules', 'plain-css'], 'plain-css', true),
    enforce_scoping: readYamlBoolean(data, 'styling', 'enforce_scoping', true, true),
    tailwind_config: readYamlScalar(data, 'styling', 'tailwind_config', '', true),
  };
  const git = {
    branch_prefix: readYamlScalar(data, 'git', 'branch_prefix', 'design/', true),
    commit_style: readYamlEnum(data, 'git', 'commit_style', ['conventional', 'simple'], 'conventional', true),
    squash_merge: readYamlBoolean(data, 'git', 'squash_merge', true, true),
    pr_title_format: readYamlScalar(data, 'git', 'pr_title_format', 'ui: {description}', true),
  };
  const handoff = {
    create_issues: readYamlBoolean(data, 'handoff', 'create_issues', true, true),
    status_on_create: readYamlScalar(data, 'handoff', 'status_on_create', 'Backlog', true),
    status_on_merge: readYamlScalar(data, 'handoff', 'status_on_merge', 'Ready', true),
    default_assignee: readYamlNullableScalar(data, 'handoff', 'default_assignee', true),
    team_id: readYamlNullableScalar(data, 'handoff', 'team_id', true),
  };
  const boundaries = {
    forbidden_imports: readYamlList(data, 'boundaries', 'forbidden_imports', [], true),
    forbidden_paths: readYamlList(data, 'boundaries', 'forbidden_paths', [], true),
    whitelisted_imports: readYamlList(data, 'boundaries', 'whitelisted_imports', [], true),
    whitelisted_components: readYamlList(data, 'boundaries', 'whitelisted_components', [], true),
  };
  const validation = {
    pre_push: readYamlBoolean(data, 'validation', 'pre_push', true, true),
    pre_commit: readYamlBoolean(data, 'validation', 'pre_commit', false, true),
    auto_fix: readYamlBoolean(data, 'validation', 'auto_fix', true, true),
    max_warnings: readYamlNumber(data, 'validation', 'max_warnings', 0, true),
  };
  const design_system = {
    library: readYamlEnum(data, 'design_system', 'library', ['shadcn', 'mui', 'antd', 'radix', 'custom', 'none'], 'none', true),
    import_path: readYamlScalar(data, 'design_system', 'import_path', '', true),
    allow_new_primitives: readYamlBoolean(data, 'design_system', 'allow_new_primitives', false, true),
    component_aliases: readYamlMapping(data, 'design_system', 'component_aliases', true),
  };

  if (readYamlTopLevelScalar(data, 'version', DEFAULT_CONFIG.version, true) !== '1.0') {
    throw new Error('Invalid config: version must be "1.0".');
  }
  assertRelativePath(project.src_path, 'project.src_path');
  assertRelativePath(project.component_path, 'project.component_path');
  assertRelativePath(git.branch_prefix, 'git.branch_prefix');
  for (const forbiddenPath of boundaries.forbidden_paths) assertRelativePath(forbiddenPath, 'boundaries.forbidden_paths');
  if (!Number.isFinite(dev.port) || dev.port <= 0) throw new Error('Invalid config: dev.port must be a positive number.');

  return {
    version: '1.0',
    project,
    dev,
    styling,
    git,
    handoff,
    boundaries,
    validation,
    design_system,
  };
}

function normalizeThreadlineConfig(config: ThreadlineConfig): ThreadlineConfig {
  return {
    ...createDefaultThreadlineConfig(),
    ...config,
    project: {
      ...DEFAULT_CONFIG.project,
      ...config.project,
    },
    dev: {
      ...DEFAULT_CONFIG.dev,
      ...config.dev,
    },
    styling: {
      ...DEFAULT_CONFIG.styling!,
      ...config.styling,
    },
    git: {
      ...DEFAULT_CONFIG.git,
      ...config.git,
    },
    handoff: {
      ...DEFAULT_CONFIG.handoff!,
      ...config.handoff,
    },
    boundaries: {
      ...DEFAULT_CONFIG.boundaries,
      ...config.boundaries,
    },
    validation: {
      ...DEFAULT_CONFIG.validation,
      ...config.validation,
    },
    design_system: {
      ...DEFAULT_CONFIG.design_system!,
      ...config.design_system,
    },
  };
}

function loadTemplate(): string {
  if (cachedTemplate === null) {
    cachedTemplate = readFileSync(TEMPLATE_PATH, 'utf8');
  }
  return cachedTemplate;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function yamlNullableString(value: string): string {
  if (value === '') return 'null';
  return yamlString(value);
}

function cloneConfig(config: ThreadlineConfig): ThreadlineConfig {
  return {
    ...config,
    project: { ...config.project, extensions: [...config.project.extensions] },
    dev: { ...config.dev },
    styling: config.styling ? { ...config.styling } : undefined,
    git: { ...config.git },
    handoff: config.handoff ? { ...config.handoff } : undefined,
    boundaries: {
      ...config.boundaries,
      forbidden_imports: [...config.boundaries.forbidden_imports],
      forbidden_paths: [...config.boundaries.forbidden_paths],
      whitelisted_imports: [...config.boundaries.whitelisted_imports],
      whitelisted_components: [...config.boundaries.whitelisted_components],
    },
    validation: { ...config.validation },
    design_system: config.design_system
      ? {
          ...config.design_system,
          component_aliases: { ...config.design_system.component_aliases },
        }
      : undefined,
  };
}

function parseYamlConfig(text: string): Record<string, unknown> {
  const parsed = parseYaml(text);
  if (!isRecord(parsed)) {
    throw new Error('Invalid config: expected a YAML mapping.');
  }
  return parsed;
}

function readYamlScalar(
  data: Record<string, unknown>,
  section: string,
  key: string,
  fallback: string,
  required = false,
): string {
  const value = readYamlValue(data, section, key, required);
  if (value === undefined) return fallback;
  if (value === null) return '';
  if (typeof value !== 'string') {
    throw new Error(`Invalid config: ${section}.${key} must be a string.`);
  }
  return value;
}

function readYamlTopLevelScalar(
  data: Record<string, unknown>,
  key: string,
  fallback: string,
  required = false,
): string {
  const value = data[key];
  if (value === undefined) {
    if (required) throw new Error(`Invalid config: missing ${key}.`);
    return fallback;
  }
  if (value === null) return '';
  if (typeof value !== 'string') {
    throw new Error(`Invalid config: ${key} must be a string.`);
  }
  return value;
}

function readYamlList(
  data: Record<string, unknown>,
  section: string,
  key: string,
  fallback: string[],
  required = false,
): string[] {
  const value = readYamlValue(data, section, key, required);
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) {
    throw new Error(`Invalid config: ${section}.${key} must be a list.`);
  }
  if (!value.every((item) => typeof item === 'string')) {
    throw new Error(`Invalid config: ${section}.${key} must contain only strings.`);
  }
  return value;
}

function readYamlBoolean(
  data: Record<string, unknown>,
  section: string,
  key: string,
  fallback: boolean,
  required = false,
): boolean {
  const value = readYamlValue(data, section, key, required);
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid config: ${section}.${key} must be true or false.`);
  }
  return value;
}

function readYamlNumber(
  data: Record<string, unknown>,
  section: string,
  key: string,
  fallback: number,
  required = false,
): number {
  const value = readYamlValue(data, section, key, required);
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid config: ${section}.${key} must be a number.`);
  }
  return value;
}

function readYamlEnum<T extends string>(
  data: Record<string, unknown>,
  section: string,
  key: string,
  allowed: readonly T[],
  fallback: T,
  required = false,
): T {
  const value = readYamlScalar(data, section, key, fallback, required);
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid config: ${section}.${key} must be one of ${allowed.join(', ')}.`);
  }
  return value as T;
}

function readYamlNullableScalar(
  data: Record<string, unknown>,
  section: string,
  key: string,
  required = false,
): string | null {
  const value = readYamlValue(data, section, key, required);
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`Invalid config: ${section}.${key} must be a string or null.`);
  }
  return value;
}

function readYamlMapping(
  data: Record<string, unknown>,
  section: string,
  key: string,
  required = false,
): Record<string, string> {
  const value = readYamlValue(data, section, key, required);
  if (value === undefined) return {};
  if (!isRecord(value)) {
    throw new Error(`Invalid config: ${section}.${key} must be a mapping.`);
  }
  const entries: Record<string, string> = {};
  for (const [name, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new Error(`Invalid config: ${section}.${key}.${name} must be a string.`);
    }
    entries[name] = item;
  }
  return entries;
}

function readYamlValue(
  data: Record<string, unknown>,
  section: string,
  key: string,
  required: boolean,
): unknown {
  const sectionValue = data[section];
  if (!isRecord(sectionValue)) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return undefined;
  }
  const value = sectionValue[key];
  if (value === undefined && required) {
    throw new Error(`Invalid config: missing ${section}.${key}.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readScalar(text: string, section: string, key: string, fallback: string, required = false): string {
  const line = readSectionEntry(text, section, key);
  if (!line) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return fallback;
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return '';
  return stripInlineComment(value).replace(/^"|"$/g, '');
}

function readList(text: string, section: string, key: string, fallback: string[], required = false): string[] {
  const block = readSectionBlock(text, section, key);
  if (block === null) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return fallback;
  }
  const { header, lines } = block;
  const headerValue = header.slice(header.indexOf(':') + 1).trim();
  if (headerValue === '[]') return [];
  const items: string[] = [];
  for (const line of lines) {
    if (line.startsWith('  ') && !line.startsWith('    ')) break;
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) items.push(stripInlineComment(trimmed.slice(2)).replace(/^"|"$/g, ''));
  }
  return items;
}

function readBoolean(text: string, section: string, key: string, fallback: boolean, required = false): boolean {
  const value = readScalar(text, section, key, String(fallback), required);
  if (value !== 'true' && value !== 'false') {
    throw new Error(`Invalid config: ${section}.${key} must be true or false.`);
  }
  return value === 'true';
}

function readNumber(text: string, section: string, key: string, fallback: number, required = false): number {
  const raw = readScalar(text, section, key, String(fallback), required);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid config: ${section}.${key} must be a number.`);
  return value;
}

function readEnum<T extends string>(text: string, section: string, key: string, allowed: readonly T[], fallback: T, required = false): T {
  const value = readScalar(text, section, key, fallback, required);
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid config: ${section}.${key} must be one of ${allowed.join(', ')}.`);
  }
  return value as T;
}

function readNullableScalar(text: string, section: string, key: string, required = false): string | null {
  const line = readSectionEntry(text, section, key);
  if (!line) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return null;
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return null;
  return stripInlineComment(value).replace(/^"|"$/g, '');
}

function readTopLevelScalar(text: string, key: string, fallback: string, required = false): string {
  const line = text.split('\n').find((candidate) => candidate.startsWith(`${key}:`));
  if (!line) {
    if (required) throw new Error(`Invalid config: missing ${key}.`);
    return fallback;
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return '';
  return stripInlineComment(value).replace(/^"|"$/g, '');
}

function assertRelativePath(value: string, label: string): void {
  if (!value || value.startsWith('/')) {
    throw new Error(`Invalid config: ${label} must be a relative path.`);
  }
}

function readMapping(text: string, section: string, key: string, required = false): Record<string, string> {
  const block = readSectionBlock(text, section, key);
  if (block === null) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return {};
  }
  const { lines } = block;
  const entries: Record<string, string> = {};
  for (const line of lines) {
    if (line.startsWith('  ') && !line.startsWith('    ')) break;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const name = trimmed.slice(0, colon).trim();
    const value = stripInlineComment(trimmed.slice(colon + 1).trim()).replace(/^"|"$/g, '');
    if (name) entries[name] = value;
  }
  return entries;
}

function stripInlineComment(value: string): string {
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\' && doubleQuoted) {
      escaped = true;
      continue;
    }

    if (character === '\'' && !doubleQuoted) {
      singleQuoted = !singleQuoted;
      continue;
    }

    if (character === '"' && !singleQuoted) {
      doubleQuoted = !doubleQuoted;
      continue;
    }

    if (character === '#' && !singleQuoted && !doubleQuoted) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value.trimEnd();
}

function readSectionEntry(text: string, section: string, key: string): string | null {
  const lines = sectionLines(text, section);
  return lines.find((candidate) => candidate.startsWith(`  ${key}:`)) ?? null;
}

function readSectionBlock(text: string, section: string, key: string): { header: string; lines: string[] } | null {
  const lines = sectionLines(text, section);
  const start = lines.findIndex((line) => line.startsWith(`  ${key}:`));
  if (start === -1) return null;
  return {
    header: lines[start],
    lines: lines.slice(start + 1),
  };
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
