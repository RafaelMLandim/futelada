import type { ReactNode } from 'react'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { useSomenteLeitura } from '../utils/somenteLeitura'

// Barra de título no topo de cada tela: a logo à esquerda do título e, à direita, a foto de quem entrou
// (tocar na foto abre "Voltar ao início" e "Sair da conta"). Quem só acompanha a pelada não tem a foto.
export function Barra({ titulo, sub, direita }: { titulo: ReactNode; sub?: ReactNode; direita?: ReactNode }) {
  const somenteLeitura = useSomenteLeitura()
  return (
    <header className="bar">
      <Logo fundo={false} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="h1">{titulo}</h1>
        {sub && <p className="bsub">{sub}</p>}
      </div>
      <div className="row" style={{ gap: 10, flex: 'none' }}>
        {direita}
        {!somenteLeitura && <Avatar />}
      </div>
    </header>
  )
}
