import { getLineColumn, makeViolation } from '../location.js';
import { parseSourceFile, walkAst } from './handoff.js';

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

export function detectStylingViolations(filePath, strategy) {
  const violations = [];
  const lowerPath = filePath.toLowerCase();
  const isCss = lowerPath.endsWith('.css');
  const isModuleCss = lowerPath.endsWith('.module.css');

  if (strategy === 'tailwind' && isCss && !isModuleCss) {
    violations.push(
      makeViolation({
        code: 'STYLE001',
        filePath,
        message: 'Remove global component CSS and express the styling with Tailwind classes.',
      }),
    );
  }

  if (strategy === 'css-modules' && isCss && !isModuleCss) {
    violations.push(
      makeViolation({
        code: 'STYLE003',
        filePath,
        message: 'Rename component CSS to .module.css or move it out of CSS modules mode.',
      }),
    );
  }

  return violations;
}

export function validateStylingScope(source, filePath, strategy) {
  if (strategy !== 'tailwind' && strategy !== 'css-modules') return [];

  const ast = parseSourceFile(source);
  const violations = [];

  walkAst(ast, (node) => {
    if (node.type !== 'JSXAttribute' || node.name?.type !== 'JSXIdentifier' || node.name.name !== 'className') {
      return;
    }

    const value = node.value;
    if (!value) return;

    if (strategy === 'css-modules') {
      if (isStaticLiteral(value)) {
        violations.push(
          styleViolation(
            source,
            filePath,
            node.name.start ?? node.start ?? 0,
            'Use CSS module references such as styles.primary for className values.',
          ),
        );
        return;
      }

      if (value.type === 'JSXExpressionContainer' && !containsStylesReference(value.expression)) {
        violations.push(
          styleViolation(
            source,
            filePath,
            node.name.start ?? node.start ?? 0,
            'Use CSS module references such as styles.primary for className values.',
          ),
        );
      }
      return;
    }

    if (strategy === 'tailwind') {
      const literal = readClassNameLiteral(value);
      if (literal === null) return;
      const invalidClass = tokenizeClassNames(literal).find((className) => className && !isTailwindClass(className));
      if (invalidClass) {
        violations.push(
          styleViolation(
            source,
            filePath,
            node.name.start ?? node.start ?? 0,
            `Replace "${invalidClass}" with configured Tailwind utility classes.`,
          ),
        );
      }
    }
  });

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

function isStaticLiteral(node) {
  return (
    node.type === 'StringLiteral' ||
    (node.type === 'JSXExpressionContainer' && isStaticLiteral(node.expression)) ||
    (node.type === 'TemplateLiteral' && node.expressions.length === 0)
  );
}

function readClassNameLiteral(node) {
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('');
  }
  if (node.type !== 'JSXExpressionContainer') return null;
  return readClassNameLiteral(node.expression);
}

function tokenizeClassNames(raw) {
  return raw.split(/\s+/);
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

function containsStylesReference(node) {
  let found = false;

  visit(node);
  return found;

  function visit(current) {
    if (!current || typeof current !== 'object' || found) return;

    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }

    if (
      (current.type === 'MemberExpression' || current.type === 'OptionalMemberExpression') &&
      current.object?.type === 'Identifier' &&
      current.object.name === 'styles'
    ) {
      found = true;
      return;
    }

    for (const [key, value] of Object.entries(current)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'range' || key === 'extra') continue;
      visit(value);
    }
  }
}
