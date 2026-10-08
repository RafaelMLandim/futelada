import { useEffect, useRef, useState } from 'react'
import { Barra } from '../../components/Barra'
import { Icone } from '../../components/Icone'
import { Camisa } from '../../components/Camisa'
import { LADOS, acabouPorGols, blocosDaFila, gol, removerJogador, restanteAzul, vitoria } from '../../logic'
import { tempoDecorrido, tempoTotalMs } from '../../store/cronometro'
import type { Pelada } from '../../store/usePelada'
import type { Jogador, Lado, Partida } from '../../types/pelada'
import { apitoFim, apitoInicio, somDeGol } from '../../utils/sons'
import { useConfirmar } from '../../utils/confirmacao'
import { textoSobre } from '../../utils/cores'
import { formatarTempo } from '../../utils/formatar'
import { AcoesJogador } from './AcoesJogador'
import { Empate } from './Empate'
import { Escalacoes } from './Escalacoes'
import { EscolherAcrescimos } from '../../components/EscolherAcrescimos'
import { GolsDaPartida } from './GolsDaPartida'
import { Placar } from './Placar'
import { QuemFezGol } from './QuemFezGol'

export function Jogo({ pelada, onLista }: { pelada: Pelada; onLista: () => void }) {
  const { app, aplicar, crono, acrescimos } = pelada
  const { estado } = app
  const confirmar = useConfirmar()
  const [empateManual, setEmpateManual] = useState(false)
  const [tempoDispensadoEm, setTempoDispensadoEm] = useState<string | null>(null)
  const [escolhendoAcrescimos, setEscolhendoAcrescimos] = useState(false)
  const [golDe, setGolDe] = useState<Lado | null>(null)
  const [acoes, setAcoes] = useState<{ lado: Lado; jogador: Jogador } | null>(null)
  // Aviso de "fim de jogo" que aparece por alguns segundos quando a partida acaba no gol
  const [transicao, setTransicao] = useState<Partida | null>(null)
  // Quando uma partida termina (vitória, gol que decide ou empate), anima a troca nas escalações.
  // Começa com o total atual para não mostrar ao abrir a tela.
  const partidasAntes = useRef(estado.historico.length)
  useEffect(() => {
    const total = estado.historico.length
    if (total > partidasAntes.current) setTransicao(estado.historico[total - 1])
    else setTransicao(null)
    partidasAntes.current = total
  }, [estado.historico])
  useEffect(() => {
    if (!transicao) return
    const id = window.setTimeout(() => setTransicao(null), 3800)
    return () => clearTimeout(id)
  }, [transicao])
  const [, tique] = useState(0)

  // Atualiza o relógio enquanto roda
  useEffect(() => {
    if (!app.crono.rodando) return
    const id = setInterval(() => tique((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [app.crono.rodando])

  const cfg = estado.config
  const decorrido = tempoDecorrido(app.crono)
  const acabouTempo = decorrido >= tempoTotalMs(cfg.tempoMin, app.crono)
  const fim = acabouTempo || acabouPorGols(estado)

  // Apita e vibra uma vez quando a partida acaba (gols ou tempo esgotado).
  // Começa com o valor atual para não repetir ao abrir uma partida que já tinha acabado.
  // Acabou o tempo: abre o modal "Acabou o tempo" (encerrar ou dar acréscimos).
  const avisou = useRef(fim)
  const [golsA, golsB] = estado.placar
  useEffect(() => {
    if (fim && !avisou.current) {
      avisou.current = true
      if (cfg.som) apitoFim()
      navigator.vibrate?.([300, 150, 300, 150, 600])
      if (app.crono.rodando) crono(false)
    }
    if (!fim) avisou.current = false
  }, [fim, app.crono.rodando, crono, cfg.som])

  // A moeda abre pelo botão ou sozinha quando o tempo acaba empatado (até ser fechada)
  const empateAberto = empateManual
  const fecharEmpate = () => setEmpateManual(false)
  // Modal "Acabou o tempo": abre sozinho quando o tempo (ou os acréscimos) esgota com o relógio
  // parado, até a pessoa escolher nesta partida. Acréscimos só uma vez e se estiver ligado.
  const chaveDoTempo = `${estado.historico.length}:${app.crono.acrescimoMin ?? 0}`
  const fimDoTempoAberto = acabouTempo && !app.crono.rodando && !empateAberto && !escolhendoAcrescimos && tempoDispensadoEm !== chaveDoTempo
  const podeDarAcrescimos = cfg.acrescimos && !app.crono.acrescimoMin
  const comecarAcrescimos = (min: number) => {
    setEscolhendoAcrescimos(false)
    if (cfg.som) apitoInicio()
    acrescimos(min)
  }

  // Vibra quando acaba o tempo de um cartão azul (jogador pode voltar)
  const azuisAtivos = estado.cartoes.filter((c) => c.cor === 'azul' && restanteAzul(estado, c.jogadorId, decorrido) > 0).length
  const azuisAntes = useRef(azuisAtivos)
  useEffect(() => {
    if (azuisAtivos < azuisAntes.current) navigator.vibrate?.([200, 100, 200])
    azuisAntes.current = azuisAtivos
  }, [azuisAtivos])

  if (!estado.emCampo) {
    return (
      <div className="scr">
        <Barra titulo="Em campo" sub="Nenhuma partida rolando" />
        <div className="conteudo">
          <div className="vazio">Monte a lista e apite a primeira partida.</div>
          <button className="btn" onClick={onLista}>Ir para a lista <Icone nome="seta" /></button>
        </div>
      </div>
    )
  }

  const emCampo = estado.emCampo
  const { coletes } = cfg
  const corDoBotao = (lado: Lado) => ({ background: coletes[lado].cor, color: textoSobre(coletes[lado].cor) })
  const proximo = blocosDaFila(estado)[0]

  const alternarCrono = () => {
    if (!app.crono.rodando && cfg.som) apitoInicio()
    crono(!app.crono.rodando)
  }
  // Gol: toca o som; ao chegar no limite de gols, apita o fim (sem encerrar sozinho)
  const marcar = (lado: Lado, autor: Jogador | null, contra = false) => {
    aplicar((e) => gol(e, lado, autor, decorrido, contra))
    const chegouNoLimite = cfg.gols !== null && estado.placar[lado === 'A' ? 0 : 1] + 1 >= cfg.gols
    if (!chegouNoLimite) {
      if (cfg.som) somDeGol()
      return
    }
    // Chegou no limite de gols: a partida não encerra sozinha, mas apita o fim
    // depois do som de gol (e o aviso de "fim de jogo" não repete o apito)
    avisou.current = true
    if (cfg.som) somDeGol(apitoFim)
    navigator.vibrate?.([300, 150, 300, 150, 600])
    if (app.crono.rodando) crono(false)
  }

  // Encerrar antes do tempo pede confirmação
  const restante = formatarTempo(cfg.tempoMin * 60_000 - decorrido)
  const encerrarCom = (acao: string, fazer: () => void) => {
    if (fim) return fazer()
    confirmar({
      titulo: 'Encerrar a partida?',
      mensagem: `O tempo ainda não acabou (faltam ${restante}). Encerrar ${golsA} x ${golsB} com ${acao}?`,
      botao: 'Encerrar',
      aoConfirmar: fazer,
    })
  }
  const venceu = (lado: Lado) =>
    encerrarCom(`vitória do Time ${estado.emCampo![lado].numero}`, () => aplicar((e) => vitoria(e, lado), true))
  const abrirEmpate = () => encerrarCom('empate', () => setEmpateManual(true))
  // Quem está ganhando (null = empatado): o botão de fim de jogo segue o placar
  const lider: Lado | null = golsA === golsB ? null : golsA > golsB ? 'A' : 'B'
  const saiu = (id: string, nome: string) => {
    const quem = proximo?.[0]?.nome
    confirmar({
      titulo: 'Foi embora?',
      mensagem: quem ? `${nome} foi embora? ${quem} entra no lugar.` : `${nome} foi embora? Não tem ninguém na fila para entrar.`,
      botao: 'Foi embora',
      perigo: true,
      aoConfirmar: () => aplicar((e) => removerJogador(e, id)),
    })
  }

  return (
    <div className="scr">
      <Barra titulo="Em campo" sub={`Partida ${estado.historico.length + 1}`} />
      <div className="conteudo" style={{ gap: 10 }}>
        <Placar estado={estado} decorrido={decorrido} rodando={app.crono.rodando} fim={fim} acrescimoMin={app.crono.acrescimoMin} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          {LADOS.map((lado) => (
            <button key={lado} className="btn w sm" onClick={() => setGolDe(lado)}>
              <Camisa cor={coletes[lado].cor} tamanho={20} /> Gol T{estado.emCampo![lado].numero}
            </button>
          ))}
          <button className="ib" style={{ width: 46, height: 46, boxShadow: '0 3px 0 var(--borda)', background: app.crono.rodando ? '#fff' : 'var(--amarelo)' }}
            aria-label={app.crono.rodando ? 'Pausar' : 'Iniciar cronômetro'} onClick={alternarCrono}>
            <Icone nome={app.crono.rodando ? 'pausa' : 'play'} />
          </button>
        </div>

        <GolsDaPartida pelada={pelada} />

        <Escalacoes pelada={pelada} decorrido={decorrido} transicao={transicao} onJogador={(lado, jogador) => setAcoes({ lado, jogador })} />

        {/* Um botão só, que segue o placar: não tem como dar a vitória para o time errado */}
        <section className={'panel' + (fim ? ' destaque' : '')}>
          <div className="ph">Fim de jogo</div>
          <div className="pb" style={{ display: 'grid', gap: 6 }}>
            {lider
              ? <button className="btn" style={corDoBotao(lider)} onClick={() => venceu(lider)}>
                  Time {emCampo[lider].numero} venceu · chamar o próximo
                </button>
              : <button className="btn w" onClick={abrirEmpate}>Empatou · ir para a moeda</button>}
            <div className="mut" style={{ textAlign: 'center', fontSize: 12 }}>O resultado segue o placar. Errou um gol? Corrija o placar antes.</div>
          </div>
        </section>

        <button className="panel row" style={{ padding: '8px 10px', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={onLista}>
          <span className="tag t-y">Próximo</span>
          <span className="nome" style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proximo ? `Time ${estado.filaTimes[0]} · ${proximo.map((j) => j.nome).join(', ')}` : 'Ninguém esperando'}
          </span>
          {proximo && (
            <span className={'tag ' + (proximo.length < cfg.linha ? 't-warn' : 't-ok')}>{proximo.length}/{cfg.linha}</span>
          )}
        </button>
      </div>

      {empateAberto && <Empate pelada={pelada} onFechar={fecharEmpate} />}
      {fimDoTempoAberto && estado.emCampo && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Acabou o tempo">
          <section className="panel">
            <div className="ph">Acabou o tempo</div>
            <div className="pb" style={{ display: 'grid', gap: 10 }}>
              <div className="led num" style={{ textAlign: 'center', padding: '8px 12px' }}>
                <div style={{ fontSize: 40 }}>{golsA} <span style={{ color: '#5e6a76' }}>-</span> {golsB}</div>
                <div style={{ fontSize: 18, color: '#fff', textTransform: 'uppercase' }}>
                  {golsA === golsB ? 'Empate' : `Time ${estado.emCampo[golsA > golsB ? 'A' : 'B'].numero} vencendo`}
                </div>
              </div>
              {golsA === golsB
                ? <button className="btn" onClick={() => { setTempoDispensadoEm(chaveDoTempo); setEmpateManual(true) }}>Encerrar · ir para a moeda</button>
                : <button className="btn" onClick={() => aplicar((e) => vitoria(e, golsA > golsB ? 'A' : 'B'), true)}>
                    Encerrar · Time {estado.emCampo[golsA > golsB ? 'A' : 'B'].numero} venceu
                  </button>}
              {podeDarAcrescimos && <button className="btn w sm" onClick={() => setEscolhendoAcrescimos(true)}><Icone nome="play" /> Dar acréscimos</button>}
              <button className="btn w sm" onClick={() => setTempoDispensadoEm(chaveDoTempo)}>Voltar ao jogo</button>
            </div>
          </section>
        </div>
      )}
      {escolhendoAcrescimos && <EscolherAcrescimos onComecar={comecarAcrescimos} onCancelar={() => setEscolhendoAcrescimos(false)} />}
      {golDe && <QuemFezGol pelada={pelada} lado={golDe} onGol={marcar} onFechar={() => setGolDe(null)} />}
      {acoes && (
        <AcoesJogador pelada={pelada} lado={acoes.lado} jogador={acoes.jogador} decorrido={decorrido}
          onGol={marcar} onSaiu={saiu} onFechar={() => setAcoes(null)} />
      )}
    </div>
  )
}
