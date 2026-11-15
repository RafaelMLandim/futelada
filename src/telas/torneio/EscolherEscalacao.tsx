import { useState } from 'react'
import { LuvaDoGoleiro } from '../../components/LuvaDoGoleiro'
import { Camisa } from '../../components/Camisa'
import { Icone } from '../../components/Icone'
import { NumeroDaCamisa } from '../../components/NumeroDaCamisa'
import { bancoSugerido, golSugerido, goleirosDoJogo, reservasDoJogo, situacaoDisciplinar, timesDoJogo } from '../../logic/torneio'
import { LADOS } from '../../logic/lado'
import type { Lado } from '../../types/pelada'
import type { JogoTorneio, Torneio } from '../../types/torneio'
import { textoSobre } from '../../utils/cores'

/** O time precisa da janela antes do jogo: tem reserva (quem fica no banco) ou mais de um goleiro (quem começa no gol). */
export const precisaEscalar = (torneio: Torneio, jogo: JogoTorneio, lado: Lado) =>
  reservasDoJogo(torneio, jogo)[lado] > 0 || goleirosDoJogo(torneio, jogo)[lado] > 1

/**
 * Antes do jogo do torneio: o organizador escolhe quem começa no gol (a luva; qualquer jogador, goleiro ou não) e toca em
 * quem fica no banco. Vem marcado como no último jogo do time; no primeiro jogo, o primeiro goleiro no gol e os últimos
 * da lista (e os goleiros reservas) no banco.
 */
export function EscolherEscalacao({ torneio, jogo, onConfirmar, onCancelar }: {
  torneio: Torneio
  jogo: JogoTorneio
  onConfirmar: (banco: Record<Lado, string[]>, noGol: Record<Lado, string | null>) => void
  onCancelar: () => void
}) {
  const lados = LADOS.filter((lado) => precisaEscalar(torneio, jogo, lado))
  const [banco, setBanco] = useState(() => bancoSugerido(torneio, jogo))
  const [noGol, setNoGol] = useState(() => golSugerido(torneio, jogo))
  const [passo, setPasso] = useState(0)
  const lado = lados[passo]
  const ids = timesDoJogo(torneio, jogo)
  const time = torneio.times.find((candidato) => candidato.id === ids[lado])!
  const { suspensos } = situacaoDisciplinar(torneio)
  const aptos = time.jogadores.filter((jogador) => !suspensos.has(jogador.id))
  const goleiro = noGol[lado]
  const noBanco = banco[lado]
  // quem não está no gol: a linha e o banco
  const precisa = Math.max(0, aptos.length - (goleiro ? 1 : 0) - torneio.regras.linha)
  const completo = noBanco.length === precisa
  const ultimoPasso = passo === lados.length - 1

  const alternar = (id: string) => setBanco((anterior) => {
    const atual = anterior[lado]
    if (atual.includes(id)) return { ...anterior, [lado]: atual.filter((outro) => outro !== id) }
    if (precisa === 0) return anterior
    // banco cheio: quem foi marcado primeiro sai do banco para dar lugar (um toque só para trocar)
    const novo = atual.length >= precisa ? [...atual.slice(1), id] : [...atual, id]
    return { ...anterior, [lado]: novo }
  })
  /** Põe no gol: quem estava no gol fica no lugar dele (no banco, se ele vinha do banco; senão, na linha). */
  const porNoGol = (id: string) => {
    const anterior = goleiro
    setNoGol((atual) => ({ ...atual, [lado]: id }))
    setBanco((atual) => {
      const lista = atual[lado]
      if (!lista.includes(id)) return atual
      return { ...atual, [lado]: anterior ? lista.map((outro) => (outro === id ? anterior : outro)) : lista.filter((outro) => outro !== id) }
    })
  }
  const avancar = () => (ultimoPasso ? onConfirmar(banco, noGol) : setPasso(passo + 1))
  const goleiroAtual = aptos.find((jogador) => jogador.id === goleiro)

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Escalação do ${time.nome}`} onClick={onCancelar}>
      <section className="panel" onClick={(evento) => evento.stopPropagation()}
        style={{ maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="ph" style={{ background: time.cor, color: textoSobre(time.cor) }}>
          <span className="row num" style={{ gap: 8, minWidth: 0 }}>
            <Camisa cor={time.cor} uniforme={time.uniforme} contorno={textoSobre(time.cor)} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Escalação · {time.nome}</span>
          </span>
          {lados.length > 1 && <span className="tag" style={{ flex: 'none' }}>{passo + 1} de {lados.length}</span>}
        </div>
        <div className="pb" style={{ display: 'grid', gap: 4, paddingBottom: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{precisa > 0 ? 'Toque em quem fica no banco' : 'Quem começa no gol?'}</span>
            {precisa > 0 && <span className={'tag ' + (completo ? 't-ok' : 't-warn')} style={{ flex: 'none' }}>Banco: {noBanco.length} de {precisa}</span>}
          </div>
          <span className="mut" style={{ fontSize: 13 }}>A luva põe no gol (qualquer jogador).</span>
        </div>
        <div style={{ overflowY: 'auto', minHeight: 0, borderTop: '2px solid var(--divisoria)' }}>
          {goleiroAtual && (
            <div className="tr" style={{ minHeight: 44 }}>
              <NumeroDaCamisa numero={goleiroAtual.camisa} goleiro cor={time.cor} />
              <span className="nome">{goleiroAtual.nome}</span>
              <span className="tag t-y">No gol</span>
            </div>
          )}
          {/* no gol, em campo e, no fim, o banco (os suspensos por último) */}
          {[
            ...time.jogadores.filter((jogador) => !suspensos.has(jogador.id) && !noBanco.includes(jogador.id)),
            ...time.jogadores.filter((jogador) => !suspensos.has(jogador.id) && noBanco.includes(jogador.id)),
            ...time.jogadores.filter((jogador) => suspensos.has(jogador.id)),
          ].map((jogador) => {
            if (jogador.id === goleiro) return null
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
              <div key={jogador.id} className="tr" style={{ minHeight: 44, paddingRight: 4, color: reserva ? 'var(--mut)' : undefined }}>
                <button className="linha-jogador" aria-pressed={reserva} disabled={precisa === 0} onClick={() => alternar(jogador.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, minHeight: 44, background: 'transparent', color: 'inherit', padding: 0 }}>
                  <NumeroDaCamisa numero={jogador.camisa} reserva={reserva} cor={time.cor} />
                  <span className="nome">{jogador.nome}</span>
                  <span className={'tag' + (reserva ? '' : ' t-ok')} style={reserva ? { background: 'var(--divisoria)' } : undefined}>
                    {reserva ? 'Banco' : 'Em campo'}
                  </span>
                </button>
                <button className="ib g" style={{ color: 'var(--navy)' }} aria-label={`Pôr ${jogador.nome} no gol`} title="Pôr no gol" onClick={() => porNoGol(jogador.id)}>
                  <LuvaDoGoleiro cor={time.cor} segunda={time.uniforme?.segunda} tamanho={28} />
                </button>
              </div>
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
