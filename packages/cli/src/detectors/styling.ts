import { join } from 'node:path';
import type { StylingDetection } from '../types.js';
import { exists, findFiles, readJson } from '../utils/fs.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function detectStyling(cwd: string): Promise<StylingDetection> {
  const pkg = await readJson<PackageJson>(join(cwd, 'package.json'));
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const reasons: string[] = [];
  const tailwindConfig = await firstTailwindConfig(cwd);

  if (deps.tailwindcss || tailwindConfig) {
    reasons.push('found Tailwind dependency or config');
    return { strategy: 'tailwind', tailwindConfig: tailwindConfig ?? 'tailwind.config.ts', reasons };
  }

  if (deps['styled-components']) {
    reasons.push('found styled-components dependency');
    return { strategy: 'styled-components', tailwindConfig: null, reasons };
  }

  if (deps['@emotion/react'] || deps['@emotion/styled']) {
    reasons.push('found Emotion dependency');
    return { strategy: 'emotion', tailwindConfig: null, reasons };
  }

  const styleFiles = await findFiles(cwd, { extensions: ['.css', '.scss', '.sass'] });
  if (styleFiles.some((file) => /\.module\.(css|scss|sass)$/.test(file))) {
    reasons.push('found CSS module file');
    return { strategy: 'css-modules', tailwindConfig: null, reasons };
  }

  reasons.push(styleFiles.length > 0 ? 'found global CSS files' : 'no styling markers found');
  return { strategy: 'plain-css', tailwindConfig: null, reasons };
}

async function firstTailwindConfig(cwd: string): Promise<string | null> {
  const candidates = [
    'tailwind.config.ts',
    'tailwind.config.js',
    'tailwind.config.mjs',
    'tailwind.config.cjs',
  ];
  for (const candidate of candidates) {
    if (await exists(join(cwd, candidate))) return candidate;
  }
  return null;
}
