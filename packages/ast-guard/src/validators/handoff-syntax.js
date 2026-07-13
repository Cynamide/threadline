import { makeViolation } from '../location.js';

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validateHandoffSyntax(handoff) {
  const violations = [];
  const baseLocation = {
    filePath: handoff.filePath,
    line: handoff.line,
    column: handoff.column,
  };

  if (!handoff.properties.id?.value) {
    violations.push(
      makeViolation({
        ...baseLocation,
        code: 'HANDOFF001',
        message: 'Add a stable string literal id to this handoff.',
      }),
    );
  } else if (!KEBAB_CASE.test(handoff.properties.id.value)) {
    violations.push(
      makeViolation({
        code: 'HANDOFF002',
        filePath: handoff.filePath,
        line: handoff.properties.id.line,
        column: handoff.properties.id.column,
        message: 'Change the handoff id to kebab-case, for example "export-data".',
      }),
    );
  }

  if (!handoff.properties.title?.value) {
    violations.push(
      makeViolation({
        ...baseLocation,
        code: 'HANDOFF003',
        message: 'Add a short title that describes the deferred work.',
      }),
    );
  }

  if (!handoff.properties.description?.value?.trim()) {
    const location = handoff.properties.description ?? baseLocation;
    violations.push(
      makeViolation({
        code: 'HANDOFF004',
        severity: 'warning',
        filePath: handoff.filePath,
        line: location.line,
        column: location.column,
        message: 'Add a description with enough context for the implementation handoff.',
      }),
    );
  }

  if (!handoff.fallback?.callable) {
    violations.push(
      makeViolation({
        ...baseLocation,
        code: 'HANDOFF005',
        message: 'Add a callable fallback so the UI remains usable while the work is deferred.',
      }),
    );
  }

  return violations;
}
