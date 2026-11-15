import { useState } from 'react'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { NumeroDaCamisa } from '../../components/NumeroDaCamisa'
import { bancoSugerido, goleiroDoTime, jogadoresDeLinha, reservasDoJogo, situacaoDisciplinar, timesDoJogo } from '../../logic/torneio'
import { LADOS } from '../../logic/lado'
import type { Lado } from '../../types/pelada'
import type { JogoTorneio, Torneio } from '../../types/torneio'
import { textoSobre } from '../../utils/cores'

/**
 * Antes do jogo do torneio: o organizador toca em quem fica no banco de cada time (só dos times com reserva).
 * Vem marcado quem ficou no banco no último jogo do time; no primeiro jogo, os últimos da lista.
 */
export function EscolherEscalacao({ torneio, jogo, onConfirmar, onCancelar }: {
  torneio: Torneio
  jogo: JogoTorneio
  onConfirmar: (banco: Record<Lado, string[]>) => void
  onCancelar: () => void
}) {
  const reservas = reservasDoJogo(torneio, jogo)
  const ladosComReserva = LADOS.filter((lado) => reservas[lado] > 0)
  const [banco, setBanco] = useState(() => bancoSugerido(torneio, jogo))
  const [passo, setPasso] = useState(0)
  const lado = ladosComReserva[passo]
  const ids = timesDoJogo(torneio, jogo)
  const time = torneio.times.find((candidato) => candidato.id === ids[lado])!
  const { suspensos } = situacaoDisciplinar(torneio)
  const goleiro = goleiroDoTime(time)
  const noBanco = banco[lado]
  const precisa = reservas[lado]
  const completo = noBanco.length === precisa
  const ultimoPasso = passo === ladosComReserva.length - 1

  const alternar = (id: string) => setBanco((anterior) => {
    const atual = anterior[lado]
    if (atual.includes(id)) return { ...anterior, [lado]: atual.filter((outro) => outro !== id) }
    // banco cheio: quem foi marcado primeiro sai do banco para dar lugar (um toque só para trocar)
    const novo = atual.length >= precisa ? [...atual.slice(1), id] : [...atual, id]
    return { ...anterior, [lado]: novo }
  })
  const avancar = () => (ultimoPasso ? onConfirmar(banco) : setPasso(passo + 1))

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Escalação do ${time.nome}`} onClick={onCancelar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()}
        style={{ maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="ph" style={{ background: time.cor, color: textoSobre(time.cor) }}>
          <span className="row num" style={{ gap: 8, minWidth: 0 }}>
            <Camisa cor={time.cor} uniforme={time.uniforme} contorno={textoSobre(time.cor)} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Escalação · {time.nome}</span>
          </span>
          {ladosComReserva.length > 1 && <span className="tag" style={{ flex: 'none' }}>{passo + 1} de {ladosComReserva.length}</span>}
        </div>
        <div className="pb row" style={{ justifyContent: 'space-between', gap: 8, paddingBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Toque em quem fica no banco</span>
          <span className={'tag ' + (completo ? 't-ok' : 't-warn')} style={{ flex: 'none' }}>Banco: {noBanco.length} de {precisa}</span>
        </div>
        <div style={{ overflowY: 'auto', minHeight: 0, borderTop: '2px solid var(--divisoria)' }}>
          {goleiro && (
            <div className="tr" style={{ minHeight: 44 }}>
              <NumeroDaCamisa numero={goleiro.camisa} goleiro />
              <span className="nome">{goleiro.nome}</span>
              <span className="tag t-y">Gol</span>
            </div>
          )}
          {jogadoresDeLinha(time).map((jogador) => {
            if (suspensos.has(jogador.id)) {
              return (
                <div key={jogador.id} className="tr" style={{ minHeight: 44, color: 'var(--mut)' }}>
                  <span className="no" style={{ background: 'var(--vermelho)' }}>S</span>
                  <span className="nome">{jogador.nome}</span>
                  <span className="tag t-warn">Suspenso</span>
                </div>
              )
            }
            const reserva = noBanco.includes(jogador.id)
            return (
              <button key={jogador.id} className="tr linha-jogador" aria-pressed={reserva} onClick={() => alternar(jogador.id)}
                style={{ minHeight: 44, color: reserva ? 'var(--mut)' : undefined }}>
                <NumeroDaCamisa numero={jogador.camisa} reserva={reserva} />
                <span className="nome">{jogador.nome}</span>
                <span className={'tag' + (reserva ? '' : ' t-ok')} style={reserva ? { background: 'var(--divisoria)' } : undefined}>
                  {reserva ? 'Banco' : 'Em campo'}
                </span>
              </button>
            )
          })}
        </div>
        <div className="pb" style={{ display: 'grid', gap: 8, borderTop: '2px solid var(--divisoria)' }}>
          <button className="btn" disabled={!completo} onClick={avancar}>
            {ultimoPasso ? <><Icone nome="play" /> Ir para o jogo</> : 'Próximo time ›'}
          </button>
          <button className="btn w sm" onClick={() => (passo > 0 ? setPasso(passo - 1) : onCancelar())}>{passo > 0 ? '‹ Time anterior' : 'Cancelar'}</button>
        </div>
      </section>
    </div>
  )
}
