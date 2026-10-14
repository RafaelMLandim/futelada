import type { Turma } from '../nuvem/tipos'
import { Icone } from './Icone'

/** Carrossel: ← nome → (dá a volta). Usado para a turma (Ajustes e Histórico) e a temporada (Histórico). */
export function Carrossel<T extends string | number>({ itens, atual, onEscolher, nome, rotulo, vazio = '—' }: {
  itens: readonly T[]; atual: T | null; onEscolher: (item: T) => void
  nome: (item: T) => string; rotulo: { anterior: string; proximo: string }; vazio?: string
}) {
  const posicao = atual === null ? -1 : itens.indexOf(atual)
  const passar = (passo: number) => {
    if (itens.length < 2) return
    onEscolher(itens[(posicao + passo + itens.length) % itens.length])
  }
  return (
    <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
      <button className="ib" aria-label={rotulo.anterior} disabled={itens.length < 2} onClick={() => passar(-1)}>
        <span style={{ display: 'flex', transform: 'scaleX(-1)' }}><Icone nome="seta" /></span>
      </button>
      <div className="led" style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '14px 8px' }}>
        <span className="num" style={{ display: 'block', fontSize: 28, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {posicao >= 0 ? nome(itens[posicao]) : vazio}
        </span>
      </div>
      <button className="ib" aria-label={rotulo.proximo} disabled={itens.length < 2} onClick={() => passar(1)}>
        <Icone nome="seta" />
      </button>
    </div>
  )
}

/** Carrossel das turmas. */
export function CarrosselDeTurmas({ turmas, turma, onEscolher }: { turmas: Turma[]; turma: string | null; onEscolher: (id: string) => void }) {
  const nomes = new Map(turmas.map((t) => [t.id, t.nome]))
  return (
    <Carrossel itens={turmas.map((t) => t.id)} atual={turmas.some((t) => t.id === turma) ? turma : null} onEscolher={onEscolher}
      nome={(id) => nomes.get(id) ?? ''} rotulo={{ anterior: 'Turma anterior', proximo: 'Próxima turma' }} vazio="Sem turma" />
  )
}
