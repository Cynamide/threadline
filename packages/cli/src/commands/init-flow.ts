import { relative } from 'node:path';
import { detectDesignSystem } from '../detectors/components.js';
import { detectFramework } from '../detectors/framework.js';
import { detectStyling } from '../detectors/styling.js';
import type {
  ConfigInput,
  DesignSystemLibrary,
  DetectedInitSettings,
  FinalizedInitProposal,
  Framework,
  InitProposal,
  InitProposalField,
  StylingStrategy,
} from '../types.js';

const CONFIG_PATH = '.threadline/config.yaml';
const WRITTEN_FILES = [
  '.threadline/config.yaml',
  '.threadline/boundaries.md',
  '.threadline/design-system.md',
  '.codex/skills/threadline/SKILL.md',
  'AGENTS.md',
  'CLAUDE.md',
  '.cursor/rules/threadline.mdc',
] as const;
const FIELD_ORDER: InitProposalField[] = [
  'framework',
  'styling',
  'designSystem',
  'srcPath',
  'componentPath',
  'devCommand',
  'port',
];
const FRAMEWORK_VALUES: Framework[] = ['nextjs', 'vite', 'cra', 'remix', 'custom'];
const STYLING_VALUES: StylingStrategy[] = [
  'tailwind',
  'styled-components',
  'emotion',
  'css-modules',
  'plain-css',
];
const DESIGN_SYSTEM_VALUES: DesignSystemLibrary[] = ['shadcn', 'mui', 'antd', 'radix', 'custom', 'none'];
const MAX_ENUM_CORRECTION_TOKENS = 8;
const NEGATION_TOKENS = new Set(['no', 'not', 'never', 'without', 'avoid', 'dont']);

export async function resolveInitProposal(options: {
  cwd: string;
}): Promise<InitProposal> {
  const detected = await detectAll(options.cwd);
  return buildInitProposal(detected);
}

export function buildInitProposal(
  detected: DetectedInitSettings,
  userAnswers: Partial<Record<InitProposalField, string>> = {},
): InitProposal {
  return createProposal(detected, userAnswers);
}

export function clarifyInitProposal(
  proposal: InitProposal,
  answer: { field: string; answer: string },
): InitProposal {
  if (!FIELD_ORDER.includes(answer.field as InitProposalField)) {
    throw new Error(`Unknown init field: ${answer.field}`);
  }

  const field = answer.field as InitProposalField;
  const normalizedAnswer = answer.answer.trim();
  if (!normalizedAnswer) {
    throw new Error(`Invalid init answer: ${field} must not be empty.`);
  }

  return createProposal(proposal.detected, {
    ...proposal.userAnswers,
    [field]: normalizedAnswer,
  });
}

export function finalizeInitProposal(proposal: InitProposal): FinalizedInitProposal {
  return proposal.resolved;
}

export function formatInitSummary(proposal: InitProposal): string {
  return proposal.summaryLines.join('\n');
}

export function formatResolvedInitSummary(proposal: InitProposal): string {
  return finalizeInitProposal(proposal).summaryLines.join('\n');
}

async function detectAll(cwd: string): Promise<DetectedInitSettings> {
  const [framework, styling, designSystem] = await Promise.all([
    detectFramework(cwd),
    detectStyling(cwd),
    detectDesignSystem(cwd),
  ]);

  return { framework, styling, designSystem };
}

function createProposal(
  detected: DetectedInitSettings,
  userAnswers: Partial<Record<InitProposalField, string>>,
): InitProposal {
  const configInput = resolveConfigInput(detected, userAnswers);
  const uncertainFields = inferUncertainFields(detected, configInput, userAnswers);
  const confident = buildConfidentValues(configInput, uncertainFields);
  const summaryLines = buildSummaryLines(detected, configInput, uncertainFields);
  const resolvedSummaryLines = buildResolvedSummaryLines(detected, configInput);

  return {
    detected,
    confident,
    uncertainFields,
    userAnswers,
    resolved: {
      configInput,
      summaryLines: resolvedSummaryLines,
    },
    summaryLines,
  };
}

