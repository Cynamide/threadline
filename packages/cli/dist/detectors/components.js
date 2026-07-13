import { join } from 'node:path';
                                                         
import { exists, readJson } from '../utils/fs.js';

                       
                                        
                                           
 

export async function detectDesignSystem(cwd        )                                 {
  const pkg = await readJson             (join(cwd, 'package.json'));
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
