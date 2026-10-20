import { podeVoltarAoJogo, removerJogador, voltouDoMachucado } from '../logic'
import { Icone } from './Icone'
import type { Pelada } from '../store/usePelada'
import { useConfirmar } from '../utils/confirmacao'
import { useSomenteLeitura } from '../utils/somenteLeitura'

// Ícones do jogador machucado (a cruz, como no Winning Eleven) e do substituto (as setas de troca),
// e a lista de machucados com "Voltar" e "Foi embora" (PLANO.md, seção 3.8.4).

/** Cruz vermelha do machucado. */
export function Cruz({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 20 20" role="img" aria-label="machucado" style={{ flex: 'none' }}>
      <rect x="1" y="1" width="18" height="18" rx="4" fill="#fff" stroke="#0b1a2c" strokeWidth="1.5" />
      <path d="M8 4h4v4h4v4h-4v4H8v-4H4V8h4z" fill="#d62828" />
    </svg>
  )
}

/** Setas de substituição: entrou no lugar de um machucado (some quando o destino dele é decidido). */
export function Troca({ tamanho = 18, de }: { tamanho?: number; de?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 20 20" role="img" aria-label={de ? `entrou no lugar de ${de}` : 'substituto'} style={{ flex: 'none' }}>
      <title>{de ? `Entrou no lugar de ${de}` : 'Substituto'}</title>
      <rect x="1" y="1" width="18" height="18" rx="4" fill="#fff" stroke="#0b1a2c" strokeWidth="1.5" />
      <path d="M7 15V7.5H4.5L8 3.5l3.5 4H9V15z" fill="#2e9e44" />
      <path d="M13 5v7.5h2.5l-3.5 4-3.5-4H11V5z" fill="#d62828" transform="translate(1.5 0)" />
    </svg>
  )
}

/** Lista dos machucados: voltar (na mesma partida, para o jogo; depois, para o fim da fila) ou foi embora. */
export function ListaDeMachucados({ pelada }: { pelada: Pelada }) {
  const { estado } = pelada.app
  const confirmar = useConfirmar()
  const somenteLeitura = useSomenteLeitura()
  if (estado.machucados.length === 0) return null

  return (
    <section className="panel">
      <div className="ph">
        <span className="row" style={{ gap: 8 }}><Cruz tamanho={20} /> Machucados</span>
        <span className="sub">não sobem na fila</span>
      </div>
      <div>
        {estado.machucados.map((m) => {
          const noJogo = podeVoltarAoJogo(estado, m)
          const voltar = () => confirmar({
            titulo: noJogo ? 'Voltar para o jogo' : 'Voltar para a fila',
            mensagem: noJogo
              ? `${m.jogador.nome} volta para o Time ${m.time}${m.substituto ? ` e ${m.substituto.nome} volta para o lugar dele na fila` : ''}.`
              : `A partida de ${m.jogador.nome} já acabou: ele entra no fim da fila.`,
            botao: 'Voltar',
            aoConfirmar: () => pelada.aplicar((e) => voltouDoMachucado(e, m.jogador.id)),
          })
          const embora = () => confirmar({
            titulo: 'Foi embora?', mensagem: `${m.jogador.nome} foi embora? Ele sai da lista de machucados.`, botao: 'Foi embora', perigo: true,
            aoConfirmar: () => pelada.aplicar((e) => removerJogador(e, m.jogador.id)),
          })
          return (
            <div key={m.jogador.id} className="tr" style={{ gap: 8 }}>
              <Cruz />
              <span className="nome" style={{ flex: 1, minWidth: 0, whiteSpace: 'normal' }}>
                {m.jogador.nome}
                <span className="mut" style={{ display: 'block', fontSize: 12 }}>
                  Time {m.time}{m.substituto ? ` · ${m.substituto.nome} entrou no lugar` : ''}
                </span>
              </span>
              {!somenteLeitura && (
                <>
                  <button className="btn sm" style={{ width: 'auto', height: 32, minHeight: 32, padding: '0 10px', fontSize: 13, flex: 'none', boxShadow: '0 2px 0 var(--borda)' }}
                    aria-label={noJogo ? `${m.jogador.nome} volta para o jogo` : `${m.jogador.nome} volta para a fila`} onClick={voltar}>
                    Voltar
                  </button>
                  <button className="ib g" aria-label={`${m.jogador.nome} foi embora`} onClick={embora}>
                    <Icone nome="saiu" tamanho={20} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
