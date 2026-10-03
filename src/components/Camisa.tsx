// Camisa (colete) na cor indicada.
export function Camisa({ cor, tamanho = 22, contorno = '#0B1A2C' }: { cor: string; tamanho?: number; contorno?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      <path
        d="M8 3L3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-.6 1.5-2.1 2.4-4 2.4S8.6 4.5 8 3z"
        fill={cor}
        stroke={contorno}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
