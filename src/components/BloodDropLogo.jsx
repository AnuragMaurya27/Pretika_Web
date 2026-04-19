export default function BloodDropLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="dropGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FF4D6D" />
          <stop offset="60%" stopColor="#DC143C" />
          <stop offset="100%" stopColor="#5a0000" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path
        d="M50 8 C50 8, 12 58, 12 78 C12 100, 29 115, 50 115 C71 115, 88 100, 88 78 C88 58, 50 8, 50 8Z"
        fill="url(#dropGrad)"
        filter="url(#glow)"
      />
      <path
        d="M38 45 C38 45, 25 68, 25 80 C25 90, 31 98, 40 103"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="62" cy="58" rx="5" ry="8" fill="rgba(255,255,255,0.12)" transform="rotate(-20 62 58)" />
    </svg>
  );
}
