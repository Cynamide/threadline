import { join } from 'node:path';
import { readJson } from './fs.js';

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface PackageManifest {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
}

export async function readPackageManifest(cwd: string): Promise<PackageManifest> {
  const pkg = await readJson<PackageJson>(join(cwd, 'package.json'));
  return {
    scripts: pkg?.scripts ?? {},
    dependencies: mergeDependencies(pkg),
  };
}

function mergeDependencies(pkg: PackageJson | null): Record<string, string> {
  return {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };
}
