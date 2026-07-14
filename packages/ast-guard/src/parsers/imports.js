import { getLineColumn, makeViolation } from '../location.js';
import { parseSourceFile, walkAst } from './ast.js';

const FORBIDDEN_IMPORT_CODES = new Map([
  ['fetch', 'STATE001'],
  ['axios', 'STATE002'],
  ['useSWR', 'STATE003'],
  ['useQuery', 'STATE004'],
  ['useDispatch', 'STATE005'],
  ['useSelector', 'STATE005'],
  ['localStorage', 'STATE006'],
  ['sessionStorage', 'STATE006'],
  ['useNavigate', 'STATE007'],
]);
const FALLBACK_FORBIDDEN_IMPORT_CODE = 'STATE002';

export function detectForbiddenImports(source, filePath, whitelistedImports = []) {
  return detectForbiddenImportsWithConfig(source, filePath, whitelistedImports);
}

export function detectForbiddenImportsWithConfig(
  source,
  filePath,
  whitelistedImports = [],
  forbiddenImports = [],
) {
  const ast = parseSourceFile(source);
  const whitelist = new Set(whitelistedImports);
  const configuredForbidden = forbiddenImports.length > 0 ? new Set(forbiddenImports) : null;
  const violations = [];

  walkAst(ast, (node) => {
    if (node.type === 'ImportDeclaration') {
      violations.push(...detectImportDeclarationViolations(node, source, filePath, whitelist, configuredForbidden));
      return;
    }

    if (node.type === 'ImportExpression') {
      violations.push(...detectDynamicImportViolations(node, source, filePath, whitelist, configuredForbidden));
      return;
    }

    if (node.type === 'CallExpression' && node.callee?.type === 'Import') {
      violations.push(...detectDynamicImportViolations(node, source, filePath, whitelist, configuredForbidden));
    }
  });

  return violations;
}

function detectImportDeclarationViolations(node, source, filePath, whitelist, configuredForbidden) {
  if (node.importKind === 'type') return [];
  const moduleName = normalizeModuleName(node.source?.value);
  if (!moduleName) return [];
  if (whitelist.has(moduleName)) return [];

  if (configuredForbidden && configuredForbidden.has(moduleName)) {
    const location = getLineColumn(source, node.source.start ?? 0);
    return [
      makeViolation({
        code: FORBIDDEN_IMPORT_CODES.get(moduleName) ?? FALLBACK_FORBIDDEN_IMPORT_CODE,
        filePath,
        line: location.line,
        column: location.column,
        message: `Move ${moduleName} usage out of the UI component or add an explicit whitelist entry.`,
      }),
    ];
  }

  const violations = [];
  for (const specifier of node.specifiers ?? []) {
    if (specifier.importKind === 'type') continue;

    const importedName = specifier.type === 'ImportDefaultSpecifier' ? moduleName : getImportedName(specifier);
    const localName = specifier.local?.name ?? importedName;
    if (whitelist.has(importedName) || whitelist.has(localName)) continue;

    if (configuredForbidden && !configuredForbidden.has(importedName) && !configuredForbidden.has(localName)) {
      continue;
    }

    const code = FORBIDDEN_IMPORT_CODES.get(importedName) ?? FORBIDDEN_IMPORT_CODES.get(localName);
    if (!code && !configuredForbidden) continue;

    const location = getLineColumn(source, specifier.local?.start ?? node.source.start ?? 0);
    violations.push(
      makeViolation({
        code: code ?? FALLBACK_FORBIDDEN_IMPORT_CODE,
        filePath,
        line: location.line,
        column: location.column,
        message: `Move ${importedName} usage out of the UI component or add an explicit whitelist entry.`,
      }),
    );
  }

  return violations;
}

function detectDynamicImportViolations(node, source, filePath, whitelist, configuredForbidden) {
  const moduleName = getImportModuleName(node);
  if (!moduleName || whitelist.has(moduleName)) return [];

  const code = resolveImportCode(moduleName, configuredForbidden);
  if (!code) return [];

  const location = getLineColumn(source, getImportSourceStart(node));
  return [
    makeViolation({
      code,
      filePath,
      line: location.line,
      column: location.column,
      message: `Move ${moduleName} usage out of the UI component or add an explicit whitelist entry.`,
    }),
  ];
}

function resolveImportCode(moduleName, configuredForbidden) {
  if (configuredForbidden && !configuredForbidden.has(moduleName)) {
    return null;
  }

  const code = FORBIDDEN_IMPORT_CODES.get(moduleName);
  if (code) return code;
  if (configuredForbidden) return FALLBACK_FORBIDDEN_IMPORT_CODE;
  return null;
}

function getImportModuleName(node) {
  if (node.type === 'ImportExpression') {
    return normalizeModuleName(node.source?.value);
  }

  if (node.type === 'CallExpression' && node.callee?.type === 'Import') {
    const sourceNode = node.arguments?.[0];
    return normalizeModuleName(sourceNode?.value);
  }

  return null;
}

function getImportSourceStart(node) {
  if (node.type === 'ImportExpression') {
    return node.source?.start ?? node.start ?? 0;
  }

  if (node.type === 'CallExpression' && node.callee?.type === 'Import') {
    return node.arguments?.[0]?.start ?? node.start ?? 0;
  }

  return node.start ?? 0;
}

function getImportedName(specifier) {
  if (!specifier.imported) return specifier.local?.name ?? '';
  if (specifier.imported.type === 'Identifier') return specifier.imported.name;
  if (specifier.imported.type === 'StringLiteral') return specifier.imported.value;
  return specifier.local?.name ?? '';
}

function normalizeModuleName(raw) {
  return typeof raw === 'string' ? raw : '';
}
