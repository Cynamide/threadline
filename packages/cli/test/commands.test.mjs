import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { installHooks } from '../dist/commands/install-hooks.js';
import { initProject } from '../dist/commands/init.js';
import { exportHandoffs } from '../dist/commands/export-handoffs.js';
import { scanHandoffs } from '../dist/commands/scan-handoffs.js';
import { validateProject } from '../dist/commands/validate.js';
import { loadConfig } from '../dist/utils/config.js';

const execFile = promisify(execFileCallback);
const cliEntry = fileURLToPath(new URL('../dist/index.js', import.meta.url));

async function fixture(files = {}) {
  const root = await import('node:fs/promises').then((fs) =>
    fs.mkdtemp(join(tmpdir(), 'threadline-cli-commands-')),
  );
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const target = join(root, path);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, contents);
    }),
  );
  return root;
}

async function runCli(args, cwd) {
  try {
    const { stdout, stderr } = await execFile('node', [cliEntry, ...args], { cwd });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return {
      code: typeof error?.code === 'number' ? error.code : 1,
      stdout: error?.stdout ?? '',
      stderr: error?.stderr ?? '',
    };
  }
}

test('init writes threadline config files and installs pre-push hook', async () => {
  const cwd = await fixture({
    'package.json': JSON.stringify({ dependencies: { next: '^15.0.0', tailwindcss: '^4.0.0' } }),
    'next.config.js': 'module.exports = {}',
  });
  await execFile('git', ['init'], { cwd });

  const result = await initProject({ cwd });

  assert.equal(result.configPath, '.threadline/config.yaml');
  assert.equal(result.filesWritten.length, 4);
  assert.equal(result.hook.installed, true);
  assert.match(await readFile(join(cwd, '.threadline/config.yaml'), 'utf8'), /framework: nextjs/);
  assert.match(await readFile(join(cwd, '.threadline/skill.md'), 'utf8'), /# Base Skill/);
  assert.match(await readFile(join(cwd, '.git/hooks/pre-push'), 'utf8'), /threadline validate --staged/);
});

test('validate reports forbidden imports, paths, and browser storage access as json', async () => {
  const cwd = await fixture({
    '.threadline/config.yaml': `version: "1.0"
project:
  framework: vite
  src_path: src
  component_path: components
  extensions:
    - .tsx
    - .ts
dev:
  run_command: npm run dev
  port: 5173
  startup_timeout: 10000
styling:
  strategy: tailwind
  enforce_scoping: true
  tailwind_config: tailwind.config.ts
git:
  branch_prefix: design/
  commit_style: conventional
  squash_merge: true
  pr_title_format: "ui: {description}"
handoff:
  create_issues: true
  status_on_create: Backlog
  status_on_merge: Ready
  default_assignee: null
  team_id: null
boundaries:
  forbidden_imports:
    - axios
    - localStorage
  forbidden_paths:
    - src/services/
  whitelisted_imports: []
  whitelisted_components: []
design_system:
  library: none
  import_path: ""
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton
    Input: TextInput
validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
`,
    'src/components/Bad.tsx': `import axios from 'axios';
export function Bad() {
  localStorage.setItem('x', 'y');
  return null;
}`,
    'src/components/global.css': '.button { color: red; }',
    'src/services/api.ts': 'export const api = true;',
  });

  const result = await validateProject({ cwd, json: true, staged: false });

  assert.equal(result.valid, false);
  assert.equal(result.violations.length, 4);
  assert.deepEqual(
    result.violations.map((violation) => violation.rule).sort(),
    ['PATH001', 'STATE002', 'STATE006', 'STYLE001'],
  );
});

test('validate can limit checks to staged files', async () => {
  const cwd = await fixture({
    '.threadline/config.yaml': `version: "1.0"
project:
  framework: vite
  src_path: src
  component_path: components
  extensions:
    - .ts
dev:
  run_command: npm run dev
  port: 5173
  startup_timeout: 10000
styling:
  strategy: css-modules
  enforce_scoping: true
  tailwind_config: ""
git:
  branch_prefix: design/
  commit_style: conventional
  squash_merge: true
  pr_title_format: "ui: {description}"
handoff:
  create_issues: true
  status_on_create: Backlog
  status_on_merge: Ready
  default_assignee: null
  team_id: null
boundaries:
  forbidden_imports:
    - axios
  forbidden_paths: []
  whitelisted_imports: []
  whitelisted_components: []
validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
design_system:
  library: none
  import_path: ""
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton
`,
    'src/staged.ts': "import axios from 'axios';",
    'src/unstaged.ts': "import axios from 'axios';",
  });
  await execFile('git', ['init'], { cwd });
  await execFile('git', ['add', 'src/staged.ts', '.threadline/config.yaml'], { cwd });

  const result = await validateProject({ cwd, staged: true });

  assert.equal(result.valid, false);
  assert.equal(result.filesChecked.length, 1);
  assert.equal(result.filesChecked[0], 'src/staged.ts');
});

test('loadConfig rejects invalid config values', async () => {
  const cwd = await fixture({
    '.threadline/config.yaml': `version: "1.0"
project:
  framework: vite
  src_path: /src
  component_path: components
  extensions:
    - .ts
dev:
  run_command: npm run dev
  port: not-a-number
  startup_timeout: 10000
styling:
  strategy: css-modules
  enforce_scoping: true
  tailwind_config: ""
git:
  branch_prefix: design/
  commit_style: conventional
  squash_merge: true
  pr_title_format: "ui: {description}"
handoff:
  create_issues: true
  status_on_create: Backlog
  status_on_merge: Ready
  default_assignee: null
  team_id: null
boundaries:
  forbidden_imports: []
  forbidden_paths: []
  whitelisted_imports: []
  whitelisted_components: []
validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
design_system:
  library: none
  import_path: ""
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton
`,
  });

  await assert.rejects(() => loadConfig(cwd));
});

test('loadConfig strips inline YAML comments from scalar values', async () => {
  const cwd = await fixture({
    '.threadline/config.yaml': `version: "1.0"
project:
  framework: nextjs # comment
  src_path: src
  component_path: components
  extensions:
    - .tsx # comment
dev:
  run_command: npm run dev
  port: 3000
  startup_timeout: 10000
styling:
  strategy: tailwind # comment
  enforce_scoping: true
  tailwind_config: tailwind.config.ts # comment
git:
  branch_prefix: design/
  commit_style: conventional # comment
  squash_merge: true
  pr_title_format: "ui: {description}" # comment
handoff:
  create_issues: true
  status_on_create: Backlog
  status_on_merge: Ready
  default_assignee: null
  team_id: null
boundaries:
  forbidden_imports: []
  forbidden_paths: []
  whitelisted_imports: []
  whitelisted_components: []
validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
design_system:
  library: shadcn # comment
  import_path: "@/components/ui" # comment
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton # comment
`,
  });

  const config = await loadConfig(cwd);

  assert.equal(config.project.framework, 'nextjs');
  assert.equal(config.project.extensions[0], '.tsx');
  assert.equal(config.styling?.strategy, 'tailwind');
  assert.equal(config.styling?.tailwind_config, 'tailwind.config.ts');
  assert.equal(config.git.commit_style, 'conventional');
  assert.equal(config.git.pr_title_format, 'ui: {description}');
  assert.equal(config.design_system?.library, 'shadcn');
  assert.equal(config.design_system?.import_path, '@/components/ui');
  assert.equal(config.design_system?.component_aliases.Button, 'PrimaryButton');
});

test('init validate and scan-handoffs work end to end in one fixture repo', async () => {
  const cwd = await fixture({
    'package.json': JSON.stringify({ dependencies: { next: '^15.0.0', tailwindcss: '^4.0.0' } }),
    'next.config.js': 'module.exports = {}',
    'src/components/ExportButton.tsx': `import { handoff } from '@threadline/runtime';

export function ExportButton() {
  return handoff({
    id: 'export-data',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
    fallback: () => null,
  });
}
`,
  });
  await execFile('git', ['init'], { cwd });

  const initResult = await initProject({ cwd });
  await execFile('git', ['add', '.threadline/config.yaml', 'src/components/ExportButton.tsx'], { cwd });
  const validateResult = await validateProject({ cwd, staged: true });
  const scanResult = await scanHandoffs({ cwd, json: true });

  assert.equal(initResult.hook.installed, true);
  assert.equal(validateResult.valid, true);
  assert.equal(scanResult.records.length, 1);
});

test('scan-handoffs returns canonical records with source locations', async () => {
  const cwd = await fixture({
    'src/components/Settings.tsx': `import { handoff } from '@threadline/runtime';

export function Settings() {
  return handoff({
    id: 'export-data',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
    fallback: () => null,
    priority: 'high'
  });
}
`,
  });

  const result = await scanHandoffs({ cwd, json: true });

  assert.equal(result.records.length, 1);
  assert.deepEqual(result.records[0], {
    id: 'export-data',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
    filePath: 'src/components/Settings.tsx',
    line: 4,
    column: 10,
    valid: true,
    errors: [],
  });
});

test('export-handoffs converts canonical records into GitHub issue payloads', async () => {
  const cwd = await fixture({
    'src/components/Settings.tsx': `${'\n'.repeat(38)}import { handoff } from '@threadline/runtime';

export function Settings() {
  return handoff({
    id: 'export-data',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
    fallback: () => null,
  });
}
`,
  });

  const result = await exportHandoffs({ cwd, tracker: 'github' });

  assert.equal(result.tracker, 'github');
  assert.deepEqual(result.payloads[0], {
    title: 'Handoff: Export Data',
    description: 'Trigger CSV export of the current table view',
    location: 'src/components/Settings.tsx:42',
    labels: ['threadline', 'handoff'],
    priority: 'medium',
    status: 'Backlog',
  });
});

test('export-handoffs converts canonical records into Linear payloads', async () => {
  const cwd = await fixture({
    'src/components/Settings.tsx': `${'\n'.repeat(38)}import { handoff } from '@threadline/runtime';

export function Settings() {
  return handoff({
    id: 'export-data',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
    fallback: () => null,
  });
}
`,
  });

  const result = await exportHandoffs({ cwd, tracker: 'linear' });

  assert.equal(result.tracker, 'linear');
  assert.deepEqual(result.payloads[0], {
    title: 'Handoff: Export Data',
    description: 'Trigger CSV export of the current table view',
    location: 'src/components/Settings.tsx:42',
    labels: ['threadline', 'handoff'],
    priority: 'medium',
    status: 'Backlog',
  });
});

test('export-handoffs marks invalid records as high priority', async () => {
  const cwd = await fixture({
    'src/components/Bad.tsx': `import { handoff } from '@threadline/runtime';

export function Bad() {
  return handoff('not-object-form');
}
`,
  });

  const result = await exportHandoffs({ cwd, tracker: 'github' });

  assert.equal(result.payloads[0].priority, 'high');
  assert.equal(result.payloads[0].status, 'Backlog');
});

test('cli rejects missing or invalid tracker values before export-handoffs falls back', async () => {
  const cwd = await fixture({
    '.threadline/config.yaml': `version: "1.0"
project:
  framework: vite
  src_path: src
  component_path: components
  extensions:
    - .tsx
dev:
  run_command: npm run dev
  port: 5173
  startup_timeout: 10000
styling:
  strategy: css-modules
  enforce_scoping: true
  tailwind_config: ""
git:
  branch_prefix: design/
  commit_style: conventional
  squash_merge: true
  pr_title_format: "ui: {description}"
handoff:
  create_issues: true
  status_on_create: Backlog
  status_on_merge: Ready
  default_assignee: null
  team_id: null
boundaries:
  forbidden_imports: []
  forbidden_paths: []
  whitelisted_imports: []
  whitelisted_components: []
validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
design_system:
  library: none
  import_path: ""
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton
`,
    'src/components/Settings.tsx': `import { handoff } from '@threadline/runtime';

export function Settings() {
  return handoff({
    id: 'export-data',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
    fallback: () => null,
  });
}
`,
  });

  const missing = await runCli(['export-handoffs', '--tracker'], cwd);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /Missing value for --tracker/);
  assert.equal(missing.stdout, '');

  const invalid = await runCli(['export-handoffs', '--tracker', 'jira'], cwd);
  assert.equal(invalid.code, 1);
  assert.match(invalid.stderr, /Invalid tracker "jira"/);
  assert.equal(invalid.stdout, '');
});

