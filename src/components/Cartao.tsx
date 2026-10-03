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
