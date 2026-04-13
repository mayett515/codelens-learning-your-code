# Android Build Setup (Local)

Use this document when Java/Gradle are not globally available, or when Gradle lock-file issues break local builds.

## Scripts in this repo

- `android/gradlew.bat`
- `android/gradlew`
- `android/build-local.ps1`

## What `build-local.ps1` does

The script sets sane defaults so builds work from this repo without extra machine setup:

1. Uses Android Studio JBR automatically when `JAVA_HOME` is unset:
   - `C:\Program Files\Android\Android Studio\jbr`
2. Uses a project-local Gradle home when `GRADLE_USER_HOME` is unset:
   - `android/.gradle-user-home-local`
3. Ensures `-Dorg.gradle.native=false` is present in `GRADLE_OPTS`.
4. Adds `--no-daemon` by default to reduce sticky background daemon issues.

## Recommended commands (Windows)

Run from `codelens-full/android`:

```powershell
.\build-local.ps1 tasks
.\build-local.ps1 compileDebugSources
.\build-local.ps1 assembleDebug
```

## Direct wrapper fallback

```powershell
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set GRADLE_USER_HOME=C:\CodeLens-v2\codelens-full\android\.gradle-user-home-local
.\gradlew.bat --no-daemon -Dorg.gradle.native=false assembleDebug
```

## APK output

`android/app/build/outputs/apk/debug/app-debug.apk`

## Notes

- Local Gradle home folders are ignored by `.gitignore` (`android/.gradle-user-home*`).
- If build cache/locks get weird, close running Gradle/Java processes and rerun the script.
