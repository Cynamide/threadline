import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { initProject } from '../dist/commands/init.js';

async function fixture(files = {}) {
  const root = await import('node:fs/promises').then((fs) =>
    fs.mkdtemp(join(tmpdir(), 'threadline-cli-init-compat-')),
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

test('initProject keeps honoring overrides in the compatibility path', async () => {
  const cwd = await fixture({
    'package.json': JSON.stringify({ dependencies: { next: '^15.0.0' } }),
    'next.config.js': 'module.exports = {}',
  });
  await import('node:child_process')
    .then(({ execFile: execFileCallback }) => import('node:util').then(({ promisify }) => promisify(execFileCallback)))
    .then((execFile) => execFile('git', ['init'], { cwd }));

  const result = await initProject({
    cwd,
    overrides: {
      framework: 'vite',
      styling: 'css-modules',
      designSystem: 'none',
      srcPath: 'app',
      componentPath: 'components',
      devCommand: 'pnpm dev',
      port: 4173,
    },
  });

  assert.match(result.summary, /Applied overrides: framework, styling, designSystem, srcPath, componentPath, devCommand, port/);
  assert.match(await readFile(join(cwd, '.threadline/config.yaml'), 'utf8'), /framework: "vite"/);
  assert.match(await readFile(join(cwd, '.threadline/config.yaml'), 'utf8'), /run_command: "pnpm dev"/);
});
