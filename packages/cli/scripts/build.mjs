import { chmod, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { composeTemplateBundle } from '../../skill-templates/src/index.js';

const root = new URL('..', import.meta.url);
const srcRoot = new URL('src/', root);
const distRoot = new URL('dist/', root);

await rm(distRoot, { recursive: true, force: true });

for (const file of await listFiles(srcRoot)) {
  if (file.endsWith('.d.ts') || extname(file) !== '.ts') continue;
  const source = await readFile(file, 'utf8');
  const stripped = stripTypeScriptTypes(source);
  const output = join(distRoot.pathname, relative(srcRoot.pathname, file)).replace(/\.ts$/, '.js');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, stripped);
}

await copySourceTree(new URL('../ast-guard/src/', root), new URL('dist/vendor/ast-guard/src/', root));

await mkdir(join(distRoot.pathname, 'generated'), { recursive: true });
await writeFile(
  join(distRoot.pathname, 'generated', 'skill-template-bundle.js'),
  `export function composeTemplateBundle() {\n  return ${JSON.stringify(composeTemplateBundle())};\n}\n`,
);

await chmod(new URL('dist/index.js', root), 0o755);

async function listFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir.pathname ?? dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

async function copySourceTree(sourceRoot, targetRoot) {
  await mkdir(targetRoot, { recursive: true });
  for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
    const sourcePath = join(sourceRoot.pathname ?? sourceRoot, entry.name);
    const targetPath = join(targetRoot.pathname ?? targetRoot, entry.name);
    if (entry.isDirectory()) {
      await copySourceTree(new URL(`${entry.name}/`, sourceRoot), new URL(`${entry.name}/`, targetRoot));
      continue;
    }
    if (!entry.isFile()) continue;
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, await readFile(sourcePath, 'utf8'));
  }
}
