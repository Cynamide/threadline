

export function buildIssuePayload(record               )                      {
  return {
    title: `Handoff: ${record.title}`,
    description: record.description,
    location: `${record.filePath}:${record.line}`,
    labels: ['threadline', 'handoff'],
    priority: record.valid ? 'medium' : 'high',
    status: 'Backlog',
  };
}
