import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runValidation as runAstValidation } from '@threadline/ast-guard';
import { loadConfig } from '../utils/config.js';
import { exists, findFiles } from '../utils/fs.js';
import { git, stagedFiles } from '../utils/git.js';

export async function validateProject(options                 )                          {
  const config = await loadConfig(options.cwd);
  const files = await filesToValidate(options.cwd, config, Boolean(options.staged));
  const fileEntries = await Promise.all(
    files.map(async (filePath) => ({
      filePath,
      source: await readSource(options.cwd, filePath, Boolean(options.staged)),
    })),
  );

  const validation = runAstValidation({
    files: fileEntries,
    config: {
      project: config.project,
      styling: config.styling,
      boundaries: config.boundaries,
      validation: config.validation,
    },
  });
  const violations = validation.violations.map((violation) => ({
    filePath: violation.filePath,
    line: violation.line ?? 1,
    column: violation.column ?? 1,
    rule: violation.code,
    message: violation.message,
  }));

  return {
    valid: validation.passed,
    filesChecked: files,
    violations,
    warnings: validation.violations
      .filter((violation) => violation.severity === 'warning')
      .map((violation) => violation.message),
  };
}

export function formatValidateResult(result                , json = false)         {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  if (result.valid) return `Threadline validation passed for ${result.filesChecked.length} file(s).\n`;
  const lines = [`Threadline validation failed with ${result.violations.length} violation(s):`];
  for (const violation of result.violations) {
    lines.push(
      `${violation.filePath}:${violation.line}:${violation.column} ${violation.rule} ${violation.message}`,
    );
  }
  return `${lines.join('\n')}\n`;
}

async function filesToValidate(cwd        , config                  , staged         )                    {
  const extensions = [...config.project.extensions, '.css', '.scss', '.sass'];
  const sourcePrefix = `${config.project.src_path.replace(/\/$/, '')}/`;
  let candidates          ;
  if (staged) {
    candidates = await stagedFiles(cwd);
  } else {
    candidates = await findFiles(join(cwd, config.project.src_path), { extensions });
  }

  let normalized = candidates;
  if (!staged) {
    normalized = candidates.map((file) => `${sourcePrefix}${file}`);
  }

  return normalized
    .filter((file) => file.startsWith(sourcePrefix))
    .filter((file) => extensions.some((extension) => file.endsWith(extension)))
    .sort();
}

async function readSource(cwd        , filePath        , staged         )                  {
  if (staged) {
    try {
      const { stdout } = await git(['show', `:${filePath}`], cwd);
      return stdout;
    } catch {
      return '';
    }
  }

  if (await exists(join(cwd, filePath))) {
    return readFile(join(cwd, filePath), 'utf8');
  }
  return '';
}
