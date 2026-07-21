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

test('threadline config accepts ordinary yaml quoting and inline lists', () => {
  const parsed = parseThreadlineConfig(`version: '1.0'
project:
  framework: 'vite'
  src_path: 'src'
  component_path: 'components'
  extensions: ['.tsx', '.ts']
dev:
  run_command: 'pnpm dev'
  port: 5173
  startup_timeout: 10000
styling:
  strategy: 'css-modules'
  enforce_scoping: true
  tailwind_config: ''
git:
  branch_prefix: 'design/'
  commit_style: 'conventional'
  squash_merge: true
  pr_title_format: 'ui: {description}'
handoff:
  create_issues: true
  status_on_create: 'Backlog'
  status_on_merge: 'Ready'
  default_assignee: null
  team_id: null
boundaries:
  forbidden_imports: ['axios', 'localStorage']
  forbidden_paths: ['src/services/']
  whitelisted_imports: []
  whitelisted_components: ['src/providers/**']
validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
design_system:
  library: 'none'
  import_path: ''
  allow_new_primitives: false
  component_aliases: { Button: PrimaryButton }
`);

  assert.equal(parsed.version, '1.0');
  assert.equal(parsed.project.framework, 'vite');
  assert.deepEqual(parsed.project.extensions, ['.tsx', '.ts']);
  assert.deepEqual(parsed.boundaries.forbidden_imports, ['axios', 'localStorage']);
  assert.deepEqual(parsed.design_system?.component_aliases, { Button: 'PrimaryButton' });
});
