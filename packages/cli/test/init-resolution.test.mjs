import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeInitSettings } from '../dist/commands/init-resolution.js';

test('mergeInitSettings prefers explicit overrides over detector output', () => {
  const result = mergeInitSettings(
    {
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
    },
    {
      framework: 'vite',
      styling: 'css-modules',
      designSystem: 'none',
      srcPath: 'app',
      componentPath: 'ui',
      devCommand: 'pnpm dev',
      port: 4173,
    },
  );

  assert.equal(result.configInput.framework, 'vite');
  assert.equal(result.configInput.srcPath, 'app');
  assert.equal(result.configInput.componentPath, 'ui');
  assert.equal(result.configInput.devCommand, 'pnpm dev');
  assert.equal(result.configInput.port, 4173);
  assert.deepEqual(result.overridesApplied, [
    'framework',
    'styling',
    'designSystem',
    'srcPath',
    'componentPath',
    'devCommand',
    'port',
  ]);
});

test('mergeInitSettings keeps componentPath relative to srcPath', () => {
  const result = mergeInitSettings(
    {
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
    },
    {
      srcPath: 'app',
      componentPath: 'app/components',
    },
  );

  assert.equal(result.configInput.srcPath, 'app');
  assert.equal(result.configInput.componentPath, 'components');
});

test('mergeInitSettings preserves detected config-relative componentPath values', () => {
  const result = mergeInitSettings(
    {
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
    },
  );

  assert.equal(result.configInput.srcPath, 'src');
  assert.equal(result.configInput.componentPath, 'components');
});

test('mergeInitSettings rejects absolute srcPath overrides', () => {
  assert.throws(
    () =>
      mergeInitSettings(
        {
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
        },
        {
          srcPath: '/absolute/path',
        },
      ),
    /srcPath must be a relative path/,
  );
});

test('mergeInitSettings rejects absolute componentPath overrides', () => {
  assert.throws(
    () =>
      mergeInitSettings(
        {
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
        },
        {
          componentPath: '/absolute/components',
        },
      ),
    /componentPath must be a relative path/,
  );
});

test('mergeInitSettings rejects non-positive port overrides', () => {
  assert.throws(
    () =>
      mergeInitSettings(
        {
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
        },
        {
          port: 0,
        },
      ),
    /port must be a positive number/,
  );
});
