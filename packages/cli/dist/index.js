#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { initProject, formatInitResult } from './commands/init.js';
import { validateProject, formatValidateResult } from './commands/validate.js';
import { scanHandoffs, formatScanHandoffsResult } from './commands/scan-handoffs.js';
import { installHooks, formatInstallHooksResult } from './commands/install-hooks.js';

export { initProject } from './commands/init.js';
export { validateProject } from './commands/validate.js';
export { scanHandoffs } from './commands/scan-handoffs.js';
export { installHooks } from './commands/install-hooks.js';

                      
                         
              
                
                  
 

export async function run(argv           = process.argv.slice(2))                  {
  const args = parseArgs(argv);
  try {
    if (args.command === 'init') {
      const result = await initProject({ cwd: args.cwd });
      process.stdout.write(args.json ? `${JSON.stringify(result, null, 2)}\n` : formatInitResult(result));
      return 0;
    }
    if (args.command === 'validate') {
      const result = await validateProject({ cwd: args.cwd, json: args.json, staged: args.staged });
      process.stdout.write(formatValidateResult(result, args.json));
      return result.valid ? 0 : 1;
    }
    if (args.command === 'scan-handoffs') {
      const result = await scanHandoffs({ cwd: args.cwd, json: args.json });
      process.stdout.write(formatScanHandoffsResult(result, args.json));
      return 0;
    }
    if (args.command === 'install-hooks') {
      const result = await installHooks({ cwd: args.cwd });
      process.stdout.write(args.json ? `${JSON.stringify(result, null, 2)}\n` : `${formatInstallHooksResult(result)}\n`);
      return result.installed ? 0 : 1;
    }

    process.stderr.write(help());
    return 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseArgs(argv          )             {
  let command                = null;
  let cwd = process.cwd();
  let json = false;
  let staged = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cwd') {
      cwd = argv[index + 1] ?? cwd;
      index += 1;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--staged') {
      staged = true;
    } else if (!command) {
      command = arg;
    }
  }

  return { command, cwd, json, staged };
}

function help()         {
  return `Usage: threadline <command> [--cwd path] [--json]

Commands:
  init             Write .threadline config files and install hooks
  validate         Validate source files against Threadline boundaries
  scan-handoffs    Extract handoff() records for tracker export
  install-hooks    Install the local pre-push validation hook
`;
}

const entrypoint = fileURLToPath(new URL(import.meta.url));
if (process.argv[1] === entrypoint) {
  process.exitCode = await run();
}
