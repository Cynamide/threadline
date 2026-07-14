import { join } from 'node:path';

import { exists } from '../utils/fs.js';
import { readPackageManifest } from '../utils/package-json.js';

export async function detectDesignSystem(cwd        )                                 {
  const manifest = await readPackageManifest(cwd);
  const deps = manifest.dependencies;

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
