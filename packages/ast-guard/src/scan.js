const OPEN_TO_CLOSE = new Map([
  ['(', ')'],
  ['{', '}'],
  ['[', ']'],
]);

const CLOSE_TO_OPEN = new Map([
  [')', '('],
  ['}', '{'],
  [']', '['],
]);

export function isWordCharacter(character) {
  return /[A-Za-z0-9_$]/.test(character ?? '');
}

export function findNextNonWhitespace(source, startIndex) {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
}

export function findMatchingDelimiter(source, openIndex) {
  const open = source[openIndex];
  const close = OPEN_TO_CLOSE.get(open);
  if (!close) return -1;

  const stack = [open];
  let quote = null;
  let templateExpressionDepth = 0;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    const previous = source[index - 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (character === '\\') {
        index += 1;
        continue;
      }
      if (quote === '`' && character === '$' && next === '{') {
        templateExpressionDepth += 1;
        stack.push('{');
        index += 1;
        continue;
      }
      if (character === quote && templateExpressionDepth === 0) {
        quote = null;
      }
      if (quote === '`' && character === '}' && templateExpressionDepth > 0) {
        templateExpressionDepth -= 1;
        stack.pop();
      }
      continue;
    }

    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (OPEN_TO_CLOSE.has(character)) {
      stack.push(character);
      continue;
    }

    if (CLOSE_TO_OPEN.has(character)) {
      const expectedOpen = CLOSE_TO_OPEN.get(character);
      if (stack.at(-1) !== expectedOpen) return -1;
      stack.pop();
      if (stack.length === 0) {
        if (character === close) return index;
        return -1;
      }
    }

    if (previous === '$' && character === '{' && quote === '`') {
      templateExpressionDepth += 1;
    }
  }

  return -1;
}

export function splitTopLevel(source, separator = ',') {
  const parts = [];
  let start = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  const stack = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (character === '\\') {
        index += 1;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }

    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (OPEN_TO_CLOSE.has(character)) {
      stack.push(character);
      continue;
    }
    if (CLOSE_TO_OPEN.has(character)) {
      stack.pop();
      continue;
    }
    if (character === separator && stack.length === 0) {
      parts.push({ text: source.slice(start, index), start });
      start = index + 1;
    }
  }

  parts.push({ text: source.slice(start), start });
  return parts;
}

export function findTopLevelColon(source) {
  let quote = null;
  const stack = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') {
        index += 1;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (OPEN_TO_CLOSE.has(character)) {
      stack.push(character);
      continue;
    }
    if (CLOSE_TO_OPEN.has(character)) {
      stack.pop();
      continue;
    }
    if (character === ':' && stack.length === 0) return index;
  }

  return -1;
}

export function decodeStringLiteral(raw) {
  const trimmed = raw.trim();
  if (!/^(['"`])/.test(trimmed)) return undefined;
  const quote = trimmed[0];
  if (!trimmed.endsWith(quote)) return undefined;
  const body = trimmed.slice(1, -1);
  return body
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

export function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function matchesAnyGlob(filePath, patterns = []) {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/')) return filePath.startsWith(pattern);
    return globToRegExp(pattern).test(filePath);
  });
}
