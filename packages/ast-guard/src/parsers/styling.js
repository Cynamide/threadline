import { makeViolation } from '../location.js';

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
