import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { generateBoundariesMarkdown } from '../generators/boundaries.js';
import { generateConfigYaml } from '../generators/config.js';
import { generateDesignSystemMarkdown } from '../generators/design-system.js';
import { generateSkillMarkdown } from '../generators/skill.js';
import type { InitOverrides, InitProposal, InitProposalField } from '../types.js';
import { writeTextFile } from '../utils/fs.js';
import {
  clarifyInitProposal,
  finalizeInitProposal,
  formatInitSummary,
  formatResolvedInitSummary,
  resolveInitProposal,
} from './init-flow.js';
import { installHooks, type InstallHooksResult } from './install-hooks.js';

export interface InitOptions {
  cwd: string;
  preview?: boolean;
  overrides?: InitOverrides;
}

export interface InitResult {
  configPath: string;
  filesWritten: string[];
  hook: InstallHooksResult;
  preview: boolean;
  summary: string;
  detected: {
    framework: string;
    styling: string;
    designSystem: string;
  };
}

export interface InteractiveInitOptions {
  cwd: string;
  overrides?: InitOverrides;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

interface PromptSession {
  ask(question: string): Promise<string>;
  close(): void;
}

export async function initProject(options: InitOptions): Promise<InitResult> {
  const proposal = await resolveInitProposal({
    cwd: options.cwd,
    overrides: options.overrides,
  });
  return await writeInitProject(options.cwd, proposal, {
    preview: options.preview ?? false,
    summarySuffix: formatAppliedOverrides(options.overrides),
  });
}

async function writeInitProject(
  cwd: string,
  proposal: InitProposal,
  options: {
    preview: boolean;
    summarySuffix?: string;
  },
): Promise<InitResult> {
  const summary = [formatResolvedInitSummary(proposal), options.summarySuffix]
    .filter(Boolean)
    .join('\n');
  const { configInput, detected } = {
    ...finalizeInitProposal(proposal),
    detected: proposal.detected,
  };
  const resolvedDesignSystem =
    configInput.designSystem === detected.designSystem.library
      ? detected.designSystem
      : {
          library: configInput.designSystem,
          importPath: configInput.designSystemImportPath,
        };

  const files = new Map<string, string>([
    [
      '.threadline/config.yaml',
      generateConfigYaml(configInput),
    ],
    ['.threadline/boundaries.md', generateBoundariesMarkdown()],
    ['.threadline/design-system.md', generateDesignSystemMarkdown(resolvedDesignSystem)],
    ['.threadline/skill.md', generateSkillMarkdown()],
  ]);

  if (options.preview) {
    return {
      configPath: '.threadline/config.yaml',
      filesWritten: [],
      hook: { installed: false, hookPath: '.git/hooks/pre-push', updated: false },
      preview: true,
      summary: `${summary}\nPreview only: no files written.`,
      detected: {
        framework: detected.framework.framework,
        styling: detected.styling.strategy,
        designSystem: detected.designSystem.library,
      },
    };
  }

  await Promise.all(
    [...files.entries()].map(([path, contents]) => writeTextFile(join(cwd, path), contents)),
  );

  const hook = await installHooks({ cwd });
  return {
    configPath: '.threadline/config.yaml',
    filesWritten: [...files.keys()],
    hook,
    preview: false,
    summary,
    detected: {
      framework: detected.framework.framework,
      styling: detected.styling.strategy,
      designSystem: detected.designSystem.library,
    },
  };
}

export async function runInteractiveInit(options: InteractiveInitOptions): Promise<InitResult | null> {
  const proposal = await resolveInitProposal({
    cwd: options.cwd,
    overrides: options.overrides,
  });
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const prompt = createPromptSession(input, output);

  try {
    output.write(`${formatInitSummary(proposal)}\n`);
    let clarified = proposal;

    for (const field of proposal.uncertainFields) {
      clarified = await promptForField(prompt, output, clarified, field);
    }

    output.write(`\n${formatResolvedInitSummary(clarified)}\n`);
    const confirmed = await promptForConfirmation(prompt, output);
    if (!confirmed) {
      output.write('Init cancelled. No files written.\n');
      return null;
    }

    return await writeInitProject(options.cwd, clarified, { preview: false });
  } finally {
    prompt.close();
  }
}

export function formatInitResult(result: InitResult): string {
  if (result.preview) {
    return result.summary;
  }

  let hook = 'skipped hook installation';
  if (result.hook.installed) {
    hook = 'installed pre-push hook';
  }

  return [
    `Threadline initialized ${result.configPath}.`,
    `Detected ${result.detected.framework}, ${result.detected.styling}, ${result.detected.designSystem}.`,
    `Wrote ${result.filesWritten.join(', ')} and ${hook}.`,
  ].join('\n');
}

function formatAppliedOverrides(overrides: InitOverrides | undefined): string {
  if (!overrides) return '';

  const order: Array<keyof InitOverrides> = [
    'framework',
    'styling',
    'designSystem',
    'srcPath',
    'componentPath',
    'devCommand',
    'port',
  ];
  const applied = order.filter((key) => overrides[key] !== undefined);
  if (applied.length === 0) return '';
  return `Applied overrides: ${applied.join(', ')}.`;
}

async function promptForField(
  prompt: PromptSession,
  output: NodeJS.WritableStream,
  proposal: InitProposal,
  field: InitProposalField,
): Promise<InitProposal> {
  while (true) {
    const answer = await prompt.ask(`${buildFieldPrompt(field, proposal)} `);
    try {
      return clarifyInitProposal(proposal, { field, answer });
    } catch (error) {
      output.write(`${formatErrorMessage(error)}\n`);
    }
  }
}

async function promptForConfirmation(
  prompt: PromptSession,
  output: NodeJS.WritableStream,
): Promise<boolean> {
  while (true) {
    const answer = (await prompt.ask('Confirm this config before writing? Type "confirm" to write or "cancel" to stop: '))
      .trim()
      .toLowerCase();
    if (answer === 'confirm' || answer === 'yes' || answer === 'y') {
      return true;
    }
    if (answer === 'cancel' || answer === 'no' || answer === 'n') {
      return false;
    }
    output.write('Please type "confirm" or "cancel".\n');
  }
}

function createPromptSession(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): PromptSession {
  const prompt = createInterface({
    input,
    output,
  });
  const queuedAnswers: string[] = [];
  let closed = false;
  let pending:
    | {
        resolve: (answer: string) => void;
        reject: (error: Error) => void;
      }
    | undefined;

  prompt.on('line', (line) => {
    if (pending) {
      const current = pending;
      pending = undefined;
      current.resolve(line);
      return;
    }
    queuedAnswers.push(line);
  });
  prompt.on('close', () => {
    closed = true;
    if (pending) {
      const current = pending;
      pending = undefined;
      current.reject(new Error('Init input ended before confirmation.'));
    }
  });

  return {
    async ask(question: string): Promise<string> {
      output.write(question);
      if (queuedAnswers.length > 0) {
        return queuedAnswers.shift() ?? '';
      }
      if (closed) {
        throw new Error('Init input ended before confirmation.');
      }
      return await new Promise<string>((resolve, reject) => {
        pending = { resolve, reject };
      });
    },
    close(): void {
      prompt.close();
    },
  };
}

function buildFieldPrompt(field: InitProposalField, proposal: InitProposal): string {
  const configInput = finalizeInitProposal(proposal).configInput;
  const choices = formatFieldChoices(field);
  if (choices.length > 0) {
    return `Clarify ${formatFieldLabel(field)} [${formatFieldValue(field, configInput)}] (choose from: ${choices.join(', ')}):`;
  }

  return `Clarify ${formatFieldLabel(field)} [${formatFieldValue(field, configInput)}]:`;
}

function formatFieldChoices(field: InitProposalField): string[] {
  switch (field) {
    case 'framework':
      return ['nextjs', 'vite', 'cra', 'remix', 'custom'];
    case 'styling':
      return ['tailwind', 'styled-components', 'emotion', 'css-modules', 'plain-css'];
    case 'designSystem':
      return ['shadcn', 'mui', 'antd', 'radix', 'custom', 'none'];
    default:
      return [];
  }
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

function formatFieldValue(field: InitProposalField, configInput: ReturnType<typeof finalizeInitProposal>['configInput']): string {
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

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
