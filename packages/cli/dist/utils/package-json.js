import { join } from 'node:path';
import { readJson } from './fs.js';

export async function readPackageManifest(cwd        )                           {
  const pkg = await readJson             (join(cwd, 'package.json'));
  return {
    scripts: pkg?.scripts ?? {},
    dependencies: mergeDependencies(pkg),
  };
}

function mergeDependencies(pkg                    )                         {
  return {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };
}
