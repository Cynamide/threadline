# @threadline/ast-guard

The AST guard parses source files and reports violations before code is pushed.

## What it checks

### Handoff syntax

- `id` is present and stable
- `id` is a string literal and should be kebab-case
- `title` is present
- `description` is recommended
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

## Files to implement

- `src/parsers/handoff.ts`
- `src/parsers/styling.ts`
- `src/parsers/imports.ts`
- `src/validators/handoff-syntax.ts`
- `src/validators/state-boundary.ts`
- `src/validators/styling-scope.ts`
- `src/runner.ts`
- `src/index.ts`

## Tests

- parses handoffs from object-form calls
- extracts multiple handoffs from one file
- detects state-boundary violations
- detects styling violations
- returns stable line and column metadata
