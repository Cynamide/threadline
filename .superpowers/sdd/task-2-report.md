# Task 2 Report

Implemented the AST-backed validation migration for the owned ast-guard slice.

## Changes

- Added `@babel/parser` to `packages/ast-guard/package.json`.
- Replaced token walking in `packages/ast-guard/src/parsers/handoff.js` with Babel AST parsing and traversal.
- Rebuilt forbidden import detection in `packages/ast-guard/src/parsers/imports.js` on top of AST nodes.
- Rebuilt styling scope validation in `packages/ast-guard/src/parsers/styling.js` on top of AST nodes.
- Added a regression test covering generic handoff calls with nested callable expressions.
- Updated `packages/ast-guard/SPEC.md` and `specs/ast-validation.md` to describe AST-based validation.

## Verification

- `npm test --prefix packages/ast-guard`
- `git diff --check`

Both passed after the migration.

## Concerns

- None in the changed slice.
- The existing `validateStateBoundaries` implementation was left untouched because it was outside the requested file list for this task.

## Commit

`1afda24` - `feat(ast-guard): switch to AST parsing`

## Fix Follow-up

- Collapsed `packages/ast-guard/src/validators/styling-scope.js` into a thin re-export of the AST-backed styling validator in `packages/ast-guard/src/parsers/styling.js`.
- Added a regression test proving the public `validateStylingScope` path ignores plain JavaScript `className` variables and only validates JSX attributes.

## Verification

- `npm test --prefix packages/ast-guard`
- `git diff --check`

Both passed after the validator collapse.

## Remaining Concerns

- None in the ast-guard slice.