function resolveConfigInput(
  detected: DetectedInitSettings,
  userAnswers: Partial<Record<InitProposalField, string>>,
): ConfigInput {
  const framework = resolveEnum(
    userAnswers.framework,
    FRAMEWORK_VALUES,
    detected.framework.framework,
    'framework',
  );
  const styling = resolveEnum(
    userAnswers.styling,
    STYLING_VALUES,
    detected.styling.strategy,
    'styling',
  );
  const designSystem = resolveEnum(
    userAnswers.designSystem,
    DESIGN_SYSTEM_VALUES,
    detected.designSystem.library,
    'designSystem',
  );
  const srcPath = normalizeRelativePath(userAnswers.srcPath ?? detected.framework.srcPath, 'srcPath');
  const componentPath = normalizeComponentPath(
    srcPath,
    userAnswers.componentPath ?? detected.framework.componentPath,
  );
  const devCommand = normalizeDevCommand(userAnswers.devCommand ?? detected.framework.devCommand);
  const port = normalizePort(userAnswers.port ?? String(detected.framework.port));

  return {
    framework,
    styling,
    designSystem,
    srcPath,
    componentPath,
    devCommand,
    port,
    tailwindConfig: styling === 'tailwind' ? detected.styling.tailwindConfig ?? 'tailwind.config.ts' : null,
    designSystemImportPath: resolveDesignSystemImportPath(designSystem, detected),
  };
}

function inferUncertainFields(
  detected: DetectedInitSettings,
  configInput: ConfigInput,
  userAnswers: Partial<Record<InitProposalField, string>>,
): InitProposalField[] {
  const uncertain = new Set<InitProposalField>();

  if (userAnswers.framework === undefined && configInput.framework === 'custom') uncertain.add('framework');
  if (userAnswers.styling === undefined && configInput.styling === 'plain-css') uncertain.add('styling');
  if (userAnswers.designSystem === undefined && configInput.designSystem === 'custom') uncertain.add('designSystem');
  if (userAnswers.srcPath === undefined && !detected.framework.srcPathDetected) uncertain.add('srcPath');
  if (userAnswers.componentPath === undefined && !detected.framework.componentPathDetected) uncertain.add('componentPath');
  if (userAnswers.devCommand === undefined && !configInput.devCommand) uncertain.add('devCommand');

  return FIELD_ORDER.filter((field) => uncertain.has(field));
}

function buildConfidentValues(
  configInput: ConfigInput,
  uncertainFields: InitProposalField[],
): Partial<ConfigInput> {
  const uncertain = new Set(uncertainFields);
  const confident: Partial<ConfigInput> = {};

  if (!uncertain.has('framework')) confident.framework = configInput.framework;
  if (!uncertain.has('styling')) confident.styling = configInput.styling;
  if (!uncertain.has('designSystem')) confident.designSystem = configInput.designSystem;
  if (!uncertain.has('srcPath')) confident.srcPath = configInput.srcPath;
  if (!uncertain.has('componentPath')) confident.componentPath = configInput.componentPath;
  if (!uncertain.has('devCommand')) confident.devCommand = configInput.devCommand;
  if (!uncertain.has('port')) confident.port = configInput.port;
  confident.tailwindConfig = configInput.tailwindConfig;
  confident.designSystemImportPath = configInput.designSystemImportPath;

  return confident;
}

function buildSummaryLines(
  detected: DetectedInitSettings,
  configInput: ConfigInput,
  uncertainFields: InitProposalField[],
): string[] {
  const lines = [
    `Detected: ${detected.framework.framework}, ${detected.styling.strategy}, ${detected.designSystem.library}`,
  ];

  if (uncertainFields.length > 0) {
    lines.push("I'm not fully sure about:");
    for (const field of uncertainFields) {
      lines.push(`- ${formatFieldLabel(field)}: ${formatFieldValue(field, configInput)}`);
    }
  } else {
    lines.push('No clarification needed before confirmation.');
  }

  lines.push('Proposed config:');
  lines.push(`- framework: ${configInput.framework}`);
  lines.push(`- styling: ${configInput.styling}`);
  lines.push(`- design system: ${configInput.designSystem}`);
  lines.push(`- source root: ${configInput.srcPath}`);
  lines.push(`- component path: ${configInput.componentPath}`);
  lines.push(`- dev command: ${configInput.devCommand}`);
  lines.push(`- port: ${configInput.port}`);
  lines.push(`Config target: ${CONFIG_PATH}.`);
  lines.push(`Will write: ${WRITTEN_FILES.join(', ')}.`);
  return lines;
}

