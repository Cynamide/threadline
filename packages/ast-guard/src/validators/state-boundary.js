import { getLineColumn, makeViolation } from '../location.js';
import { matchesAnyGlob } from '../scan.js';
import { parseSourceFile, walkAst } from '../parsers/ast.js';

const STATE_RULES = [
  { code: 'STATE001', name: 'fetch', identifier: 'fetch', kind: 'call' },
  { code: 'STATE002', name: 'axios', identifier: 'axios', kind: 'call-or-member' },
  { code: 'STATE003', name: 'useSWR', identifier: 'useSWR', kind: 'call' },
  { code: 'STATE004', name: 'useQuery', identifier: 'useQuery', kind: 'call' },
  { code: 'STATE005', name: 'Redux hooks', identifier: 'useDispatch', kind: 'call' },
  { code: 'STATE005', name: 'Redux hooks', identifier: 'useSelector', kind: 'call' },
  { code: 'STATE006', name: 'browser storage', identifier: 'localStorage', kind: 'member' },
  { code: 'STATE006', name: 'browser storage', identifier: 'sessionStorage', kind: 'member' },
  { code: 'STATE007', name: 'router navigation', identifier: 'useNavigate', kind: 'call' },
  { code: 'STATE007', name: 'router navigation', identifier: 'navigate', kind: 'call' },
  { code: 'STATE007', name: 'router navigation', identifier: 'router', property: 'push', kind: 'member-call' },
];

export function validateStateBoundaries(source, filePath, config = {}) {
  if (!isUiComponent(filePath, config) || isWhitelistedComponent(filePath, config)) {
    return [];
  }

  const ast = parseSourceFile(source);
  const whitelistedImports = new Set(config.boundaries?.whitelisted_imports ?? []);
  const violations = [];

  walkAst(ast, (node) => {
    for (const rule of STATE_RULES) {
      if (whitelistedImports.has(rule.identifier)) continue;
      const match = matchStateRule(node, rule);
      if (!match) continue;
      const location = getLineColumn(source, match.start ?? node.start ?? 0);
      violations.push(
        makeViolation({
          code: rule.code,
          filePath,
          line: location.line,
          column: location.column,
          message: `Move ${rule.name} out of the UI component or wrap it behind an approved handoff boundary.`,
        }),
      );
    }
  });

  return violations.sort((left, right) => left.line - right.line || left.column - right.column || left.code.localeCompare(right.code));
}

function isUiComponent(filePath, config) {
  const srcPath = config.project?.src_path ?? 'src';
  const componentPath = config.project?.component_path ?? 'components';
  const normalizedComponentPath = `${srcPath.replace(/\/$/, '')}/${componentPath.replace(/^\/|\/$/g, '')}/`;
  return (
    filePath.includes(normalizedComponentPath) ||
    /\/components\//.test(filePath) ||
    /\.(jsx|tsx)$/.test(filePath)
  );
}

function isWhitelistedComponent(filePath, config) {
  return matchesAnyGlob(filePath, config.boundaries?.whitelisted_components ?? []);
}

function matchStateRule(node, rule) {
  if (rule.kind === 'call' && isCallToIdentifier(node, rule.identifier)) {
    return node.callee;
  }

  if (rule.kind === 'member' && isMemberOnIdentifier(node, rule.identifier)) {
    return node.object;
  }

  if (rule.kind === 'call-or-member') {
    if (isCallToIdentifier(node, rule.identifier)) return node.callee;
    if (isMemberOnIdentifier(node, rule.identifier)) return node.object;
  }

  if (rule.kind === 'member-call' && isCallToMember(node, rule.identifier, rule.property)) {
    return node.callee.object;
  }

  return null;
}

function isCallToIdentifier(node, identifier) {
  return (
    (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') &&
    node.callee?.type === 'Identifier' &&
    node.callee.name === identifier
  );
}

function isMemberOnIdentifier(node, identifier) {
  return (
    (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') &&
    node.object?.type === 'Identifier' &&
    node.object.name === identifier
  );
}

function isCallToMember(node, objectName, propertyName) {
  if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return false;
  const callee = node.callee;
  return (
    (callee?.type === 'MemberExpression' || callee?.type === 'OptionalMemberExpression') &&
    callee.object?.type === 'Identifier' &&
    callee.object.name === objectName &&
    callee.property?.type === 'Identifier' &&
    callee.property.name === propertyName
  );
}
