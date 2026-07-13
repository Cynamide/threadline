import { join } from 'node:path';
import type { DesignSystemDetection } from '../types.js';
import { exists, readJson } from '../utils/fs.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function detectDesignSystem(cwd: string): Promise<DesignSystemDetection> {
  const pkg = await readJson<PackageJson>(join(cwd, 'package.json'));
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };

  if (await exists(join(cwd, 'src/components/ui'))) {
    return { library: 'shadcn', importPath: '@/components/ui' };
  }

  if (deps['@mui/material'] || deps['@mui/system']) {
    return { library: 'mui', importPath: '@mui/material' };
  }

  if (deps.antd) {
    return { library: 'antd', importPath: 'antd' };
  }

  if (Object.keys(deps).some((name) => name.startsWith('@radix-ui/'))) {
    return { library: 'radix', importPath: '@radix-ui/react-*' };
  }

  return { library: 'none', importPath: '' };
}
