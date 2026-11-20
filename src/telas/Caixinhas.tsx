// Caixinhas no Caixa (PLANO.md, seção 19): dinheiro separado por motivo ("Bola nova"), dividido por todos os
// jogadores escolhidos (quem joga com a conta já vem marcado; os outros o organizador adiciona). Cada uma tem o link com o QR do Pix para o grupo, a lista de quem pagou e a barra da meta.

import { useState } from 'react'
import { QrCode } from '../components/QrCode'
import { participantesDaTurma, resumoDaCaixinha, valorPorPessoaDaCaixinha, type Caixinha, type JogadorDaCaixinha } from '../logic'
import type { Lancamento, Turma } from '../nuvem/tipos'
import { carregar } from '../store/armazenamento'
import { criarCaixinha, encerrarCaixinha, marcarNaCaixinha, mudarParticipantes, useLancarCaixinha, useStatusDaCaixinha } from '../store/caixinhas'
import { linkDePagamento } from '../store/cobranca'
import { useJogadoresDaTurma } from '../store/turmas'
import type { StatusPagamento } from '../types/pelada'
import { useConfirmar } from '../utils/confirmacao'
import { normalizarNome, reais } from '../utils/formatar'
import { compartilharTexto } from '../utils/nativo'
import { pixCopiaECola } from '../utils/pix'

type Lancar = (movimentos: Omit<Lancamento, 'id'>[]) => Promise<void>
type Apagar = (id: string) => Promise<void>

/** As caixinhas da turma escolhida no Caixa (todas, no "Todas"), cada uma com a barra da meta. */
export function SecaoDeCaixinhas({ caixinhas, turmas, turmaDoFiltro, lancamentos, lancar, apagar, onSaida }: {
  caixinhas: Caixinha[]; turmas: Turma[]; turmaDoFiltro: string | null; lancamentos: Lancamento[] | null
  lancar: Lancar; apagar: Apagar; onSaida: (caixinha: Caixinha) => void
}) {
  const [criando, setCriando] = useState(false)
  const [aberta, setAberta] = useState<string | null>(null)
  const visiveis = caixinhas.filter((caixinha) => !caixinha.encerrada && caixinha.turma === turmaDoFiltro)
  const abertaAgora = caixinhas.find((caixinha) => caixinha.id === aberta)
  return (
    <section className="panel">
      <div className="ph">Caixinhas<span className="sub">dinheiro separado por motivo</span></div>
      <div className="pb" style={{ display: 'grid', gap: 10 }}>
        {visiveis.length === 0 && <div className="mut">Junte dinheiro para a bola nova, os coletes ou o churrasco. O valor é dividido por quem participa.</div>}
        {/* cada card também lança no caixa o que for confirmado (mesmo com a caixinha fechada) */}
        {caixinhas.filter((caixinha) => !caixinha.encerrada).map((caixinha) => (
          <CardDaCaixinha key={caixinha.id} caixinha={caixinha} visivel={visiveis.includes(caixinha)} lancamentos={lancamentos}
            lancar={lancar} apagar={apagar} onAbrir={() => setAberta(caixinha.id)} />
        ))}
        <button className="btn w sm" disabled={!turmaDoFiltro} onClick={() => setCriando(true)}>+ Nova caixinha</button>
        {!turmaDoFiltro && <div className="mut" style={{ fontSize: 13 }}>Crie uma pelada antes: a caixinha é dividida pelos jogadores da turma.</div>}
      </div>
      {criando && <NovaCaixinha turmas={turmas} turmaInicial={turmaDoFiltro} onFechar={() => setCriando(false)} onCriada={(id) => { setCriando(false); setAberta(id) }} />}
      {abertaAgora && <CaixinhaAberta caixinha={abertaAgora} lancamentos={lancamentos} onSaida={() => onSaida(abertaAgora)} onFechar={() => setAberta(null)} />}
    </section>
  )
}

