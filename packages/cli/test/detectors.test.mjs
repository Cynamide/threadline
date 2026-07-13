import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { tmpdir } from 'node:os';

import { detectFramework } from '../dist/detectors/framework.js';
import { detectStyling } from '../dist/detectors/styling.js';
import { detectDesignSystem } from '../dist/detectors/components.js';

async function fixture(files) {
  const root = await import('node:fs/promises').then((fs) =>
    fs.mkdtemp(join(tmpdir(), 'threadline-cli-detectors-')),
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

test('detects Next.js with Tailwind and shadcn conventions', async () => {
  const cwd = await fixture({
    'package.json': JSON.stringify({
      dependencies: {
        next: '^15.0.0',
        tailwindcss: '^4.0.0',
        '@radix-ui/react-slot': '^1.0.0',
      },
    }),
    'next.config.ts': 'export default {}',
    'tailwind.config.ts': 'export default {}',
    'src/components/ui/button.tsx': 'export function Button() {}',
  });

  assert.equal((await detectFramework(cwd)).framework, 'nextjs');
  assert.equal((await detectStyling(cwd)).strategy, 'tailwind');
  assert.deepEqual(await detectDesignSystem(cwd), {
    library: 'shadcn',
    importPath: '@/components/ui',
  });
});

test('detects Vite styled-components and CRA CSS modules', async () => {
  const vite = await fixture({
    'package.json': JSON.stringify({
      dependencies: { vite: '^6.0.0', 'styled-components': '^6.0.0' },
    }),
    'vite.config.ts': 'export default {}',
  });
  const cra = await fixture({
    'package.json': JSON.stringify({
      dependencies: { 'react-scripts': '^5.0.0' },
    }),
    'src/App.module.css': '.root {}',
  });

  assert.equal((await detectFramework(vite)).framework, 'vite');
  assert.equal((await detectStyling(vite)).strategy, 'styled-components');
  assert.equal((await detectFramework(cra)).framework, 'cra');
  assert.equal((await detectStyling(cra)).strategy, 'css-modules');
});
