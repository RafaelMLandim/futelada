import { useState, type ReactNode } from 'react'
import { Camisa } from '../../components/Camisa'
import { LADOS } from '../../logic'
import {
  cobrar, comecarProrrogacao, encerrarPartida, expulsosNaPartida, jogoPorId, novaDisputa, partidaDoJogo, placarDecisivo, placarDosPenaltis, precisaDePenaltis, quemBate, vencedorDosPenaltis,
  vaiParaProrrogacao, voltarCobranca, type Penaltis,
} from '../../logic/torneio'
import type { TorneioHook } from '../../store/torneio'
import type { Lado } from '../../types/pelada'
import type { TimeTorneio } from '../../types/torneio'
import { textoSobre } from '../../utils/cores'
import { somDeMoeda } from '../../utils/sons'

// Fim de jogo: confirma o resultado. No mata-mata empatado (ou agregado empatado na volta):
// prorrogação, se ligada e ainda não jogada; senão, a disputa de pênaltis.
export function FimDeJogo({ hook, jogoId, times, onFechar, onEncerrado, onAcrescimos }: {
  hook: TorneioHook; jogoId: string; times: Record<Lado, TimeTorneio>; onFechar: () => void; onEncerrado: () => void
  /** Tempo esgotado e acréscimos ligados: abre a escolha dos minutos de acréscimo. */
  onAcrescimos?: () => void
}) {
  const t = hook.torneio!
  const p = partidaDoJogo(t, jogoId)!
  const jogo = jogoPorId(t, jogoId)!
  const [penaltis, setPenaltis] = useState<Penaltis | null>(null)
  const [batedor, setBatedor] = useState<string | null>(null)
  const [a, b] = p.placar
  const empate = a === b
  // ida e volta: na volta vale o agregado (ida + volta); a ida não tem pênaltis
  const agregado = jogo.perna === 'volta' ? placarDecisivo(t, jogo, p.placar) : null
  const precisaPenaltis = precisaDePenaltis(t, jogo, p.placar)
  const prorrogar = vaiParaProrrogacao(t, jogo, p)
  const { temposProrrogacao, minutosProrrogacao } = t.regras
  const comecarAProrrogacao = () => {
    hook.aplicar((x) => comecarProrrogacao(x, jogoId))
    onFechar()
  }

  const confirmar = (placarPenaltis: [number, number] | null) => {
    hook.aplicar((x) => encerrarPartida(x, jogoId, placarPenaltis))
    onEncerrado()
  }

  const titulo = agregado
    ? agregado[0] === agregado[1] ? `Agregado empatado · ${agregado[0]} x ${agregado[1]}` : `${times[agregado[0] > agregado[1] ? 'A' : 'B'].nome} avança · agregado ${agregado[0]} x ${agregado[1]}`
    : empate ? 'Empate' : `${times[a > b ? 'A' : 'B'].nome} venceu`

  // ---- Pênaltis ----
  if (penaltis) {
    const vez = quemBate(penaltis)
    const [pa, pb] = placarDosPenaltis(penaltis)
    const vencedor = vencedorDosPenaltis(penaltis)
    const expulsos = expulsosNaPartida(p)
    const aptos = p.escalacao.emCampo[vez].filter((id) => !expulsos.has(id))
    const nome = (id: string) => times[vez].jogadores.find((j) => j.id === id)?.nome ?? ''
    const bater = (gol: boolean) => {
      setPenaltis((x) => cobrar(x!, gol, batedor ? { id: batedor, nome: nome(batedor) } : null))
      setBatedor(null)
    }
    return (
      <Modal titulo={`Pênaltis · ${pa} x ${pb}`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LADOS.map((l) => (
            <div key={l} style={{ border: `3px solid ${times[l].cor}`, borderRadius: 6, padding: 8 }}>
              <div className="row num" style={{ gap: 6, fontSize: 16 }}><Camisa cor={times[l].cor} tamanho={18} />{times[l].nome}</div>
              <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginTop: 6 }} aria-label={`Cobranças do ${times[l].nome}`}>
                {penaltis.cobrancas.filter((c) => c.lado === l).map((c, i) => (
                  <span key={i} title={c.nome ?? ''} style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--borda)', background: c.gol ? 'var(--verde)' : 'var(--vermelho)' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {vencedor ? (
          <>
            <div className="led num" style={{ textAlign: 'center', padding: 10, fontSize: 24, textTransform: 'uppercase' }}>
              {times[vencedor].nome} venceu nos pênaltis · {pa} x {pb}
            </div>
            <button className="btn" onClick={() => confirmar([pa, pb])}>Confirmar resultado</button>
            <button className="btn w sm" onClick={() => setPenaltis((x) => voltarCobranca(x!))}>Voltar última cobrança</button>
          </>
        ) : (
          <>
            <div className="num" style={{ fontSize: 20, textTransform: 'uppercase', background: times[vez].cor, color: textoSobre(times[vez].cor), padding: '6px 10px', borderRadius: 5 }}>
              Vez do {times[vez].nome}
            </div>
            <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>Quem vai bater? (opcional)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {aptos.map((id) => (
                <button key={id} className={'chip' + (batedor === id ? ' on' : '')} style={{ textTransform: 'none' }} onClick={() => setBatedor(batedor === id ? null : id)}>{nome(id)}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn" style={{ background: 'var(--verde)', color: '#fff' }} onClick={() => bater(true)}>Gol</button>
              <button className="btn r" onClick={() => bater(false)}>Perdeu</button>
            </div>
            {penaltis.cobrancas.length > 0
              ? <button className="btn w sm" onClick={() => setPenaltis((x) => voltarCobranca(x!))}>Voltar última cobrança</button>
              : <button className="btn w sm" onClick={() => setPenaltis(null)}>Voltar</button>}
          </>
        )}
      </Modal>
    )
  }

  // ---- Resultado ----
  const comecar = (l: Lado) => setPenaltis(novaDisputa(l, t.regras.cobrancasPenalti))
  const sortearQuemComeca = () => {
    if (t.regras.som) somDeMoeda(0.6)
    comecar(Math.random() < 0.5 ? 'A' : 'B')
  }
  return (
    <Modal titulo="Fim de jogo" onFechar={onFechar}>
      <div className="led num" style={{ textAlign: 'center', padding: '10px 12px' }}>
        <div style={{ fontSize: 44 }}>{a} <span style={{ color: '#5e6a76' }}>-</span> {b}</div>
        <div style={{ fontSize: 22, textTransform: 'uppercase', color: '#fff' }}>{titulo}</div>
      </div>
      {prorrogar ? (
        <>
          <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
            {agregado ? 'Agregado empatado' : 'Empate no mata-mata'}: vai para a prorrogação
            ({temposProrrogacao > 1 ? `${temposProrrogacao} tempos de ${minutosProrrogacao} min` : `${minutosProrrogacao} min`}).
            Se empatar de novo, pênaltis.
          </div>
          <button className="btn" onClick={comecarAProrrogacao}>Começar a prorrogação</button>
        </>
      ) : precisaPenaltis ? (
        <>
          <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
            {agregado ? 'Agregado empatado' : 'Mata-mata empatado'}{p.prorrogacao ? ' depois da prorrogação' : ''}: vai para os pênaltis ({t.regras.cobrancasPenalti} cobranças de cada lado). Quem começa?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {LADOS.map((l) => (
              <button key={l} className="btn sm" style={{ background: times[l].cor, color: textoSobre(times[l].cor), textTransform: 'none' }} onClick={() => comecar(l)}>{times[l].nome}</button>
            ))}
          </div>
          <button className="btn w sm" onClick={sortearQuemComeca}>Sortear quem começa</button>
        </>
      ) : (
        <button className="btn" onClick={() => confirmar(null)}>Confirmar resultado</button>
      )}
      {onAcrescimos && <button className="btn w sm" onClick={onAcrescimos}>Dar acréscimos</button>}
      <button className="btn w sm" onClick={onFechar}>Voltar ao jogo</button>
    </Modal>
  )
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar?: () => void; children: ReactNode }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">{titulo}</div>
        <div className="pb" style={{ display: 'grid', gap: 10 }}>{children}</div>
      </section>
    </div>
  )
}
