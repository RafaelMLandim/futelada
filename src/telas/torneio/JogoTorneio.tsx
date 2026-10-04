import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Barra } from '../../components/Barra'
import { Bola } from '../../components/Bola'
import { Camisa } from '../../components/Camisa'
import { Cartao } from '../../components/Cartao'
import { Icone } from '../../components/Icone'
import { ResumoDeGols } from '../../components/ResumoDeGols'
import { PlacarLed } from '../../components/PlacarLed'
import { LADOS, outro, restanteAzulNaLista } from '../../logic'
import { tempoDecorrido, tempoTotalMs } from '../../logic/cronometro'
import { EscolherAcrescimos } from '../../components/EscolherAcrescimos'
import {
  acrescimosNaPartida, cancelarPartida, cartaoNaPartida, cronoDaPartida, expulsosNaPartida, golNaPartida, jogoPorId, partidaDoJogo, removerGolDaPartida,
  substituirNaPartida, timesDoJogo,
} from '../../logic/torneio'
import type { TorneioHook } from '../../store/torneio'
import type { CorCartao, Jogador, Lado } from '../../types/pelada'
import type { TimeTorneio } from '../../types/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { textoSobre } from '../../utils/cores'
import { formatarTempo } from '../../utils/formatar'
import { apitoFim, apitoInicio, somDeGol } from '../../utils/sons'
import { nomeDoJogo } from './nomes'
import { FimDeJogo } from './FimDeJogo'

type Escolha =
  | { tipo: 'gol'; lado: Lado; contra?: boolean }
  | { tipo: 'jogador'; lado: Lado; jogador: Jogador }
  | { tipo: 'entrar'; lado: Lado; jogador: Jogador }
  | { tipo: 'sair'; lado: Lado; jogador: Jogador }

