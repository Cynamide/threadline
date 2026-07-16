
import { buildIssuePayload } from './payload.js';

export const githubAdapter                 = {
  name: 'github',
  toIssuePayload: buildIssuePayload,
};
