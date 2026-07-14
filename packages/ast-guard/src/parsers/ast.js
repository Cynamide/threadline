import { parse } from '@babel/parser';

const SKIPPED_CHILD_KEYS = new Set([
  'loc',
  'start',
  'end',
  'range',
  'tokens',
  'comments',
  'errors',
  'extra',
  'leadingComments',
  'innerComments',
  'trailingComments',
]);

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
      if (SKIPPED_CHILD_KEYS.has(childKey)) continue;
      visit(value, current, childKey);
    }
  }
}
