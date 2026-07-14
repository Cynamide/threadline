import { buildThreadlineConfig, renderThreadlineConfig } from '../config/threadline-config.js';
import type { ConfigInput } from '../types.js';

export function generateConfigYaml(input: ConfigInput): string {
  return renderThreadlineConfig(buildThreadlineConfig(input));
}
