// Bola de futebol (branca com gomos), usada para marcar gols.
export function Bola({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <clipPath id="bola-borda"><circle cx="12" cy="12" r="10.6" /></clipPath>
      </defs>
      <circle cx="12" cy="12" r="10.6" fill="#fff" />
      <g clipPath="url(#bola-borda)" fill="#10223A">
        <path d="M12.00 8.30L15.52 10.86L14.17 14.99L9.83 14.99L8.48 10.86Z" />
        <path d="M12.00 4.90L8.86 2.62L10.06 -1.07L13.94 -1.07L15.14 2.62ZM18.75 9.81L19.95 6.12L23.83 6.12L25.03 9.81L21.89 12.09ZM16.17 17.74L20.05 17.74L21.25 21.43L18.11 23.71L14.97 21.43ZM7.83 17.74L9.03 21.43L5.89 23.71L2.75 21.43L3.95 17.74ZM5.25 9.81L2.11 12.09L-1.03 9.81L0.17 6.12L4.05 6.12Z" />
        <path d="M12.00 8.30L12.00 4.90M15.52 10.86L18.75 9.81M14.17 14.99L16.17 17.74M9.83 14.99L7.83 17.74M8.48 10.86L5.25 9.81" fill="none" stroke="#10223A" strokeWidth="0.8" strokeLinecap="round" />
      </g>
      <circle cx="12" cy="12" r="10.6" fill="none" stroke="#10223A" strokeWidth="1" />
    </svg>
  )
}
