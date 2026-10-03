import { useEffect, useRef, useState } from 'react'
import { Barra } from '../../components/Barra'
import { Icone } from '../../components/Icone'
import { Camisa } from '../../components/Camisa'
import { LADOS, acabouPorGols, blocosDaFila, removerJogador, restanteAzul, vitoria } from '../../logic'
import { tempoDecorrido } from '../../store/cronometro'
import type { Pelada } from '../../store/usePelada'
import type { Jogador, Lado } from '../../types/pelada'
import { textoSobre } from '../../utils/cores'
import { AcoesJogador } from './AcoesJogador'
import { Empate } from './Empate'
import { Escalacoes } from './Escalacoes'
import { Placar } from './Placar'
import { QuemFezGol } from './QuemFezGol'

export function Jogo({ pelada, onAjustes, onLista }: { pelada: Pelada; onAjustes: () => void; onLista: () => void }) {
  const { app, aplicar, crono, desfazer } = pelada
  const { estado } = app
  const [empateAberto, setEmpateAberto] = useState(false)
  const [golDe, setGolDe] = useState<Lado | null>(null)
  const [acoes, setAcoes] = useState<{ lado: Lado; jogador: Jogador } | null>(null)
  const [, tique] = useState(0)

  // Atualiza o relógio enquanto roda
  useEffect(() => {
    if (!app.crono.rodando) return
    const id = setInterval(() => tique((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [app.crono.rodando])

  const cfg = estado.config
  const decorrido = tempoDecorrido(app.crono)
  const fim = decorrido >= cfg.tempoMin * 60_000 || acabouPorGols(estado)

  // Vibra uma vez quando a partida acaba
  const avisou = useRef(false)
  useEffect(() => {
    if (fim && !avisou.current) {
      avisou.current = true
      navigator.vibrate?.([300, 150, 300, 150, 600])
      if (app.crono.rodando) crono(false)
    }
    if (!fim) avisou.current = false
  }, [fim, app.crono.rodando, crono])

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

  const { A, B } = estado.emCampo
  const { coletes } = cfg
  const corDoBotao = (lado: Lado) => ({ background: coletes[lado].cor, color: textoSobre(coletes[lado].cor) })
  const proximo = blocosDaFila(estado)[0]

  const venceu = (lado: Lado) => aplicar((e) => vitoria(e, lado), true)
  const saiu = (id: string, nome: string) => {
    const quem = proximo?.[0]?.nome
    const msg = quem ? `${nome} foi embora? ${quem} entra no lugar.` : `${nome} foi embora? Não tem ninguém na fila para entrar.`
    if (confirm(msg)) aplicar((e) => removerJogador(e, id))
  }

  return (
    <div className="scr">
      <Barra
        titulo="Em campo"
        sub={`Partida ${estado.historico.length + 1}`}
        direita={
          <div className="row" style={{ gap: 6 }}>
            <button className="ib" aria-label="Desfazer" disabled={app.desfazer.length === 0} onClick={desfazer}><Icone nome="desfazer" /></button>
            <button className="ib" aria-label="Ajustes" onClick={onAjustes}><Icone nome="ajustes" /></button>
          </div>
        }
      />
      <div className="conteudo" style={{ gap: 10 }}>
        <Placar estado={estado} decorrido={decorrido} rodando={app.crono.rodando} fim={fim} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          {LADOS.map((lado) => (
            <button key={lado} className="btn w sm" onClick={() => setGolDe(lado)}>
              <Camisa cor={coletes[lado].cor} tamanho={20} /> Gol T{estado.emCampo![lado].numero}
            </button>
          ))}
          <button className="ib" style={{ width: 46, height: 46, boxShadow: '0 3px 0 var(--borda)', background: app.crono.rodando ? '#fff' : 'var(--amarelo)' }}
            aria-label={app.crono.rodando ? 'Pausar' : 'Iniciar cronômetro'} onClick={() => crono(!app.crono.rodando)}>
            <Icone nome={app.crono.rodando ? 'pausa' : 'play'} />
          </button>
        </div>

        <Escalacoes pelada={pelada} decorrido={decorrido} onJogador={(lado, jogador) => setAcoes({ lado, jogador })} />

        <section className={'panel' + (fim ? ' destaque' : '')}>
          <div className="ph">Fim de jogo · quem venceu?</div>
          <div className="pb" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8 }}>
            <button className="btn sm" style={corDoBotao('A')} onClick={() => venceu('A')}>Time {A.numero}</button>
            <button className="btn w sm" style={{ width: 'auto' }} onClick={() => setEmpateAberto(true)}>Empate</button>
            <button className="btn sm" style={corDoBotao('B')} onClick={() => venceu('B')}>Time {B.numero}</button>
          </div>
        </section>

        <button className="panel row" style={{ padding: '8px 10px', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={onLista}>
          <span className="tag t-y">Próximo</span>
          <span className="nome" style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proximo ? `Time ${estado.proximoNumero} · ${proximo.map((j) => j.nome).join(', ')}` : 'Ninguém esperando'}
          </span>
          {proximo && (
            <span className={'tag ' + (proximo.length < cfg.linha ? 't-warn' : 't-ok')}>{proximo.length}/{cfg.linha}</span>
          )}
        </button>
      </div>

      {empateAberto && <Empate pelada={pelada} onFechar={() => setEmpateAberto(false)} />}
      {golDe && <QuemFezGol pelada={pelada} lado={golDe} onFechar={() => setGolDe(null)} />}
      {acoes && (
        <AcoesJogador pelada={pelada} lado={acoes.lado} jogador={acoes.jogador} decorrido={decorrido}
          onSaiu={saiu} onFechar={() => setAcoes(null)} />
      )}
    </div>
  )
}
