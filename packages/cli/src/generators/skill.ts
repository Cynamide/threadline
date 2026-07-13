import { composeTemplateBundle } from '../../../skill-templates/src/index.js';

export function generateSkillMarkdown(): string {
  return composeTemplateBundle();
}
