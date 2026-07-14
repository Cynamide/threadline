import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T = Record<string, unknown>>(path: string): Promise<T | null> {
  if (!(await exists(path))) return null;
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export async function writeTextFile(path: string, contents: string, mode?: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (mode === undefined) {
    await writeFile(path, contents);
    return;
  }

  await writeFile(path, contents, { mode });
}

export async function findFiles(
  root: string,
  options: { extensions?: string[]; includeHidden?: boolean } = {},
): Promise<string[]> {
  const files: string[] = [];
  const extensions = options.extensions ?? [];
  const ignored = new Set(['node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);

  async function visit(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!options.includeHidden && entry.name.startsWith('.') && entry.name !== '.threadline') continue;
      if (entry.isDirectory()) {
        if (ignored.has(entry.name)) continue;
        await visit(join(dir, entry.name));
      } else if (entry.isFile()) {
        const absolute = join(dir, entry.name);
        if (extensions.length === 0 || extensions.includes(extname(entry.name))) {
          files.push(toPosix(relative(root, absolute)));
        }
      }
    }
  }

  await visit(root);
  return files.sort();
}

export async function firstExisting(root: string, candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await exists(join(root, candidate))) return candidate;
  }
  return null;
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export function toPosix(path: string): string {
  return path.split(sep).join('/');
}
