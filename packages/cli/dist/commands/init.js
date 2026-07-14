import { join } from 'node:path';
import { detectDesignSystem } from '../detectors/components.js';
import { detectFramework } from '../detectors/framework.js';
import { detectStyling } from '../detectors/styling.js';
import { generateBoundariesMarkdown } from '../generators/boundaries.js';
import { generateConfigYaml } from '../generators/config.js';
import { generateDesignSystemMarkdown } from '../generators/design-system.js';
import { generateSkillMarkdown } from '../generators/skill.js';
import { writeTextFile } from '../utils/fs.js';
import { installHooks,                         } from './install-hooks.js';

export async function initProject(options             )                      {
  const [framework, styling, designSystem] = await Promise.all([
    detectFramework(options.cwd),
    detectStyling(options.cwd),
    detectDesignSystem(options.cwd),
  ]);

  const files = new Map                ([
    [
      '.threadline/config.yaml',
      generateConfigYaml({
        framework: framework.framework,
        srcPath: framework.srcPath,
        componentPath: framework.componentPath,
        devCommand: framework.devCommand,
        port: framework.port,
        styling: styling.strategy,
        tailwindConfig: styling.tailwindConfig,
        designSystem: designSystem.library,
        designSystemImportPath: designSystem.importPath,
      }),
    ],
    ['.threadline/boundaries.md', generateBoundariesMarkdown()],
    ['.threadline/design-system.md', generateDesignSystemMarkdown(designSystem)],
    ['.threadline/skill.md', generateSkillMarkdown()],
  ]);

  await Promise.all(
    [...files.entries()].map(([path, contents]) => writeTextFile(join(options.cwd, path), contents)),
  );

  const hook = await installHooks({ cwd: options.cwd });
  return {
    configPath: '.threadline/config.yaml',
    filesWritten: [...files.keys()],
    hook,
    detected: {
      framework: framework.framework,
      styling: styling.strategy,
      designSystem: designSystem.library,
    },
  };
}

export function formatInitResult(result            )         {
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
