import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildThreadlineConfig,
  parseThreadlineConfig,
  renderThreadlineConfig,
} from '../dist/config/threadline-config.js';

test('threadline config round-trips through the canonical seam', () => {
  const config = buildThreadlineConfig({
    framework: 'nextjs',
    srcPath: 'src',
    componentPath: 'components',
    devCommand: 'npm run dev',
    port: 3000,
    styling: 'tailwind',
    tailwindConfig: 'tailwind.config.ts',
    designSystem: 'shadcn',
    designSystemImportPath: '@/components/ui',
  });

  const rendered = renderThreadlineConfig(config);
  const parsed = parseThreadlineConfig(rendered);

  assert.deepEqual(parsed, config);
});
