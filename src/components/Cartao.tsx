import type { CorCartao } from '../types/pelada'

const COR_DO_CARTAO: Record<CorCartao, string> = {
  amarelo: '#FFD23F',
  vermelho: '#C8352B',
  azul: '#1E5FBF',
}

// Cartãozinho na cor indicada.
export function Cartao({ cor, tamanho = 14 }: { cor: CorCartao; tamanho?: number }) {
  return (
    <span aria-hidden="true" style={{
      display: 'inline-block', flex: 'none', width: tamanho * 0.7, height: tamanho, borderRadius: 2,
      background: COR_DO_CARTAO[cor], border: '1px solid #0B1A2C', transform: 'rotate(8deg)',
    }} />
  )
}

/**
 * Cartões de um jogador ao lado do nome, compactos para a linha não estourar:
 * expulso mostra só o vermelho; cartões repetidos viram um com a contagem (amarelo ×2).
 */
export function CartoesDoJogador({ cores, expulso }: { cores: CorCartao[]; expulso: boolean }) {
  if (expulso) return <Cartao cor="vermelho" />
  return (['amarelo', 'azul'] as const).map((cor) => {
    const n = cores.filter((c) => c === cor).length
    if (n === 0) return null
    return (
      <span key={cor} className="row" style={{ gap: 2, flex: 'none' }}>
        <Cartao cor={cor} />{n > 1 && <span className="num" style={{ fontSize: 13 }}>×{n}</span>}
      </span>
    )
  })
}
