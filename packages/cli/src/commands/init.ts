import { join } from 'node:path';
import { generateBoundariesMarkdown } from '../generators/boundaries.js';
import { generateConfigYaml } from '../generators/config.js';
import { generateDesignSystemMarkdown } from '../generators/design-system.js';
import { generateSkillMarkdown } from '../generators/skill.js';
import type { InitOverrides } from '../types.js';
import { writeTextFile } from '../utils/fs.js';
import { resolveInitSettings } from './init-resolution.js';
import { installHooks, type InstallHooksResult } from './install-hooks.js';

export interface InitOptions {
  cwd: string;
  overrides?: InitOverrides;
}

export interface InitResult {
  configPath: string;
  filesWritten: string[];
  hook: InstallHooksResult;
  detected: {
    framework: string;
    styling: string;
    designSystem: string;
  };
}

export async function initProject(options: InitOptions): Promise<InitResult> {
  const settings = await resolveInitSettings({
    cwd: options.cwd,
    overrides: options.overrides,
  });
  const { configInput, detected } = settings;
  const resolvedDesignSystem =
    configInput.designSystem === detected.designSystem.library
      ? detected.designSystem
      : {
          library: configInput.designSystem,
          importPath: configInput.designSystemImportPath,
        };

  const files = new Map<string, string>([
    [
      '.threadline/config.yaml',
      generateConfigYaml(configInput),
    ],
    ['.threadline/boundaries.md', generateBoundariesMarkdown()],
    ['.threadline/design-system.md', generateDesignSystemMarkdown(resolvedDesignSystem)],
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
      framework: detected.framework.framework,
      styling: detected.styling.strategy,
      designSystem: detected.designSystem.library,
    },
  };
}

export function formatInitResult(result: InitResult): string {
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
