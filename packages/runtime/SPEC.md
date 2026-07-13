# @ui-copilot/runtime

The runtime package provides the `handoff()` API that marks work the agent should not implement directly.

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

## Example

```ts
import { handoff } from '@ui-copilot/runtime';

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
