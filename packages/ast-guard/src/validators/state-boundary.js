import { getLineColumn, makeViolation } from '../location.js';
import { matchesAnyGlob } from '../scan.js';

const STATE_RULES = [
  { code: 'STATE001', name: 'fetch', pattern: /\bfetch\s*\(/g },
  { code: 'STATE002', name: 'axios', pattern: /\baxios(?:\s*\(|\s*\.)/g },
  { code: 'STATE003', name: 'useSWR', pattern: /\buseSWR\s*\(/g },
  { code: 'STATE004', name: 'useQuery', pattern: /\buseQuery\s*\(/g },
  { code: 'STATE005', name: 'Redux hooks', pattern: /\b(?:useDispatch|useSelector)\s*\(/g },
  { code: 'STATE006', name: 'browser storage', pattern: /\b(?:localStorage|sessionStorage)\s*\./g },
  { code: 'STATE007', name: 'router navigation', pattern: /\b(?:useNavigate\s*\(|navigate\s*\(|router\.push\s*\()/g },
];

export function validateStateBoundaries(source, filePath, config = {}) {
  if (!isUiComponent(filePath, config) || isWhitelistedComponent(filePath, config)) {
    return [];
  }

  const executableSource = stripImportLines(source);
  const violations = [];

  for (const rule of STATE_RULES) {
    for (const match of executableSource.matchAll(rule.pattern)) {
      const location = getLineColumn(source, match.index);
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

function stripImportLines(source) {
  return source
    .split('\n')
    .map((line) => (/^\s*import\b/.test(line) ? ''.padEnd(line.length, ' ') : line))
    .join('\n');
}
