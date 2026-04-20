# Keyboard Overlap Fix

**Date:** 2026-04-20
**Issue:** Keyboard appeared over input fields on Android across chat screens, NewProjectModal, and Settings.

## Root cause

`KeyboardAvoidingView` was using `behavior="padding"` unconditionally on all screens.
On iOS `padding` shrinks the view from the bottom — correct.
On Android `padding` pushes the entire view up (including the header), which fights the status bar and leaves the input buried behind the keyboard.
The correct Android behavior is `'height'`, which resizes the view's height to fit above the keyboard.

Settings had no `KeyboardAvoidingView` at all — the API key inputs were completely unprotected.

## Fix applied

All `KeyboardAvoidingView` instances now use:

```tsx
behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
```

`settings.tsx` had `KeyboardAvoidingView` + `Platform` added to its imports and a `KeyboardAvoidingView` wrapping the existing `ScrollView`.

## Files changed

| File | Change |
|------|--------|
| `app/chat/[id].tsx` | `"padding"` → `Platform.OS` ternary |
| `app/general-chat/[id].tsx` | `"padding"` → `Platform.OS` ternary |
| `app/learning/chat/[id].tsx` | `"padding"` → `Platform.OS` ternary |
| `src/ui/components/NewProjectModal.tsx` | `"padding"` → `Platform.OS` ternary |
| `app/settings.tsx` | Added `KeyboardAvoidingView` + `Platform` import; wrapped `ScrollView` |

## Already correct (no change needed)

- `src/features/learning/ui/SaveAsLearningModal.tsx` — already used the Platform ternary (`ios ? 'padding' : undefined`)
- `src/ui/components/FilePickerModal.tsx` — already used `ios ? 'padding' : 'height'`

## TypeScript

`tsc --noEmit` passes clean after changes.
