'use client';

/**
 * This screen replaces the root layout, so the stylesheet may not be present.
 * Values are therefore inlined, and they mirror the `midnightTeal` tokens in
 * `globals.css` so the crash screen still looks like the product.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: 32,
            textAlign: 'center',
            backgroundColor: '#050814',
            backgroundImage:
              'radial-gradient(1200px 600px at 50% -10%, rgba(99, 245, 208, 0.10), transparent 60%)',
            color: '#f8fafc',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: 'rgba(251, 113, 133, 0.14)',
              border: '1px solid rgba(251, 113, 133, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fb7185"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}
          >
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#a7b0c0', margin: '0 0 26px', maxWidth: 400 }}>
            {error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '11px 24px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#22d3c5',
              color: '#05202a',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