/** Barra da meta: "R$ 90 de R$ 150 · 9 de 15 pagaram". */
function BarraDaMeta({ caixinha, status, lancamentos }: { caixinha: Caixinha; status: Record<string, StatusPagamento>; lancamentos: Lancamento[] | null }) {
  const resumo = resumoDaCaixinha(caixinha, status, lancamentos ?? [])
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div className="caixinha-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(resumo.progresso * 100)}>
        <span style={{ width: `${resumo.progresso * 100}%` }} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
        <span><b>{reais(resumo.arrecadado)}</b> de {reais(caixinha.meta)}</span>
        <span>{resumo.pagos} de {resumo.pessoas} pagaram{resumo.avisaram > 0 && ` · ${resumo.avisaram} a conferir`}</span>
      </div>
      {resumo.saldo !== resumo.arrecadado && <div className="mut" style={{ fontSize: 12 }}>Saldo da caixinha: {reais(resumo.saldo)}</div>}
    </div>
  )
}

function CardDaCaixinha({ caixinha, visivel, lancamentos, lancar, apagar, onAbrir }: {
  caixinha: Caixinha; visivel: boolean; lancamentos: Lancamento[] | null; lancar: Lancar; apagar: Apagar; onAbrir: () => void
}) {
  const status = useStatusDaCaixinha(caixinha)
  useLancarCaixinha(caixinha, status, lancamentos, lancar, apagar)
  if (!visivel) return null
  return (
    <button className="caixinha-card" onClick={onAbrir}>
      <span className="row" style={{ justifyContent: 'space-between' }}>
        <b className="num" style={{ fontSize: 20 }}>{caixinha.nome}</b>
        <span className="mut" style={{ fontSize: 13 }}>{reais(caixinha.valorPorPessoa)} cada</span>
      </span>
      {caixinha.descricao && <span className="mut" style={{ fontSize: 13, textAlign: 'left' }}>{caixinha.descricao}</span>}
      <BarraDaMeta caixinha={caixinha} status={status} lancamentos={lancamentos} />
    </button>
  )
}

/**
 * Quem participa da caixinha: a lista (tocar no × tira) e, embaixo, quem dá para adicionar: quem tem conta e ficou de
 * fora e qualquer nome digitado pelo organizador. Quem já pagou ou avisou não sai.
 */
function QuemParticipa({ escolhidos, sugestoes, travados, onMudar }: {
  escolhidos: JogadorDaCaixinha[]; sugestoes: JogadorDaCaixinha[]; travados?: Record<string, StatusPagamento>; onMudar: (jogadores: JogadorDaCaixinha[]) => void
}) {
  const [novo, setNovo] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const ids = new Set(escolhidos.map((jogador) => jogador.id))
  const nomes = new Set(escolhidos.map((jogador) => normalizarNome(jogador.nome)))
  const foraComConta = sugestoes.filter((jogador) => !ids.has(jogador.id))
  const adicionarNome = () => {
    const nome = novo.trim()
    if (!nome || nomes.has(normalizarNome(nome))) return setNovo('')
    onMudar([...escolhidos, { id: `n${Date.now().toString(36)}`, nome }])
    setNovo('')
  }
  const chip = (jogador: JogadorDaCaixinha) => (
    <button key={jogador.id} className="chip" style={{ textTransform: 'none', background: '#fff' }} onClick={() => onMudar([...escolhidos, jogador])}>+ {jogador.nome}</button>
  )
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Quem participa ({escolhidos.length})</span>
      {escolhidos.length === 0 && <div className="mut" style={{ fontSize: 13 }}>Ninguém ainda. Adicione abaixo.</div>}
      <div>
        {escolhidos.map((jogador) => {
          const pagou = travados?.[jogador.id]
          return (
            <div key={jogador.id} className="tr" style={{ color: 'var(--navy)' }}>
              <span className="nome">{jogador.nome}</span>
              {pagou
                ? <span className="tag">{pagou === 'pago' ? 'Pago' : 'Avisou'}</span>
                : <button className="ib s" style={{ width: 30, height: 30 }} aria-label={`Tirar ${jogador.nome}`}
                    onClick={() => onMudar(escolhidos.filter((outro) => outro.id !== jogador.id))}><span style={{ fontSize: 18, lineHeight: 1 }}>×</span></button>}
            </div>
          )
        })}
      </div>
      {!adicionando
        ? <button className="btn w sm" onClick={() => setAdicionando(true)}>+ Adicionar mais gente</button>
        : <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
              <input className="inp" style={{ minWidth: 0 }} maxLength={30} placeholder="Nome de quem vai pagar" value={novo}
                onChange={(evento) => setNovo(evento.target.value)} onKeyDown={(evento) => { if (evento.key === 'Enter') adicionarNome() }} />
              <button className="btn sm" style={{ width: 'auto', paddingInline: 14 }} disabled={!novo.trim()} onClick={adicionarNome}>Adicionar</button>
            </div>
            {foraComConta.length > 0 && <>
              <span className="mut" style={{ fontSize: 13 }}>Da turma, com conta no app</span>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{foraComConta.map(chip)}</div>
            </>}
          </div>}
    </div>
  )
}

