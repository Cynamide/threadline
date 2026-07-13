import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { exists } from './fs.js';

export async function git(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  return exists(join(cwd, '.git'));
}

export async function stagedFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await git(['diff', '--name-only', '--cached'], cwd);
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
