/**
 * Static facts about the app and the site. Anything that describes the *build*
 * (size, checksum, build date, version) is deliberately absent — that is read
 * from the real APK at request time by `lib/apk.ts`.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://sultiai.com';

export const APP = {
  name: 'SultiAI',
  tagline: 'Learn Bisaya with AI',
  packageName: 'com.sultiai.app',
  /**
   * Keep in sync with the build. These are the Expo defaults for this project
   * (no expo-build-properties override in app.json) — verify against the APK
   * you publish and correct them here if the build differs.
   */
  minAndroid: 'Android 8.0 (API 26)',
  targetAndroid: 'Android 16 (API 36)',
  supportedLanguages: ['Bisaya (Cebuano)', 'English'],
  contactEmail: 'hello@sultiai.com',
} as const;

/** Absolute URL a phone should hit to reach the download page. */
export const DOWNLOAD_PAGE_URL = `${SITE_URL}/download`;

/** Where the nav + footer send people who want the app. */
export const PRIMARY_CTA = { href: '/download', label: 'Download APK' };
