import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(moduleDir, '..', 'templates');

export const templateNames = [
  'base-skill.md',
  'git-workflow.md',
  'handoff-workflow.md',
  'linear-handoff.md',
  'plan-execute.md',
  'state-boundaries.md',
  'validation-workflow.md'
];

export function listTemplateNames() {
  return [...templateNames];
}

export function getTemplatePath(templateName) {
  if (!templateNames.includes(templateName)) {
    throw new Error(`Unknown skill template: ${templateName}`);
  }

  return join(templatesDir, templateName);
}

export function readTemplate(templateName) {
  return readFileSync(getTemplatePath(templateName), 'utf8');
}

export function readAllTemplates() {
  return Object.fromEntries(templateNames.map((name) => [name, readTemplate(name)]));
}

export function composeTemplateBundle(templateOrder = templateNames) {
  return templateOrder.map((name) => readTemplate(name).trimEnd()).join('\n\n');
}
