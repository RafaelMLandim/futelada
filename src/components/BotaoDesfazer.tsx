import type { Desfazer } from '../store/desfazer'
import type { Pelada } from '../store/usePelada'
import { useConfirmar } from '../utils/confirmacao'
import { Icone } from './Icone'

/** Botão da barra do topo: desfaz a última ação do jogo (gol, fim de partida, entrada na lista...), com confirmação. */
export function BotaoDesfazer({ pelada, antes }: { pelada: Pelada; antes?: (ultima: Desfazer) => void }) {
  const confirmar = useConfirmar()
  const pilha = pelada.app.desfazer ?? []
  const ultima = pilha[pilha.length - 1]
  return (
    <button className="ib s" aria-label="Desfazer a última ação" disabled={!ultima}
      onClick={() => ultima && confirmar({
        titulo: 'Desfazer?',
        mensagem: `Desfazer ${ultima.descricao}? A lista e o jogo voltam a ser como estavam antes.`,
        botao: 'Desfazer',
        aoConfirmar: () => { antes?.(ultima); pelada.desfazer() },
      })}>
      <Icone nome="desfazer" />
    </button>
  )
}
