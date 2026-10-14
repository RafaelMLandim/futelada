import { useRef, useState, type FormEvent } from 'react'
import {
  adicionarJogador, blocosDaFila, comecar, sortearPrimeirosTimes, novoJogador, podeComecar, removerJogador,
  LADOS, parecidoNaTurma, quemCostumaVir, resumoPagamentos, subiuDe, sugestoes, todosOsJogadores, type JogadorDaTurma,
} from '../logic'
import { useJogadoresDaTurma } from '../store/turmas'
import { contarUso, usePlano } from '../store/plano'
import { TelaPremium } from '../components/TelaPremium'
import { Aviso } from '../components/Aviso'
import { Barra } from '../components/Barra'
import { BotaoDesfazer } from '../components/BotaoDesfazer'
import { Camisa } from '../components/Camisa'
import { Icone } from '../components/Icone'
import { Subiu } from '../components/Subiu'
import { ListaDeMachucados } from '../components/Machucado'
import type { Pelada } from '../store/usePelada'
import { SEM_COLETE } from '../utils/cores'
import { useConfirmar } from '../utils/confirmacao'
import { maiusculas, normalizarNome, reais } from '../utils/formatar'
import type { useCobranca } from '../store/cobranca'
import { Pagamentos } from './Pagamentos'

