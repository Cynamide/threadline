import { chmod, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exists, writeTextFile } from '../utils/fs.js';

const hookHeader = '#!/bin/sh';
const managedBlockStart = '# threadline managed block start';
const managedBlockEnd = '# threadline managed block end';
const managedBlock = `${managedBlockStart}
threadline validate
${managedBlockEnd}`;
const hookBody = `${hookHeader}
${managedBlock}
`;

export async function installHooks(options                     )                              {
  const hookPath = join(options.cwd, '.git/hooks/pre-push');
  if (!(await exists(join(options.cwd, '.git')))) {
    return { installed: false, hookPath: '.git/hooks/pre-push', updated: false };
  }

  let updated = true;
  if (await exists(hookPath)) {
    const current = await readFile(hookPath, 'utf8');
    updated = normalizeHook(current) !== normalizeHook(mergeHook(current));
  }

  if (updated) {
    const current = (await exists(hookPath)) ? await readFile(hookPath, 'utf8') : '';
    await writeTextFile(hookPath, mergeHook(current), 0o755);
  }
  await chmod(hookPath, 0o755);

  return { installed: true, hookPath: '.git/hooks/pre-push', updated };
}

function mergeHook(current        )         {
  const body = stripManagedBlock(current).trimEnd();
  if (!body) {
    return hookBody;
  }

  const withHeader = body.startsWith(hookHeader) ? body : `${hookHeader}\n${body}`;
  return `${withHeader}\n\n${managedBlock}\n`;
}

function stripManagedBlock(current        )         {
  if (current.trim() === '#!/bin/sh\n# threadline pre-push hook\nthreadline validate --staged') {
    return '';
  }

  const start = current.indexOf(managedBlockStart);
  const end = current.indexOf(managedBlockEnd);
  if (start === -1 || end === -1 || end < start) {
    return current;
  }

  return `${current.slice(0, start)}${current.slice(end + managedBlockEnd.length)}`;
}

function normalizeHook(value        )         {
  return value.trim().replace(/\r\n/g, '\n');
}

export function formatInstallHooksResult(result                    )         {
  if (!result.installed) {
    return 'Threadline hook not installed: .git directory was not found.';
  }

  if (result.updated) {
    return `Threadline pre-push hook installed at ${result.hookPath}.`;
  }

  return `Threadline pre-push hook already current at ${result.hookPath}.`;
}
