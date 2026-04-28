import { parseSandboxModelOutput } from './engine';
import type { SandboxChatMessage } from './types';

const assistantRaw = `
The chat renderer can treat model output as a contract: prose stays readable, while code, terms, and calculations become clickable surfaces.

\`\`\`codelens-chat-engine
{
  "prose": "Here is a tiny React Native chat brick renderer. Click a code line to move under the abstraction layer, or click terms like model output and prompt contract to open focused explanations.",
  "codeArtifacts": [
    {
      "id": "chat-brick-renderer",
      "title": "ChatBrickRenderer.tsx",
      "language": "tsx",
      "code": "import { Pressable, Text, View } from 'react-native';\\n\\ntype Brick = { label: string; detail: string };\\n\\nexport function ChatBrickRenderer({ bricks }: { bricks: Brick[] }) {\\n  return (\\n    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>\\n      {bricks.map((brick) => (\\n        <Pressable key={brick.label} onPress={() => inspect(brick)}>\\n          <Text>{brick.label}</Text>\\n        </Pressable>\\n      ))}\\n    </View>\\n  );\\n}",
      "layers": [
        {
          "id": "imports",
          "kind": "imports",
          "title": "Imports",
          "summary": "The renderer only needs platform-safe React Native primitives.",
          "detail": "Pressable gives the click target, Text keeps inline copy accessible, and View owns the flex-wrap layout that makes bricks work on desktop and mobile widths.",
          "lineStart": 1,
          "lineEnd": 1
        },
        {
          "id": "data-shape",
          "kind": "state",
          "title": "Brick Data Shape",
          "summary": "Each highlighted word is data first, UI second.",
          "detail": "The model should emit stable ids, labels, summaries, and prompt hooks. The visual layer should not infer meaning from raw prose when the model can provide a structured contract.",
          "lineStart": 3,
          "lineEnd": 3
        },
        {
          "id": "render-loop",
          "kind": "render",
          "title": "Render Loop",
          "summary": "The map call turns semantic terms into clickable visual bricks.",
          "detail": "This is where the chat message becomes inspectable. In the full engine this target opens a dynamic window with the term explanation, related code layer, or calculation trace.",
          "lineStart": 7,
          "lineEnd": 12
        }
      ]
    }
  ],
  "terms": [
    {
      "id": "model-output",
      "label": "model output",
      "summary": "The raw assistant response before the UI renders it.",
      "detail": "For this sandbox, model output can include a fenced JSON block that describes code artifacts, abstraction layers, important terms, and calculations.",
      "promptHook": "Emit prose plus one codelens-chat-engine JSON block whenever code should become inspectable."
    },
    {
      "id": "prompt-contract",
      "label": "prompt contract",
      "summary": "The exact structure the assistant is asked to produce.",
      "detail": "A strict prompt contract lets us line up AI output with deterministic UI behavior instead of guessing what a markdown response means.",
      "promptHook": "Require stable ids, code lines, term labels, and calculation results in the assistant output."
    },
    {
      "id": "abstraction-layer",
      "label": "abstraction layer",
      "summary": "A named view under the visible code.",
      "detail": "Examples are imports, state, API calls, render flow, and calculations. Clicking a line should select the layer that explains what that line does.",
      "promptHook": "For every code artifact, include layers with lineStart and lineEnd ranges."
    }
  ],
  "calculations": [
    {
      "id": "line-coverage",
      "label": "Layer coverage",
      "expression": "1 import line + 1 type line + 6 render lines",
      "result": "8 explained lines",
      "explanation": "The sample does not explain every blank line. It explains the lines that carry behavior so the inspector stays focused."
    }
  ]
}
\`\`\`
`.trim();

export const sandboxMessages: SandboxChatMessage[] = [
  {
    id: 'u-1',
    role: 'user',
    content:
      'Build me a desktop-testable chat engine where code output turns into visual layers and important terms become clickable bricks.',
  },
  {
    id: 'a-1',
    role: 'assistant',
    content: assistantRaw,
    parsed: parseSandboxModelOutput(assistantRaw),
  },
];
