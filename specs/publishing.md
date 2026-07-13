# Publishing Specification

UI Copilot is a workspace of independently published packages.

## Packages

- `@ui-copilot/runtime`
- `@ui-copilot/cli`
- `@ui-copilot/ast-guard`
- `@ui-copilot/skill-templates`

## Versioning

- use semver
- version packages independently
- keep breaking changes explicit in changesets

## Release flow

1. create a release branch
2. update package versions with Changesets
3. run tests and builds
4. publish the package set
5. tag the release

## Package metadata

Each publishable package should carry:

- name
- version
- description
- repository reference
- license
- public publish config

## Automation

Publishing can be automated, but release automation is separate from the local validation path used by the agent during editing.

## Checks before release

- tests pass
- builds pass
- package metadata looks correct
- generated artifacts are present

## Notes

- keep the runtime package lean
- keep the CLI focused on repo workflow
- keep release notes tied to Changesets
