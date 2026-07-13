import { getLineColumn, makeViolation } from '../location.js';

const CLASS_NAME_PATTERN = /\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|{([^}]+)})/g;
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

  const violations = [];
  for (const match of source.matchAll(CLASS_NAME_PATTERN)) {
    const literal = match[1] ?? match[2];
    const expression = match[3];

    if (strategy === 'css-modules') {
      if (literal || (expression && !/\bstyles\./.test(expression))) {
        violations.push(styleViolation(source, filePath, match.index, 'Use CSS module references such as styles.primary for className values.'));
      }
      continue;
    }

    if (strategy === 'tailwind' && literal) {
      const invalidClass = literal.split(/\s+/).find((className) => className && !isTailwindClass(className));
      if (invalidClass) {
        violations.push(styleViolation(source, filePath, match.index, `Replace "${invalidClass}" with configured Tailwind utility classes.`));
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

function isTailwindClass(className) {
  const variantFree = className.split(':').at(-1) ?? className;
  if (/^-?\[[^\]]+\]$/.test(variantFree) || /\[[^\]]+\]/.test(variantFree)) return true;
  if (variantFree === 'container' || variantFree === 'sr-only' || variantFree === 'not-sr-only') return true;
  const withoutNegative = variantFree.replace(/^-/, '');
  const spacingMatch = withoutNegative.match(/^(m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl)-(.+)$/);
  if (spacingMatch) return isTailwindSpacingValue(spacingMatch[2]);
  const prefix = variantFree.replace(/^-/, '').split('-')[0];
  return TAILWIND_PREFIXES.has(prefix);
}

function isTailwindSpacingValue(value) {
  return /^(0|px|auto|\d+(?:\.\d+)?|0\.5|1\.5|2\.5|3\.5|\[[^\]]+\])$/.test(value);
}
