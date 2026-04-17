# Design Assets

Source of truth for every visual asset the app ships. Drop PNG exports at the paths below — `app.json` already references them, so no config changes are needed when the real files land.

## App icon — iOS + generic

- Path: `assets/images/icon.png`
- Size: **1024×1024 PNG**, sRGB, **no alpha** (iOS App Store rejects alpha on the icon asset)
- Safe zone: keep meaningful content inside the centre **820×820** square — iOS masks the corners with a rounded rectangle

## App icon — Android adaptive

Android composes the foreground, background, and (optionally) monochrome layers at different crop ratios per device. Design with the safe zone in mind — anything outside will be cropped on some launchers.

- Path: `assets/images/android-icon-foreground.png`
  - Size: **1024×1024 PNG**, transparent background
  - Safe zone: centre **660×660** circle is always visible
- Path: `assets/images/android-icon-background.png`
  - Size: **1024×1024 PNG**, opaque — solid colour or subtle gradient
  - Current `app.json` backgroundColor is `#E6F4FE` — set this to match the PNG if they diverge
- Path: `assets/images/android-icon-monochrome.png`
  - Size: **1024×1024 PNG**, single-colour (white on transparent)
  - Used by Android 13+ themed icons (Material You)

## Splash screen

- Path: `assets/images/splash-icon.png`
- Size: **512×512 PNG**, transparent background
- Rendered at 200px wide on-device (see `app.json` → `imageWidth: 200`)
- Background colour: **`#0f1117`** (matches `colors.background` in `src/ui/theme.ts`) — both light and dark modes
- Keep the mark visually minimal — splash should feel instant, not branded-heavy

## Favicon (web)

- Path: `assets/images/favicon.png`
- Size: **48×48 PNG**
- Browsers downsample, so anything larger is wasted bytes

## Exporter checklist

- [ ] All PNGs use sRGB colourspace
- [ ] File names match **EXACTLY** — case-sensitive on CI
- [ ] No macOS Finder metadata: run `xattr -c *.png` before committing
- [ ] All sizes match the spec above
- [ ] Commit message: `chore(assets): v1.0 icon + splash`

## Rebuild after assets change

Icon + splash changes require rebuilding the native project — they are not OTA-updatable:

```bash
npx expo prebuild --clean
npm run android     # or: npm run ios
```
