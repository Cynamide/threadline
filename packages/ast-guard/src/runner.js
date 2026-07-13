import { existsSync, readFileSync } from 'node:fs';

import { parseHandoffs } from './parsers/handoff.js';
import { detectStylingViolations } from './parsers/styling.js';
import { validateHandoffSyntax } from './validators/handoff-syntax.js';
import { validateStateBoundaries } from './validators/state-boundary.js';
import { validateStylingScope } from './validators/styling-scope.js';
import { detectForbiddenImports } from './parsers/imports.js';
import { makeViolation } from './location.js';

const DEFAULT_CONFIG = {
  project: {
    src_path: 'src',
    component_path: 'components',
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.css'],
  },
  styling: {
    strategy: 'tailwind',
    enforce_scoping: true,
  },
  boundaries: {
    forbidden_imports: [],
    forbidden_paths: ['src/api/', 'src/store/'],
    whitelisted_imports: [],
    whitelisted_components: [],
  },
};

export function runValidation(options = {}) {
  const config = mergeConfig(DEFAULT_CONFIG, options.config ?? {});
  const files = normalizeFiles(options.files ?? options.filePaths ?? []);
  const violations = [];
  let handoffsFound = 0;

  for (const file of files) {
    const source = file.source ?? readSource(file.filePath);
    violations.push(...validateForbiddenPath(file.filePath, config));
    violations.push(...detectStylingViolations(file.filePath, config.styling.strategy));

    if (isSourceFile(file.filePath, config)) {
      const handoffs = parseHandoffs(source, file.filePath);
      handoffsFound += handoffs.length;
      for (const handoff of handoffs) {
        violations.push(...validateHandoffSyntax(handoff));
      }
      violations.push(
        ...detectForbiddenImports(source, file.filePath, config.boundaries.whitelisted_imports),
        ...validateStateBoundaries(source, file.filePath, config),
      );
      if (config.styling.enforce_scoping) {
        violations.push(...validateStylingScope(source, file.filePath, config.styling.strategy));
      }
    }
  }

  const errorCount = violations.filter((violation) => violation.severity === 'error').length;
  const warningCount = violations.filter((violation) => violation.severity === 'warning').length;
  const maxWarnings = options.maxWarnings ?? config.validation?.max_warnings;
  const warningsAllowed = typeof maxWarnings === 'number' ? warningCount <= maxWarnings : true;

  return {
    passed: errorCount === 0 && warningsAllowed,
    summary: {
      filesValidated: files.length,
      handoffsFound,
      errorCount,
      warningCount,
    },
    violations,
  };
}

function normalizeFiles(files) {
  return files.map((file) => (typeof file === 'string' ? { filePath: file } : file));
}

function readSource(filePath) {
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
}

function isSourceFile(filePath, config) {
  const extensions = config.project.extensions ?? DEFAULT_CONFIG.project.extensions;
  return extensions.some((extension) => filePath.endsWith(extension)) && !filePath.endsWith('.css');
}

function validateForbiddenPath(filePath, config) {
  const forbiddenPaths = config.boundaries?.forbidden_paths ?? [];
  const violations = [];

  for (const forbiddenPath of forbiddenPaths) {
    if (!filePath.startsWith(forbiddenPath)) continue;
    violations.push(
      makeViolation({
        code: pathCode(forbiddenPath),
        filePath,
        message: `Do not edit ${forbiddenPath}; move this change back inside the allowed UI scope.`,
      }),
    );
  }

  return violations;
}

function pathCode(forbiddenPath) {
  if (forbiddenPath.startsWith('src/api/')) return 'PATH001';
  if (forbiddenPath.startsWith('src/store/')) return 'PATH002';
  return 'PATH001';
}

function mergeConfig(defaultConfig, config) {
  return {
    ...defaultConfig,
    ...config,
    project: { ...defaultConfig.project, ...(config.project ?? {}) },
    styling: { ...defaultConfig.styling, ...(config.styling ?? {}) },
    boundaries: { ...defaultConfig.boundaries, ...(config.boundaries ?? {}) },
    validation: { ...(defaultConfig.validation ?? {}), ...(config.validation ?? {}) },
  };
}
