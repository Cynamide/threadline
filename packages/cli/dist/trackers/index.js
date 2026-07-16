import { githubAdapter } from './github.js';
import { linearAdapter } from './linear.js';

export { githubAdapter, linearAdapter };

export function resolveTrackerAdapter(name             )                 {
  if (name === 'linear') {
    return linearAdapter;
  }
  return githubAdapter;
}
