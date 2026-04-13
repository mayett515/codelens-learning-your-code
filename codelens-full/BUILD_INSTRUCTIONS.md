# CodeLens Build Instructions

## Current Build Path (April 2026)

Use this path for reliable local builds:

1. From `codelens-full`:
   - `npm install`
   - `npx cap sync`
2. From `codelens-full/android`:
   - `.\build-local.ps1 compileDebugSources`
   - `.\build-local.ps1 assembleDebug`
3. APK output:
   - `android/app/build/outputs/apk/debug/app-debug.apk`

Notes:
- `build-local.ps1` auto-detects Java from Android Studio JBR.
- `build-local.ps1` sets a project-local Gradle home by default.
- If Gradle lock issues appear, rerun `.\build-local.ps1 tasks`.

## Current Core UX Summary

- Project screen supports `View` mode and `Mark` mode.
- Recent chats screen supports search + incremental loading.
- Chat header action is `Save as Learning` with preview-before-save flow.
- Learning screen includes session list, concept explorer, and graph view.

---
Legacy instructions from the original package format are preserved below.

## Features Included
- 📦 Import from GitHub (paste repo URL)
- 📋 Paste code directly
- 🎨 Mark lines with colors (red, green, yellow, blue, purple)
- 💬 Chat about marked sections (auto-explains)
- 🔖 Bookmark any message
- 📁 Save answers to folders
- 💎 Gems (prompt templates with icons & colors)
- 🤖 Avatar personas for chatting
- 💬 General chat area
- 🔄 Multi-API: Gemini, DeepSeek, OpenRouter
- 📤 Export/Import backup
- 🎨 Colored chat bubble borders
- 🏷️ Custom color names

## Build Steps

1. Extract this ZIP

2. Open terminal in extracted folder

3. Install dependencies:
   ```
   npm install
   ```

4. Sync Capacitor:
   ```
   npx cap sync
   ```

5. Open Android Studio → Open → select the `android` folder

6. Wait for Gradle sync to finish

7. Build → Build Bundle(s) / APK(s) → Build APK(s)

8. Get your APK from: android/app/build/outputs/apk/debug/app-debug.apk

## First Time Setup

1. Open the app
2. Go to Settings (⚙️)
3. Enter your API key(s):
   - Gemini: Get from https://aistudio.google.com
   - DeepSeek: Get from https://platform.deepseek.com
   - OpenRouter: Get from https://openrouter.ai
4. Tap which API to use as active
5. Save Settings

## Usage

1. **Home** - Import GitHub repo or paste code
2. **Project** - Tap lines to mark with colors, tap marked section to chat
3. **Gems** - Create prompt templates (icon + color + prompt)
4. **Snippets** - View saved AI answers
5. **Settings** - API keys, color names, backup

Enjoy! 🚀
