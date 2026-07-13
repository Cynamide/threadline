# Config Schema Specification

This file defines the shape of `.ui-copilot/config.yaml`, the repo-local configuration written by `ui-copilot init`.

## Goals

- keep the important decisions explicit
- make the validator's job straightforward
- leave room for repo-specific overrides without changing the schema shape

## Schema

```yaml
version: "1.0"

project:
  framework: nextjs # nextjs | vite | cra | remix | custom
  src_path: src
  component_path: components
  extensions:
    - .tsx
    - .ts
    - .jsx
    - .js

dev:
  run_command: npm run dev
  port: 3000
  startup_timeout: 10000

styling:
  strategy: tailwind # tailwind | styled-components | emotion | css-modules | plain-css
  enforce_scoping: true
  tailwind_config: tailwind.config.ts

git:
  branch_prefix: design/
  commit_style: conventional # conventional | simple
  squash_merge: true
  pr_title_format: "ui: {description}"

handoff:
  create_linear_issues: true
  linear_status_on_create: Backlog
  linear_status_on_merge: Ready
  default_assignee: null
  team_id: null

boundaries:
  forbidden_imports:
    - fetch
    - axios
    - useSWR
    - useQuery
    - useDispatch
    - useSelector
    - useNavigate
    - localStorage
    - sessionStorage
  forbidden_paths:
    - src/api/
    - src/store/
    - src/hooks/useAuth*
    - src/services/
  whitelisted_imports: []
  whitelisted_components:
    - src/providers/**
    - src/layouts/**

design_system:
  library: shadcn # shadcn | mui | antd | radix | custom | none
  import_path: "@/components/ui"
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton
    Input: TextInput

validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
```

## Notes

- `project.component_path` is relative to `project.src_path`
- `allow_new_primitives` stays `false` for this product
- `validation.pre_push` is the default enforcement point
- repo-specific overrides should stay in this file, not in the code

## Validation rules

- required fields must be present
- enum values must be valid
- paths must be relative
- ports must be valid numbers

## Common configurations

### Next.js + Tailwind + shadcn

```yaml
project:
  framework: nextjs
  src_path: src
  component_path: components
dev:
  run_command: npm run dev
  port: 3000
styling:
  strategy: tailwind
  enforce_scoping: true
design_system:
  library: shadcn
  import_path: "@/components/ui"
  allow_new_primitives: false
```

### Vite + CSS modules

```yaml
project:
  framework: vite
  src_path: src
dev:
  run_command: npm run dev
  port: 5173
styling:
  strategy: css-modules
  enforce_scoping: true
design_system:
  library: none
```
