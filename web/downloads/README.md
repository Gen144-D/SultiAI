# Published APK builds

Drop the Android build here and it goes live on `/download` automatically —
the page reads the real file for its size, SHA-256, build date and version, so
nothing on that page is hardcoded or mocked.

**Naming.** `sultiai.apk` is always preferred. Otherwise the newest file by
modified time wins, and a version is picked up from the filename:

```
sultiai.apk                 -> preferred, no version shown
sultiai-1.0.0.apk           -> shows "1.0.0"
```

**How they get served.** Only through `/api/apk/latest`, which sets the correct
`application/vnd.android.package-archive` type and an attachment disposition.
This folder is deliberately outside `public/`, so Next's static layer never
serves the APK with generic headers and it cannot be crawled or indexed.

`.apk` files are gitignored here — they are large binaries. The build output
belongs in your release pipeline, not in version control.

## Producing the APK

This repo uses Expo's managed workflow with no `android/` directory, so build
on a machine that has the Android SDK, or use EAS:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease     # or: eas build -p android
```

Copy the resulting `app-release.apk` from
`android/app/build/outputs/apk/release/` into this folder as `sultiai.apk`.
