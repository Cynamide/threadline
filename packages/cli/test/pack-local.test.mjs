import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const packScript = join(repoRoot, 'packages/cli/scripts/pack-local.mjs');

test('pack:local creates an installable tarball for a separate repo', async () => {
  const packOutput = await mkdtemp(join(tmpdir(), 'threadline-cli-pack-output-'));
  const consumerRepo = await mkdtemp(join(tmpdir(), 'threadline-cli-consumer-'));

  try {
    const { stdout } = await execFile(
      'node',
      ['--disable-warning=ExperimentalWarning', packScript, '--out-dir', packOutput],
      { cwd: repoRoot },
    );
    const tarballPath = stdout.trim().split('\n').at(-1);
    assert.ok(tarballPath, 'pack:local did not print a tarball path');

    await writeFile(
      join(consumerRepo, 'package.json'),
      JSON.stringify(
        {
          name: 'threadline-consumer',
          private: true,
          version: '1.0.0',
        },
        null,
        2,
      ),
    );
    await mkdir(join(consumerRepo, 'src'), { recursive: true });
    await mkdir(join(consumerRepo, '.threadline'), { recursive: true });
    await writeFile(join(consumerRepo, 'next.config.js'), 'module.exports = {};\n');
    await writeFile(
      join(consumerRepo, '.threadline/config.yaml'),
      `version: "1.0"
project:
  framework: nextjs
  src_path: src
  component_path: components
  extensions:
    - .tsx
    - .ts
dev:
  run_command: npm run dev
  port: 3000
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
    Input: TextInput
`,
    );
    await writeFile(join(consumerRepo, 'src/App.tsx'), 'export function App() { return null; }\n');

    await execFile('npm', ['install', '--ignore-scripts', '--no-package-lock', tarballPath], {
      cwd: consumerRepo,
      env: {
        ...process.env,
        npm_config_cache: join(consumerRepo, '.npm-cache'),
      },
    });

    const installResult = await execFile(
      join(consumerRepo, 'node_modules/.bin/threadline'),
      ['validate', '--json'],
      { cwd: consumerRepo },
    );

    const parsed = JSON.parse(installResult.stdout);
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.violations, []);
    assert.ok(parsed.filesChecked.length > 0);
  } finally {
    await Promise.allSettled([
      rm(packOutput, { recursive: true, force: true }),
      rm(consumerRepo, { recursive: true, force: true }),
    ]);
  }
});
