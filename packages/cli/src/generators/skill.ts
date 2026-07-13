import { composeTemplateBundle } from '../generated/skill-template-bundle.js';

export function generateSkillMarkdown(): string {
  return composeTemplateBundle();
}
