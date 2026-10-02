/**
 * APK releases are published to a public-read Supabase Storage bucket so they
 * survive deployment to Vercel, whose filesystem is immutable.
 *
 * The bucket holds the APK plus a small `latest.json` manifest describing it.
 * This module only ever reads that manifest over plain HTTPS — no Supabase key
 * is needed, and therefore none is present in the Vercel environment. Uploading
 * is a separate, local/CI-only step (see `scripts/publish-apk.mjs`) that uses
 * the secret key from the machine doing the release.
 *
 * To publish a build, run the release script. Nothing here is hardcoded to a
 * version, so the page always reflects whatever was last uploaded.
 */

const DEFAULT_BUCKET = 'releases';
const MANIFEST_OBJECT = 'latest.json';

export interface ApkRelease {
  filename: string;
  sizeBytes: number;
  sizeLabel: string;
  sha256: string;
  version: string | null;
  builtAt: string;
  /** Same-origin route the UI links to; it redirects to `objectUrl`. */
  downloadUrl: string;
  /** Direct public Storage URL, used for the redirect target. */
  objectUrl: string;
}

interface Manifest {
  filename?: unknown;
  version?: unknown;
  sizeBytes?: unknown;
  sha256?: unknown;
  builtAt?: unknown;
}

function storageBase(): string | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? url.replace(/\/+$/, '') : null;
}

function bucketName(): string {
  return process.env.APK_BUCKET?.trim() || DEFAULT_BUCKET;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseVersion(filename: string): string | null {
  const match = filename.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * A manifest that fails any of these checks is treated as "no release", so a
 * half-finished upload or a hand-edited file degrades to the page's empty
 * state instead of rendering a download button that 404s.
 */
function toRelease(manifest: Manifest, base: string): ApkRelease | null {
  const { filename, sizeBytes, sha256 } = manifest;

  if (typeof filename !== 'string' || !filename.toLowerCase().endsWith('.apk')) return null;
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return null;
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(sha256)) return null;

  const version =
    typeof manifest.version === 'string' && manifest.version.trim()
      ? manifest.version.trim()
      : parseVersion(filename);

  const builtAt =
    typeof manifest.builtAt === 'string' && !Number.isNaN(Date.parse(manifest.builtAt))
      ? manifest.builtAt
      : new Date(0).toISOString();

  const objectUrl = `${base}/storage/v1/object/public/${bucketName()}/${encodeURIComponent(filename)}`;

  return {
    filename,
    sizeBytes,
    sizeLabel: formatBytes(sizeBytes),
    sha256: sha256.toLowerCase(),
    version,
    builtAt,
    downloadUrl: '/api/apk/latest',
    objectUrl,
  };
}

export async function getApkRelease(): Promise<ApkRelease | null> {
  const base = storageBase();
  if (!base) return null;

  const manifestUrl = `${base}/storage/v1/object/public/${bucketName()}/${MANIFEST_OBJECT}`;

  let manifest: Manifest;
  try {
    const res = await fetch(manifestUrl, {
      // Short window: a freshly published build should appear within a minute
      // without hammering Storage on every page view.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    manifest = (await res.json()) as Manifest;
  } catch {
    return null;
  }

  return toRelease(manifest, base);
}
