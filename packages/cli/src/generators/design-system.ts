import type { DesignSystemLibrary } from '../types.js';

export function generateDesignSystemMarkdown(input: { library: DesignSystemLibrary; importPath: string }): string {
  return `# Threadline Design System

Library: ${input.library}
Import path: ${input.importPath || 'none'}

Use existing primitives before creating new UI building blocks. The generated
configuration keeps \`allow_new_primitives\` false so new primitives stay an
explicit design decision.
`;
}
