# @threadline/runtime

`@threadline/runtime` is the app-side piece of Threadline. It gives UI code a way to mark work that should be handled later without breaking the current experience.

Use it when a screen or interaction needs a safe local fallback now, but the real implementation belongs in a deeper pass.

## Contract

`handoff()` accepts a single object argument and returns a callable wrapper that runs the fallback when invoked.

```ts
function handoff<T = void>(options: HandoffOptions<T>): () => T | Promise<T> | void;

interface HandoffOptions<T = void> {
  id: string;
  title: string;
  description?: string;
  fallback: () => T | Promise<T>;
}
```

## Behavior

- `id` is required and must be a stable string literal
- `title` is required and becomes the human-readable label for the handoff
- `description` is optional but should explain the missing implementation clearly
- `fallback` is required and must be safe to run in the current UI
- the returned wrapper is what gets attached to events or callbacks
- async fallbacks are allowed
- development mode warns when the wrapper is invoked
- production mode stays quiet and still runs the fallback

## Why this package exists

The runtime makes the handoff pattern usable inside real UI code.

Without it, teams tend to leave unfinished work as comments, TODOs, or ad hoc placeholder functions. With it, the unfinished piece has a real call shape, a safe fallback, and a stable identifier that the rest of Threadline can understand.

## How to use it

1. Import `handoff` from `@threadline/runtime`.
2. Wrap the work that needs to be deferred.
3. Provide an explicit `fallback` that keeps the UI usable.
4. Add a stable `id` and a human-readable `title`.
5. Let the CLI and AST guard find and validate the handoff later.

## Example

```ts
import { handoff } from '@threadline/runtime';

function SettingsToolbar() {
  const handleExport = handoff({
    id: 'settings-export-csv',
    title: 'Export Data',
    description: 'Trigger CSV export of the current table view',
    fallback: () => alert('Export coming soon'),
  });

  return <button onClick={handleExport}>Export</button>;
}
```

## Notes

- Keep the package small and dependency-light
- Avoid positional arguments; the object form is the only supported shape
- Preserve a stable call shape so the AST parser can identify handoffs reliably
- The fallback should be safe to run locally because it may execute in development and production

## Files to implement

- `src/types.ts`
- `src/handoff.ts`
- `src/index.ts`
- `package.json`
- `tsconfig.json`

## Tests

- executes the fallback when the wrapper is called
- returns the fallback result
- supports async fallbacks
- warns in development mode
- stays quiet in production mode
