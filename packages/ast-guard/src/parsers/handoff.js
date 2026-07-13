import {
  decodeStringLiteral,
  findMatchingDelimiter,
  findNextNonWhitespace,
  findTopLevelColon,
  isWordCharacter,
  splitTopLevel,
} from '../scan.js';
import { getLineColumn } from '../location.js';

const CALLEE = 'handoff';

export function parseHandoffs(sourceCode, filePath) {
  const handoffs = [];
  let searchIndex = 0;

  while (searchIndex < sourceCode.length) {
    const calleeIndex = sourceCode.indexOf(CALLEE, searchIndex);
    if (calleeIndex === -1) break;

    const before = sourceCode[calleeIndex - 1];
    const after = sourceCode[calleeIndex + CALLEE.length];
    if (isWordCharacter(before) || isWordCharacter(after)) {
      searchIndex = calleeIndex + CALLEE.length;
      continue;
    }

    const openParen = findNextNonWhitespace(sourceCode, calleeIndex + CALLEE.length);
    if (sourceCode[openParen] !== '(') {
      searchIndex = calleeIndex + CALLEE.length;
      continue;
    }

    const closeParen = findMatchingDelimiter(sourceCode, openParen);
    if (closeParen === -1) {
      searchIndex = openParen + 1;
      continue;
    }

    handoffs.push(parseHandoffCall(sourceCode, filePath, calleeIndex, openParen, closeParen));
    searchIndex = closeParen + 1;
  }

  return handoffs;
}

function parseHandoffCall(sourceCode, filePath, calleeIndex, openParen, closeParen) {
  const callLocation = getLineColumn(sourceCode, calleeIndex);
  const argumentStart = findNextNonWhitespace(sourceCode, openParen + 1);
  const objectForm = sourceCode[argumentStart] === '{';
  const properties = {};

  if (objectForm) {
    const objectEnd = findMatchingDelimiter(sourceCode, argumentStart);
    if (objectEnd !== -1 && objectEnd <= closeParen) {
      Object.assign(properties, parseObjectProperties(sourceCode, argumentStart, objectEnd));
    }
  }

  return {
    filePath,
    line: callLocation.line,
    column: callLocation.column,
    objectForm,
    range: [calleeIndex, closeParen + 1],
    properties,
    id: properties.id?.value,
    title: properties.title?.value,
    description: properties.description?.value,
    fallback: properties.fallback
      ? {
          raw: properties.fallback.raw,
          callable: isCallableExpression(properties.fallback.raw),
          line: properties.fallback.line,
          column: properties.fallback.column,
        }
      : undefined,
  };
}

function parseObjectProperties(sourceCode, objectStart, objectEnd) {
  const body = sourceCode.slice(objectStart + 1, objectEnd);
  const properties = {};

  for (const part of splitTopLevel(body)) {
    if (part.text.trim() === '') continue;
    const colon = findTopLevelColon(part.text);
    if (colon === -1) continue;

    const rawKey = part.text.slice(0, colon).trim();
    const key = normalizePropertyKey(rawKey);
    if (!key) continue;

    const valueOffsetInPart = colon + 1 + leadingWhitespaceLength(part.text.slice(colon + 1));
    const valueStart = objectStart + 1 + part.start + valueOffsetInPart;
    const raw = part.text.slice(colon + 1).trim();
    const location = getLineColumn(sourceCode, valueStart);

    properties[key] = {
      key,
      raw,
      value: decodeStringLiteral(raw),
      line: location.line,
      column: location.column,
    };
  }

  return properties;
}

function normalizePropertyKey(rawKey) {
  const literal = decodeStringLiteral(rawKey);
  if (literal) return literal;
  const match = rawKey.match(/^[A-Za-z_$][\w$]*$/);
  return match ? rawKey : undefined;
}

function leadingWhitespaceLength(value) {
  return value.length - value.trimStart().length;
}

function isCallableExpression(raw) {
  const value = raw.trim();
  return (
    /^(async\s+)?function\b/.test(value) ||
    /^(async\s*)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(value) ||
    /^[A-Za-z_$][\w$]*$/.test(value)
  );
}
