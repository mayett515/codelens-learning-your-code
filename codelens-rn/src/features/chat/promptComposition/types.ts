import type { Persona } from '../../personas';
import type { RetrievedMemory } from '../../learning/retrieval/types/retrieval';

export type CodeContextKind = 'selected_code' | 'line_anchor' | 'expanded_mini_chat';

export interface ChatCodeContext {
  kind: CodeContextKind;
  text: string;
  filePath?: string | null | undefined;
  language?: string | null | undefined;
  startLine?: number | null | undefined;
  endLine?: number | null | undefined;
  precedingLines?: string | null | undefined;
  followingLines?: string | null | undefined;
}

export interface BuildChatSystemPromptInput {
  persona?: Pick<Persona, 'systemPromptLayer'> | null | undefined;
  memories?: RetrievedMemory[] | null | undefined;
  memoryInjectionOptions?: {
    tokenBudget?: number;
    maxItems?: number;
    header?: string;
  } | undefined;
  codeContext?: ChatCodeContext | null | undefined;
}
