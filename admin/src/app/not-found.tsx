import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: 32,
        textAlign: 'center',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: '#f59e0b20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Page Not Found</h2>
      <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px', maxWidth: 400 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/admin"
        style={{
          padding: '10px 24px',
          borderRadius: 999,
          textDecoration: 'none',
          backgroundColor: '#0d9488',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
