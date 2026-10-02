import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { APP } from '@/lib/site';

export const alt = 'SultiAI — Learn Bisaya with AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Inlined at build time so Satori (which fetches images over the network) does
 * not need a publicly reachable asset URL.
 */
const logo = readFileSync(join(process.cwd(), 'public', 'app-icon.png')).toString('base64');

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(135deg, #081c24 0%, #07111f 45%, #050814 100%)',
        color: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Satori renders a raw <img>; next/image is not available in next/og. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${logo}`} width={96} height={96} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#63f5d0' }}>{APP.name}</div>
          <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.75)' }}>{APP.tagline}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
          Learn Bisaya with an AI tutor
        </div>
        <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.8)' }}>
          Voice practice · AR culture · Community
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignSelf: 'flex-start',
          background: 'rgba(99,245,208,0.14)',
          border: '2px solid rgba(99,245,208,0.45)',
          borderRadius: 20,
          padding: '20px 32px',
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        Download the Android APK — no Play Store needed
      </div>
    </div>,
    size
  );
}
