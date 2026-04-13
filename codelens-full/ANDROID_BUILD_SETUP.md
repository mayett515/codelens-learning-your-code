# Android Build Setup (Local)

Use this when `javac` or `gradle` are not available globally in PATH.

## What Was Added

- `android/gradlew.bat`
- `android/gradlew`
- `android/build-local.ps1`

The scripts use Android Studio's bundled JDK automatically if `JAVA_HOME` is missing:

`C:\Program Files\Android\Android Studio\jbr`

## Build Command (Windows)

From `codelens-full/android`:

```powershell
.\build-local.ps1 assembleDebug
```

## Direct Wrapper Call

```powershell
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
.\gradlew.bat assembleDebug
```

## Output APK

`android/app/build/outputs/apk/debug/app-debug.apk`
