# @ui-copilot/skill-templates

This package holds the Markdown instructions copied into a repo's agent-facing skill file.

## Purpose

The templates tell the agent how to:

- read the repo before editing
- plan larger changes before acting
- stay inside the UI and local-state boundary
- create handoffs for engineer-owned work
- format tracker-ready briefs
- respect validation and git workflow

## Template set

- `templates/base-skill.md`
- `templates/plan-execute.md`
- `templates/state-boundaries.md`
- `templates/handoff-workflow.md`
- `templates/linear-handoff.md`
- `templates/git-workflow.md`
- `templates/validation-workflow.md`

## Writing rules

- keep instructions direct and unambiguous
- prefer examples where they remove guesswork
- keep the wording consistent across templates
- avoid conflicting guidance between files

## What the templates should teach

1. Read the repo's configuration before editing.
2. Plan when a change spans multiple files or concepts.
3. Stay within the allowed UI scope.
4. Use `handoff()` for deferred work.
5. Run validation before pushing.
6. Export tracker-ready handoff records when needed.

## Notes

- The templates are documentation, not code
- The exact tracker adapter can vary by repo
- The instructions should survive repo-specific customization without falling apart
