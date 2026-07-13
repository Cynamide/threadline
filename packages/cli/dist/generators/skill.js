export function generateSkillMarkdown()         {
  return `# Threadline Agent Skill

Before changing UI code in this repo:

1. Run \`threadline validate\` to check the current boundary state.
2. Use \`handoff({ id, title, description })\` when implementation needs data,
   routing, persistence, or tracker-owned follow-up work.
3. Run \`threadline scan-handoffs --json\` before export so tracker records stay
   structured and portable.
4. Run \`threadline validate --staged\` before pushing.
`;
}
