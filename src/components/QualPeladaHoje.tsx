// "Qual pelada é hoje?": toda pelada nova pertence a uma turma, escolhida de propósito (PLANO.md, seção 15).
// Sem turma, a primeira coisa é criar uma. Com várias, nenhuma vem marcada: quem organiza duas peladas não
// cai na turma errada sem perceber. É o único lugar para criar e remover turmas (os ajustes não mostram a turma).

import { useState, type FormEvent } from 'react'
import { nomeSugerido, peladasDaTurma, resumoDasTurmas, textoDoDia } from '../logic'
import { useHistorico } from '../store/conta'
import { useTurmas } from '../store/turmas'
import { useConfirmar } from '../utils/confirmacao'
import { maiusculas, normalizarNome } from '../utils/formatar'
import { Icone } from './Icone'

const dataCurta = (data: number) => new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const qtd = (numero: number, um: string, varios: string) => `${numero} ${numero === 1 ? um : varios}`

/**
 * A escolha da turma. `atual`: a turma já escolhida (no "Trocar"; vem marcada). `podeRemover`: mostra
 * "Remover esta turma" (só nos ajustes, para não remover sem querer ao criar a pelada).
 */
export function QualPeladaHoje({ atual = null, podeRemover = false, aoEscolher, aoFechar }: {
  atual?: string | null; podeRemover?: boolean; aoEscolher: (turma: string, criadaAgora: boolean) => void; aoFechar?: () => void
}) {
  const { turmas, criar, remover } = useTurmas()
  const { peladas } = useHistorico()
  const confirmar = useConfirmar()
  const [marcada, setMarcada] = useState<string | null>(atual)
  const [nova, setNova] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [hoje] = useState(() => new Date())

  if (turmas === null) return <div className="pb mut">Carregando as turmas…</div>
  const resumos = resumoDasTurmas(turmas, peladas ?? [], hoje)
  // sem turma: o campo de criar já vem aberto (é o único caminho)
  const nome = nova ?? (turmas.length === 0 ? nomeSugerido(hoje) : null)
  // uma turma só: vem marcada (não tem como errar); várias: a pessoa escolhe
  const escolhida = marcada ?? (resumos.length === 1 ? resumos[0].id : null)
  const nomeDaEscolhida = resumos.find((turma) => turma.id === escolhida)?.nome

  const criarTurma = async (evento: FormEvent) => {
    evento.preventDefault()
    const limpo = (nome ?? '').trim()
    if (!limpo) return
    if (turmas.some((turma) => normalizarNome(turma.nome) === normalizarNome(limpo))) return setAviso('Já existe uma turma com esse nome.')
    setCriando(true)
    const id = await criar(limpo).catch(() => null)
    setCriando(false)
    if (!id) return setAviso('Não deu para criar a turma. Confira a internet e tente de novo.')
    aoEscolher(id, true)
  }
  const removerTurma = () => {
    const turma = resumos.find((item) => item.id === escolhida)
    if (!turma) return
    const daTurma = peladasDaTurma(peladas ?? [], turma.id, turmas[0]?.id ?? null)
    confirmar({
      titulo: 'Remover turma',
      mensagem: `Excluir a turma ${turma.nome} remove o histórico dela (${qtd(daTurma.length, 'pelada', 'peladas')}). As cartas dos jogadores não mudam. Deseja confirmar?`,
      botao: 'Remover', perigo: true,
      digitar: turma.nome, // remover turma é sério: só libera digitando o nome
      aoConfirmar: () => { setMarcada(null); void remover(turma.id, daTurma.map((pelada) => pelada.id)) },
    })
  }

  if (nome !== null) {
    return (
      <form className="pb" style={{ display: 'grid', gap: 12 }} onSubmit={criarTurma}>
        <div style={{ fontWeight: 600, lineHeight: 1.4 }}>
          {turmas.length === 0 ? 'Dê um nome para a sua pelada. Ele separa os jogadores, o histórico e o ranking de cada grupo.' : 'Nome da nova turma'}
        </div>
        <label style={{ display: 'flex' }}>
          <span className="vh">Nome da turma</span>
          <input className="inp" autoFocus maxLength={40} placeholder="Ex.: PELADA DE TERÇA" value={nome}
            onChange={(evento) => { setNova(maiusculas(evento.target.value)); setAviso(null) }} />
        </label>
        {aviso && <div style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{aviso}</div>}
        {turmas.length === 0 && <div className="mut">Joga em mais de um grupo? Cada um vira uma turma. Dá para criar outra depois.</div>}
        <button className="btn" type="submit" disabled={!nome.trim() || criando}>{criando ? 'Criando…' : 'Criar e continuar'}</button>
        {turmas.length > 0 && <button className="lnk" type="button" style={{ justifySelf: 'center' }} onClick={() => { setNova(null); setAviso(null) }}>Voltar para as turmas</button>}
      </form>
    )
  }

  return (
    <div className="pb" style={{ display: 'grid', gap: 10 }}>
      <div role="radiogroup" aria-label="Turmas" style={{ display: 'grid', gap: 10 }}>
        {resumos.map((turma) => (
          <button key={turma.id} type="button" role="radio" aria-checked={turma.id === escolhida}
            className={'turma-opcao' + (turma.id === escolhida ? ' escolhida' : '')} onClick={() => setMarcada(turma.id)}>
            <span className="marca">{turma.id === escolhida && <Icone nome="certo" tamanho={16} />}</span>
            <span>
              <b>{turma.nome}</b>
              <span className="mut" style={{ display: 'block' }}>
                {turma.ultima === null
                  ? 'Ainda sem pelada'
                  : `${resumos.length > 1 && turma.diaDaSemana !== null ? `${textoDoDia(turma.diaDaSemana)} · ` : ''}última: ${dataCurta(turma.ultima)} · ${qtd(turma.peladas, 'pelada', 'peladas')}`}
              </span>
            </span>
          </button>
        ))}
      </div>
      <button className="btn" disabled={!escolhida} onClick={() => escolhida && aoEscolher(escolhida, false)}>
        {escolhida && resumos.length > 1 ? `Continuar · ${nomeDaEscolhida}` : 'Continuar'}
      </button>
      <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
        <button className="chip" onClick={() => { setNova(''); setAviso(null) }}><Icone nome="mais" tamanho={16} /> Nova turma</button>
        {podeRemover && escolhida && (
          <button className="chip" style={{ color: 'var(--vermelho)' }} onClick={removerTurma}><Icone nome="lixo" tamanho={16} /> Remover</button>
        )}
      </div>
      {aoFechar && <button className="lnk" style={{ justifySelf: 'center' }} onClick={aoFechar}>Fechar</button>}
    </div>
  )
}
