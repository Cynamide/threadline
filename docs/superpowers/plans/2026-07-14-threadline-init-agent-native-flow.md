# Threadline Init Agent-Native Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `threadline init` behave like guided setup for a real repo: detect what can be inferred, ask only about uncertain parts, validate the answers, confirm the result, and then write the local Threadline files.

**Architecture:** Keep init agent-native and stateful. Build a small interactive resolution layer that turns detector output plus user responses into a validated config proposal, then reuse that same proposal for summary text, confirmation, and file generation. The CLI should feel calm and brief: detect, clarify uncertainty, confirm, write.

**Tech Stack:** TypeScript in `packages/cli`, Node.js ESM, `node:test`, existing detectors and generators, local terminal prompts, Markdown docs.

## Global Constraints

- `version: "1.0"`
- `project.component_path` is relative to `project.src_path`
- `allow_new_primitives` stays `false` for this product
- `validation.pre_push` is the default enforcement point
- repo-specific overrides should stay in this file, not in the code
- required fields must be present
- enum values must be valid
- paths must be relative
- ports must be valid numbers

---

### Task 1: Replace init resolution with an interactive agent-guided flow

**Files:**
- Create: `packages/cli/src/commands/init-flow.ts`
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/types.ts`
- Modify: `docs/adr/0006-init-detection-and-overrides.md`
- Modify: `packages/cli/test/init-flow.test.mjs`

**Interfaces:**
- Consumes: `detectFramework(cwd)`, `detectStyling(cwd)`, `detectDesignSystem(cwd)`, `ConfigInput`
- Produces: `buildInitProposal(detected)`, `clarifyInitProposal(proposal, answer)`, `finalizeInitProposal(proposal)`, and a proposal shape that carries detected values, uncertain fields, user answers, and a validated config input

- [ ] **Step 1: Write the failing proposal test**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInitProposal, clarifyInitProposal } from '../dist/commands/init-flow.js';

test('buildInitProposal marks uncertain fields and keeps confident defaults', () => {
  const proposal = buildInitProposal({
    framework: {
      framework: 'nextjs',
      srcPath: 'src',
      componentPath: 'components',
      devCommand: 'npm run dev',
      port: 3000,
      reasons: ['found Next.js dependency or config'],
    },
    styling: {
      strategy: 'tailwind',
      tailwindConfig: 'tailwind.config.ts',
      reasons: ['found Tailwind dependency or config'],
    },
    designSystem: {
      library: 'shadcn',
      importPath: '@/components/ui',
    },
  });

  assert.equal(proposal.confident.framework, 'nextjs');
  assert.deepEqual(proposal.uncertainFields, ['componentPath']);
});

test('clarifyInitProposal accepts a natural-language correction and validates it', () => {
  const proposal = clarifyInitProposal(
    buildInitProposal({
      framework: {
        framework: 'nextjs',
        srcPath: 'src',
        componentPath: 'components',
        devCommand: 'npm run dev',
        port: 3000,
        reasons: ['found Next.js dependency or config'],
      },
      styling: {
        strategy: 'tailwind',
        tailwindConfig: 'tailwind.config.ts',
        reasons: ['found Tailwind dependency or config'],
      },
      designSystem: {
        library: 'shadcn',
        importPath: '@/components/ui',
      },
    }),
    { field: 'componentPath', answer: 'src/ui' },
  );

  assert.equal(proposal.resolved.configInput.componentPath, 'ui');
});
```

- [ ] **Step 2: Run the focused proposal test and verify it fails**

Run: `node --test packages/cli/test/init-flow.test.mjs`

Expected: FAIL because `packages/cli/src/commands/init-flow.ts` does not exist yet.

- [ ] **Step 3: Implement the interactive init-flow helper**

```ts
export interface InitProposal {
  detected: DetectedInitSettings;
  confident: {
    framework?: Framework;
    styling?: StylingStrategy;
    designSystem?: DesignSystemLibrary;
    srcPath?: string;
    componentPath?: string;
    devCommand?: string;
    port?: number;
  };
  uncertainFields: Array<'framework' | 'styling' | 'designSystem' | 'srcPath' | 'componentPath' | 'devCommand' | 'port'>;
  summaryLines: string[];
}

export function buildInitProposal(detected: DetectedInitSettings): InitProposal;

export function clarifyInitProposal(
  proposal: InitProposal,
  answer: { field: string; answer: string },
): InitProposal;

export function finalizeInitProposal(proposal: InitProposal): {
  configInput: ConfigInput;
  summaryLines: string[];
};
```

