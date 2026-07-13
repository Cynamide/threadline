export type Framework = 'nextjs' | 'vite' | 'cra' | 'remix' | 'custom';
export type StylingStrategy = 'tailwind' | 'styled-components' | 'emotion' | 'css-modules' | 'plain-css';
export type DesignSystemLibrary = 'shadcn' | 'mui' | 'antd' | 'radix' | 'custom' | 'none';

export interface FrameworkDetection {
  framework: Framework;
  srcPath: string;
  componentPath: string;
  devCommand: string;
  port: number;
  reasons: string[];
}

export interface StylingDetection {
  strategy: StylingStrategy;
  tailwindConfig: string | null;
  reasons: string[];
}

export interface DesignSystemDetection {
  library: DesignSystemLibrary;
  importPath: string;
}

export interface ConfigInput {
  framework: Framework;
  srcPath: string;
  componentPath: string;
  devCommand: string;
  port: number;
  styling: StylingStrategy;
  tailwindConfig: string | null;
  designSystem: DesignSystemLibrary;
  designSystemImportPath: string;
}

export interface ThreadlineConfig {
  version: string;
  project: {
    framework: Framework;
    src_path: string;
    component_path: string;
    extensions: string[];
  };
  dev: {
    run_command: string;
    port: number;
    startup_timeout: number;
  };
  styling?: {
    strategy: StylingStrategy;
    enforce_scoping: boolean;
    tailwind_config: string;
  };
  git: {
    branch_prefix: string;
    commit_style: 'conventional' | 'simple';
    squash_merge: boolean;
    pr_title_format: string;
  };
  handoff?: {
    create_issues?: boolean;
    status_on_create?: string;
    status_on_merge?: string;
    default_assignee?: string | null;
    team_id?: string | null;
  };
  boundaries: {
    forbidden_imports: string[];
    forbidden_paths: string[];
    whitelisted_imports: string[];
    whitelisted_components: string[];
  };
  validation: {
    pre_push: boolean;
    pre_commit: boolean;
    auto_fix: boolean;
    max_warnings: number;
  };
  design_system?: {
    library: DesignSystemLibrary;
    import_path: string;
    allow_new_primitives: boolean;
    component_aliases: Record<string, string>;
  };
}
