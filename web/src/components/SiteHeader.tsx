import Navbar from './Navbar';
import { getApkRelease } from '@/lib/apk';

/**
 * Server wrapper around the client header.
 *
 * The header CTA depends on release state the client cannot know: when an
 * APK is published it offers the download, otherwise it offers early access
 * via the contact page. No unpublished state text ever appears in the header.
 */
export default async function SiteHeader() {
  const release = await getApkRelease();
  return <Navbar hasRelease={release !== null} />;
}
