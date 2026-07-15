import { join } from 'node:path';
import { generateBoundariesMarkdown } from '../generators/boundaries.js';
import { generateConfigYaml } from '../generators/config.js';
import { generateDesignSystemMarkdown } from '../generators/design-system.js';
import { generateSkillMarkdown } from '../generators/skill.js';
import type { InitOverrides } from '../types.js';
import { writeTextFile } from '../utils/fs.js';
import { finalizeInitProposal, formatInitSummary, resolveInitProposal } from './init-flow.js';
import { installHooks, type InstallHooksResult } from './install-hooks.js';

export interface InitOptions {
  cwd: string;
  preview?: boolean;
  overrides?: InitOverrides;
}

export interface InitResult {
  configPath: string;
  filesWritten: string[];
  hook: InstallHooksResult;
  preview: boolean;
  summary: string;
  detected: {
    framework: string;
    styling: string;
    designSystem: string;
  };
}

export async function initProject(options: InitOptions): Promise<InitResult> {
  const proposal = await resolveInitProposal({
    cwd: options.cwd,
  });
  const summary = formatInitSummary(proposal);
  const { configInput, detected } = {
    ...finalizeInitProposal(proposal),
    detected: proposal.detected,
  };
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

export function formatInitResult(result: InitResult): string {
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
