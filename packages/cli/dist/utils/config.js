import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
                                                    

const defaultConfig                   = {
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

export async function loadConfig(cwd        )                            {
  let text = '';
  try {
    text = await readFile(join(cwd, '.threadline/config.yaml'), 'utf8');
  } catch {
    return defaultConfig;
  }

  const project = {
    framework: readEnum(text, 'project', 'framework', ['nextjs', 'vite', 'cra', 'remix', 'custom'], defaultConfig.project.framework),
    src_path: readScalar(text, 'project', 'src_path', defaultConfig.project.src_path, true),
    component_path: readScalar(text, 'project', 'component_path', defaultConfig.project.component_path, true),
    extensions: readList(text, 'project', 'extensions', defaultConfig.project.extensions, true),
  };
  const dev = {
    run_command: readScalar(text, 'dev', 'run_command', defaultConfig.dev.run_command, true),
    port: readNumber(text, 'dev', 'port', defaultConfig.dev.port, true),
  };
  const styling = {
    strategy: readEnum(text, 'styling', 'strategy', ['tailwind', 'styled-components', 'emotion', 'css-modules', 'plain-css'], 'plain-css'),
    enforce_scoping: readBoolean(text, 'styling', 'enforce_scoping', true, true),
  };
  const handoff = {
    create_issues: readBoolean(text, 'handoff', 'create_issues', true),
    status_on_create: readScalar(text, 'handoff', 'status_on_create', 'Backlog'),
    status_on_merge: readScalar(text, 'handoff', 'status_on_merge', 'Ready'),
    default_assignee: readScalar(text, 'handoff', 'default_assignee', ''),
    team_id: readScalar(text, 'handoff', 'team_id', ''),
  };
  const boundaries = {
    forbidden_imports: readList(text, 'boundaries', 'forbidden_imports', [], true),
    forbidden_paths: readList(text, 'boundaries', 'forbidden_paths', [], true),
    whitelisted_imports: readList(text, 'boundaries', 'whitelisted_imports', [], true),
    whitelisted_components: readList(text, 'boundaries', 'whitelisted_components', [], true),
  };
  const validation = {
    max_warnings: readNumber(text, 'validation', 'max_warnings', 0, true),
  };
  const design_system = {
    library: readEnum(text, 'design_system', 'library', ['shadcn', 'mui', 'antd', 'radix', 'custom', 'none'], 'none'),
    import_path: readScalar(text, 'design_system', 'import_path', ''),
    allow_new_primitives: readBoolean(text, 'design_system', 'allow_new_primitives', false),
  };

  assertRelativePath(project.src_path, 'project.src_path');
  assertRelativePath(project.component_path, 'project.component_path');
  for (const forbiddenPath of boundaries.forbidden_paths) assertRelativePath(forbiddenPath, 'boundaries.forbidden_paths');
  if (!Number.isFinite(dev.port) || dev.port <= 0) throw new Error('Invalid config: dev.port must be a positive number.');

  return { project, dev, styling, handoff, boundaries, validation, design_system };
}

function readScalar(text        , section        , key        , fallback        , required = false)         {
  const line = sectionLines(text, section).find((candidate) => candidate.startsWith(`  ${key}:`));
  if (!line) {
    if (required) throw new Error(`Invalid config: missing ${section}.${key}.`);
    return fallback;
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  if (value === 'null') return '';
  return value.replace(/^"|"$/g, '');
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
    if (trimmed.startsWith('- ')) items.push(trimmed.slice(2).replace(/^"|"$/g, ''));
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

function readEnum                  (text        , section        , key        , allowed              , fallback   )    {
  const value = readScalar(text, section, key, fallback);
  if (!allowed.includes(value     )) {
    throw new Error(`Invalid config: ${section}.${key} must be one of ${allowed.join(', ')}.`);
  }
  return value     ;
}

function assertRelativePath(value        , label        )       {
  if (!value || value.startsWith('/')) {
    throw new Error(`Invalid config: ${label} must be a relative path.`);
  }
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
