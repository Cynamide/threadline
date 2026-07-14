import type { ConfigInput } from '../types.js';

export function generateConfigYaml(input: ConfigInput): string {
  const tailwindConfig = renderNullableValue(input.tailwindConfig);
  const importPath = renderQuotedValue(input.designSystemImportPath);

  return `version: "1.0"

project:
  framework: ${input.framework}
  src_path: ${input.srcPath}
  component_path: ${input.componentPath}
  extensions:
    - .tsx
    - .ts
    - .jsx
    - .js

dev:
  run_command: ${input.devCommand}
  port: ${input.port}
  startup_timeout: 10000

styling:
  strategy: ${input.styling}
  enforce_scoping: true
  tailwind_config: ${tailwindConfig}

git:
  branch_prefix: design/
  commit_style: conventional
  squash_merge: true
  pr_title_format: "ui: {description}"

handoff:
  create_issues: true
  status_on_create: Backlog
  status_on_merge: Ready
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
  library: ${input.designSystem}
  import_path: ${importPath}
  allow_new_primitives: false
  component_aliases:
    Button: PrimaryButton
    Input: TextInput

validation:
  pre_push: true
  pre_commit: false
  auto_fix: true
  max_warnings: 0
`;
}

function renderNullableValue(value: string | null): string {
  if (value === null) return 'null';
  return value;
}

function renderQuotedValue(value: string): string {
  if (value === '') return '""';
  return `"${value}"`;
}
