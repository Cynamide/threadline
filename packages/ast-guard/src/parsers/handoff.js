import { getLineColumn } from '../location.js';
import { parseSourceFile, walkAst } from './ast.js';

const CALLEE = 'handoff';
const INVALID_CALLABLE_IDENTIFIERS = new Set([
  'false',
  'null',
  'true',
  'undefined',
  'NaN',
  'Infinity',
  'new',
  'class',
  'function',
  'void',
  'typeof',
  'delete',
  'instanceof',
  'in',
  'yield',
  'await',
]);

export function parseHandoffs(sourceCode, filePath) {
  const ast = parseSourceFile(sourceCode);
  const handoffs = [];

  walkAst(ast, (node) => {
    if (!isHandoffCall(node)) return;
    handoffs.push(parseHandoffCall(sourceCode, filePath, node));
  });

  return handoffs.sort((left, right) => left.range[0] - right.range[0]);
}

function isHandoffCall(node) {
  return (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') && isHandoffCallee(node.callee);
}

function isHandoffCallee(callee) {
  return callee?.type === 'Identifier' && callee.name === CALLEE;
}

function parseHandoffCall(sourceCode, filePath, node) {
  const callLocation = getLineColumn(sourceCode, node.callee?.start ?? node.start ?? 0);
  const firstArgument = node.arguments[0];
  const objectForm = firstArgument?.type === 'ObjectExpression';
  const properties = objectForm ? parseObjectProperties(sourceCode, firstArgument) : {};

  return {
    filePath,
    line: callLocation.line,
    column: callLocation.column,
    objectForm,
    range: [node.start ?? 0, node.end ?? 0],
    properties,
    id: properties.id?.value,
    title: properties.title?.value,
    description: properties.description?.value,
    fallback: properties.fallback
      ? {
          raw: properties.fallback.raw,
          callable: isCallableExpression(properties.fallback.valueNode),
          line: properties.fallback.line,
          column: properties.fallback.column,
        }
      : undefined,
  };
}

function parseObjectProperties(sourceCode, objectExpression) {
  const properties = {};

  for (const property of objectExpression.properties) {
    if (property.type !== 'ObjectProperty' && property.type !== 'ObjectMethod') continue;
    if (property.type === 'ObjectProperty' && property.computed) continue;

    const key = normalizePropertyKey(property.key);
    if (!key) continue;

    const valueNode = property.type === 'ObjectMethod' ? property : property.value;
    const location = getLineColumn(sourceCode, valueNode?.start ?? property.key?.start ?? property.start ?? 0);
    const raw = sourceCode.slice(valueNode?.start ?? property.start ?? 0, valueNode?.end ?? property.end ?? 0).trim();

    properties[key] = {
      key,
      raw,
      value: decodeLiteralValue(valueNode, raw),
      line: location.line,
      column: location.column,
      valueStartIndex: valueNode?.start ?? property.start ?? 0,
      valueEndIndex: valueNode?.end ?? property.end ?? 0,
      valueNode,
    };
  }

  return properties;
}

function normalizePropertyKey(node) {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral') return decodeQuotedString(node.value);
  return undefined;
}

function decodeLiteralValue(node, raw) {
  if (!node) return undefined;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'NullLiteral') return undefined;
  if (node.type === 'TemplateLiteral') return undefined;
  if (raw === 'null') return undefined;
  return undefined;
}

function isCallableExpression(node) {
  const expression = unwrapExpression(node);
  if (!expression) return false;

  if (expression.type === 'Identifier') {
    return !INVALID_CALLABLE_IDENTIFIERS.has(expression.name);
  }

  if (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression') {
    return true;
  }

  if (expression.type === 'ObjectMethod') {
    return true;
  }

  if (expression.type === 'CallExpression' || expression.type === 'OptionalCallExpression') {
    return true;
  }

  if (expression.type === 'MemberExpression' || expression.type === 'OptionalMemberExpression') {
    return isCallableMemberExpression(expression);
  }

  if (expression.type === 'ChainExpression') {
    return isCallableExpression(expression.expression);
  }

  return false;
}

function isCallableMemberExpression(node) {
  return isCallableReference(node.object) && isCallableReference(node.property);
}

function isCallableReference(node) {
  const expression = unwrapExpression(node);
  if (!expression) return false;

  if (expression.type === 'Identifier') {
    return !INVALID_CALLABLE_IDENTIFIERS.has(expression.name);
  }

  if (expression.type === 'MemberExpression' || expression.type === 'OptionalMemberExpression') {
    return isCallableMemberExpression(expression);
  }

  if (expression.type === 'ThisExpression') {
    return true;
  }

  return false;
}

function unwrapExpression(node) {
  let current = node;

  while (current && typeof current === 'object') {
    if (
      current.type === 'ParenthesizedExpression' ||
      current.type === 'TSAsExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'TypeCastExpression'
    ) {
      current = current.expression;
      continue;
    }

    break;
  }

  return current;
}

function decodeQuotedString(value) {
  return value;
}
