import { getLineColumn, makeViolation } from '../location.js';
import { isIdentifierToken, isStringToken, matchingTokenIndex, tokenize } from '../tokenize.js';

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
  const tokens = tokenize(source);
  const whitelist = new Set(whitelistedImports);
  let configuredForbidden = null;
  if (forbiddenImports.length > 0) {
    configuredForbidden = new Set(forbiddenImports);
  }
  const violations = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (!isIdentifierToken(tokens[index], 'import')) continue;

    if (tokens[index + 1]?.value === '(') {
      const closeIndex = matchingTokenIndex(tokens, index + 1, '(', ')');
      if (closeIndex === -1) continue;
      const moduleToken = findFirstStringLikeToken(tokens, index + 2, closeIndex - 1);
      if (!moduleToken || !isStringToken(moduleToken)) continue;
      const moduleName = normalizeModuleName(moduleToken.value);
      if (whitelist.has(moduleName)) continue;
      const code = resolveImportCode(moduleName, configuredForbidden);
      if (!code) continue;
      const location = getLineColumn(source, moduleToken.start);
      violations.push(
        makeViolation({
          code,
          filePath,
          line: location.line,
          column: location.column,
          message: `Move ${moduleName} usage out of the UI component or add an explicit whitelist entry.`,
        }),
      );
      continue;
    }

    if (isIdentifierToken(tokens[index + 1], 'type')) continue;

    const fromIndex = findFromIndex(tokens, index + 1);
    if (fromIndex === -1) continue;

    const moduleToken = findFirstStringLikeToken(tokens, fromIndex + 1);
    if (!moduleToken || !isStringToken(moduleToken)) continue;
    const moduleName = normalizeModuleName(moduleToken.value);
    if (whitelist.has(moduleName)) continue;
    if (configuredForbidden?.has(moduleName)) {
      const location = getLineColumn(source, moduleToken.start);
      violations.push(
        makeViolation({
          code: FORBIDDEN_IMPORT_CODES.get(moduleName) ?? FALLBACK_FORBIDDEN_IMPORT_CODE,
          filePath,
          line: location.line,
          column: location.column,
          message: `Move ${moduleName} usage out of the UI component or add an explicit whitelist entry.`,
        }),
      );
      continue;
    }

    const specifiers = extractImportSpecifiers(tokens, index + 1, fromIndex - 1, moduleName);

    for (const { name, localName, token } of specifiers) {
      if (whitelist.has(name) || whitelist.has(localName)) continue;
      if (configuredForbidden) {
        if (!configuredForbidden.has(name) && !configuredForbidden.has(localName)) continue;
      }
      const code = FORBIDDEN_IMPORT_CODES.get(name) ?? FORBIDDEN_IMPORT_CODES.get(localName);
      if (!code) {
        if (!configuredForbidden) continue;
      }
      const resolvedCode = code ?? FALLBACK_FORBIDDEN_IMPORT_CODE;
      const location = getLineColumn(source, token.start);
      violations.push(
        makeViolation({
          code: resolvedCode,
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

function resolveImportCode(moduleName, configuredForbidden) {
  if (configuredForbidden) {
    if (!configuredForbidden.has(moduleName)) {
      return null;
    }
  }

  const code = FORBIDDEN_IMPORT_CODES.get(moduleName);
  if (code) return code;
  if (configuredForbidden) return FALLBACK_FORBIDDEN_IMPORT_CODE;
  return null;
}

function findFromIndex(tokens, startIndex) {
  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (isIdentifierToken(token, 'from')) return index;
    if (token.value === ';' || token.value === '\n') break;
  }
  return -1;
}

function findFirstStringLikeToken(tokens, startIndex, endIndex = tokens.length - 1) {
  for (let index = startIndex; index <= endIndex; index += 1) {
    if (isStringToken(tokens[index])) return tokens[index];
    if (tokens[index].value === ';') break;
  }
  return null;
}

function extractImportSpecifiers(tokens, startIndex, endIndex, moduleName) {
  const specifiers = [];
  let index = startIndex;

  while (index <= endIndex) {
    const token = tokens[index];
    if (token.value === '{') {
      const closeIndex = matchingTokenIndex(tokens, index, '{', '}');
      if (closeIndex === -1 || closeIndex > endIndex) break;
      specifiers.push(...extractNamedSpecifiers(tokens.slice(index + 1, closeIndex), moduleName));
      index = closeIndex + 1;
      continue;
    }

    if (token.value === '*') {
      const asToken = tokens[index + 1];
      const nameToken = tokens[index + 2];
      if (isIdentifierToken(asToken, 'as') && isIdentifierToken(nameToken)) {
        specifiers.push({
          name: moduleName,
          localName: nameToken.value,
          token: nameToken,
        });
      }
      break;
    }

    if (isIdentifierToken(token)) {
      specifiers.push({
        name: moduleName,
        localName: token.value,
        token,
      });
    }

    index += 1;
    if (tokens[index]?.value === ',') index += 1;
  }

  return specifiers;
}

function extractNamedSpecifiers(tokens, moduleName) {
  const specifiers = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    if (!isIdentifierToken(token)) {
      index += 1;
      continue;
    }

    let importedName = token.value;
    let localName = token.value;

    if (tokens[index + 1]?.value === 'as' && isIdentifierToken(tokens[index + 2])) {
      localName = tokens[index + 2].value;
      index += 2;
    }

    specifiers.push({
      name: importedName,
      localName,
      token,
      moduleName,
    });

    index += 1;
    while (index < tokens.length && tokens[index].value !== ',' && tokens[index].value !== '}') index += 1;
    if (tokens[index]?.value === ',') index += 1;
  }

  return specifiers;
}

function normalizeModuleName(raw) {
  return raw.slice(1, -1);
}
