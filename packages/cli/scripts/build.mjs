import { chmod, mkdir, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { composeTemplateBundle } from '../../skill-templates/src/index.js';

const root = new URL('..', import.meta.url);
const srcRoot = new URL('src/', root);
const distRoot = new URL('dist/', root);

await rm(distRoot, { recursive: true, force: true });

await ensureLinkedPackage(new URL('node_modules/@threadline/ast-guard', root), new URL('../ast-guard/', root));

for (const file of await listFiles(srcRoot)) {
  const extension = extname(file);
  if (file.endsWith('.d.ts')) continue;
  if (extension === '.ts') {
    const source = await readFile(file, 'utf8');
    const stripped = stripTypeScriptTypes(source)
      .replace(/[ \t]+$/gm, '')
      .replace(/^[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n');
    const output = join(distRoot.pathname, relative(srcRoot.pathname, file)).replace(/\.ts$/, '.js');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, stripped);
    continue;
  }

  if (extension === '.yaml' || extension === '.yml') {
    const output = join(distRoot.pathname, relative(srcRoot.pathname, file));
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, await readFile(file, 'utf8'));
  }
}

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

async function ensureLinkedPackage(linkPath, targetPath) {
  await mkdir(new URL('.', linkPath), { recursive: true });
  try {
    await unlink(linkPath);
  } catch {
    await rm(linkPath, { force: true, recursive: true });
  }
  await symlink(targetPath, linkPath, 'dir');
}
