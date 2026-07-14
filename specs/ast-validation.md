# AST Validation Specification

This document defines the local validation rules enforced before a push. The implementation uses a real AST parser so validation follows syntax structure instead of token heuristics.

## Rule groups

### Handoff syntax

`handoff()` calls must use the object form and include:

- `id`
- `title`
- `fallback`

`description` is recommended and should be present whenever the missing implementation needs context.

#### Errors

- `HANDOFF001` - missing `id`
- `HANDOFF002` - `id` is not kebab-case
- `HANDOFF003` - missing `title`
- `HANDOFF004` - missing `description` or empty description
- `HANDOFF005` - missing `fallback`

### State boundaries

UI components must not directly contain architectural behavior that belongs to the engineer lane.

#### Errors

- `STATE001` - `fetch` outside an allowed handoff context
- `STATE002` - `axios` outside an allowed handoff context
- `STATE003` - `useSWR` outside an allowed handoff context
- `STATE004` - `useQuery` outside an allowed handoff context
- `STATE005` - Redux hooks in a UI component
- `STATE006` - localStorage or sessionStorage access in a UI component
- `STATE007` - router navigation in a UI component

### Styling scope

Styling must match the configured strategy.

#### Errors

- `STYLE001` - global CSS in a Tailwind project
- `STYLE002` - class name does not fit the configured styling strategy
- `STYLE003` - non-module CSS file in CSS modules mode

### Forbidden paths

Some paths are always outside the agent's edit scope.

#### Errors

- `PATH001` - modified `src/api/`
- `PATH002` - modified `src/store/`

## Output contract

Validation should report:

- file path
- line and column when available
- severity
- code
- message

Text output should be easy to scan in a terminal. JSON output should be stable enough for the CLI and hook runner to consume.

## Examples

### Missing id

```ts
handoff({
  title: 'Export Data',
  fallback: () => alert('Coming soon'),
});
```

### Styling violation

```ts
<button className="my-custom-button">Save</button>
```

## Notes

- Prefer explicit AST rules over regex or token scans
- Keep the messages actionable
- Do not hide boundary violations behind generic failures
