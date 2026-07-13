# @threadline/ast-guard

`@threadline/ast-guard` is Threadline's local reviewer. It reads source files, finds places where the repo's rules are being broken, and returns structured violations before code is pushed.

It exists so the team can keep UI code inside the agreed boundaries without relying on a manual code review to catch every issue.

## What it checks

### Handoff syntax

- `id` is present and stable
- `id` is a string literal and should be kebab-case
- `title` is present
- `description` is recommended, but missing or empty descriptions are reported as `HANDOFF004`
- `fallback` is present and callable

### State boundaries

- API calls do not appear directly in UI components
- global state hooks do not appear directly in UI components
- routing and storage access stay outside the UI lane

### Styling scope

- Tailwind projects do not use global CSS files for component styling
- CSS module projects keep CSS in module files
- class names and inline styles stay within the configured strategy

### Forbidden paths

- repo-local config can mark directories that the agent must not edit

## Public surface

- `parseHandoffs(sourceCode, filePath)`
- `detectStylingViolations(filePath, strategy)`
- `detectForbiddenImports(source, filePath, whitelistedImports)`
- `validateHandoffSyntax(handoff)`
- `validateStateBoundaries(source, filePath, config)`
- `validateStylingScope(source, filePath, strategy)`
- `runValidation(options)`

## Output shape

Validation should return structured violations with:

- code
- severity
- file path
- line and column when available
- a message that tells the user what to change

## Example result

```json
{
  "passed": false,
  "summary": {
    "filesValidated": 3,
    "handoffsFound": 2,
    "errorCount": 1,
    "warningCount": 1
  }
}
```

## Notes

- Prefer structured token-aware parsing over raw string matching
- Keep messages actionable
- Make the runner fast enough for local hook use
- The output should be stable enough for CLI use, hooks, and tracker-aware automation

## How people use it

1. The CLI calls into this package during `threadline validate`.
2. The package parses handoffs and source text.
3. It reports errors and warnings with file locations and stable codes.
4. The caller decides whether to print the result, fail a hook, or export it elsewhere.

## Files to implement

- `src/parsers/handoff.js`
- `src/parsers/styling.js`
- `src/parsers/imports.js`
- `src/validators/handoff-syntax.js`
- `src/validators/state-boundary.js`
- `src/validators/styling-scope.js`
- `src/runner.js`
- `src/index.js`

## Tests

- parses handoffs from object-form calls
- extracts multiple handoffs from one file
- detects state-boundary violations
- detects styling violations
- returns stable line and column metadata
