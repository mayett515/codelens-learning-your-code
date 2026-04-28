# sandboxtexttesting Intent

## Original user prompt

> dude u see we have a working tree here i need another working tree this one will be sandboxtexttesting and i dont know if we need another aswell branch for it or if a new working tree comes with a new branch regardless ok but in this one we will 100% i swear i swear need a kinda react native testing development where we test in its own the chats and how the chats work with the apis (like a game engine and all) but it has to be possible on the computer u know not on the phone) and then we can test graphical implementations of the chats u know. like here i in this engine wanna test like how code that gets outputed by the models gets visualized then i wanna imiplement a maybe pretext engine like ska engine or whatever the thing that pretext is build on ofc i dont mean pretext. i wanna make a "code under the hood" tool again for the chat where i click on code and it gets under the abstraction layers visually and we build a cool custom engine for that for react native aswell so the prompts the ai prompts completely can work with it aswell u know that would be amazing. we will do that very cool so the output for the code under the hood thing works perfectly with our specified ai prompts output. calculations and all. then we aswell build a maybe additionally chat layer thing where you get light bricks around different importand words where u can click on them and then for those words a new dynamic window opens explaining the term or so yeah but all for we need that engine here take your time

## Intent

This sandbox exists to develop and test a React Native chat experimentation engine on the computer, primarily through Expo web, without touching the main working tree.

The goal is to build a self-contained lab for chat behavior, API/model output handling, and graphical chat implementations. The important idea is that model responses should not just render as plain markdown. They should be parsed into a structured contract that the UI can visualize deterministically.

Core direction:

- Build a desktop-testable React Native chat lab.
- Test how chats work with APIs and model output in isolation.
- Create a "code under the hood" experience where clicking code opens visual abstraction layers.
- Align AI prompt output with the renderer so prompts can ask models for exactly the structure the engine needs.
- Support code artifacts, line ranges, abstraction layers, calculations, and explanation metadata.
- Add clickable highlighted term bricks around important words in chat messages.
- Open a dynamic explanation window/panel when a highlighted term is clicked.
- Keep this as an experimental engine area before merging ideas into the main app.

## Current Sandbox Location

`C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn`

This is now a real linked Git worktree of the main CodeLens repo. It exists to keep sandbox chat-engine experiments separate from mainline Stage 8 work.

Branch:

`sandboxtexttesting-worktree`

Historical note: an earlier accidental standalone copy existed at `C:\Projects\CodeLensApp\sandboxtexttesting\codelens-rn`. Its useful files were copied into this real worktree before cleanup.

## First Implementation Slice

The first pass added a structured chat engine prototype:

- `src/features/sandbox-chat-engine/types.ts`
- `src/features/sandbox-chat-engine/engine.ts`
- `src/features/sandbox-chat-engine/sampleData.ts`
- `src/features/sandbox-chat-engine/ui/SandboxChatEngineScreen.tsx`
- `src/features/sandbox-chat-engine/__tests__/engine.test.ts`
- `app/sandboxtexttesting.tsx`

The route is:

`/sandboxtexttesting`

The home screen also has a `Sandbox` button that navigates there.

## Verification Notes

TypeScript passed with:

```powershell
node_modules\.bin\tsc.cmd --noEmit --project C:\Projects\CodeLensApp\sandboxtexttesting\codelens-rn\tsconfig.json
```

Vitest and Expo Metro could not fully run inside the Codex sandbox because Windows process spawning was blocked with `spawn EPERM`. Expo did reach `http://localhost:8082` before Metro worker startup failed.

To run locally as the normal user:

```powershell
cd C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn
npm run web -- --port 8082
```

Then open:

`http://localhost:8082/sandboxtexttesting`

## Next Session Starting Point

Continue from the sandbox engine. The next useful step is to replace the sample data with a real model/API adapter that can request the `codelens-chat-engine` contract from a model, then render the response through the existing parser and inspector UI.
