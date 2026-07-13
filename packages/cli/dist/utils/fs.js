import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';

export async function exists(path        )                   {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJson                             (path        )                    {
  if (!(await exists(path))) return null;
  return JSON.parse(await readFile(path, 'utf8'))     ;
}

export async function writeTextFile(path        , contents        , mode         )                {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, mode === undefined ? undefined : { mode });
}

export async function findFiles(
  root        ,
  options                                                     = {},
)                    {
  const files           = [];
  const extensions = options.extensions ?? [];
  const ignored = new Set(['node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);

  async function visit(dir        )                {
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

export async function firstExisting(root        , candidates          )                         {
  for (const candidate of candidates) {
    if (await exists(join(root, candidate))) return candidate;
  }
  return null;
}

export async function isDirectory(path        )                   {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export function toPosix(path        )         {
  return path.split(sep).join('/');
}
