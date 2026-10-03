import type { ReactNode } from 'react'

// Barra de título no topo de cada tela.
export function Barra({ titulo, sub, direita }: { titulo: ReactNode; sub?: ReactNode; direita?: ReactNode }) {
  return (
    <header className="bar">
      <div>
        <h1 className="h1">{titulo}</h1>
        {sub && <p className="bsub">{sub}</p>}
      </div>
      {direita}
    </header>
  )
}
