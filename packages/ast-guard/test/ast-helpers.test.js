import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSourceFile, walkAst } from '../src/parsers/ast.js';

test('parseSourceFile preserves parser metadata for downstream validators', () => {
  const ast = parseSourceFile([
    'export function Example() {',
    '  return <button className="px-4">Save</button>;',
    '}',
  ].join('\n'));

  assert.equal(ast.type, 'File');
  assert.equal(ast.program.type, 'Program');
  assert.ok(Array.isArray(ast.tokens));
});

test('walkAst skips non-semantic metadata and still reaches nested semantic nodes', () => {
  const ast = parseSourceFile([
    'const value = call({',
    "  title: 'Hello',",
    '});',
  ].join('\n'));

  const visitedTypes = [];

  walkAst(ast, (node) => {
    visitedTypes.push(node.type);
  });

  assert.ok(visitedTypes.includes('Program'));
  assert.ok(visitedTypes.includes('CallExpression'));
  assert.ok(visitedTypes.includes('ObjectExpression'));
  assert.ok(visitedTypes.includes('StringLiteral'));
  assert.ok(!visitedTypes.includes('Token'));
});
