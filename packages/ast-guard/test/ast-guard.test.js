import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  detectForbiddenImports,
  detectForbiddenImportsWithConfig,
  detectStylingViolations,
  parseHandoffs,
  runValidation,
  validateHandoffSyntax,
  validateStateBoundaries,
  validateStylingScope,
} from '../src/index.js';

test('parseHandoffs extracts multiple object-form handoffs with stable locations', () => {
  const source = [
    "import { handoff } from '@threadline/runtime';",
    '',
    'export function Toolbar() {',
    '  const exportAction = handoff({',
    "    id: 'export-data',",
    "    title: 'Export Data',",
    "    description: 'Export needs a backend job.',",
    "    fallback: () => alert('Export queued'),",
    '  });',
    '',
    '  return handoff({',
    "    id: 'save-draft',",
    "    title: 'Save Draft',",
    "    fallback: function fallback() { return null; },",
    '  });',
    '}',
  ].join('\n');

  const handoffs = parseHandoffs(source, 'src/components/Toolbar.tsx');

  assert.equal(handoffs.length, 2);
  assert.deepEqual(
    handoffs.map((handoff) => ({
      id: handoff.id,
      title: handoff.title,
      description: handoff.description,
      line: handoff.line,
      column: handoff.column,
    })),
    [
      {
        id: 'export-data',
        title: 'Export Data',
        description: 'Export needs a backend job.',
        line: 4,
        column: 24,
      },
      {
        id: 'save-draft',
        title: 'Save Draft',
        description: undefined,
        line: 11,
        column: 10,
      },
    ],
  );
  assert.equal(handoffs[0].fallback.callable, true);
  assert.equal(handoffs[1].fallback.callable, true);
});

test('parseHandoffs treats bare identifiers as callable fallbacks', () => {
  const [handoff] = parseHandoffs(
    [
      'handoff({',
      "  id: 'export-data',",
      "  title: 'Export Data',",
      '  fallback: onExportQueued,',
      '});',
    ].join('\n'),
    'src/components/ExportButton.tsx',
  );

  assert.equal(handoff.fallback.callable, true);
});

test('parseHandoffs accepts generic handoff calls', () => {
  const [handoff] = parseHandoffs(
    [
      'handoff<string>({',
      "  id: 'typed-handoff',",
      "  title: 'Typed Handoff',",
      '  fallback: () => null,',
      '});',
    ].join('\n'),
    'src/components/Typed.tsx',
  );

  assert.equal(handoff.id, 'typed-handoff');
  assert.equal(handoff.title, 'Typed Handoff');
  assert.equal(handoff.fallback.callable, true);
});

test('parseHandoffs keeps working for generic handoff calls and nested expressions', () => {
  const source = [
    'const wrapped = handoff<string>({',
    "  id: 'typed-handoff',",
    "  title: 'Typed Handoff',",
    "  fallback: makeFallback<string>('ready'),",
    '});',
  ].join('\n');

  const [handoff] = parseHandoffs(source, 'src/components/Typed.tsx');

  assert.equal(handoff.id, 'typed-handoff');
  assert.equal(handoff.title, 'Typed Handoff');
  assert.equal(handoff.fallback.callable, true);
});

test('validateHandoffSyntax reports documented handoff codes and description error', () => {
  const [handoff] = parseHandoffs(
    [
      'handoff({',
      "  id: 'ExportData',",
      "  description: '',",
      '});',
    ].join('\n'),
    'src/components/ExportButton.tsx',
  );

  const violations = validateHandoffSyntax(handoff);

  assert.deepEqual(
    violations.map(({ code, severity, line, column }) => ({ code, severity, line, column })),
    [
      { code: 'HANDOFF002', severity: 'error', line: 2, column: 7 },
      { code: 'HANDOFF003', severity: 'error', line: 1, column: 1 },
      { code: 'HANDOFF004', severity: 'error', line: 3, column: 16 },
      { code: 'HANDOFF005', severity: 'error', line: 1, column: 1 },
    ],
  );
});

