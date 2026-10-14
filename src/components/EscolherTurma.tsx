import { useEffect, useState, type FormEvent } from 'react'
import { peladasDaTurma } from '../logic'
import { useConta, useHistorico } from '../store/conta'
import { useJogadoresDaTurma, useTurmas } from '../store/turmas'
import { useConfirmar } from '../utils/confirmacao'
import { maiusculas, normalizarNome } from '../utils/formatar'
import { CarrosselDeTurmas } from './CarrosselDeTurmas'
import { Icone } from './Icone'

const qtd = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * De qual turma é esta pelada ("Pelada de terça", "Pelada de sábado"…): cada turma tem os seus
 * jogadores de sempre, histórico e relatório (PLANO.md, seção 15). Sem login, não aparece.
 */
export function EscolherTurma({ turma, onEscolher }: { turma: string | null; onEscolher: (id: string | null) => void }) {
  const { logado } = useConta()
  const { turmas: todas, criar, remover } = useTurmas()
  const { peladas } = useHistorico()
  const jogadores = useJogadoresDaTurma(turma)
  const confirmar = useConfirmar()
  const [nova, setNova] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  // a nuvem avisa da turma criada/removida um instante depois: enquanto isso, vale o que foi feito aqui
  const [criada, setCriada] = useState<string | null>(null)
  const [removida, setRemovida] = useState<string | null>(null)
  const turmas = todas?.filter((t) => t.id !== removida) ?? null

  // sem turma escolhida (ou a escolhida foi removida): fica a primeira (a pelada nova já vem com a turma de sempre)
  const primeira = turmas?.[0]?.id ?? null
  const valida = !!turma && (turma === criada || !!turmas?.some((t) => t.id === turma))
  useEffect(() => {
    if (turmas !== null && !valida && turma !== primeira) onEscolher(primeira)
  }, [turmas, valida, turma, primeira, onEscolher])

  if (!logado || turmas === null) return null
  const escolhida = turmas.find((t) => t.id === turma)
  const posicao = escolhida ? turmas.indexOf(escolhida) : -1
  const abrirNova = () => { setNova(turmas.length === 0 ? 'MINHA PELADA' : ''); setAviso(null) }
  const criarTurma = async (ev: FormEvent) => {
    ev.preventDefault()
    const nome = (nova ?? '').trim()
    if (!nome) return
    if (turmas.some((t) => normalizarNome(t.nome) === normalizarNome(nome))) return setAviso('Já existe uma turma com esse nome.')
    setAviso(null)
    setNova(null)
    const id = await criar(nome)
    setCriada(id)
    onEscolher(id)
  }
  const removerTurma = () => {
    if (!escolhida) return
    const daTurma = peladasDaTurma(peladas ?? [], escolhida.id, primeira)
    confirmar({
      titulo: 'Remover turma',
      mensagem: `Excluir a turma ${escolhida.nome} remove o histórico dela (${qtd(daTurma.length, 'pelada', 'peladas')} e ${qtd(jogadores.length, 'jogador', 'jogadores')}). Deseja confirmar?`,
      botao: 'Remover',
      perigo: true,
      aoConfirmar: () => {
        setRemovida(escolhida.id)
        onEscolher(turmas[posicao + 1]?.id ?? turmas[posicao - 1]?.id ?? null)
        void remover(escolhida.id, daTurma.map((p) => p.id))
      },
    })
  }

  return (
    <section className="panel">
      <div className="ph">
        Turma
        {turmas.length > 1 && <span className="sub">{posicao + 1} de {turmas.length}</span>}
      </div>
      <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CarrosselDeTurmas turmas={turmas} turma={turma} onEscolher={onEscolher} />
        <div style={{ display: 'grid', gridTemplateColumns: escolhida ? '1fr 1fr' : '1fr', gap: 6 }}>
          <button className="chip" onClick={abrirNova}><Icone nome="mais" tamanho={16} /> Nova turma</button>
          {escolhida && (
            <button className="chip" style={{ color: 'var(--vermelho)' }} onClick={removerTurma}>
              <Icone nome="lixo" tamanho={16} /> Remover
            </button>
          )}
        </div>
        <div className="mut">Cada turma tem os seus jogadores de sempre, o histórico e o relatório da temporada.</div>
      </div>

      {nova !== null && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Nova turma" onClick={() => setNova(null)}>
          <form className="panel" style={{ width: '100%', maxWidth: 440 }} onClick={(ev) => ev.stopPropagation()} onSubmit={criarTurma}>
            <div className="ph">Nova turma</div>
            <div className="pb" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex' }}>
                <span className="vh">Nome da turma</span>
                <input className="inp" autoFocus placeholder="Ex.: PELADA DE TERÇA" value={nova}
                  onChange={(ev) => { setNova(maiusculas(ev.target.value)); setAviso(null) }} />
              </label>
              {aviso && <div className="mut" style={{ color: 'var(--vermelho)' }}>{aviso}</div>}
            </div>
            <div className="pb" style={{ paddingTop: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn w sm" type="button" onClick={() => setNova(null)}>Cancelar</button>
              <button className="btn sm" type="submit" disabled={!nova.trim()}>OK</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
