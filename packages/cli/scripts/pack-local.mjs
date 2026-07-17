#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile, mkdtemp } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const outputDir = resolveOutputDir(process.argv.slice(2));

let stagingRoot;
try {
  await runBuild();

  stagingRoot = await mkdtemp(join(tmpdir(), 'threadline-cli-pack-'));
  const npmCacheDir = join(stagingRoot, 'npm-cache');
  const stagingPackage = join(stagingRoot, 'package');
  await mkdir(stagingPackage, { recursive: true });
  await mkdir(npmCacheDir, { recursive: true });

  await cp(join(packageRoot, 'dist'), join(stagingPackage, 'dist'), { recursive: true });
  await cp(join(packageRoot, 'SPEC.md'), join(stagingPackage, 'SPEC.md'));
  await cp(join(packageRoot, 'CONTEXT.md'), join(stagingPackage, 'CONTEXT.md'));
  await cp(join(packageRoot, 'package.json'), join(stagingPackage, 'package.json'));

  await stagePackage(
    join(repoRoot, 'packages/ast-guard'),
    join(stagingPackage, 'dist/vendor/ast-guard'),
    {
      '@babel/parser': 'file:../@babel/parser',
    },
  );
  await stagePackage(
    join(repoRoot, 'packages/ast-guard/node_modules/@babel/parser'),
    join(stagingPackage, 'dist/vendor/@babel/parser'),
    {
      '@babel/types': 'file:../@babel/types',
    },
  );
  await stagePackage(
    join(repoRoot, 'packages/ast-guard/node_modules/@babel/types'),
    join(stagingPackage, 'dist/vendor/@babel/types'),
    {
      '@babel/helper-string-parser': 'file:../helper-string-parser',
      '@babel/helper-validator-identifier': 'file:../helper-validator-identifier',
    },
  );
  await stagePackage(
    join(repoRoot, 'packages/ast-guard/node_modules/@babel/helper-string-parser'),
    join(stagingPackage, 'dist/vendor/@babel/helper-string-parser'),
  );
  await stagePackage(
    join(repoRoot, 'packages/ast-guard/node_modules/@babel/helper-validator-identifier'),
    join(stagingPackage, 'dist/vendor/@babel/helper-validator-identifier'),
  );

  await rewriteAstGuardImports(stagingPackage);

  const packageJsonPath = join(stagingPackage, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  if (packageJson.dependencies) {
    delete packageJson.dependencies['@threadline/ast-guard'];
  }
  if (packageJson.dependencies && Object.keys(packageJson.dependencies).length === 0) {
    delete packageJson.dependencies;
  }
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const { stdout } = await execFile('npm', ['pack', '--json', '--pack-destination', outputDir], {
    cwd: stagingPackage,
    env: {
      ...process.env,
      npm_config_cache: npmCacheDir,
    },
  });
  const packed = JSON.parse(stdout);
  const filename = packed[0]?.filename;
  if (!filename) {
    throw new Error('Failed to pack the local CLI bundle.');
  }

  process.stdout.write(`${join(outputDir, filename)}\n`);
} finally {
  if (stagingRoot) {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

async function runBuild() {
  await execFile('node', ['--disable-warning=ExperimentalWarning', join(packageRoot, 'scripts/build.mjs')], {
    cwd: packageRoot,
  });
}

async function stagePackage(sourceDir, targetDir, dependencyRewrites = {}) {
  await mkdir(dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });

  const packageJsonPath = join(targetDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  if (packageJson.dependencies) {
    packageJson.dependencies = rewriteDependencies(packageJson.dependencies, dependencyRewrites);
  }
  if (packageJson.peerDependencies) {
    packageJson.peerDependencies = rewriteDependencies(packageJson.peerDependencies, dependencyRewrites);
  }
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function rewriteDependencies(dependencies, dependencyRewrites) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => [name, dependencyRewrites[name] ?? version]),
  );
}

async function rewriteAstGuardImports(stagingPackage) {
  const distRoot = join(stagingPackage, 'dist');
  const vendorEntry = join(distRoot, 'vendor/ast-guard/src/index.js');
  for (const file of await listFiles(distRoot)) {
    if (!file.endsWith('.js')) continue;
    const source = await readFile(file, 'utf8');
    if (!source.includes("@threadline/ast-guard")) continue;
    const replacement = relative(dirname(file), vendorEntry).replace(/\\/g, '/');
    await writeFile(file, source.replaceAll("@threadline/ast-guard", replacement));
  }
}

async function listFiles(dir) {
  const entries = await import('node:fs/promises').then((fs) => fs.readdir(dir, { withFileTypes: true }));
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function resolveOutputDir(argv) {
  const index = argv.findIndex((arg) => arg === '--out-dir' || arg === '-o');
  if (index !== -1) {
    const value = argv[index + 1];
    if (!value || value.startsWith('-')) {
      throw new Error('Missing value for --out-dir.');
    }
    return resolve(process.cwd(), value);
  }

  return join(packageRoot, '.pack');
}
