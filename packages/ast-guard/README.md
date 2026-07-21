# @threadline/ast-guard

AST validation used by Threadline to find handoffs and enforce local UI boundaries.

Most users should install `@threadline/cli` instead of calling this package directly. The CLI uses ast-guard for `threadline validate` and `threadline scan-handoffs`.

## Public API

```js
import { runValidation, parseHandoffs } from '@threadline/ast-guard';
```

Use this package directly only when you are building custom tooling around Threadline validation output.
