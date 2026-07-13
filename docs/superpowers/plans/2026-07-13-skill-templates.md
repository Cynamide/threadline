# Skill Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@threadline/skill-templates` as the repository of reusable agent instructions that can be copied into downstream repos without conflicting guidance.

**Architecture:** Keep the package as content-first Markdown templates plus a small generator layer that assembles repo-specific skills from the template set. The templates should stay short, directive, and vocabulary-consistent so downstream agents get one clear behavioral model instead of overlapping rules.

**Tech Stack:** Markdown templates, TypeScript for any generator or packaging helpers, pnpm workspace, and snapshot-style tests against rendered template output.

## Global Constraints

- Keep instructions direct and unambiguous
- Prefer examples where they remove guesswork
- Keep the wording consistent across templates
- Avoid conflicting guidance between files
- The templates are documentation, not code
- The exact tracker adapter can vary by repo
- The instructions should survive repo-specific customization without falling apart
- The package holds the Markdown instructions copied into a repo's agent-facing skill file

---

### Task 1: Scaffold the template package

**Files:**
- Create: `packages/skill-templates/package.json`
- Create: `packages/skill-templates/tsconfig.json`
- Create: `packages/skill-templates/src/index.ts`
- Create: `packages/skill-templates/templates/base-skill.md`
- Create: `packages/skill-templates/templates/plan-execute.md`
- Create: `packages/skill-templates/templates/state-boundaries.md`
- Create: `packages/skill-templates/templates/handoff-workflow.md`
- Create: `packages/skill-templates/templates/linear-handoff.md`
- Create: `packages/skill-templates/templates/git-workflow.md`
- Create: `packages/skill-templates/templates/validation-workflow.md`
- Create: `packages/skill-templates/test/templates.test.ts`

**Interfaces:**
- Consumes: package-local template markdown
- Produces: exported template paths and/or concatenated skill content for downstream copy

- [ ] **Step 1: Write the package manifest and tsconfig**

```json
{
  "name": "@threadline/skill-templates",
  "version": "1.0.0",
  "private": false,
  "type": "module",
  "files": ["templates", "dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true,
    "noEmit": false
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write a test that verifies the template set exists and is non-empty**

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('skill templates', () => {
  it('includes the expected markdown files', () => {
    const dir = path.resolve('packages/skill-templates/templates');
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.md'));
    expect(files).toEqual([
      'base-skill.md',
      'git-workflow.md',
      'handoff-workflow.md',
      'linear-handoff.md',
      'plan-execute.md',
      'state-boundaries.md',
      'validation-workflow.md'
    ]);
  });
});
```

- [ ] **Step 3: Add the initial template content**

```md
# Base Skill

Read the repo before editing.
Stay inside the repo's boundary rules.
Use handoffs for deferred engineer-owned work.
Validate before pushing.
```

- [ ] **Step 4: Run the template tests**

Run: `pnpm --filter @threadline/skill-templates test`
Expected: PASS for file inventory and content checks

- [ ] **Step 5: Commit the scaffold**

```bash
git add packages/skill-templates/package.json packages/skill-templates/tsconfig.json packages/skill-templates/src packages/skill-templates/templates packages/skill-templates/test
git commit -m "feat(skill-templates): scaffold instruction templates"
```

### Task 2: Normalize template language and repo-specific guidance

**Files:**
- Modify: `packages/skill-templates/templates/*.md`
- Modify: `packages/skill-templates/src/index.ts`
- Modify: `packages/skill-templates/test/templates.test.ts`

**Interfaces:**
- Consumes: repository vocabulary and workflow requirements
- Produces: a coherent template bundle with no conflicting instructions

- [ ] **Step 1: Write tests that assert the package vocabulary is consistent**

```ts
it('uses the canonical repo language', () => {
  const base = fs.readFileSync('packages/skill-templates/templates/base-skill.md', 'utf8');
  expect(base).toContain('Read the repo before editing.');
  expect(base).toContain('Use handoffs for deferred engineer-owned work.');
  expect(base).not.toContain('TODO');
});
```

- [ ] **Step 2: Update each template to use the same canonical terms**

```md
Use `handoff` for deferred engineer-owned work.
Use `validation` for local checks before push.
Use `boundary rule` for hard edit limits.
```

- [ ] **Step 3: Keep the guidance direct, short, and copyable**

```md
When a change spans multiple files or concepts, write a plan first.
Stay inside the repo's boundary rules.
Prefer tracker-ready summaries when work leaves the local lane.
```

- [ ] **Step 4: Re-run the template tests**

Run: `pnpm --filter @threadline/skill-templates test`
Expected: template inventory and vocabulary assertions pass

- [ ] **Step 5: Commit the language pass**

```bash
git add packages/skill-templates/templates/*.md packages/skill-templates/src/index.ts packages/skill-templates/test/templates.test.ts
git commit -m "feat(skill-templates): normalize template language"
```
