import { useCallback, type RefObject } from 'react';
import { buildChatSystemPrompt } from '../promptComposition/buildChatSystemPrompt';
import type { Persona } from '../../personas';
import type { RetrievedMemory } from '../../learning/retrieval/types/retrieval';
import type { ChatCodeContext } from '../promptComposition/types';

export function useChatPromptContext(input: {
  persona: Pick<Persona, 'systemPromptLayer'> | null | undefined;
  memoriesRef: RefObject<RetrievedMemory[]>;
  codeContext: ChatCodeContext | null;
}) {
  const { persona, memoriesRef, codeContext } = input;
  return useCallback(
    () =>
      buildChatSystemPrompt({
        persona: persona ?? null,
        memories: memoriesRef.current,
        codeContext,
      }),
    [codeContext, memoriesRef, persona],
  );
}