test('scan-handoffs includes invalid handoff calls with errors', async () => {
  const cwd = await fixture({
    'src/components/Bad.tsx': `import { handoff } from '@threadline/runtime';

export function Bad() {
  return handoff('not-object-form');
}
`,
  });

  const result = await scanHandoffs({ cwd, json: true });

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].valid, false);
  assert.ok(result.records[0].errors.length > 0);
});

test('scan-handoffs ignores handoff text inside strings and comments', async () => {
  const cwd = await fixture({
    'src/components/Doc.tsx': `// handoff({ title: 'Ignore comment', description: 'No issue' })
export const sample = "handoff({ title: 'Ignore string', description: 'No issue' })";
`,
  });

  const result = await scanHandoffs({ cwd, json: true });

  assert.deepEqual(result.records, []);
});

test('install-hooks writes an executable pre-push hook idempotently', async () => {
  const cwd = await fixture();
  await execFile('git', ['init'], { cwd });
  await installHooks({ cwd });
  const second = await installHooks({ cwd });
  const hookPath = join(cwd, '.git/hooks/pre-push');

  assert.equal(second.installed, true);
  assert.match(await readFile(hookPath, 'utf8'), /threadline validate --staged/);
  assert.equal((await stat(hookPath)).mode & 0o111, 0o111);
});