test('validateHandoffSyntax rejects non-callable fallback expressions', () => {
  const handoffs = parseHandoffs(
    [
      'handoff({',
      "  id: 'false-fallback',",
      "  title: 'False Fallback',",
      '  fallback: false,',
      '});',
      '',
      'handoff({',
      "  id: 'paren-fallback',",
      "  title: 'Paren Fallback',",
      '  fallback: (0),',
      '});',
      '',
      'handoff({',
      "  id: 'binary-fallback',",
      "  title: 'Binary Fallback',",
      '  fallback: count + 1,',
      '});',
      '',
      'handoff({',
      "  id: 'ternary-fallback',",
      "  title: 'Ternary Fallback',",
      '  fallback: maybe ? a : b,',
      '});',
    ].join('\n'),
    'src/components/Example.tsx',
  );

  assert.deepEqual(
    handoffs.map((handoff) => validateHandoffSyntax(handoff).some((violation) => violation.code === 'HANDOFF005')),
    [true, true, true, true],
  );
});

test('validateStateBoundaries detects UI state violations including unsafe fallback bodies', () => {
  const source = [
    'export function ProfileCard() {',
    '  const user = useSelector((state) => state.user);',
    '  const open = () => useNavigate()("/settings");',
    '  return handoff({',
    "    id: 'load-profile',",
    "    title: 'Load Profile',",
    "    description: 'Needs API integration.',",
    '    fallback: () => fetch("/api/profile"),',
    '  });',
    '}',
  ].join('\n');

  const violations = validateStateBoundaries(source, 'src/components/ProfileCard.tsx', {
    project: { src_path: 'src', component_path: 'components' },
    boundaries: { whitelisted_components: [] },
  });

  assert.deepEqual(
    violations.map(({ code, line, column }) => ({ code, line, column })),
    [
      { code: 'STATE005', line: 2, column: 16 },
      { code: 'STATE007', line: 3, column: 22 },
      { code: 'STATE001', line: 8, column: 21 },
    ],
  );
});

test('validateStateBoundaries honors whitelisted imports for matching state rules', () => {
  const source = [
    'export function SearchBox() {',
    '  const query = useQuery();',
    '  return query;',
    '}',
  ].join('\n');

  const violations = validateStateBoundaries(source, 'src/components/SearchBox.tsx', {
    project: { src_path: 'src', component_path: 'components' },
    boundaries: { whitelisted_imports: ['useQuery'], whitelisted_components: [] },
  });

  assert.deepEqual(violations, []);
});

test('detectForbiddenImports reports configured import names unless whitelisted', () => {
  const source = [
    "import axios from 'axios';",
    "import { useQuery, useMutation } from '@tanstack/react-query';",
    "import { Button } from '@/components/ui/button';",
  ].join('\n');

  const violations = detectForbiddenImports(source, 'src/components/SearchBox.tsx', ['useMutation']);

  assert.deepEqual(
    violations.map(({ code, message, line, column }) => ({ code, message, line, column })),
    [
      {
        code: 'STATE002',
        message: 'Move axios usage out of the UI component or add an explicit whitelist entry.',
        line: 1,
        column: 8,
      },
      {
        code: 'STATE004',
        message: 'Move useQuery usage out of the UI component or add an explicit whitelist entry.',
        line: 2,
        column: 10,
      },
    ],
  );
});

test('detectForbiddenImportsWithConfig reports forbidden dynamic imports', () => {
  const source = [
    'export async function loadWidget() {',
    "  return await import('axios');",
    '}',
  ].join('\n');

  const violations = detectForbiddenImportsWithConfig(source, 'src/components/Loader.tsx', [], ['axios']);

  assert.deepEqual(
    violations.map(({ code, message, line, column }) => ({ code, message, line, column })),
    [
      {
        code: 'STATE002',
        message: 'Move axios usage out of the UI component or add an explicit whitelist entry.',
        line: 2,
        column: 23,
      },
    ],
  );
});

test('detectForbiddenImportsWithConfig reports configured forbidden module paths', () => {
  const source = "import api from '@/services/api';";
  const violations = detectForbiddenImportsWithConfig(source, 'src/components/Loader.tsx', [], ['@/services/api']);

  assert.equal(violations.length, 1);
  assert.equal(violations[0].code, 'STATE002');
  assert.equal(violations[0].filePath, 'src/components/Loader.tsx');
});

