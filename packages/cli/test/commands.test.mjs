import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { installHooks } from '../dist/commands/install-hooks.js';
import { initProject } from '../dist/commands/init.js';
import { scanHandoffs } from '../dist/commands/scan-handoffs.js';
import { validateProject } from '../dist/commands/validate.js';

const execFile = promisify(execFileCallback);

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
  assert.match(await readFile(join(cwd, '.threadline/skill.md'), 'utf8'), /threadline scan-handoffs/);
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
styling:
  strategy: css-modules
  enforce_scoping: true
git:
  branch_prefix: design/
handoff:
  create_linear_issues: true
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
validation:
  pre_push: true
  max_warnings: 0
`,
    'src/components/Bad.tsx': `import axios from 'axios';
export function Bad() {
  localStorage.setItem('x', 'y');
  return null;
}`,
    'src/services/api.ts': 'export const api = true;',
  });

  const result = await validateProject({ cwd, json: true, staged: false });

  assert.equal(result.valid, false);
  assert.equal(result.violations.length, 3);
  assert.deepEqual(
    result.violations.map((violation) => violation.rule).sort(),
    ['PATH001', 'STATE002', 'STATE006'],
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
boundaries:
  forbidden_imports:
    - axios
  forbidden_paths: []
  whitelisted_imports: []
  whitelisted_components: []
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

test('scan-handoffs returns tracker-ready records with source locations', async () => {
  const cwd = await fixture({
    'src/components/Settings.tsx': `import { handoff } from '@threadline/runtime';

export function Settings() {
  return handoff({
    id: 'export-data',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
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
    trackerPayload: {
      title: 'Export Data',
      description: 'Trigger CSV export of the current table view',
      location: 'src/components/Settings.tsx:4',
      labels: ['handoff'],
      priority: 'high',
      status: 'Backlog',
    },
  });
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
