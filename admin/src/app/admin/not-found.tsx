import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'system-ui, sans-serif',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: '#f59e0b15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <svg
          width="28"
          height="28"
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
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: '#e2e8f0' }}>
        Page Not Found
      </h3>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px', maxWidth: 360 }}>
        This admin page does not exist.
      </p>
      <Link
        href="/admin"
        style={{
          padding: '8px 20px',
          borderRadius: 999,
          textDecoration: 'none',
          backgroundColor: '#0d9488',
          color: '#fff',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
