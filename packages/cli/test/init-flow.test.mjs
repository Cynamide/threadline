import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInitProposal, clarifyInitProposal } from '../dist/commands/init-flow.js';

test('buildInitProposal marks uncertain fields and keeps confident defaults', () => {
  const proposal = buildInitProposal({
    framework: {
      framework: 'nextjs',
      srcPath: 'src',
      componentPath: 'components',
      devCommand: 'npm run dev',
      port: 3000,
      reasons: ['found Next.js dependency or config'],
    },
    styling: {
      strategy: 'tailwind',
      tailwindConfig: 'tailwind.config.ts',
      reasons: ['found Tailwind dependency or config'],
    },
    designSystem: {
      library: 'shadcn',
      importPath: '@/components/ui',
    },
  });

  assert.equal(proposal.confident.framework, 'nextjs');
  assert.deepEqual(proposal.uncertainFields, ['componentPath']);
});

test('clarifyInitProposal accepts a natural-language correction and validates it', () => {
  const proposal = clarifyInitProposal(
    buildInitProposal({
      framework: {
        framework: 'nextjs',
        srcPath: 'src',
        componentPath: 'components',
        devCommand: 'npm run dev',
        port: 3000,
        reasons: ['found Next.js dependency or config'],
      },
      styling: {
        strategy: 'tailwind',
        tailwindConfig: 'tailwind.config.ts',
        reasons: ['found Tailwind dependency or config'],
      },
      designSystem: {
        library: 'shadcn',
        importPath: '@/components/ui',
      },
    }),
    { field: 'componentPath', answer: 'src/ui' },
  );

  assert.equal(proposal.resolved.configInput.componentPath, 'ui');
});
