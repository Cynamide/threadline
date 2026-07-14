import { getLineColumn } from '../location.js';
import { isIdentifierToken, matchingTokenIndex, tokenize, tokensToSource } from '../tokenize.js';

const CALLEE = 'handoff';
const OPENERS = new Set(['(', '{', '[']);
const CLOSERS = new Set([')', '}', ']']);
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
  const tokens = tokenize(sourceCode);
  const handoffs = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!isIdentifierToken(token, CALLEE)) continue;
    if (tokens[index - 1]?.value === '.') continue;

    const openParenIndex = findCallOpenParenIndex(tokens, index + 1);
    if (openParenIndex === -1) continue;

    const closeParenIndex = matchingTokenIndex(tokens, openParenIndex, '(', ')');
    if (closeParenIndex === -1) continue;

    handoffs.push(parseHandoffCall(sourceCode, filePath, tokens, index, openParenIndex, closeParenIndex));
    index = closeParenIndex;
  }

  return handoffs;
}

function findCallOpenParenIndex(tokens, startIndex) {
  let index = startIndex;

  if (tokens[index]?.value === '<') {
    const closeAngleIndex = matchingTokenIndex(tokens, index, '<', '>');
    if (closeAngleIndex === -1) return -1;
    index = closeAngleIndex + 1;
  }

  if (tokens[index]?.value === '(') {
    return index;
  }

  return -1;
}

function parseHandoffCall(sourceCode, filePath, tokens, calleeIndex, openParenIndex, closeParenIndex) {
  const callLocation = getLineColumn(sourceCode, tokens[calleeIndex].start);
  const argumentStartIndex = openParenIndex + 1;
  const firstArgument = tokens[argumentStartIndex];
  const objectForm = firstArgument?.value === '{';
  const properties = objectForm
    ? parseObjectProperties(sourceCode, tokens, argumentStartIndex, closeParenIndex)
    : {};

  return {
    filePath,
    line: callLocation.line,
    column: callLocation.column,
    objectForm,
    range: [tokens[calleeIndex].start, tokens[closeParenIndex].end],
    properties,
    id: properties.id?.value,
    title: properties.title?.value,
    description: properties.description?.value,
    fallback: properties.fallback
      ? {
          raw: properties.fallback.raw,
          callable: isCallableExpression(
            tokens.slice(properties.fallback.valueStartIndex, properties.fallback.valueEndIndex + 1),
          ),
          line: properties.fallback.line,
          column: properties.fallback.column,
        }
      : undefined,
  };
}

function parseObjectProperties(sourceCode, tokens, openIndex, closeIndex) {
  const properties = {};
  const segments = splitTopLevelSegments(tokens, openIndex + 1, closeIndex - 1);

  for (const [segmentStart, segmentEnd] of segments) {
    const colonIndex = findTopLevelColon(tokens, segmentStart, segmentEnd);
    if (colonIndex === -1) continue;

    const keyToken = tokens[segmentStart];
    const valueStartIndex = findFirstSignificantToken(tokens, colonIndex + 1, segmentEnd);
    if (valueStartIndex === -1) continue;

    const key = normalizePropertyKey(keyToken);
    if (!key) continue;

    const valueEndIndex = findLastSignificantToken(tokens, valueStartIndex, segmentEnd);
    if (valueEndIndex === -1) continue;

    const location = getLineColumn(sourceCode, tokens[valueStartIndex].start);
    const raw = tokensToSource(tokens, sourceCode, valueStartIndex, valueEndIndex).trim();

    properties[key] = {
      key,
      raw,
      value: decodeLiteralValue(tokens[valueStartIndex], raw),
      line: location.line,
      column: location.column,
      valueStartIndex,
      valueEndIndex,
    };
  }

  return properties;
}

function splitTopLevelSegments(tokens, startIndex, endIndex) {
  const segments = [];
  let segmentStart = startIndex;
  let depth = 0;

  for (let index = startIndex; index <= endIndex; index += 1) {
    const token = tokens[index];
    if (token.type === 'string' || token.type === 'template') continue;

    if (OPENERS.has(token.value)) {
      depth += 1;
      continue;
    }

    if (CLOSERS.has(token.value)) {
      depth -= 1;
      continue;
    }

    if (token.value === ',' && depth === 0) {
      if (segmentStart <= index - 1) segments.push([segmentStart, index - 1]);
      segmentStart = index + 1;
    }
  }

  if (segmentStart <= endIndex) segments.push([segmentStart, endIndex]);
  return segments;
}

function findTopLevelColon(tokens, startIndex, endIndex) {
  let depth = 0;

  for (let index = startIndex; index <= endIndex; index += 1) {
    const token = tokens[index];
    if (token.type === 'string' || token.type === 'template') continue;

    if (OPENERS.has(token.value)) {
      depth += 1;
      continue;
    }

    if (CLOSERS.has(token.value)) {
      depth -= 1;
      continue;
    }

    if (token.value === ':' && depth === 0) return index;
  }

  return -1;
}

function findFirstSignificantToken(tokens, startIndex, endIndex) {
  for (let index = startIndex; index <= endIndex; index += 1) {
    if (tokens[index].type !== 'eof') return index;
  }
  return -1;
}

function findLastSignificantToken(tokens, startIndex, endIndex) {
  for (let index = endIndex; index >= startIndex; index -= 1) {
    if (tokens[index].type !== 'eof') return index;
  }
  return -1;
}

function normalizePropertyKey(token) {
  if (!token) return undefined;
  if (token.type === 'identifier') return token.value;
  if (token.type === 'string') return decodeQuotedString(token.value);
  return undefined;
}

function decodeLiteralValue(token, raw) {
  if (token.type === 'string') return decodeQuotedString(token.value);
  if (token.type === 'template') return undefined;
  if (raw === 'null') return undefined;
  return undefined;
}

function decodeQuotedString(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw.slice(1, -1);
  }
}

function isCallableExpression(tokens) {
  if (tokens.length === 0) return false;
  const first = tokens[0];
  const second = tokens[1];
  if ((first.type === 'identifier' && first.value === 'function') || (first.type === 'identifier' && first.value === 'async' && second?.value === 'function') || isArrowFunctionExpression(tokens)) {
    return true;
  }

  if (first.value === '(') {
    let closeIndex = -1;
    if (tokens[tokens.length - 1]?.value === ')') {
      closeIndex = matchingTokenIndex(tokens, 0, '(', ')');
    }
    return closeIndex === tokens.length - 1 && isCallableExpression(tokens.slice(1, -1));
  }

  if (first.type !== 'identifier' || INVALID_CALLABLE_IDENTIFIERS.has(first.value)) return false;
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'identifier') continue;
    if (token.value === '.' || token.value === '[' || token.value === ']') continue;
    return false;
  }
  return true;
}

function isArrowFunctionExpression(tokens) {
  let depth = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'string' || token.type === 'template') continue;

    if (OPENERS.has(token.value)) {
      depth += 1;
      continue;
    }

    if (CLOSERS.has(token.value)) {
      depth -= 1;
      continue;
    }

    if (depth === 0 && (token.value === '?' || token.value === ':')) {
      return false;
    }

    if (depth === 0 && token.value === '=>') {
      return true;
    }
  }

  return false;
}
