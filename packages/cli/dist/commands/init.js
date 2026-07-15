import { join } from 'node:path';
import { generateBoundariesMarkdown } from '../generators/boundaries.js';
import { generateConfigYaml } from '../generators/config.js';
import { generateDesignSystemMarkdown } from '../generators/design-system.js';
import { generateSkillMarkdown } from '../generators/skill.js';

import { writeTextFile } from '../utils/fs.js';
import { formatInitSummary, resolveInitSettings } from './init-resolution.js';
import { installHooks,                         } from './install-hooks.js';

export async function initProject(options             )                      {
  const settings = await resolveInitSettings({
    cwd: options.cwd,
    overrides: options.overrides,
  });
  const summary = formatInitSummary(settings);
  const { configInput, detected } = settings;
  const resolvedDesignSystem =
    configInput.designSystem === detected.designSystem.library
      ? detected.designSystem
      : {
          library: configInput.designSystem,
          importPath: configInput.designSystemImportPath,
        };

  const files = new Map                ([
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
    [...files.entries()].map(([path, contents]) => writeTextFile(join(options.cwd, path), contents)),
  );

  const hook = await installHooks({ cwd: options.cwd });
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

export function formatInitResult(result            )         {
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
