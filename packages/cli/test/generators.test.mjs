import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateBoundariesMarkdown } from '../dist/generators/boundaries.js';
import { generateConfigYaml } from '../dist/generators/config.js';
import { generateDesignSystemMarkdown } from '../dist/generators/design-system.js';
import { generateSkillMarkdown } from '../dist/generators/skill.js';

test('generates schema-aligned config yaml with explicit knobs', () => {
  const yaml = generateConfigYaml({
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

  assert.match(yaml, /^version: "1.0"/);
  assert.match(yaml, /framework: nextjs/);
  assert.match(yaml, /branch_prefix: design\//);
  assert.match(yaml, /create_linear_issues: true/);
  assert.match(yaml, /allow_new_primitives: false/);
  assert.match(yaml, /max_warnings: 0/);
});

test('generates markdown files for boundaries, design system, and agent skill', () => {
  assert.match(generateBoundariesMarkdown(), /Forbidden imports/);
  assert.match(generateDesignSystemMarkdown({ library: 'mui', importPath: '@mui/material' }), /mui/);
  assert.match(generateSkillMarkdown(), /threadline validate/);
});
