import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  size?: number;
  alt: string;
}

/**
 * Renders a QR code as an inline data-URI image. Server-side only, so the
 * `qrcode` dependency never reaches the client bundle. The value is always a
 * site constant, never user input.
 */
export default async function QrCode({ value, size = 200, alt }: QrCodeProps) {
  // Render at 2x for retina, then constrain with width/height.
  const src = await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size * 2,
    color: { dark: '#1a1a2eff', light: '#ffffffff' },
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      className="rounded-xl border border-line bg-white"
    />
  );
}
