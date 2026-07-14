#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { initProject, formatInitResult } from './commands/init.js';
import { validateProject, formatValidateResult } from './commands/validate.js';
import { scanHandoffs, formatScanHandoffsResult } from './commands/scan-handoffs.js';
import { installHooks, formatInstallHooksResult } from './commands/install-hooks.js';
import { exportHandoffs, formatExportHandoffsResult } from './commands/export-handoffs.js';

export { initProject } from './commands/init.js';
export { validateProject } from './commands/validate.js';
export { scanHandoffs } from './commands/scan-handoffs.js';
export { installHooks } from './commands/install-hooks.js';
export { exportHandoffs } from './commands/export-handoffs.js';

export async function run(argv           = process.argv.slice(2))                  {
  try {
    const args = parseArgs(argv);
    if (args.command === 'init') {
      const result = await initProject({ cwd: args.cwd });
      if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(formatInitResult(result));
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

function parseArgs(argv          )             {
  let command                = null;
  let cwd = process.cwd();
  let json = false;
  let staged = false;
  let tracker                      = 'github';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cwd') {
      cwd = argv[index + 1] ?? cwd;
      index += 1;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--staged') {
      staged = true;
    } else if (arg === '--tracker') {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error('Missing value for --tracker. Use github or linear.');
      }
      if (next === 'github' || next === 'linear') {
        tracker = next;
      } else {
        throw new Error(`Invalid tracker "${next}". Use github or linear.`);
      }
      index += 1;
    } else if (!command) {
      command = arg;
    }
  }

  return { command, cwd, json, staged, tracker };
}

function help()         {
  return `Usage: threadline <command> [--cwd path] [--json] [--tracker github|linear]

Commands:
  init             Write .threadline config files and install hooks
  validate         Validate source files against Threadline boundaries
  scan-handoffs    Extract handoff() records for tracker export
  export-handoffs  Shape canonical handoff records for a tracker
  install-hooks    Install the local pre-push validation hook
`;
}

function formatError(error         )         {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

const entrypoint = fileURLToPath(new URL(import.meta.url));
if (process.argv[1] === entrypoint) {
  process.exitCode = await run();
}
