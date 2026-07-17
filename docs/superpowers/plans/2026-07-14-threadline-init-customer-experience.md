# Threadline Init Customer Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `threadline init` feel trustworthy and low-friction for new users by auto-detecting the repo shape, showing a concise summary of what will be written, and exposing only a small set of useful override flags.

**Architecture:** Keep detection in code, not in a conversational wizard. Add a tiny resolution layer that merges detector output with explicit overrides, then reuse that same resolved state for file generation, summary output, and help text. The customer-facing story should stay simple: run `threadline init`, inspect the summary, and only reach for flags when the repo is unusual or the detector guessed wrong.

**Tech Stack:** TypeScript in the `packages/cli` workspace package, Node.js ESM, `node:test`, existing CLI detectors/generators, Markdown docs.

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

### Task 1: Add a shared init-resolution layer and ADR

**Files:**
- Create: `packages/cli/src/commands/init-resolution.ts`
- Create: `packages/cli/test/init-resolution.test.mjs`
- Create: `docs/adr/0006-init-detection-and-overrides.md`
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/types.ts`

**Interfaces:**
- Consumes: `detectFramework(cwd)`, `detectStyling(cwd)`, `detectDesignSystem(cwd)`, `ConfigInput`
- Produces: `mergeInitSettings(detected, overrides)`, `resolveInitSettings(options)`, `formatInitSummary(result)`, and an `InitSettings` shape that carries detected values, explicit overrides, and summary lines

- [ ] **Step 1: Write the failing resolver test**

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeInitSettings } from '../dist/commands/init-resolution.js';

test('mergeInitSettings prefers explicit overrides over detector output', () => {
  const result = mergeInitSettings(
    {
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
    },
    {
      framework: 'vite',
      styling: 'css-modules',
      designSystem: 'none',
      srcPath: 'app',
      componentPath: 'ui',
      devCommand: 'pnpm dev',
      port: 4173,
    },
  );

  assert.equal(result.configInput.framework, 'vite');
  assert.equal(result.configInput.srcPath, 'app');
  assert.equal(result.configInput.componentPath, 'ui');
  assert.equal(result.configInput.devCommand, 'pnpm dev');
  assert.equal(result.configInput.port, 4173);
  assert.deepEqual(result.overridesApplied, [
    'framework',
    'styling',
    'designSystem',
    'srcPath',
    'componentPath',
    'devCommand',
    'port',
  ]);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test packages/cli/test/init-resolution.test.mjs`

Expected: FAIL because `packages/cli/src/commands/init-resolution.ts` does not exist yet.

- [ ] **Step 3: Implement the shared resolution helper**

```ts
export interface InitOverrides {
  framework?: 'nextjs' | 'vite' | 'cra' | 'remix' | 'custom';
  styling?: 'tailwind' | 'styled-components' | 'emotion' | 'css-modules' | 'plain-css';
  designSystem?: 'shadcn' | 'mui' | 'antd' | 'radix' | 'custom' | 'none';
  srcPath?: string;
  componentPath?: string;
  devCommand?: string;
  port?: number;
}

export interface InitSettings {
  configInput: ConfigInput;
  overridesApplied: string[];
  summaryLines: string[];
}

export function mergeInitSettings(
  detected: {
    framework: FrameworkDetection;
    styling: StylingDetection;
    designSystem: DesignSystemDetection;
  },
  overrides?: InitOverrides,
): InitSettings;

export async function resolveInitSettings(options: {
  cwd: string;
  overrides?: InitOverrides;
}): Promise<InitSettings>;

export function formatInitSummary(result: InitSettings): string;
```

The helper should:
- use the existing detectors for framework, styling, and design system
- merge explicit overrides only for the common knobs surfaced in the CLI
- keep the generated config valid under `specs/config-schema.md`
- include a short summary that says what was detected, what was overridden, and where the config was written

- [ ] **Step 4: Write and run the ADR draft**

Create `docs/adr/0006-init-detection-and-overrides.md` with the decision that `threadline init` stays code-driven, prints a concise summary, and uses explicit flags only for the small set of high-value overrides. The ADR should note the trade-off: no prompt-heavy wizard, but a clearer and faster first-run path.

Add a short verification pass by reading the ADR for consistency with the helper shape and the existing `specs/config-schema.md` constraints.

- [ ] **Step 5: Run the focused resolver test again**

Run: `node --test packages/cli/test/init-resolution.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/init-resolution.ts packages/cli/src/commands/init.ts packages/cli/src/types.ts packages/cli/test/init-resolution.test.mjs docs/adr/0006-init-detection-and-overrides.md
git commit -m "feat(cli): add init resolution layer"
```

