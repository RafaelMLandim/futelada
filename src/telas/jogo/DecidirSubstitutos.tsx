import { useState } from 'react'
import { Troca } from '../../components/Machucado'
import type { Decisao } from '../../logic'
import type { Estado, Machucado } from '../../types/pelada'

// Fim da partida: o time de quem entrou no lugar de um machucado saiu de campo. Quem organiza decide se
// o substituto fica no time (vai para o fim da fila com ele) ou volta para o time antigo (o lugar dele
// na fila). Assim quem entrou no fim de um jogo perdido não perde a vez (PLANO.md, seção 3.8.4).
export function DecidirSubstitutos({ estado, pendentes, onConfirmar, onCancelar }: {
  estado: Estado; pendentes: Machucado[]; onConfirmar: (decisoes: Record<string, Decisao>) => void; onCancelar: () => void
}) {
  const [decisoes, setDecisoes] = useState<Record<string, Decisao>>({})
  const timeAtual = (id: string) => [estado.emCampo!.A, estado.emCampo!.B].find((t) => t.jogadores.some((j) => j.id === id))?.numero
  const prontas = pendentes.every((m) => decisoes[m.substituto!.id])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Substitutos">
      <section className="panel" style={{ width: '100%', maxWidth: 440 }}>
        <div className="ph">{pendentes.length > 1 ? 'Substitutos' : 'Substituto'}</div>
        {pendentes.map((m) => {
          const s = m.substituto!
          const escolha = decisoes[s.id]
          const opcao = (d: Decisao, texto: string) => (
            <button className={'chip' + (escolha === d ? ' on' : '')} role="radio" aria-checked={escolha === d}
              style={{ height: 'auto', padding: '10px 8px', textTransform: 'none', fontSize: 15 }}
              onClick={() => setDecisoes({ ...decisoes, [s.id]: d })}>
              {texto}
            </button>
          )
          return (
            <div key={s.id} className="pb" style={{ display: 'grid', gap: 8, borderBottom: '2px solid #e3e8d6' }}>
              <div className="row" style={{ gap: 8, fontWeight: 600, lineHeight: 1.4 }}>
                <Troca tamanho={22} />
                <span><b>{s.nome}</b> entrou no lugar de <b>{m.jogador.nome}</b> (machucado) e o Time {timeAtual(s.id)} saiu de campo.</span>
              </div>
              <div role="radiogroup" aria-label={`Destino de ${s.nome}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {opcao('fica', `Fica no Time ${timeAtual(s.id)}`)}
                {opcao('volta', `Volta para o Time ${s.deTime}`)}
              </div>
              <div className="mut" style={{ fontSize: 12 }}>
                {escolha === 'fica' ? `${s.nome} vai para o fim da fila com o Time ${timeAtual(s.id)}.`
                  : escolha === 'volta' ? `${s.nome} volta para o lugar dele na fila, no Time ${s.deTime}.`
                  : 'Ficar: vai para o fim da fila com o time. Voltar: volta para o lugar dele na fila.'}
              </div>
            </div>
          )
        })}
        <div className="pb" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn w sm" onClick={onCancelar}>Voltar ao jogo</button>
          <button className="btn sm" disabled={!prontas} onClick={() => onConfirmar(decisoes)}>Confirmar</button>
        </div>
      </section>
    </div>
  )
}
