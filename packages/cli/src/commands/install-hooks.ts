import { chmod, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exists, writeTextFile } from '../utils/fs.js';

export interface InstallHooksOptions {
  cwd: string;
}

export interface InstallHooksResult {
  installed: boolean;
  hookPath: string;
  updated: boolean;
}

const hookBody = `#!/bin/sh
# threadline pre-push hook
threadline validate --staged
`;

export async function installHooks(options: InstallHooksOptions): Promise<InstallHooksResult> {
  const hookPath = join(options.cwd, '.git/hooks/pre-push');
  if (!(await exists(join(options.cwd, '.git')))) {
    return { installed: false, hookPath: '.git/hooks/pre-push', updated: false };
  }

  let updated = true;
  if (await exists(hookPath)) {
    const current = await readFile(hookPath, 'utf8');
    updated = current !== hookBody;
  }

  if (updated) {
    await writeTextFile(hookPath, hookBody, 0o755);
  }
  await chmod(hookPath, 0o755);

  return { installed: true, hookPath: '.git/hooks/pre-push', updated };
}

export function formatInstallHooksResult(result: InstallHooksResult): string {
  if (!result.installed) return 'Threadline hook not installed: .git directory was not found.';
  return result.updated
    ? `Threadline pre-push hook installed at ${result.hookPath}.`
    : `Threadline pre-push hook already current at ${result.hookPath}.`;
}