The helper should:
- use the existing detectors for framework, styling, and design system
- treat confident values as defaults and uncertain values as questions
- normalize component paths relative to the selected source root
- validate paths, ports, required fields, and enum values before finalization
- produce summary lines that tell the user what was detected, what is uncertain, and what will be written

- [ ] **Step 4: Update the ADR to describe the agent-native init decision**

Replace the current code-driven/override-centric ADR language with the agent-native flow:

- init stays guided by detection
- uncertainty is resolved through short interactive clarification
- a final confirmation happens before write
- preview and override flags are not part of the primary customer flow

Add a short verification pass by reading the ADR against the spec and the schema constraints in `specs/config-schema.md`.

- [ ] **Step 5: Run the focused proposal test again**

Run: `node --test packages/cli/test/init-flow.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/init-flow.ts packages/cli/src/commands/init.ts packages/cli/src/types.ts packages/cli/test/init-flow.test.mjs docs/adr/0006-init-detection-and-overrides.md
git commit -m "feat(cli): add agent-native init flow"
```

### Task 2: Wire the interactive flow into the CLI entrypoint

**Files:**
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/test/commands.test.mjs`

**Interfaces:**
- Consumes: `buildInitProposal`, `clarifyInitProposal`, `finalizeInitProposal`, the existing `run(argv)` entrypoint
- Produces: an init command that detects, clarifies uncertainty, confirms the result, and writes files without relying on `--preview` or init override flags as part of the normal path

- [ ] **Step 1: Write the failing CLI tests**

```ts
test('threadline init shows a summary, asks only about uncertainty, and confirms before write', async () => {
  const cwd = await fixture({
    'package.json': JSON.stringify({ dependencies: { next: '^15.0.0' } }),
    'next.config.js': 'module.exports = {}',
    'src/components/ui/Button.tsx': 'export function Button() { return null; }',
  });
  await execFile('git', ['init'], { cwd });

  const result = await runCli(['init'], cwd, {
    input: 'src/ui\nconfirm\n',
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Detected nextjs, tailwind, shadcn/);
  assert.match(result.stdout, /I’m not fully sure about/);
  assert.match(result.stdout, /Confirm this config before writing/);
  assert.equal(result.stderr, '');
});
```

- [ ] **Step 2: Run the package suite and verify it fails before wiring lands**

Run: `npm test --prefix packages/cli`

Expected: FAIL because `init` still uses the old non-interactive path.

- [ ] **Step 3: Add the init command wiring and prompt loop**

```ts
if (args.command === 'init') {
  const result = await initProject({ cwd: args.cwd });
  process.stdout.write(formatInitResult(result));
  return 0;
}
```

Replace the simple path with an interactive loop that:
- prints the proposed summary
- asks only about unresolved fields
- validates each answer through the proposal helper
- prints a final confirmation
- writes files only after confirmation

- [ ] **Step 4: Run the package suite and verify it passes**

Run: `npm test --prefix packages/cli`

Expected: pass with the new interactive init flow and the updated help surface.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/commands/init.ts packages/cli/test/commands.test.mjs
git commit -m "feat(cli): wire agent-native init flow"
```

### Task 3: Align customer-facing docs with the new init UX

**Files:**
- Modify: `README.md`
- Modify: `packages/cli/SPEC.md`

**Interfaces:**
- Consumes: the new init summary, clarification loop, and confirmation flow
- Produces: documentation that tells a new user how `threadline init` works without mentioning the implementation details of the prompt engine

- [ ] **Step 1: Draft the README update**

Add a short section near the top of `README.md` that explains:
- `threadline init` is agent-native
- the tool detects the repo shape first
- it asks only about uncertain parts
- it confirms the resolved config before writing files

- [ ] **Step 2: Update the CLI package spec**

Revise `packages/cli/SPEC.md` so the `threadline init` section describes:
- detection
- agent-guided clarification
- final confirmation
- writing files after validation

Remove the old preview/flag-centric wording from the primary customer flow.

- [ ] **Step 3: Run a docs sanity check**

Run: `git diff --check -- README.md packages/cli/SPEC.md`

Expected: clean diff check.

- [ ] **Step 4: Commit**

```bash
git add README.md packages/cli/SPEC.md
git commit -m "docs: align init docs with agent-native flow"
```