// O jogo do torneio em andamento: placar, gols, cartões, substituições e encerramento.
export function JogoTorneio({ hook, jogoId, editavel = true, onTerminou }: {
  hook: TorneioHook; jogoId: string; editavel?: boolean; onTerminou: () => void
}) {
  const t = hook.torneio!
  const p = partidaDoJogo(t, jogoId)!
  const confirmar = useConfirmar()
  const [escolha, setEscolha] = useState<Escolha | null>(null)
  const [fimManual, setFimManual] = useState(false)
  // acréscimos dados quando o resumo foi fechado (o resumo volta a abrir quando os acréscimos acabam)
  const [fimDispensadoEm, setFimDispensadoEm] = useState<number | null>(null)
  const [escolhendoAcrescimos, setEscolhendoAcrescimos] = useState(false)
  const [, tique] = useState(0)

  useEffect(() => {
    if (!p.crono.rodando) return
    const id = setInterval(() => tique((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [p.crono.rodando])

  const { regras } = t
  const jogo = jogoPorId(t, p.jogoId)!
  const ids = timesDoJogo(t, jogo)
  const times = { A: t.times.find((x) => x.id === ids.A)!, B: t.times.find((x) => x.id === ids.B)! }
  const decorrido = tempoDecorrido(p.crono)
  const acabouTempo = decorrido >= tempoTotalMs(regras.tempoMin, p.crono)
  const acabouGols = regras.gols !== null && (p.placar[0] >= regras.gols || p.placar[1] >= regras.gols)
  const fim = acabouTempo || acabouGols
  const expulsos = expulsosNaPartida(p)

  // Apita, vibra e pausa uma vez quando acaba (tempo ou gols)
  const avisou = useRef(fim)
  const { aplicar } = hook
  useEffect(() => {
    if (fim && !avisou.current) {
      avisou.current = true
      if (!editavel) return // quem só acompanha não apita nem mexe no jogo
      if (regras.som) apitoFim()
      navigator.vibrate?.([300, 150, 300, 150, 600])
      if (p.crono.rodando) aplicar((x) => cronoDaPartida(x, jogoId, false))
    }
    if (!fim) avisou.current = false
  }, [fim, regras.som, p.crono.rodando, aplicar, jogoId, editavel])

  // O resumo de fim de jogo abre pelo botão ou sozinho quando acaba o tempo
  const acrescimoMin = p.crono.acrescimoMin ?? 0
  const fimAberto = editavel && !escolhendoAcrescimos && (fimManual || (acabouTempo && fimDispensadoEm !== acrescimoMin))
  const fecharFim = () => { setFimManual(false); setFimDispensadoEm(acrescimoMin) }
  const comecarAcrescimos = (min: number) => {
    setEscolhendoAcrescimos(false)
    if (regras.som) apitoInicio()
    hook.aplicar((x) => acrescimosNaPartida(x, jogoId, min))
  }

  const jogador = (time: TimeTorneio, id: string) => time.jogadores.find((j) => j.id === id)!
  const play = () => {
    if (!p.crono.rodando && regras.som) apitoInicio()
    hook.aplicar((x) => cronoDaPartida(x, jogoId, !p.crono.rodando))
  }
  const marcarGol = (lado: Lado, autor: Jogador | null, contra = false) => {
    setEscolha(null)
    if (regras.som) somDeGol()
    hook.aplicar((x) => golNaPartida(x, jogoId, lado, autor, decorrido, contra))
  }
  const darCartao = (lado: Lado, j: Jogador, cor: CorCartao) => {
    setEscolha(null)
    hook.aplicar((x) => cartaoNaPartida(x, jogoId, lado, j, cor, decorrido))
  }
  const trocar = (lado: Lado, saiId: string, entraId: string) => {
    setEscolha(null)
    hook.aplicar((x) => substituirNaPartida(x, jogoId, lado, saiId, entraId))
  }
  const restante = formatarTempo(regras.tempoMin * 60_000 - decorrido)
  const encerrar = () => {
    if (fim) return setFimManual(true)
    confirmar({
      titulo: 'Encerrar o jogo?', mensagem: `O tempo ainda não acabou (faltam ${restante}).`,
      botao: 'Encerrar', aoConfirmar: () => setFimManual(true),
    })
  }
  const abandonar = () => confirmar({
    titulo: 'Abandonar o jogo?', mensagem: 'O jogo volta para a lista sem resultado. Gols e cartões deste jogo serão descartados.',
    botao: 'Abandonar', perigo: true, aoConfirmar: () => { hook.aplicar((x) => cancelarPartida(x, jogoId)); onTerminou() },
  })
  const limite = regras.maxSubstituicoes
  const podeSubstituir = (lado: Lado) => limite === null || p.escalacao.substituicoes[lado] < limite

  const coluna = (lado: Lado) => {
    const time = times[lado]
    const golsDe = (id: string) => p.gols.filter((g) => g.autorId === id && !g.contra).length
    const contraDe = (id: string) => p.gols.filter((g) => g.autorId === id && g.contra).length
    return (
      <div key={lado} style={lado === 'A' ? { borderRight: '2px solid #e3e8d6' } : undefined}>
        <div className="num" style={{ padding: '6px 10px', background: time.cor, color: textoSobre(time.cor), textTransform: 'uppercase' }}>
          <div style={{ fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{time.nome}</div>
          <div style={{ fontSize: 12, letterSpacing: 1, opacity: .85 }}>
            Subst. {p.escalacao.substituicoes[lado]}{limite !== null ? `/${limite}` : ''}
          </div>
        </div>
        {time.goleiro && <div className="tr" style={{ minHeight: 36, fontSize: 14 }}><span className="no g">G</span><span className="nome">{time.goleiro}</span></div>}
        {p.escalacao.emCampo[lado].map((id, i) => {
          const j = jogador(time, id)
          const fora = expulsos.has(id)
          const azul = restanteAzulNaLista(p.cartoes, id, regras.minutosAzul, decorrido)
          return (
            <button key={id} className="tr linha-jogador" style={{ minHeight: 40, fontSize: 14, opacity: fora ? 0.55 : 1 }} disabled={!editavel}
              aria-label={`Ações de ${j.nome}`} onClick={() => setEscolha({ tipo: 'jogador', lado, jogador: j })}>
              <span className="no">{i + 1}</span>
              <span className="nome" style={{ flex: '0 1 auto', textDecoration: fora ? 'line-through' : undefined }}>{j.nome}</span>
              {Array.from({ length: Math.min(golsDe(id), 3) }, (_, k) => <Bola key={k} />)}
              {golsDe(id) > 3 && <span className="num" style={{ fontSize: 14 }}>×{golsDe(id)}</span>}
              {Array.from({ length: contraDe(id) }, (_, k) => <Bola key={`c${k}`} contra />)}
              {p.cartoes.filter((c) => c.jogadorId === id).map((c, k) => <Cartao key={k} cor={c.cor} />)}
              {azul > 0 && <span className="tag" style={{ background: 'var(--azul)', color: '#fff', height: 20, fontSize: 13 }}>{formatarTempo(azul)}</span>}
            </button>
          )
        })}
        {(p.escalacao.banco[lado].length > 0 || p.escalacao.suspensos[lado].length > 0) && (
          <div className="tr" style={{ minHeight: 26, fontSize: 11, letterSpacing: 1, color: 'var(--mut)', background: '#e3e8d6' }}>BANCO</div>
        )}
        {p.escalacao.banco[lado].map((id) => {
          const j = jogador(time, id)
          return (
            <button key={id} className="tr linha-jogador" style={{ minHeight: 36, fontSize: 13, color: 'var(--mut)' }} disabled={!editavel}
              aria-label={`Colocar ${j.nome} em campo`} onClick={() => setEscolha({ tipo: 'entrar', lado, jogador: j })}>
              <span className="no" style={{ background: '#9aa4ae' }}>R</span><span className="nome">{j.nome}</span>
            </button>
          )
        })}
        {p.escalacao.suspensos[lado].map((id) => (
          <div key={id} className="tr" style={{ minHeight: 36, fontSize: 13, color: 'var(--mut)' }}>
            <span className="no" style={{ background: 'var(--vermelho)' }}>S</span>
            <span className="nome">{jogador(time, id).nome}</span><span className="tag t-warn">Suspenso</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="scr" key={p.jogoId}>
      <Barra titulo={`${times.A.nome} x ${times.B.nome}`} sub={`${nomeDoJogo(t, jogo)}${regras.campos > 1 ? ` · Campo ${p.campo}` : ''}`} />
      <div className="conteudo" style={{ gap: 10 }}>
        <PlacarLed lados={{ A: { titulo: times.A.nome, cor: times.A.cor }, B: { titulo: times.B.nome, cor: times.B.cor } }}
          placar={p.placar} tempoMin={regras.tempoMin} gols={regras.gols} decorrido={decorrido} rodando={p.crono.rodando} fim={fim} acrescimoMin={p.crono.acrescimoMin} />

        {!editavel && (
          <div className="panel pb mut" style={{ color: 'var(--navy)' }}>
            Acompanhando ao vivo. Quem marca este jogo é o mesário do Campo {p.campo} (ou o organizador).
          </div>
        )}
        {editavel && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          {LADOS.map((lado) => (
            <button key={lado} className="btn w sm" style={{ textTransform: 'none' }} onClick={() => setEscolha({ tipo: 'gol', lado })}>
              <Camisa cor={times[lado].cor} tamanho={20} /> Gol
            </button>
          ))}
          <button className="ib" style={{ width: 46, height: 46, boxShadow: '0 3px 0 var(--borda)', background: p.crono.rodando ? '#fff' : 'var(--amarelo)' }}
            aria-label={p.crono.rodando ? 'Pausar' : 'Iniciar cronômetro'} onClick={play}>
            <Icone nome={p.crono.rodando ? 'pausa' : 'play'} />
          </button>
        </div>}

        <ResumoDeGols gols={p.gols} tempoMin={regras.tempoMin} nomeDoLado={{ A: times.A.nome, B: times.B.nome }}
          onRemover={editavel ? (i) => hook.aplicar((x) => removerGolDaPartida(x, jogoId, i)) : undefined} />

        <section className="panel">
          <div className="ph">Escalações<span className="sub">toque no jogador</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>{LADOS.map(coluna)}</div>
        </section>

        {editavel && <button className={'btn' + (fim ? '' : ' w')} onClick={encerrar}><Icone nome="trofeu" /> Encerrar jogo</button>}
        {editavel && <button className="btn w sm" style={{ color: 'var(--vermelho)' }} onClick={abandonar}>Abandonar jogo (sem resultado)</button>}
      </div>

      {escolha?.tipo === 'gol' && (() => {
        // Gol contra: quem fez é do outro time
        const { lado, contra } = escolha
        const deQuem = contra ? outro(lado) : lado
        return (
          <Escolher titulo={`Gol do ${times[lado].nome}`} pergunta={contra ? `Gol contra · quem do ${times[deQuem].nome} fez?` : 'Quem fez?'}
            cor={times[lado].cor} onFechar={() => setEscolha(null)}>
            {p.escalacao.emCampo[deQuem].filter((id) => !expulsos.has(id)).map((id) => {
              const j = jogador(times[deQuem], id)
              return <button key={id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => marcarGol(lado, j, contra)}>{j.nome}</button>
            })}
            <button className="btn sm" style={{ gridColumn: '1 / -1' }} onClick={() => marcarGol(lado, null, contra)}>Não sei · só marcar o gol</button>
            {!contra && <button className="btn w sm" style={{ gridColumn: '1 / -1' }} onClick={() => setEscolha({ tipo: 'gol', lado, contra: true })}>Foi gol contra</button>}
          </Escolher>
        )
      })()}

      {escolha?.tipo === 'jogador' && (() => {
        const { lado, jogador: j } = escolha
        const fora = expulsos.has(j.id)
        const opcao = (rotulo: string, icone: ReactNode, onClick: () => void, classe = 'btn w sm') => (
          <button className={classe} style={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: 18, gridColumn: '1 / -1' }} onClick={onClick}>{icone}{rotulo}</button>
        )
        return (
          <Escolher titulo={j.nome} pergunta={times[lado].nome} cor={times[lado].cor} onFechar={() => setEscolha(null)}>
            {!fora && opcao('Gol', <Bola tamanho={22} />, () => marcarGol(lado, j))}
            {!fora && opcao('Gol contra', <Bola tamanho={22} />, () => marcarGol(outro(lado), j, true))}
            {opcao('Cartão amarelo', <Cartao cor="amarelo" tamanho={20} />, () => darCartao(lado, j, 'amarelo'))}
            {opcao('Cartão vermelho · expulso', <Cartao cor="vermelho" tamanho={20} />, () => darCartao(lado, j, 'vermelho'))}
            {opcao(`Cartão azul · ${regras.minutosAzul} min fora`, <Cartao cor="azul" tamanho={20} />, () => darCartao(lado, j, 'azul'))}
            {fora
              ? <div className="mut" style={{ gridColumn: '1 / -1' }}>Expulso não pode ser substituído.</div>
              : p.escalacao.banco[lado].length === 0
                ? <div className="mut" style={{ gridColumn: '1 / -1' }}>Sem reservas no banco.</div>
                : podeSubstituir(lado)
                  ? opcao('Substituir', <Icone nome="times" />, () => setEscolha({ tipo: 'sair', lado, jogador: j }), 'btn sm')
                  : <div className="mut" style={{ gridColumn: '1 / -1' }}>Limite de substituições atingido.</div>}
          </Escolher>
        )
      })()}

      {escolha?.tipo === 'sair' && (
        <Escolher titulo={`Sai ${escolha.jogador.nome}`} pergunta="Quem entra?" cor={times[escolha.lado].cor} onFechar={() => setEscolha(null)}>
          {p.escalacao.banco[escolha.lado].map((id) => {
            const j = jogador(times[escolha.lado], id)
            return <button key={id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => trocar(escolha.lado, escolha.jogador.id, id)}>{j.nome}</button>
          })}
        </Escolher>
      )}

      {escolha?.tipo === 'entrar' && (
        <Escolher titulo={`Entra ${escolha.jogador.nome}`} pergunta="No lugar de quem?" cor={times[escolha.lado].cor} onFechar={() => setEscolha(null)}>
          {!podeSubstituir(escolha.lado)
            ? <div className="mut" style={{ gridColumn: '1 / -1' }}>Limite de substituições atingido.</div>
            : p.escalacao.emCampo[escolha.lado].filter((id) => !expulsos.has(id)).map((id) => {
              const j = jogador(times[escolha.lado], id)
              return <button key={id} className="btn w sm" style={{ textTransform: 'none', fontSize: 18 }} onClick={() => trocar(escolha.lado, id, escolha.jogador.id)}>{j.nome}</button>
            })}
        </Escolher>
      )}

      {fimAberto && (
        <FimDeJogo hook={hook} jogoId={jogoId} times={times} onFechar={fecharFim} onEncerrado={onTerminou}
          onAcrescimos={acabouTempo && regras.acrescimos && !acrescimoMin ? () => { setFimManual(false); setEscolhendoAcrescimos(true) } : undefined} />
      )}
      {escolhendoAcrescimos && <EscolherAcrescimos onComecar={comecarAcrescimos} onCancelar={() => setEscolhendoAcrescimos(false)} />}
    </div>
  )
}

/** Modal simples com título na cor do time e uma grade de opções. */
function Escolher({ titulo, pergunta, cor, onFechar, children }: {
  titulo: string; pergunta: string; cor: string; onFechar: () => void; children: ReactNode
}) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph" style={{ background: cor, color: textoSobre(cor) }}>
          <span>{titulo}</span>
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Fechar" onClick={onFechar}><span style={{ fontSize: 20, lineHeight: 1 }}>×</span></button>
        </div>
        <div className="pb" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div className="mut" style={{ gridColumn: '1 / -1', color: 'var(--navy)', fontWeight: 600 }}>{pergunta}</div>
          {children}
        </div>
      </section>
    </div>
  )
}
