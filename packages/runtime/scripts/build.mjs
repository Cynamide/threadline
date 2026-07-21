import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const execFile = promisify(execFileCallback);
const require = createRequire(import.meta.url);
const packageRoot = resolve(import.meta.dirname, '..');
const sourceRoot = join(packageRoot, 'src');
const outputRoot = join(packageRoot, 'dist');

await rm(outputRoot, { recursive: true, force: true });

await buildDirectory(sourceRoot);
await emitDeclarations();

async function buildDirectory(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await buildDirectory(absolutePath);
      continue;
    }

    if (!entry.isFile() || !absolutePath.endsWith('.ts')) {
      continue;
    }

    const relativePath = relative(sourceRoot, absolutePath);
    const outputPath = join(outputRoot, relativePath.replace(/\.ts$/u, '.js'));
    const source = await readFile(absolutePath, 'utf8');
    const transformed = rewriteLocalTypeScriptSpecifiers(
      stripTypeScriptTypes(source),
    );

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, transformed, 'utf8');
  }
}

function rewriteLocalTypeScriptSpecifiers(source) {
  return source.replace(
    /((?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"])(\.{1,2}\/[^'"]+)\.ts(['"])/gu,
    '$1$2.js$3',
  );
}

async function emitDeclarations() {
  await execFile(
    process.execPath,
    [
      require.resolve('typescript/bin/tsc'),
      '-p',
      'tsconfig.json',
      '--emitDeclarationOnly',
      '--allowImportingTsExtensions',
    ],
    { cwd: packageRoot },
  );
}
