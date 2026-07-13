import { getLineColumn, makeViolation } from '../location.js';
import { matchesAnyGlob } from '../scan.js';
import { isIdentifierToken, tokenize } from '../tokenize.js';

const STATE_RULES = [
  { code: 'STATE001', name: 'fetch', sequence: ['fetch', '('] },
  { code: 'STATE002', name: 'axios', sequence: ['axios', '('] },
  { code: 'STATE002', name: 'axios', sequence: ['axios', '.'] },
  { code: 'STATE003', name: 'useSWR', sequence: ['useSWR', '('] },
  { code: 'STATE004', name: 'useQuery', sequence: ['useQuery', '('] },
  { code: 'STATE005', name: 'Redux hooks', sequence: ['useDispatch', '('] },
  { code: 'STATE005', name: 'Redux hooks', sequence: ['useSelector', '('] },
  { code: 'STATE006', name: 'browser storage', sequence: ['localStorage', '.'] },
  { code: 'STATE006', name: 'browser storage', sequence: ['sessionStorage', '.'] },
  { code: 'STATE007', name: 'router navigation', sequence: ['useNavigate', '('] },
  { code: 'STATE007', name: 'router navigation', sequence: ['navigate', '('] },
  { code: 'STATE007', name: 'router navigation', sequence: ['router', '.', 'push', '('] },
];

export function validateStateBoundaries(source, filePath, config = {}) {
  if (!isUiComponent(filePath, config) || isWhitelistedComponent(filePath, config)) {
    return [];
  }

  const tokens = tokenize(source);
  const whitelistedImports = new Set(config.boundaries?.whitelisted_imports ?? []);
  const violations = [];

  for (const rule of STATE_RULES) {
    if (whitelistedImports.has(rule.sequence[0])) continue;

    for (let index = 0; index < tokens.length; index += 1) {
      if (matchesSequence(tokens, index, rule.sequence)) {
        const location = getLineColumn(source, tokens[index].start);
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
    }
  }

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

function matchesSequence(tokens, startIndex, sequence) {
  for (let offset = 0; offset < sequence.length; offset += 1) {
    const token = tokens[startIndex + offset];
    if (!token) return false;
    if (token.value !== sequence[offset]) return false;
  }

  if (startIndex > 0 && isIdentifierToken(tokens[startIndex - 1])) {
    return false;
  }

  return true;
}