test('runValidation honors configured forbidden imports and wildcard paths', () => {
  const result = runValidation({
    files: [
      {
        filePath: 'src/components/Example.tsx',
        source: [
          "import axios from 'axios';",
          "import { useQuery } from '@tanstack/react-query';",
          'export const Example = () => null;',
        ].join('\n'),
      },
      { filePath: 'src/hooks/useAuth.ts', source: 'export const useAuth = () => null;' },
    ],
    config: {
      project: { src_path: 'src', component_path: 'components', extensions: ['.tsx', '.ts'] },
      styling: { strategy: 'tailwind', enforce_scoping: false },
      boundaries: {
        forbidden_imports: ['useQuery'],
        forbidden_paths: ['src/hooks/useAuth*'],
        whitelisted_imports: [],
        whitelisted_components: [],
      },
    },
  });

  assert.deepEqual(
    result.violations.map(({ code, filePath }) => ({ code, filePath })),
    [
      { code: 'STATE004', filePath: 'src/components/Example.tsx' },
      { code: 'PATH001', filePath: 'src/hooks/useAuth.ts' },
    ],
  );
});

test('styling validators enforce Tailwind and CSS modules strategies', () => {
  assert.equal(detectStylingViolations('src/components/button.css', 'tailwind')[0].code, 'STYLE001');
  assert.equal(detectStylingViolations('src/components/button.css', 'css-modules')[0].code, 'STYLE003');

  const tailwindViolations = validateStylingScope(
    '<button className="px-4 my-custom-button">Save</button>',
    'src/components/Button.tsx',
    'tailwind',
  );
  const tailwindBraceViolations = validateStylingScope(
    '<button className={"px-4 my-custom-button"}>Save</button>',
    'src/components/Button.tsx',
    'tailwind',
  );
  const cssModuleViolations = validateStylingScope(
    '<button className="primary">Save</button>',
    'src/components/Button.tsx',
    'css-modules',
  );

  assert.deepEqual(tailwindViolations.map(({ code }) => code), ['STYLE002']);
  assert.deepEqual(tailwindBraceViolations.map(({ code }) => code), ['STYLE002']);
  assert.deepEqual(cssModuleViolations.map(({ code }) => code), ['STYLE002']);
});

test('validateStylingScope ignores plain JavaScript className variables', () => {
  const violations = validateStylingScope(
    [
      'const className = "px-4 my-custom-button";',
      'export function Button() {',
      '  return <button className="px-4">Save</button>;',
      '}',
    ].join('\n'),
    'src/components/Button.tsx',
    'tailwind',
  );

  assert.deepEqual(violations, []);
});

test('runValidation returns stable summary and forbidden path violations', () => {
  const source = [
    'export function ExportButton() {',
    '  return handoff({',
    "    id: 'export-data',",
    "    title: 'Export Data',",
    '    fallback: () => null,',
    '  });',
    '}',
  ].join('\n');

  const result = runValidation({
    files: [
      { filePath: 'src/components/ExportButton.tsx', source },
      { filePath: 'src/api/client.ts', source: 'export const client = {};' },
      { filePath: 'src/components/global.css', source: '.button {}' },
    ],
    config: {
      project: { src_path: 'src', component_path: 'components', extensions: ['.tsx', '.ts', '.css'] },
      styling: { strategy: 'tailwind', enforce_scoping: true },
      boundaries: {
        forbidden_paths: ['src/api/', 'src/store/'],
        forbidden_imports: [],
        whitelisted_imports: [],
        whitelisted_components: [],
      },
    },
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.summary, {
    filesValidated: 3,
    handoffsFound: 1,
    errorCount: 3,
    warningCount: 0,
  });
  assert.deepEqual(
    result.violations.map(({ code, filePath }) => ({ code, filePath })),
    [
      { code: 'HANDOFF004', filePath: 'src/components/ExportButton.tsx' },
      { code: 'PATH001', filePath: 'src/api/client.ts' },
      { code: 'STYLE001', filePath: 'src/components/global.css' },
    ],
  );
});