test('pre-push hook blocks invalid staged code', async () => {
  const cwd = await fixture({
    '.threadline/config.yaml': `version: "1.0"
project:
  framework: vite
  src_path: src
  component_path: components
  extensions:
    - .ts
dev:
  run_command: npm run dev
  port: 5173
  startup_timeout: 10000
styling:
  strategy: css-modules
  enforce_scoping: true
  tailwind_config: ""
git:
  branch_prefix: design/
  commit_style: conventional
  squash_merge: true
  pr_title_format: "ui: {description}"
handoff:
  create_issues: true
  status_on_create: Backlog
  status_on_merge: Ready
  default_assignee: null
  team_id: null
boundaries:
  forbidden_imports:
    - axios
  forbidden_paths: []
  whitelisted_imports: []
  whitelisted_components: []
validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
design_system:
  library: none
  import_path: ""
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton
`,
    'src/bad.ts': "import axios from 'axios';\n",
  });
  await execFile('git', ['init'], { cwd });
  await installHooks({ cwd });
  await execFile('git', ['add', 'src/bad.ts', '.threadline/config.yaml'], { cwd });

  const binDir = join(cwd, '.tmp-bin');
  await mkdir(binDir, { recursive: true });
  await writeFile(
    join(binDir, 'threadline'),
    `#!/bin/sh
exec node ${join(process.cwd(), 'dist/index.js')} "$@"
`,
  );
  await chmod(join(binDir, 'threadline'), 0o755);

  await assert.rejects(
    execFile(
      join(cwd, '.git/hooks/pre-push'),
      ['origin', 'https://example.com'],
      {
        cwd,
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
        },
      },
    ),
  );
});
