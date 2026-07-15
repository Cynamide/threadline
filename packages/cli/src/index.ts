#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import type { DesignSystemLibrary, Framework, StylingStrategy } from './types.js';
import { initProject } from './commands/init.js';
import { validateProject, formatValidateResult } from './commands/validate.js';
import { scanHandoffs, formatScanHandoffsResult } from './commands/scan-handoffs.js';
import { installHooks, formatInstallHooksResult } from './commands/install-hooks.js';
import { exportHandoffs, formatExportHandoffsResult } from './commands/export-handoffs.js';

export { initProject } from './commands/init.js';
export { validateProject } from './commands/validate.js';
export { scanHandoffs } from './commands/scan-handoffs.js';
export { installHooks } from './commands/install-hooks.js';
export { exportHandoffs } from './commands/export-handoffs.js';

interface ParsedArgs {
  command: string | null;
  cwd: string;
  json: boolean;
  help: boolean;
  staged: boolean;
  preview: boolean;
  tracker: 'github' | 'linear';
  framework?: Framework;
  styling?: StylingStrategy;
  designSystem?: DesignSystemLibrary;
  srcPath?: string;
  componentPath?: string;
  devCommand?: string;
  port?: number;
}

const frameworkValues = ['nextjs', 'vite', 'cra', 'remix', 'custom'] as const;
const stylingValues = ['tailwind', 'styled-components', 'emotion', 'css-modules', 'plain-css'] as const;
const designSystemValues = ['shadcn', 'mui', 'antd', 'radix', 'custom', 'none'] as const;

export async function run(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args.help || !args.command) {
      process.stdout.write(help());
      return args.help ? 0 : 1;
    }
    if (args.command === 'init') {
      const result = await initProject({
        cwd: args.cwd,
        preview: args.preview,
        overrides: {
          framework: args.framework,
          styling: args.styling,
          designSystem: args.designSystem,
          srcPath: args.srcPath,
          componentPath: args.componentPath,
          devCommand: args.devCommand,
          port: args.port,
        },
      });
      if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${result.summary}\n`);
      }
      return 0;
    }
    if (args.command === 'validate') {
      const result = await validateProject({ cwd: args.cwd, json: args.json, staged: args.staged });
      process.stdout.write(formatValidateResult(result, args.json));
      if (result.valid) {
        return 0;
      }
      return 1;
    }
    if (args.command === 'scan-handoffs') {
      const result = await scanHandoffs({ cwd: args.cwd, json: args.json });
      process.stdout.write(formatScanHandoffsResult(result, args.json));
      return 0;
    }
    if (args.command === 'export-handoffs') {
      const result = await exportHandoffs({ cwd: args.cwd, tracker: args.tracker });
      if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(formatExportHandoffsResult(result));
      }
      return 0;
    }
    if (args.command === 'install-hooks') {
      const result = await installHooks({ cwd: args.cwd });
      if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${formatInstallHooksResult(result)}\n`);
      }
      if (result.installed) {
        return 0;
      }
      return 1;
    }

    process.stderr.write(help());
    return 1;
  } catch (error) {
    process.stderr.write(`${formatError(error)}\n`);
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  let command: string | null = null;
  let cwd = process.cwd();
  let json = false;
  let help = false;
  let staged = false;
  let preview = false;
  let tracker: 'github' | 'linear' = 'github';
  let framework: Framework | undefined;
  let styling: StylingStrategy | undefined;
  let designSystem: DesignSystemLibrary | undefined;
  let srcPath: string | undefined;
  let componentPath: string | undefined;
  let devCommand: string | undefined;
  let port: number | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--cwd') {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('-')) {
        throw new Error('Missing value for --cwd. Provide a directory path.');
      }
      cwd = next;
      index += 1;
    } else if (arg === '--framework') {
      framework = parseEnumValue(arg, readValue(argv, index, '--framework'), frameworkValues);
      index += 1;
    } else if (arg === '--styling') {
      styling = parseEnumValue(arg, readValue(argv, index, '--styling'), stylingValues);
      index += 1;
    } else if (arg === '--design-system') {
      designSystem = parseEnumValue(arg, readValue(argv, index, '--design-system'), designSystemValues);
      index += 1;
    } else if (arg === '--src-path') {
      srcPath = readValue(argv, index, '--src-path');
      index += 1;
    } else if (arg === '--component-path') {
      componentPath = readValue(argv, index, '--component-path');
      index += 1;
    } else if (arg === '--dev-command') {
      devCommand = readValue(argv, index, '--dev-command');
      index += 1;
    } else if (arg === '--port') {
      port = parsePort(readValue(argv, index, '--port'));
      index += 1;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--staged') {
      staged = true;
    } else if (arg === '--preview') {
      preview = true;
    } else if (arg === '--tracker') {
      const next = readValue(argv, index, '--tracker', 'Use github or linear.');
      if (next === 'github' || next === 'linear') {
        tracker = next;
      } else {
        throw new Error(`Invalid tracker "${next}". Use github or linear.`);
      }
      index += 1;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown flag "${arg}". Use --help to see supported options.`);
    } else if (!command) {
      command = arg;
    } else {
      throw new Error(`Unexpected argument "${arg}". Use --help to see supported options.`);
    }
  }

  return {
    command,
    cwd,
    json,
    help,
    staged,
    preview,
    tracker,
    framework,
    styling,
    designSystem,
    srcPath,
    componentPath,
    devCommand,
    port,
  };
}

function help(): string {
  return `Usage: threadline <command> [options]

Global flags:
  -h, --help       Show this help message
  --cwd <path>     Run against a different working directory
  --json           Emit JSON output when supported

Commands:
  init             Write .threadline config files and install hooks
                   Add --preview to inspect the inferred config without writing files.
                   Use --framework <value>, --styling <value>, --design-system <value>,
                   --src-path <path>, --component-path <path>, --dev-command <value>,
                   and --port <number> to override common init settings.
  validate         Validate source files against Threadline boundaries
                   Add --staged to limit validation to staged files.
  scan-handoffs    Extract handoff() records for tracker export
  export-handoffs  Shape canonical handoff records for a tracker
                   Use --tracker github|linear to choose the adapter.
  install-hooks    Install the local pre-push validation hook
`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function readValue(argv: string[], index: number, flag: string, hint?: string): string {
  const next = argv[index + 1];
  if (next === undefined || next.startsWith('-')) {
    const suffix = hint ? ` ${hint}` : '';
    throw new Error(`Missing value for ${flag}.${suffix}`);
  }
  return next;
}

function parseEnumValue<const T extends readonly string[]>(flag: string, value: string, allowed: T): T[number] {
  if (allowed.includes(value)) {
    return value;
  }
  throw new Error(`Invalid value for ${flag}: "${value}". Use ${allowed.join(', ')}.`);
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid value for --port: "${value}". Use a positive integer.`);
  }
  return port;
}

const entrypoint = fileURLToPath(new URL(import.meta.url));
if (process.argv[1] === entrypoint) {
  process.exitCode = await run();
}
