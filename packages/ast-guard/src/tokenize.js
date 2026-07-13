const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;

export function tokenize(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  let column = 1;

  while (index < source.length) {
    const start = index;
    const startLine = line;
    const startColumn = column;
    const character = source[index];
    const next = source[index + 1];

    if (isWhitespace(character)) {
      advance(character);
      index += 1;
      continue;
    }

    if (character === '/' && next === '/') {
      advance(character);
      index += 1;
      advance(next);
      index += 1;
      while (index < source.length && source[index] !== '\n') {
        advance(source[index]);
        index += 1;
      }
      continue;
    }

    if (character === '/' && next === '*') {
      advance(character);
      index += 1;
      advance(next);
      index += 1;
      while (index < source.length) {
        const current = source[index];
        const following = source[index + 1];
        advance(current);
        index += 1;
        if (current === '*' && following === '/') {
          advance(following);
          index += 1;
          break;
        }
      }
      continue;
    }

    if (IDENTIFIER_START.test(character)) {
      const value = readIdentifier();
      tokens.push(token('identifier', value, start, index, startLine, startColumn));
      continue;
    }

    if (character === '\'' || character === '"') {
      const value = readQuotedString(character);
      tokens.push(token('string', value, start, index, startLine, startColumn));
      continue;
    }

    if (character === '`') {
      const value = readTemplateLiteral();
      tokens.push(token('template', value, start, index, startLine, startColumn));
      continue;
    }

    if (character === '=' && next === '>') {
      advance(character);
      index += 1;
      advance(next);
      index += 1;
      tokens.push(token('punctuator', '=>', start, index, startLine, startColumn));
      continue;
    }

    advance(character);
    index += 1;
    tokens.push(token('punctuator', character, start, index, startLine, startColumn));
  }

  tokens.push(token('eof', '', source.length, source.length, line, column));
  return tokens;

  function advance(character) {
    if (character === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  function readIdentifier() {
    let value = source[index];
    advance(source[index]);
    index += 1;
    while (index < source.length && IDENTIFIER_PART.test(source[index])) {
      value += source[index];
      advance(source[index]);
      index += 1;
    }
    return value;
  }

  function readQuotedString(quote) {
    let value = source[index];
    advance(source[index]);
    index += 1;

    while (index < source.length) {
      const current = source[index];
      value += current;
      advance(current);
      index += 1;

      if (current === '\\') {
        if (index < source.length) {
          value += source[index];
          advance(source[index]);
          index += 1;
        }
        continue;
      }

      if (current === quote) break;
    }

    return value;
  }

  function readTemplateLiteral() {
    let value = source[index];
    advance(source[index]);
    index += 1;
    let interpolationDepth = 0;

    while (index < source.length) {
      const current = source[index];
      const following = source[index + 1];
      value += current;
      advance(current);
      index += 1;

      if (current === '\\') {
        if (index < source.length) {
          value += source[index];
          advance(source[index]);
          index += 1;
        }
        continue;
      }

      if (current === '`' && interpolationDepth === 0) break;

      if (current === '$' && following === '{') {
        value += following;
        advance(following);
        index += 1;
        interpolationDepth += 1;
        continue;
      }

      if (current === '{' && interpolationDepth > 0) {
        interpolationDepth += 1;
        continue;
      }

      if (current === '}' && interpolationDepth > 0) {
        interpolationDepth -= 1;
      }
    }

    return value;
  }
}

export function findNextToken(tokens, startIndex, predicate) {
  for (let index = startIndex; index < tokens.length; index += 1) {
    if (predicate(tokens[index], index)) return index;
  }
  return -1;
}

export function tokensToSource(tokens, source, startIndex, endIndex) {
  const start = tokens[startIndex];
  const end = tokens[endIndex];
  if (!start || !end) return '';
  return source.slice(start.start, end.end);
}

export function matchingTokenIndex(tokens, openIndex, openValue, closeValue) {
  if (tokens[openIndex]?.value !== openValue) return -1;
  let depth = 0;

  for (let index = openIndex; index < tokens.length; index += 1) {
    const current = tokens[index];
    if (current.type === 'string' || current.type === 'template') continue;
    if (current.value === openValue) depth += 1;
    if (current.value === closeValue) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

export function isIdentifierToken(token, value) {
  return token?.type === 'identifier' && (value === undefined || token.value === value);
}

export function isStringToken(token) {
  return token?.type === 'string' || token?.type === 'template';
}

function token(type, value, start, end, line, column) {
  return { type, value, start, end, line, column };
}

function isWhitespace(character) {
  return /\s/.test(character);
}