/** Criar: nome, motivo, valor total e quem participa (quem joga com a conta já vem marcado). */
function NovaCaixinha({ turmas, turmaInicial, onFechar, onCriada }: {
  turmas: Turma[]; turmaInicial: string | null; onFechar: () => void; onCriada: (id: string) => void
}) {
  // o Pix é o mesmo do campo pago (fica nos ajustes da pelada)
  const pagamento = carregar()?.estado.config.pagamento
  const turma = turmaInicial
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [chavePix, setChavePix] = useState(pagamento?.chavePix ?? '')
  const [recebedor, setRecebedor] = useState(pagamento?.recebedor ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const jogadoresDaTurma = useJogadoresDaTurma(turma)
  const sugestoes = participantesDaTurma(jogadoresDaTurma)
  const [escolhidos, setEscolhidos] = useState<JogadorDaCaixinha[] | null>(null)
  // até o organizador mexer, vale quem joga com a conta (a turma pode chegar depois de abrir)
  const participantes = escolhidos ?? sugestoes
  const meta = Number(valor.replace(/[^\d,.]/g, '').replace(',', '.')) || 0
  const porPessoa = valorPorPessoaDaCaixinha(meta, participantes.length)
  const pronto = nome.trim() && meta > 0 && participantes.length > 0 && chavePix.trim() && recebedor.trim()

  const criar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const caixinha = await criarCaixinha({ nome: nome.trim(), descricao: descricao.trim(), meta: Math.round(meta * 100) / 100, turma, jogadores: participantes, chavePix: chavePix.trim(), recebedor: recebedor.trim() })
      onCriada(caixinha.id)
    } catch {
      setErro('Não deu para criar agora. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Nova caixinha" onClick={onFechar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: 'calc(var(--altura-tela) * .92)', overflowY: 'auto' }}>
        <div className="ph">Nova caixinha</div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>
          <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>Turma: {turmas.find((item) => item.id === turma)?.nome ?? '—'}</div>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Nome</span>
            <input className="inp" autoFocus maxLength={30} placeholder="Ex.: Bola nova" value={nome} onChange={(evento) => setNome(evento.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Motivo (aparece no link)</span>
            <input className="inp" maxLength={80} placeholder="Ex.: Bola oficial para o society" value={descricao} onChange={(evento) => setDescricao(evento.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Valor total (R$)</span>
            <input className="inp" inputMode="decimal" placeholder="Ex.: 150" value={valor} onChange={(evento) => setValor(evento.target.value)} />
          </label>
          <div className="plano-conta" style={{ color: 'var(--navy)' }}>
            {participantes.length > 0
              ? <><b>{reais(porPessoa)} para cada um</b><small>{reais(meta)} ÷ {participantes.length} {participantes.length === 1 ? 'pessoa' : 'pessoas'}</small></>
              : <b>Escolha quem participa para dividir o valor.</b>}
          </div>
          <QuemParticipa escolhidos={participantes} sugestoes={sugestoes} onMudar={setEscolhidos} />
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Sua chave Pix</span>
            <input className="inp" placeholder="CPF, celular, e-mail ou chave aleatória" value={chavePix} onChange={(evento) => setChavePix(evento.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>Nome de quem recebe</span>
            <input className="inp" placeholder="Como aparece no Pix" value={recebedor} onChange={(evento) => setRecebedor(evento.target.value)} />
          </label>
          {erro && <div role="status" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
          <button className="btn" disabled={!pronto || salvando} onClick={() => void criar()}>{salvando ? 'Criando…' : 'Criar caixinha'}</button>
          <button className="btn w sm" onClick={onFechar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}

/** Uma caixinha: QR do Pix, link para o grupo, quem pagou (tocar = confirma ou desfaz), usar o dinheiro e encerrar. */
function CaixinhaAberta({ caixinha, lancamentos, onSaida, onFechar }: { caixinha: Caixinha; lancamentos: Lancamento[] | null; onSaida: () => void; onFechar: () => void }) {
  const status = useStatusDaCaixinha(caixinha)
  const confirmar = useConfirmar()
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const pix = pixDaCaixinha(caixinha)
  const copiar = async () => {
    await navigator.clipboard.writeText(pix).catch(() => null)
    setAviso('Pix copia e cola copiado!')
  }
  const compartilharLink = async () => {
    const texto = `💰 ${caixinha.nome}${caixinha.descricao ? ` · ${caixinha.descricao}` : ''}\n${reais(caixinha.valorPorPessoa)} cada. Pague pelo Pix e marque seu nome: ${linkDePagamento(caixinha.cobranca)}`
    if (!(await compartilharTexto({ text: texto }))) { await navigator.clipboard.writeText(texto).catch(() => null); setAviso('Link copiado! É só colar no grupo.') }
  }
  const alternar = (jogador: JogadorDaCaixinha) => void marcarNaCaixinha(caixinha, jogador, status[jogador.id] === 'pago' ? null : 'pago')
  const encerrar = () => confirmar({
    titulo: 'Encerrar a caixinha?', mensagem: `${caixinha.nome} sai da lista. O que já entrou continua no caixa.`, botao: 'Encerrar', perigo: true,
    aoConfirmar: () => { void encerrarCaixinha(caixinha); onFechar() },
  })
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={caixinha.nome} onClick={onFechar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: 'calc(var(--altura-tela) * .92)', display: 'flex', flexDirection: 'column' }}>
        <div className="ph">
          <span>{caixinha.nome}</span>
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Fechar" onClick={onFechar}><span style={{ fontSize: 20, lineHeight: 1 }}>×</span></button>
        </div>
        <div className="pb" style={{ display: 'grid', gap: 10, overflowY: 'auto' }}>
          {caixinha.descricao && <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{caixinha.descricao}</div>}
          <BarraDaMeta caixinha={caixinha} status={status} lancamentos={lancamentos} />
          <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
            <QrCode texto={pix} tamanho={180} />
            <div className="mut" style={{ fontSize: 13 }}>{reais(caixinha.valorPorPessoa)} cada · Pix para {caixinha.recebedor}</div>
          </div>
          <div className="opcoes-lado-a-lado">
            <button className="btn w sm" onClick={() => void copiar()}>Copiar Pix</button>
            <button className="btn sm" onClick={() => void compartilharLink()}>Link p/ grupo</button>
          </div>
          {aviso && <div role="status" className="mut" style={{ color: 'var(--navy)', fontWeight: 600, textAlign: 'center' }}>{aviso}</div>}
          <div className="mut" style={{ fontSize: 13 }}>Toque no nome para confirmar o pagamento (ou desfazer). Amarelo: avisou que pagou, confira no banco.</div>
          <div>
            {caixinha.jogadores.map((jogador) => {
              const estado = status[jogador.id]
              const cor = estado === 'pago' ? 'var(--verde)' : estado === 'avisou' ? 'var(--amarelo)' : 'var(--divisoria)'
              return (
                <button key={jogador.id} className="tr" style={{ width: '100%', border: 0, font: 'inherit', color: 'var(--navy)', textAlign: 'left', cursor: 'pointer', borderLeft: `8px solid ${cor}` }}
                  onClick={() => alternar(jogador)}>
                  <span className="nome">{jogador.nome}</span>
                  <span className="tag" style={{ background: cor, color: estado === 'pago' ? '#fff' : 'var(--navy)' }}>{estado === 'pago' ? 'Pago' : estado === 'avisou' ? 'Avisou' : 'Pendente'}</span>
                </button>
              )
            })}
          </div>
          <button className="btn w sm" onClick={() => setEditando(true)}>Mudar quem participa</button>
          <button className="btn r sm" onClick={() => { onFechar(); onSaida() }}>Usar o dinheiro (saída)</button>
          <button className="btn w sm" onClick={encerrar}>Encerrar caixinha</button>
        </div>
      </section>
      {editando && <MudarParticipantes caixinha={caixinha} status={status} onFechar={() => setEditando(false)} />}
    </div>
  )
}

/** Muda quem participa de uma caixinha já criada: o valor por pessoa é refeito. Quem já pagou ou avisou não sai. */
function MudarParticipantes({ caixinha, status, onFechar }: { caixinha: Caixinha; status: Record<string, StatusPagamento>; onFechar: () => void }) {
  const sugestoes = participantesDaTurma(useJogadoresDaTurma(caixinha.turma))
  const [escolhidos, setEscolhidos] = useState(caixinha.jogadores)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const porPessoa = valorPorPessoaDaCaixinha(caixinha.meta, escolhidos.length)
  const jaPagaram = caixinha.jogadores.some((jogador) => status[jogador.id] === 'pago')
  // quem tem conta, mais quem já pagou ou avisou (esses não saem)
  const contas = new Set(sugestoes.map((jogador) => jogador.id))
  const soComConta = [...caixinha.jogadores.filter((jogador) => status[jogador.id] && !contas.has(jogador.id)), ...sugestoes]
  const salvar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      await mudarParticipantes(caixinha, escolhidos)
      onFechar()
    } catch {
      setErro('Não deu para salvar agora. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Quem participa" onClick={(evento) => { evento.stopPropagation(); onFechar() }}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()} style={{ maxHeight: 'calc(var(--altura-tela) * .92)', overflowY: 'auto' }}>
        <div className="ph">Quem participa</div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>
          <div className="plano-conta" style={{ color: 'var(--navy)' }}>
            {escolhidos.length > 0
              ? <><b>{reais(porPessoa)} para cada um</b><small>{reais(caixinha.meta)} ÷ {escolhidos.length} {escolhidos.length === 1 ? 'pessoa' : 'pessoas'}</small></>
              : <b>Escolha quem participa para dividir o valor.</b>}
          </div>
          {jaPagaram && porPessoa !== caixinha.valorPorPessoa && (
            <div className="mut" style={{ fontSize: 13 }}>Quem já pagou continua com {reais(caixinha.valorPorPessoa)} no caixa. O valor novo vale para quem ainda vai pagar.</div>
          )}
          {sugestoes.length > 0 && escolhidos.length !== soComConta.length && (
            <button className="btn w sm" onClick={() => setEscolhidos(soComConta)}>Deixar só quem tem conta ({soComConta.length})</button>
          )}
          <QuemParticipa escolhidos={escolhidos} sugestoes={sugestoes} travados={status} onMudar={setEscolhidos} />
          {erro && <div role="status" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
          <button className="btn" disabled={escolhidos.length === 0 || salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          <button className="btn w sm" onClick={onFechar}>Cancelar</button>
        </div>
      </section>
    </div>
  )
}

/** O mesmo Pix do link (o nome da caixinha vai como identificador, aparece no extrato). */
const pixDaCaixinha = (caixinha: Caixinha) =>
  pixCopiaECola({ chave: caixinha.chavePix, recebedor: caixinha.recebedor, valor: caixinha.valorPorPessoa, identificador: caixinha.nome })
