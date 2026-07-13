import { getLineColumn, makeViolation } from '../location.js';
import { tokenize } from '../tokenize.js';

const TAILWIND_PREFIXES = new Set([
  'absolute',
  'accent',
  'align',
  'animate',
  'appearance',
  'aspect',
  'auto',
  'backdrop',
  'basis',
  'bg',
  'block',
  'border',
  'bottom',
  'box',
  'break',
  'capitalize',
  'clear',
  'col',
  'container',
  'contents',
  'cursor',
  'decoration',
  'delay',
  'divide',
  'duration',
  'ease',
  'fixed',
  'flex',
  'float',
  'flow',
  'font',
  'from',
  'gap',
  'grid',
  'grow',
  'h',
  'hidden',
  'inline',
  'inset',
  'isolate',
  'italic',
  'items',
  'justify',
  'leading',
  'left',
  'm',
  'max',
  'mb',
  'min',
  'ml',
  'mr',
  'mt',
  'mx',
  'my',
  'object',
  'opacity',
  'order',
  'origin',
  'outline',
  'overflow',
  'overscroll',
  'p',
  'place',
  'placeholder',
  'pointer',
  'pr',
  'pt',
  'px',
  'py',
  'relative',
  'resize',
  'right',
  'ring',
  'rotate',
  'rounded',
  'row',
  'scale',
  'select',
  'self',
  'shadow',
  'shrink',
  'skew',
  'space',
  'sr',
  'static',
  'sticky',
  'stroke',
  'table',
  'text',
  'to',
  'top',
  'touch',
  'tracking',
  'transform',
  'transition',
  'translate',
  'truncate',
  'underline',
  'uppercase',
  'via',
  'visible',
  'w',
  'whitespace',
  'z',
]);

export function validateStylingScope(source, filePath, strategy) {
  if (strategy !== 'tailwind' && strategy !== 'css-modules') return [];

  const tokens = tokenize(source);
  const violations = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== 'identifier' || tokens[index].value !== 'className') continue;
    if (tokens[index + 1]?.value !== '=') continue;

    const valueToken = tokens[index + 2];
    if (!valueToken) continue;

    if (strategy === 'css-modules') {
      if (valueToken.type === 'string' || (valueToken.type === 'template' && !valueToken.value.includes('${'))) {
        violations.push(
          styleViolation(source, filePath, tokens[index].start, 'Use CSS module references such as styles.primary for className values.'),
        );
        continue;
      }

      if (valueToken.value === '{') {
        const expression = readBraceExpression(tokens, index + 2);
        if (!containsStylesReference(expression.tokens)) {
          violations.push(
            styleViolation(source, filePath, tokens[index].start, 'Use CSS module references such as styles.primary for className values.'),
          );
        }
      }
      continue;
    }

    if (strategy === 'tailwind') {
      const literal = readClassNameLiteral(tokens, index + 2);
      if (literal === null) continue;
      const classNames = tokenizeClassNames(literal);
      const invalidClass = classNames.find((className) => className && !isTailwindClass(className));
      if (invalidClass) {
        violations.push(
          styleViolation(
            source,
            filePath,
            tokens[index].start,
            `Replace "${invalidClass}" with configured Tailwind utility classes.`,
          ),
        );
      }
    }
  }

  return violations;
}

function styleViolation(source, filePath, index, message) {
  const location = getLineColumn(source, index);
  return makeViolation({
    code: 'STYLE002',
    filePath,
    line: location.line,
    column: location.column,
    message,
  });
}

function tokenizeClassNames(raw) {
  const unquoted = raw.replace(/^["'`]|["'`]$/g, '');
  return unquoted.split(/\s+/);
}

function readClassNameLiteral(tokens, valueIndex) {
  const valueToken = tokens[valueIndex];
  if (!valueToken) return null;
  if (valueToken.type === 'string' || (valueToken.type === 'template' && !valueToken.value.includes('${'))) {
    return valueToken.value;
  }
  if (valueToken.value !== '{') return null;

  const expression = readBraceExpression(tokens, valueIndex);
  if (expression.tokens.length !== 1) return null;
  const literal = expression.tokens[0];
  if (literal.type !== 'string' && !(literal.type === 'template' && !literal.value.includes('${'))) {
    return null;
  }
  return literal.value;
}

function isTailwindClass(className) {
  const variantFree = className.split(':').at(-1) ?? className;
  if (/^-?\[[^\]]+\]$/.test(variantFree) || /\[[^\]]+\]/.test(variantFree)) return true;
  if (variantFree === 'container' || variantFree === 'sr-only' || variantFree === 'not-sr-only') return true;
  const withoutNegative = variantFree.replace(/^-/, '');
  const spacingMatch = withoutNegative.match(/^(m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl)-(.+)$/);
  if (spacingMatch) return isTailwindSpacingValue(spacingMatch[2]);
  const prefix = withoutNegative.split('-')[0];
  return TAILWIND_PREFIXES.has(prefix);
}

function isTailwindSpacingValue(value) {
  return /^(0|px|auto|\d+(?:\.\d+)?|0\.5|1\.5|2\.5|3\.5|\[[^\]]+\])$/.test(value);
}

function readBraceExpression(tokens, startIndex) {
  let depth = 0;
  const expressionTokens = [];
  const startToken = tokens[startIndex];

  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.value === '{') {
      depth += 1;
      if (depth === 1) continue;
    }
    if (token.value === '}') {
      depth -= 1;
      if (depth === 0) break;
    }

    if (depth >= 1) expressionTokens.push(token);
  }

  return {
    tokens: expressionTokens,
    start: startToken?.start ?? 0,
  };
}

function containsStylesReference(tokens) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].type === 'identifier' && tokens[index].value === 'styles' && tokens[index + 1]?.value === '.') {
      return true;
    }
  }
  return false;
}
