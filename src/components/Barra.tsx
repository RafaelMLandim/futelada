import type { ReactNode } from 'react'
import { Logo } from './Logo'

// Barra de título no topo de cada tela, com a logo no canto direito.
export function Barra({ titulo, sub, direita }: { titulo: ReactNode; sub?: ReactNode; direita?: ReactNode }) {
  return (
    <header className="bar">
      <div>
        <h1 className="h1">{titulo}</h1>
        {sub && <p className="bsub">{sub}</p>}
      </div>
      <div className="row" style={{ gap: 10, flex: 'none' }}>
        {direita}
        <Logo fundo={false} />
      </div>
    </header>
  )
}
