'use client';

export default function UaLogo() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="ua-logo"
    >
      {/* Round U shape - left side */}
      <path
        d="M 25 30 Q 25 20 35 20 Q 45 20 45 30 L 45 90 Q 45 100 35 100 Q 25 100 25 90 Z"
        stroke="#000000"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Upside down U shape (A without bar) - right side */}
      <path
        d="M 75 100 L 95 100 L 100 75 L 105 100 L 115 100"
        stroke="#000000"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Dot in the middle to act as horizontal bar of A */}
      <circle cx="90" cy="75" r="4" fill="#000000" />
    </svg>
  );
}

