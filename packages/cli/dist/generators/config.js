import { buildThreadlineConfig, renderThreadlineConfig } from '../config/threadline-config.js';

export function generateConfigYaml(input             )         {
  return renderThreadlineConfig(buildThreadlineConfig(input));
}