function buildResolvedSummaryLines(
  detected: DetectedInitSettings,
  configInput: ConfigInput,
): string[] {
  return buildSummaryLines(detected, configInput, []);
}

function formatFieldLabel(field: InitProposalField): string {
  switch (field) {
    case 'designSystem':
      return 'design system';
    case 'srcPath':
      return 'source root';
    case 'componentPath':
      return 'component path';
    case 'devCommand':
      return 'dev command';
    default:
      return field;
  }
}

function formatFieldValue(field: InitProposalField, configInput: ConfigInput): string {
  switch (field) {
    case 'framework':
      return configInput.framework;
    case 'styling':
      return configInput.styling;
    case 'designSystem':
      return configInput.designSystem;
    case 'srcPath':
      return configInput.srcPath;
    case 'componentPath':
      return configInput.componentPath;
    case 'devCommand':
      return configInput.devCommand;
    case 'port':
      return String(configInput.port);
  }
}

function resolveEnum<T extends string>(
  answer: string | undefined,
  allowed: readonly T[],
  fallback: T,
  label: string,
): T {
  if (answer === undefined) return fallback;

  const normalized = answer.trim().toLowerCase();
  const direct = allowed.find((value) => value === normalized);
  if (direct) return direct;

  const parsed = parseEnumCorrection(normalized, allowed);
  if (parsed) return parsed;

  throw new Error(`Invalid init answer: ${label} must be one of ${allowed.join(', ')}.`);
}

function parseEnumCorrection<T extends string>(answer: string, allowed: readonly T[]): T | undefined {
  const normalized = normalizeEnumPhrase(answer);
  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0 || tokens.length > MAX_ENUM_CORRECTION_TOKENS) {
    return undefined;
  }

  const matches: Array<{ value: T; negated: boolean }> = [];
  for (const value of allowed) {
    const aliasTokens = buildEnumAliases(value);
    for (const alias of aliasTokens) {
      const index = findTokenSequence(tokens, alias.split(' '));
      if (index === -1) continue;
      matches.push({ value, negated: isNegatedMention(tokens, index) });
      break;
    }
  }

  if (matches.length !== 1) {
    return undefined;
  }

  if (matches[0].negated) {
    return undefined;
  }

  return matches[0].value;
}

function buildEnumAliases(value: string): string[] {
  const aliases = new Set<string>([normalizeEnumPhrase(value)]);
  if (value.includes('-')) {
    aliases.add(normalizeEnumPhrase(value.replace(/-/g, ' ')));
  }
  if (value === 'nextjs') {
    aliases.add('next js');
  }
  if (value === 'cra') {
    aliases.add('create react app');
  }
  return [...aliases].filter(Boolean);
}

function findTokenSequence(tokens: string[], sequence: string[]): number {
  for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((token, offset) => tokens[index + offset] === token)) {
      return index;
    }
  }
  return -1;
}

function isNegatedMention(tokens: string[], index: number): boolean {
  return tokens.slice(Math.max(0, index - 3), index).some((token) => NEGATION_TOKENS.has(token));
}

function normalizeEnumPhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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
  }
}

function normalizeComponentPath(srcPath: string, componentPath: string): string {
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
    throw new Error(`Invalid init answer: ${label} must be a relative path.`);
  }
  return trimmed;
}

function normalizeDevCommand(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Invalid init answer: devCommand must not be empty.');
  }
  return trimmed;
}

function normalizePort(value: string): number {
  const port = Number(value);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('Invalid init answer: port must be a positive number.');
  }
  return port;
}
