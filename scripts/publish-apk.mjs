#!/usr/bin/env node
/**
 * Publishes a release APK to the public-read Supabase Storage bucket that the
 * marketing site serves downloads from.
 *
 *   node scripts/publish-apk.mjs [path-to.apk] [--allow-localhost] [--bucket name]
 *
 * Uploads `sultiai-<version>.apk` plus a `latest.json` manifest. The web app
 * reads only the manifest, so the site updates within ~60s of this finishing.
 *
 * Uses SUPABASE_URL and SUPABASE_SECRET_KEY from the repo-root `.env`. The
 * secret key never leaves this machine; the web app needs no key at all.
 */
/* global Buffer -- Node script, but the repo config is the Expo/React Native one */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DEFAULT_APK = 'android/app/build/outputs/apk/release/app-release.apk';
const DEFAULT_BUCKET = 'releases';
const MANIFEST_OBJECT = 'latest.json';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));

function flagValue(name, fallback) {
  const hit = argv.find((a, i) => a === name && argv[i + 1]);
  return hit ? argv[argv.indexOf(name) + 1] : fallback;
}

async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  } catch {
    // No .env is fine if the vars are already exported.
  }
}

function fail(message) {
  console.error(`\n  error: ${message}\n`);
  process.exit(1);
}

async function main() {
  await loadEnv();

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const secretKey = process.env.SUPABASE_SECRET_KEY || '';
  const bucket = flagValue('--bucket', process.env.APK_BUCKET || DEFAULT_BUCKET);

  if (!supabaseUrl) fail('SUPABASE_URL is not set (checked .env and the environment).');
  if (!secretKey) fail('SUPABASE_SECRET_KEY is not set (checked .env and the environment).');

  const apkPath = path.resolve(ROOT, positional[0] || DEFAULT_APK);
  let apk;
  try {
    apk = await readFile(apkPath);
  } catch {
    fail(`Cannot read APK at ${apkPath}. Build it first, or pass a path.`);
  }

  // The APK bakes EXPO_PUBLIC_API_URL in at build time, so stock the exact
  // failure that shipped once already: an app that calls localhost on a phone.
  if (!flags.has('--allow-localhost')) {
    const probe = apk.toString('latin1');
    if (probe.includes('http://localhost') || probe.includes('http://127.0.0.1')) {
      fail(
        'This APK still contains a localhost API URL, so it will not work on a real phone.\n' +
          '  Rebuild with a public backend URL:\n' +
          '    EXPO_PUBLIC_API_URL=https://your-service.onrender.com npx expo prebuild --platform android --clean\n' +
          '    (then rebuild with gradlew assembleRelease)\n' +
          '  Pass --allow-localhost only for an internal test build.'
      );
    }
  }

  const appJson = JSON.parse(await readFile(path.join(ROOT, 'app.json'), 'utf8')).expo;
  const version = appJson.version || '0.0.0';
  const packageName = appJson.android?.package || 'unknown';
  const filename = `sultiai-${version}.apk`;
  const sha256 = createHash('sha256').update(apk).digest('hex');
  const sizeBytes = apk.byteLength;
  const sizeLabel = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  const builtAt = new Date().toISOString();

  const headers = {
    Authorization: `Bearer ${secretKey}`,
    apikey: secretKey,
    'x-upsert': 'true',
  };

  async function upload(objectName, body, contentType) {
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(objectName)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      fail(`Upload of ${objectName} failed (${res.status}): ${detail.slice(0, 300)}`);
    }
  }

  console.log(`\n  publishing ${filename}`);
  console.log(`  size      ${sizeLabel}`);
  console.log(`  sha256    ${sha256}`);
  console.log(`  package   ${packageName}`);
  console.log(`  bucket    ${bucket}\n`);

  await upload(filename, apk, 'application/vnd.android.package-archive');

  const manifest = {
    filename,
    version,
    sizeBytes,
    sizeLabel,
    sha256,
    packageName,
    builtAt,
  };
  await upload(
    MANIFEST_OBJECT,
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
    'application/json'
  );

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(filename)}`;
  console.log('  done. The site picks it up within ~60s.\n');
  console.log(`  ${publicUrl}\n`);
}

main().catch((err) => fail(err?.stack || String(err)));
