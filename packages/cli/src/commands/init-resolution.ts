import { relative } from 'node:path';
import { detectDesignSystem } from '../detectors/components.js';
import { detectFramework } from '../detectors/framework.js';
import { detectStyling } from '../detectors/styling.js';
import type {
  ConfigInput,
  DesignSystemLibrary,
  DetectedInitSettings,
  InitOverrides,
  InitSettings,
  StylingStrategy,
} from '../types.js';

const CONFIG_PATH = '.threadline/config.yaml';

export function mergeInitSettings(
  detected: DetectedInitSettings,
  overrides: InitOverrides = {},
): InitSettings {
  const srcPath = normalizeRelativePath(overrides.srcPath ?? detected.framework.srcPath, 'srcPath');
  const componentPath =
    overrides.componentPath !== undefined
      ? normalizeOverrideComponentPath(srcPath, overrides.componentPath)
      : normalizeDetectedComponentPath(srcPath, detected.framework.componentPath);
  const styling = overrides.styling ?? detected.styling.strategy;
  const designSystem = overrides.designSystem ?? detected.designSystem.library;

  const configInput: ConfigInput = {
    framework: overrides.framework ?? detected.framework.framework,
    srcPath,
    componentPath,
    devCommand: overrides.devCommand ?? detected.framework.devCommand,
    port: normalizePort(overrides.port ?? detected.framework.port),
    styling,
    tailwindConfig: resolveTailwindConfig(styling, detected),
    designSystem,
    designSystemImportPath: resolveDesignSystemImportPath(designSystem, detected),
  };

  const overridesApplied = overrideKeys(overrides);
  const summaryLines = [
    `Detected ${detected.framework.framework}, ${detected.styling.strategy}, ${detected.designSystem.library}.`,
    overridesApplied.length > 0
      ? `Applied overrides: ${overridesApplied.join(', ')}.`
      : 'Applied overrides: none.',
    `Config target: ${CONFIG_PATH}.`,
  ];

  return {
    configInput,
    detected,
    overrides: { ...overrides },
    overridesApplied,
    summaryLines,
  };
}

export async function resolveInitSettings(options: {
  cwd: string;
  overrides?: InitOverrides;
}): Promise<InitSettings> {
  const detected = await detectAll(options.cwd);
  return mergeInitSettings(detected, options.overrides);
}

export function formatInitSummary(result: InitSettings): string {
  return result.summaryLines.join('\n');
}

async function detectAll(cwd: string): Promise<DetectedInitSettings> {
  const [framework, styling, designSystem] = await Promise.all([
    detectFramework(cwd),
    detectStyling(cwd),
    detectDesignSystem(cwd),
  ]);

  return { framework, styling, designSystem };
}

function overrideKeys(overrides: InitOverrides): string[] {
  const order: Array<keyof InitOverrides> = [
    'framework',
    'styling',
    'designSystem',
    'srcPath',
    'componentPath',
    'devCommand',
    'port',
  ];
  return order.filter((key) => overrides[key] !== undefined);
}

function resolveTailwindConfig(styling: StylingStrategy, detected: DetectedInitSettings): string | null {
  if (styling !== 'tailwind') return null;
  return detected.styling.tailwindConfig ?? 'tailwind.config.ts';
}

function resolveDesignSystemImportPath(
  designSystem: DesignSystemLibrary,
  detected: DetectedInitSettings,
): string {
  if (designSystem === detected.designSystem.library) {
    return detected.designSystem.importPath;
  }

  switch (designSystem) {
    case 'shadcn':
      return '@/components/ui';
    case 'mui':
      return '@mui/material';
    case 'antd':
      return 'antd';
    case 'radix':
      return '@radix-ui/react-*';
    case 'custom':
    case 'none':
      return '';
    default:
      return '';
  }
}

function normalizeDetectedComponentPath(srcPath: string, componentPath: string): string {
  const normalized = normalizeRelativePath(componentPath, 'componentPath');
  if (normalized === srcPath) {
    return '.';
  }
  if (normalized.startsWith(`${srcPath}/`)) {
    return relative(srcPath, normalized) || '.';
  }
  return normalized;
}

function normalizeOverrideComponentPath(srcPath: string, componentPath: string): string {
  const normalized = normalizeRelativePath(componentPath, 'componentPath');
  if (normalized === srcPath) {
    return '.';
  }
  if (normalized.startsWith(`${srcPath}/`)) {
    return relative(srcPath, normalized) || '.';
  }
  return normalized;
}

function normalizeRelativePath(value: string, label: string): string {
  const trimmed = value.trim().replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '');
  if (!trimmed || trimmed.startsWith('/')) {
    throw new Error(`Invalid init override: ${label} must be a relative path.`);
  }
  return trimmed;
}

function normalizePort(port: number): number {
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('Invalid init override: port must be a positive number.');
  }
  return port;
}
