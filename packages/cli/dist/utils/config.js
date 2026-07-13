import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
                                                    

const defaultConfig                   = {
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

export async function loadConfig(cwd        )                            {
  let text = '';
  try {
    text = await readFile(join(cwd, '.threadline/config.yaml'), 'utf8');
  } catch {
    return defaultConfig;
  }

  const project = {
    framework: readEnum(text, 'project', 'framework', ['nextjs', 'vite', 'cra', 'remix', 'custom'], defaultConfig.project.framework, true),
    src_path: readScalar(text, 'project', 'src_path', defaultConfig.project.src_path, true),
    component_path: readScalar(text, 'project', 'component_path', defaultConfig.project.component_path, true),
    extensions: readList(text, 'project', 'extensions', defaultConfig.project.extensions, true),
  };
  const dev = {
    run_command: readScalar(text, 'dev', 'run_command', defaultConfig.dev.run_command, true),
    port: readNumber(text, 'dev', 'port', defaultConfig.dev.port, true),
    startup_timeout: readNumber(text, 'dev', 'startup_timeout', defaultConfig.dev.startup_timeout, true),
  };
  const styling = {
    strategy: readEnum(text, 'styling', 'strategy', ['tailwind', 'styled-components', 'emotion', 'css-modules', 'plain-css'], 'plain-css', true),
    enforce_scoping: readBoolean(text, 'styling', 'enforce_scoping', true, true),
    tailwind_config: readScalar(text, 'styling', 'tailwind_config', '', true),
  };
  const git = {
    branch_prefix: readScalar(text, 'git', 'branch_prefix', 'design/', true),
    commit_style: readEnum(text, 'git', 'commit_style', ['conventional', 'simple'], 'conventional', true),
    squash_merge: readBoolean(text, 'git', 'squash_merge', true, true),
    pr_title_format: readScalar(text, 'git', 'pr_title_format', 'ui: {description}', true),
  };
  const handoff = {
    create_issues: readBoolean(text, 'handoff', 'create_issues', true, true),
    status_on_create: readScalar(text, 'handoff', 'status_on_create', 'Backlog', true),
    status_on_merge: readScalar(text, 'handoff', 'status_on_merge', 'Ready', true),
    default_assignee: readNullableScalar(text, 'handoff', 'default_assignee', true),
    team_id: readNullableScalar(text, 'handoff', 'team_id', true),
  };
  const boundaries = {
    forbidden_imports: readList(text, 'boundaries', 'forbidden_imports', [], true),
    forbidden_paths: readList(text, 'boundaries', 'forbidden_paths', [], true),
    whitelisted_imports: readList(text, 'boundaries', 'whitelisted_imports', [], true),
    whitelisted_components: readList(text, 'boundaries', 'whitelisted_components', [], true),
  };
  const validation = {
    pre_push: readBoolean(text, 'validation', 'pre_push', true, true),
    pre_commit: readBoolean(text, 'validation', 'pre_commit', false, true),
    auto_fix: readBoolean(text, 'validation', 'auto_fix', true, true),
    max_warnings: readNumber(text, 'validation', 'max_warnings', 0, true),
  };
  const design_system = {
    library: readEnum(text, 'design_system', 'library', ['shadcn', 'mui', 'antd', 'radix', 'custom', 'none'], 'none', true),
    import_path: readScalar(text, 'design_system', 'import_path', '', true),
    allow_new_primitives: readBoolean(text, 'design_system', 'allow_new_primitives', false, true),
    component_aliases: readMapping(text, 'design_system', 'component_aliases', true),
  };

  if (readTopLevelScalar(text, 'version', defaultConfig.version, true) !== '1.0') {
    throw new Error('Invalid config: version must be "1.0".');
  }
  assertRelativePath(project.src_path, 'project.src_path');
  assertRelativePath(project.component_path, 'project.component_path');
  assertRelativePath(git.branch_prefix, 'git.branch_prefix');
  for (const forbiddenPath of boundaries.forbidden_paths) assertRelativePath(forbiddenPath, 'boundaries.forbidden_paths');
  if (!Number.isFinite(dev.port) || dev.port <= 0) throw new Error('Invalid config: dev.port must be a positive number.');

  return { version: '1.0', project, dev, styling, git, handoff, boundaries, validation, design_system };
}

function readScalar(text        , section        , key        , fallback        , required = false)         {
  const line = sectionLines(text, section).find((candidate) => candidate.startsWith(`  ${key}:`));
  if (!line) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return fallback;
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return '';
  return stripInlineComment(value).replace(/^"|"$/g, '');
}

function readList(text        , section        , key        , fallback          , required = false)           {
  const lines = sectionLines(text, section);
  const start = lines.findIndex((line) => line.startsWith(`  ${key}:`));
  if (start === -1) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return fallback;
  }
  const headerValue = lines[start].slice(lines[start].indexOf(':') + 1).trim();
  if (headerValue === '[]') return [];
  const items           = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('  ') && !line.startsWith('    ')) break;
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) items.push(stripInlineComment(trimmed.slice(2)).replace(/^"|"$/g, ''));
  }
  return items;
}

function readBoolean(text        , section        , key        , fallback         , required = false)          {
  const value = readScalar(text, section, key, String(fallback), required);
  if (value !== 'true' && value !== 'false') {
    throw new Error(`Invalid config: ${section}.${key} must be true or false.`);
  }
  return value === 'true';
}

function readNumber(text        , section        , key        , fallback        , required = false)         {
  const raw = readScalar(text, section, key, String(fallback), required);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid config: ${section}.${key} must be a number.`);
  return value;
}

function readEnum                  (text        , section        , key        , allowed              , fallback   , required = false)    {
  const value = readScalar(text, section, key, fallback, required);
  if (!allowed.includes(value     )) {
    throw new Error(`Invalid config: ${section}.${key} must be one of ${allowed.join(', ')}.`);
  }
  return value     ;
}

function readNullableScalar(text        , section        , key        , required = false)                {
  const line = sectionLines(text, section).find((candidate) => candidate.startsWith(`  ${key}:`));
  if (!line) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return null;
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return null;
  return stripInlineComment(value).replace(/^"|"$/g, '');
}

function readTopLevelScalar(text        , key        , fallback        , required = false)         {
  const line = text.split('\n').find((candidate) => candidate.startsWith(`${key}:`));
  if (!line) {
    if (required) throw new Error(`Invalid config: missing ${key}.`);
    return fallback;
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return '';
  return stripInlineComment(value).replace(/^"|"$/g, '');
}

function assertRelativePath(value        , label        )       {
  if (!value || value.startsWith('/')) {
    throw new Error(`Invalid config: ${label} must be a relative path.`);
  }
}

function readMapping(text        , section        , key        , required = false)                         {
  const lines = sectionLines(text, section);
  const start = lines.findIndex((line) => line.startsWith(`  ${key}:`));
  if (start === -1) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return {};
  }
  const entries                         = {};
  for (const line of lines.slice(start + 1)) {
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

function stripInlineComment(value        )         {
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

function sectionLines(text        , section        )           {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line === `${section}:`);
  if (start === -1) return [];
  const result           = [];
  for (const line of lines.slice(start + 1)) {
    if (/^[a-z_]+:/.test(line)) break;
    result.push(line);
  }
  return result;
}
