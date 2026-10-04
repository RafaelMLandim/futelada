import { useId } from 'react'

// Logo do Dois ou Dez: cronômetro com um campo no mostrador e "2 OU 10" no meio.
export function Logo({ tamanho = 44, fundo = true }: { tamanho?: number; fundo?: boolean }) {
  const mostrador = useId()
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 512 512" role="img" aria-label="Dois ou Dez" style={{ flex: 'none', borderRadius: fundo ? tamanho * 0.22 : 0 }}>
      {fundo && <rect width="512" height="512" fill="#FFD23F" />}
      <g transform={fundo ? 'translate(25.6 12) scale(0.9)' : 'translate(0 -18) scale(1.04)'}>
        <rect x="226" y="40" width="60" height="44" rx="8" fill="#10223A" stroke={fundo ? undefined : '#FFD23F'} strokeWidth="10" />
        <rect x="200" y="28" width="112" height="26" rx="10" fill="#10223A" stroke={fundo ? undefined : '#FFD23F'} strokeWidth="10" />
        <clipPath id={mostrador}><circle cx="256" cy="286" r="196" /></clipPath>
        <circle cx="256" cy="286" r="196" fill="#1F6B33" />
        <g clipPath={`url(#${mostrador})`} fill="#23763A">
          {[60, 158, 256, 354].map((x) => <rect key={x} x={x} y="80" width="49" height="420" />)}
        </g>
        <g fill="none" stroke="#fff" strokeWidth="6" opacity=".85">
          <line x1="256" y1="90" x2="256" y2="482" />
          <circle cx="256" cy="286" r="62" />
        </g>
        <path d="M256 286 L256 116 A170 170 0 0 1 403 201 Z" fill="#FFD23F" opacity=".35" />
        <circle cx="256" cy="286" r="170" fill="none" stroke="#FFD23F" strokeWidth="8" strokeDasharray="4 26.7" />
        <circle cx="256" cy="286" r="196" fill="none" stroke={fundo ? '#10223A' : '#FFD23F'} strokeWidth="18" />
        <text x="256" y="336" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize="150"
          fill="#FFD23F" stroke="#10223A" strokeWidth="14" paintOrder="stroke">
          2<tspan fill="#fff" fontSize="70" dy="-22" dx="6">OU</tspan><tspan dy="22" dx="6">10</tspan>
        </text>
      </g>
    </svg>
  )
}