### Task 2: Wire the init UX into the CLI surface

**Files:**
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/test/commands.test.mjs`

**Interfaces:**
- Consumes: `resolveInitSettings(options)`, `formatInitSummary(result)`, the existing `run(argv)` entrypoint
- Produces: `threadline init --preview`, override flags for framework/style/design-system/source paths/dev command/port, and summary output that names the applied detection and overrides

- [ ] **Step 1: Write the failing CLI tests**

```ts
test('threadline init preview prints the resolved summary without writing files', async () => {
  const cwd = await fixture({
    'package.json': JSON.stringify({ dependencies: { next: '^15.0.0', tailwindcss: '^4.0.0' } }),
    'next.config.js': 'module.exports = {}',
  });
  await execFile('git', ['init'], { cwd });

  const result = await runCli(['init', '--preview'], cwd);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Detected nextjs, tailwind, shadcn/);
  assert.match(result.stdout, /Preview only/);
  await assert.rejects(stat(join(cwd, '.threadline/config.yaml')));
  assert.equal(result.stderr, '');
});

test('threadline init accepts explicit overrides for common knobs', async () => {
  const cwd = await fixture({
    'package.json': JSON.stringify({ dependencies: { next: '^15.0.0' } }),
    'next.config.js': 'module.exports = {}',
  });
  await execFile('git', ['init'], { cwd });

  const result = await runCli([
    'init',
    '--framework',
    'vite',
    '--styling',
    'css-modules',
    '--design-system',
    'none',
    '--src-path',
    'app',
    '--component-path',
    'components',
    '--dev-command',
    'pnpm dev',
    '--port',
    '4173',
  ], cwd);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Applied overrides: framework, styling, designSystem, srcPath, componentPath, devCommand, port/);
  assert.match(await readFile(join(cwd, '.threadline/config.yaml'), 'utf8'), /framework: "vite"/);
});
```

- [ ] **Step 2: Run the package suite and verify it fails before the wiring lands**

Run: `npm test --prefix packages/cli`

Expected: FAIL because the CLI does not yet understand the new init flags or preview mode.

- [ ] **Step 3: Add the flag parsing and init wiring**

```ts
if (args.command === 'init') {
  const result = await initProject({
    cwd: args.cwd,
    preview: args.preview,
    overrides: {
      framework: args.framework,
      styling: args.styling,
      designSystem: args.designSystem,
      srcPath: args.srcPath,
      componentPath: args.componentPath,
      devCommand: args.devCommand,
      port: args.port,
    },
  });
  process.stdout.write(formatInitSummary(result));
  return 0;
}
```

`packages/cli/src/index.ts` should also add `--help` text that advertises the init override flags and `--preview`, and it should keep rejecting unknown flags and stray positional arguments.

- [ ] **Step 4: Run the package suite and verify it passes**

Run: `npm test --prefix packages/cli`

Expected: pass with the new init behavior, preview mode, and help surface.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/commands/init.ts packages/cli/test/commands.test.mjs
git commit -m "feat(cli): wire init preview and overrides"
```

### Task 3: Document the init flow for customers

**Files:**
- Modify: `README.md`
- Modify: `packages/cli/SPEC.md`

**Interfaces:**
- Consumes: the new init summary, preview mode, and explicit override flags
- Produces: customer-facing docs that explain what `threadline init` does on a fresh repo, when to use `--preview`, and which flags are worth reaching for

- [ ] **Step 1: Update the README with the customer path**

```md
## Get started
pnpm add -D @threadline/cli
npx threadline init

Threadline detects the repo shape, prints a summary of what it found, and writes `.threadline/config.yaml` plus the local guidance files. Use `--preview` when you want to inspect the proposed config first, and use the override flags only when the detector missed something specific about the repo.
```

- [ ] **Step 2: Update the CLI package spec**

Add a short `threadline init` section to `packages/cli/SPEC.md` that explains:
- the automatic detection path
- the summary line the user sees before files are written
- `--preview` as the no-write check
- the supported override flags and why they exist

Keep the rest of the CLI contract unchanged.

- [ ] **Step 3: Run the CLI suite and a diff sanity check**

Run:

```bash
npm test --prefix packages/cli
git diff --check
```

Expected: both pass, and the docs read as a short customer-facing guide rather than an internal implementation note.

- [ ] **Step 4: Commit**

```bash
git add README.md packages/cli/SPEC.md
git commit -m "docs: clarify threadline init ux"
```
