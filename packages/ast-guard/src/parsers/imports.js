import { getLineColumn, makeViolation } from '../location.js';

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

const MODULE_DEFAULTS = new Map([
  ['axios', 'axios'],
  ['swr', 'useSWR'],
]);

export function detectForbiddenImports(source, filePath, whitelistedImports = []) {
  const whitelist = new Set(whitelistedImports);
  const violations = [];
  const importPattern = /^\s*import\s+(.+?)\s+from\s+['"]([^'"]+)['"];?/gm;

  for (const match of source.matchAll(importPattern)) {
    const clause = match[1];
    const moduleName = match[2];
    const names = extractImportNames(clause, moduleName);
    const clauseOffset = match[0].indexOf(clause);

    for (const { name, localName, offset } of names) {
      if (whitelist.has(name) || whitelist.has(localName)) continue;
      const code = FORBIDDEN_IMPORT_CODES.get(name);
      if (!code) continue;
      const location = getLineColumn(source, match.index + clauseOffset + offset);
      violations.push(
        makeViolation({
          code,
          filePath,
          line: location.line,
          column: location.column,
          message: `Move ${name} usage out of the UI component or add an explicit whitelist entry.`,
        }),
      );
    }
  }

  return violations;
}

function extractImportNames(clause, moduleName) {
  const names = [];
  const defaultName = MODULE_DEFAULTS.get(moduleName);
  const trimmedClause = clause.trim();

  if (defaultName && !trimmedClause.startsWith('{') && !trimmedClause.startsWith('*')) {
    const localName = trimmedClause.split(',')[0].trim();
    names.push({ name: defaultName, localName, offset: clause.indexOf(localName) });
  }

  const namedMatch = clause.match(/\{([^}]+)\}/);
  if (namedMatch) {
    const namedBody = namedMatch[1];
    for (const rawSpecifier of namedBody.split(',')) {
      const specifier = rawSpecifier.trim();
      if (!specifier) continue;
      const [importedName, localName = importedName] = specifier.split(/\s+as\s+/).map((part) => part.trim());
      names.push({
        name: importedName,
        localName,
        offset: clause.indexOf(specifier) + specifier.indexOf(importedName),
      });
    }
  }

  return names;
}
