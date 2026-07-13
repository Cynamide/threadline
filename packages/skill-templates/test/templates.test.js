import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  composeTemplateBundle,
  listTemplateNames,
  readAllTemplates,
  readTemplate,
  templateNames
} from '../src/index.js';

const templatesDir = resolve(process.cwd(), 'templates');
const forbiddenTerms = [
  'prompt pack',
  '\\bscript\\b',
  'policy',
  'checklist',
  'estimate',
  'roadmap',
  '\\bnote\\b',
  '\\bcomment\\b',
  '\\bsummary\\b',
  'guideline',
  'preference',
  'style note'
];

describe('skill templates package', () => {
  it('exports the canonical template names', () => {
    assert.deepEqual(listTemplateNames(), templateNames);
  });

  it('keeps the template directory complete and ordered', () => {
    assert.deepEqual(readdirSync(templatesDir).filter((name) => name.endsWith('.md')), templateNames);
  });

  it('loads every template file', () => {
    const templates = readAllTemplates();

    assert.deepEqual(Object.keys(templates), templateNames);
    for (const name of templateNames) {
      assert.equal(typeof templates[name], 'string');
      assert.ok(templates[name].trim().length > 0, `${name} should not be empty`);
    }
  });

  it('keeps the wording direct and glossary-aligned', () => {
    const baseSkill = readTemplate('base-skill.md');
    const bundle = composeTemplateBundle();

    assert.match(baseSkill, /Read the repo's docs, config, and nearby code before editing\./);
    assert.match(baseSkill, /Use the repo vocabulary: skill, plan, agent brief, and boundary rule\./);
    assert.match(baseSkill, /Use `handoff\(\)` for work that should remain engineer-owned\./);
    assert.match(baseSkill, /Run the relevant validation before you say the work is done\./);
    assert.match(baseSkill, /keep the agent brief portable/i);

    for (const term of forbiddenTerms) {
      const pattern = term.startsWith('\\b') ? new RegExp(term, 'i') : new RegExp(term, 'i');
      assert.equal(pattern.test(bundle), false, `bundle should not contain "${term}"`);
    }
  });

  it('keeps the bundle readable as one copied skill file', () => {
    const bundle = composeTemplateBundle();

    assert.ok(bundle.includes('# Base Skill'));
    assert.ok(bundle.includes('# Validation Workflow'));
    assert.ok(bundle.length > readFileSync(resolve(templatesDir, 'base-skill.md'), 'utf8').length);
  });
});
