export function buildLearningSystemPrompt(
  conceptName: string,
  conceptSummary: string,
  relatedConcepts: Array<{ name: string; summary: string }>,
): string {
  let prompt = `You are a code tutor helping someone deepen their understanding of: "${conceptName}".

Summary: ${conceptSummary}

Your role:
- Ask probing questions to test understanding
- Explain with concrete examples and analogies
- Connect ideas to practical use cases
- Keep responses concise — the user is on a phone`;

  if (relatedConcepts.length > 0) {
    prompt += '\n\nRelated concepts the learner has encountered:';
    for (const rc of relatedConcepts) {
      prompt += `\n- ${rc.name}: ${rc.summary}`;
    }
    prompt += '\n\nDraw connections to these when it deepens understanding.';
  }

  return prompt;
}
