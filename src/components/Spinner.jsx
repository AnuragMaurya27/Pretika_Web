export default function Spinner({ size = 40, fullPage = false }) {
  const spinner = (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'pulse 1.2s ease-in-out infinite', display: 'block' }}
    >
      <path
        d="M50 8 C50 8, 12 58, 12 78 C12 100, 29 115, 50 115 C71 115, 88 100, 88 78 C88 58, 50 8, 50 8Z"
        fill="#DC143C"
        opacity="0.9"
      />
    </svg>
  );

  if (fullPage) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', flexDirection: 'column', gap: '1rem'
      }}>
        {spinner}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Andheron mein dhundh rahe hain...</p>
      </div>
    );
  }

  return spinner;
}
