import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInitProposal, clarifyInitProposal, formatResolvedInitSummary } from '../dist/commands/init-flow.js';

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

test('formatInitSummary shows an explicit ready-to-write proposal once uncertainty is resolved', () => {
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

  assert.equal(
    formatResolvedInitSummary(proposal),
    [
      'Detected: nextjs, tailwind, shadcn',
      'No clarification needed before confirmation.',
      'Proposed config:',
      '- framework: nextjs',
      '- styling: tailwind',
      '- design system: shadcn',
      '- source root: src',
      '- component path: ui',
      '- dev command: npm run dev',
      '- port: 3000',
      'Config target: .threadline/config.yaml.',
      'Will write: .threadline/config.yaml, .threadline/boundaries.md, .threadline/design-system.md, .threadline/skill.md.',
    ].join('\n'),
  );
});

test('clarifyInitProposal accepts an unambiguous natural-language enum correction', () => {
  const proposal = clarifyInitProposal(
    buildInitProposal({
      framework: {
        framework: 'custom',
        srcPath: 'src',
        componentPath: 'components',
        devCommand: 'npm run dev',
        port: 3000,
        reasons: ['fallback'],
      },
      styling: {
        strategy: 'plain-css',
        tailwindConfig: null,
        reasons: ['fallback'],
      },
      designSystem: {
        library: 'none',
        importPath: '',
      },
    }),
    { field: 'framework', answer: 'please use vite' },
  );

  assert.equal(proposal.resolved.configInput.framework, 'vite');
});

test('clarifyInitProposal rejects ambiguous enum clarifications', () => {
  assert.throws(
    () =>
      clarifyInitProposal(
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
        { field: 'framework', answer: 'not nextjs, use vite' },
    ),
    /Invalid init answer: framework must be one of nextjs, vite, cra, remix, custom\./,
  );
});

test('clarifyInitProposal rejects negated natural-language enum clarifications', () => {
  assert.throws(
    () =>
      clarifyInitProposal(
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
            strategy: 'plain-css',
            tailwindConfig: null,
            reasons: ['fallback'],
          },
          designSystem: {
            library: 'none',
            importPath: '',
          },
        }),
        { field: 'styling', answer: 'do not use plain css' },
      ),
    /Invalid init answer: styling must be one of tailwind, styled-components, emotion, css-modules, plain-css\./,
  );
});
