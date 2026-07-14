# AST Traversal Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the generic AST traversal logic out of `packages/ast-guard/src/parsers/handoff.js` into its own deep module so handoff parsing stays focused and the shared traversal seam has one owner.

**Architecture:** Create one shared AST traversal module and make `handoff.js`, `imports.js`, and `styling.js` consume it through a single seam. Keep the public validation behavior unchanged; this is a locality and depth improvement, not a behavior change. Tests should exercise the new seam and confirm the existing parser and validator outputs still match.

**Tech Stack:** Node.js ESM, TypeScript-transpiled package outputs, `node:test`, `@babel/parser`

## Global Constraints

- Keep the existing validation outputs and line/column metadata unchanged.
- Keep the current parser and validator public surfaces intact unless a task explicitly updates them.
- Preserve the existing `npm test --prefix packages/ast-guard` test workflow.
- Use the existing AST parser dependency (`@babel/parser`); do not add a new parser dependency.

---

### Task 1: Extract the shared AST traversal module

**Files:**
- Create: `packages/ast-guard/src/parsers/ast.js`
- Create: `packages/ast-guard/test/ast-helpers.test.js`
- Modify: `packages/ast-guard/src/parsers/handoff.js`
- Modify: `packages/ast-guard/src/parsers/imports.js`
- Modify: `packages/ast-guard/src/parsers/styling.js`

**Interfaces:**
- Consumes: `parseSourceFile(source)`, `walkAst(node, visitor)`, and the existing AST node shapes used by the validators.
- Produces: a shared AST module that owns traversal and parsing, while `handoff.js` keeps only handoff-specific parsing.

- [ ] **Step 1: Add a failing test for the new seam**

```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSourceFile, walkAst } from '../src/parsers/ast.js';

test('AST helpers parse and walk a source file', () => {
  const ast = parseSourceFile('const value = 1;');
  const types = [];

  walkAst(ast, (node) => {
    types.push(node.type);
  });

  assert.ok(types.includes('Program'));
  assert.ok(types.includes('VariableDeclaration'));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test packages/ast-guard/test/ast-helpers.test.js`

Expected: FAIL because `packages/ast-guard/src/parsers/ast.js` does not exist yet.

- [ ] **Step 3: Implement the shared AST module and update the consumers**

```javascript
// packages/ast-guard/src/parsers/ast.js
import { parse } from '@babel/parser';

export function parseSourceFile(source) {
  return parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
    ranges: true,
    tokens: true,
  });
}

export function walkAst(node, visitor) {
  visit(node, null, null);

  function visit(current, parent, key) {
    if (!current || typeof current !== 'object') return;
    if (Array.isArray(current)) {
      for (const item of current) visit(item, parent, key);
      return;
    }

    if (typeof current.type === 'string') {
      visitor(current, parent, key);
    }

    for (const [childKey, value] of Object.entries(current)) {
      if (shouldSkipChild(childKey)) continue;
      visit(value, current, childKey);
    }
  }

  function shouldSkipChild(key) {
    return (
      key === 'loc' ||
      key === 'start' ||
      key === 'end' ||
      key === 'range' ||
      key === 'tokens' ||
      key === 'comments' ||
      key === 'errors' ||
      key === 'extra' ||
      key === 'leadingComments' ||
      key === 'innerComments' ||
      key === 'trailingComments'
    );
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test --prefix packages/ast-guard`

Expected: pass with the existing validator suite plus the new AST helper coverage.

- [ ] **Step 5: Commit**

```bash
git add packages/ast-guard/src/parsers/ast.js packages/ast-guard/src/parsers/handoff.js packages/ast-guard/src/parsers/imports.js packages/ast-guard/src/parsers/styling.js packages/ast-guard/test/ast-helpers.test.js
git commit -m "refactor(ast-guard): extract shared ast traversal"
```

### Task 2: Lock the seam with regression coverage

**Files:**
- Modify: `packages/ast-guard/test/ast-guard.test.js`

**Interfaces:**
- Consumes: the new AST helper module and the existing validator entry points.
- Produces: tests that prove the traversal seam is reusable and that existing parser/validator behavior is unchanged.

- [ ] **Step 1: Add regression coverage for handoff parsing and validator consumers**

```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHandoffs } from '../src/parsers/handoff.js';
import { detectForbiddenImportsWithConfig } from '../src/parsers/imports.js';
import { validateStylingScope } from '../src/parsers/styling.js';

test('handoff parsing still finds object-form calls', () => {
  const handoffs = parseHandoffs(
    "import { handoff } from '@threadline/runtime';\nconst save = handoff({ id: 'save', title: 'Save', fallback: () => null });",
    'src/example.tsx',
  );

  assert.equal(handoffs.length, 1);
  assert.equal(handoffs[0].id, 'save');
});

test('forbidden imports still report the same violation shape', () => {
  const violations = detectForbiddenImportsWithConfig(
    "import axios from 'axios';",
    'src/example.tsx',
    [],
    ['axios'],
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].code, 'STATE002');
});

test('styling scope validation still reports className violations', () => {
  const violations = validateStylingScope(
    "export function Example() { return <div className='bg-red-500 bad-class' />; }",
    'src/example.tsx',
    'tailwind',
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].code, 'STYLE002');
});
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `npm test --prefix packages/ast-guard`

Expected: all ast-guard tests pass, including the new regression coverage.

- [ ] **Step 3: Commit**

```bash
git add packages/ast-guard/test/ast-helpers.test.js packages/ast-guard/test/ast-guard.test.js
git commit -m "test(ast-guard): cover shared ast traversal"
```
