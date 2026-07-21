# @threadline/runtime

Runtime API for marking deferred UI work with a safe fallback.

## Install

```sh
pnpm add @threadline/runtime
```

## Use

```ts
import { handoff } from '@threadline/runtime';

const onExport = handoff({
  id: 'settings-export-csv',
  title: 'Export Data',
  description: 'CSV export should be implemented against the reporting service',
  fallback: () => alert('Export coming soon'),
});
```

`handoff()` returns a callable wrapper. Attach that wrapper to the current UI path, and Threadline can later validate and export the deferred work through the CLI.