export function Lista({ pelada, cobranca, onApitar }: { pelada: Pelada; cobranca: ReturnType<typeof useCobranca>; onApitar: () => void }) {
  const { app, aplicar } = pelada
  const { estado } = app
  const [nome, setNome] = useState('')
  const confirmar = useConfirmar()
  const [repetido, setRepetido] = useState<string | null>(null)
  const [pagamentos, setPagamentos] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const linha = estado.config.linha
  const { coletes } = estado.config
  const blocos = blocosDaFila(estado)
  const emJogo = estado.emCampo !== null

  // Turma: os jogadores de sempre (sugestões ao digitar, "quem costuma vir", "é ele?")
  const turma = useJogadoresDaTurma(estado.config.turma)
  const naLista = todosOsJogadores(estado)
  const sugeridos = sugestoes(turma, nome, naLista)
  const costumamVir = quemCostumaVir(turma, naLista)
  const [chamando, setChamando] = useState(false)
  const [ehEle, setEhEle] = useState<{ nome: string; jogador: JogadorDaTurma } | null>(null)
  /** Entra na fila com o id da turma (assim é a mesma pessoa de uma pelada para a outra). */
  const entrar = (j: { id: string; nome: string }) => {
    aplicar((e) => adicionarJogador(e, { id: j.id, nome: j.nome }))
    setNome('')
  }
  const adicionar = (ev: FormEvent) => {
    ev.preventDefault()
    if (!nome.trim()) return
    const existente = naLista.find((j) => normalizarNome(j.nome) === normalizarNome(nome))
    if (existente) {
      setRepetido(existente.nome)
      return
    }
    const daTurma = turma.find((j) => normalizarNome(j.nome) === normalizarNome(nome))
    if (daTurma) return entrar(daTurma)
    const parecido = parecidoNaTurma(turma, nome)
    if (parecido) return setEhEle({ nome: nome.trim(), jogador: parecido })
    aplicar((e) => adicionarJogador(e, novoJogador(nome)))
    setNome('')
  }
  const remover = (id: string, quem: string) => {
    confirmar({
      titulo: 'Foi embora?', mensagem: `${quem} foi embora? A fila sobe uma posição.`, botao: 'Foi embora', perigo: true,
      aoConfirmar: () => aplicar((e) => removerJogador(e, id)),
    })
  }
  // Plano pago (PLANO.md, seção 14): a pelada conta no 1º "Apitar" do dia
  const plano = usePlano()
  const [premium, setPremium] = useState(false)
  const apitar = () => {
    const primeiro = estado.historico.length === 0
    if (primeiro && !plano.podeComecarPelada) return setPremium(true)
    if (primeiro && plano.cobrancaAtiva && !plano.premium) void contarUso('peladas').catch(() => null)
    // primeiro jogo: mistura os jogadores dos 2 primeiros times (se ligado nos Ajustes)
    aplicar((e) => comecar(e.config.sortearInicio ? sortearPrimeirosTimes(e) : e), true)
    onApitar()
  }

  let posicao = 0
  return (
    <div className="scr">
      <Barra
        titulo={emJogo ? 'Fila' : 'Lista'}
        sub={`${estado.fila.length} ${estado.fila.length === 1 ? 'jogador' : 'jogadores'}`}
        direita={<BotaoDesfazer pelada={pelada} />}
      />
      <form onSubmit={adicionar} style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
        <label style={{ display: 'flex', flex: 1 }}>
          <span className="vh">Nome do jogador</span>
          <input ref={campo} className="inp" placeholder={emJogo ? 'Chegou atrasado?' : 'Quem chegou?'} value={nome}
            onChange={(ev) => setNome(maiusculas(ev.target.value))} autoCapitalize="characters" enterKeyHint="done" />
        </label>
        <button className="ib" type="submit" style={{ width: 52, height: 52, background: 'var(--amarelo)', boxShadow: '0 3px 0 var(--borda)' }} aria-label="Adicionar jogador">
          <Icone nome="mais" />
        </button>
      </form>
      {/* sugestões da turma enquanto digita; com o campo vazio, "quem costuma vir" */}
      {sugeridos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px 0', scrollbarWidth: 'none' }} aria-label="Sugestões da turma">
          {sugeridos.map((j) => (
            <button key={j.id} className="chip" style={{ flex: 'none', textTransform: 'none', background: '#fff' }} onClick={() => { entrar(j); campo.current?.focus() }}>
              {j.nome} <span className="mut" style={{ fontSize: 12 }}>· {j.peladas}</span>
            </button>
          ))}
        </div>
      )}
      {!nome && costumamVir.length > 0 && (
        <button className="btn w sm" style={{ margin: '8px 12px 0', width: 'auto', textTransform: 'none' }} onClick={() => setChamando(true)}>
          <Icone nome="times" tamanho={20} /> Quem costuma vir ({costumamVir.length})
        </button>
      )}

      {/* campo pago: quantos já pagaram; abre QR Pix, link para o grupo e a lista de pagamentos */}
      {estado.config.pagamento.ativo && (() => {
        const r = resumoPagamentos(estado)
        return (
          <button className="panel row" style={{ margin: '10px 12px 0', padding: '8px 10px', cursor: 'pointer', font: 'inherit', color: 'var(--navy)', textAlign: 'left' }}
            onClick={() => setPagamentos(true)}>
            <span className="num" style={{ fontSize: 20 }}>💰</span>
            <span style={{ flex: 1, fontWeight: 700 }}>Campo · {reais(r.valor)} cada</span>
            {r.avisaram > 0 && <span className="tag" style={{ background: 'var(--amarelo)' }}>{r.avisaram} avisou</span>}
            <span className={'tag ' + (r.pagos === r.pessoas && r.pessoas ? 't-ok' : 't-warn')}>{r.pagos}/{r.pessoas} pagos</span>
          </button>
        )
      })()}
      {pagamentos && <Pagamentos pelada={pelada} cobranca={cobranca} onFechar={() => setPagamentos(false)} />}

      <div className="conteudo">
        {blocos.length === 0 && (
          <div className="vazio">{emJogo ? 'Ninguém esperando. Quem perder vem para cá.' : 'Adicione os nomes na ordem de chegada.'}</div>
        )}
        {blocos.map((bloco, i) => {
          const numero = estado.filaTimes[i]
          const falta = linha - bloco.length
          // Antes de apitar, os dois primeiros times já vestem os coletes
          const colete = !emJogo && i < 2 ? coletes[LADOS[i]] : null
          const posicaoNaFila = emJogo ? i : i - 2
          const proximo = posicaoNaFila === 0
          return (
            <section key={numero} className={'panel' + (proximo && emJogo ? ' destaque' : '')}>
              <div className="ph">
                <span className="row" style={{ gap: 8 }}>
                  <Camisa cor={colete?.cor ?? SEM_COLETE} contorno="#fff" />
                  <span>
                    Time {numero}
                    <span style={{ display: 'block', fontSize: 12, color: '#c9d4e3', letterSpacing: 1 }}>
                      {colete ? colete.nome : proximo ? 'Próximo' : `${posicaoNaFila + 1}º da fila`}
                    </span>
                  </span>
                </span>
                <span className={'tag ' + (falta ? 't-warn' : 't-ok')}>{falta ? `faltam ${falta}` : `${bloco.length}/${linha}`}</span>
              </div>
              <div>
                {bloco.map((j) => {
                  posicao++
                  return (
                    <div key={j.id} className="tr">
                      <span className="no">{posicao}</span>
                      <span className="nome" style={{ flex: '0 1 auto' }}>{j.nome}</span>
                      <Subiu de={subiuDe(estado, j.id)} />
                      <span style={{ flex: 1 }} />
                      <button className="ib g" aria-label={`${j.nome} foi embora`} onClick={() => remover(j.id, j.nome)}>
                        <Icone nome="saiu" tamanho={20} />
                      </button>
                    </div>
                  )
                })}
                {Array.from({ length: falta }, (_, k) => (
                  <div key={k} className="slot"><span className="no">?</span>{emJogo ? `vaga · ${k + 1}º de quem perder` : 'vaga'}</div>
                ))}
              </div>
            </section>
          )
        })}
        <ListaDeMachucados pelada={pelada} />
      </div>

      {/* "quem costuma vir": tocar na ordem em que chegam põe na fila nessa ordem */}
      {chamando && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Quem costuma vir" onClick={() => setChamando(false)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>
            <div className="ph">Quem costuma vir<span className="sub">toque na ordem de chegada</span></div>
            <div className="pb" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, overflowY: 'auto' }}>
              {costumamVir.length === 0 && <div className="mut">Todo mundo da turma já está na lista.</div>}
              {costumamVir.map((j) => (
                <button key={j.id} className="chip" style={{ textTransform: 'none' }} onClick={() => entrar(j)}>
                  {j.nome} <span className="mut" style={{ fontSize: 12 }}>· {j.peladas}</span>
                </button>
              ))}
            </div>
            <div className="pb" style={{ paddingTop: 0 }}>
              <button className="btn" onClick={() => setChamando(false)}>Pronto · {estado.fila.length} na lista</button>
            </div>
          </section>
        </div>
      )}
      {/* nome novo parecido com alguém da turma */}
      {ehEle && (
        <div className="modal" role="alertdialog" aria-modal="true" aria-label="É ele?" onClick={() => setEhEle(null)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">É ele?</div>
            <div className="pb" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>
              <b>{ehEle.nome}</b> parece com <b>{ehEle.jogador.nome}</b>, da turma ({ehEle.jogador.peladas} {ehEle.jogador.peladas === 1 ? 'pelada' : 'peladas'}).
            </div>
            <div className="pb" style={{ paddingTop: 0, display: 'grid', gap: 8 }}>
              <button className="btn sm" onClick={() => { entrar(ehEle.jogador); setEhEle(null) }}>Sim, é o {ehEle.jogador.nome}</button>
              <button className="btn w sm" onClick={() => { aplicar((e) => adicionarJogador(e, novoJogador(ehEle.nome))); setNome(''); setEhEle(null) }}>
                Não, é outra pessoa
              </button>
            </div>
          </section>
        </div>
      )}
      {premium && <TelaPremium motivo="peladas" onFechar={() => setPremium(false)} />}
      {repetido && (
        <Aviso titulo="Nome repetido" onFechar={() => { setRepetido(null); campo.current?.focus() }}>
          Já tem um <b>{repetido}</b> na lista. Adicione o sobrenome ou um apelido.
        </Aviso>
      )}

      {!emJogo && (
        <div className="rodape">
          <button className="btn" disabled={!podeComecar(estado)} onClick={apitar}>
            {estado.config.sortearInicio && estado.historico.length === 0 ? 'Sortear e apitar' : 'Apitar'} · Time {estado.filaTimes[0]} x Time {estado.filaTimes[1]}
          </button>
        </div>
      )}
    </div>
  )
}
