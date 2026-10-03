import { Bola } from '../../components/Bola'
import { Cartao } from '../../components/Cartao'
import { LADOS, cartoesDoJogador, escolherGoleiro, expulso, restanteAzul, trocarGoleiros } from '../../logic'
import type { Pelada } from '../../store/usePelada'
import type { Jogador, Lado } from '../../types/pelada'
import { textoSobre } from '../../utils/cores'
import { formatarTempo } from '../../utils/formatar'

// Os dois times em campo, com goleiro fixo, gols e cartões. Tocar no jogador abre as ações.
export function Escalacoes({ pelada, decorrido, onJogador }: {
  pelada: Pelada; decorrido: number; onJogador: (lado: Lado, jogador: Jogador) => void
}) {
  const { app, aplicar } = pelada
  const { estado } = app
  const { emCampo, config, goleiros } = estado
  if (!emCampo) return null

  const { A, B } = emCampo
  const lider = A.vitoriasSeguidas >= B.vitoriasSeguidas ? A : B

  // Gols de cada jogador na partida em andamento
  const golsPorJogador = new Map<string, number>()
  for (const g of estado.gols) if (g.autorId) golsPorJogador.set(g.autorId, (golsPorJogador.get(g.autorId) ?? 0) + 1)

  const coluna = (lado: Lado) => {
    const time = emCampo[lado]
    const colete = config.coletes[lado]
    return (
      <div key={lado} style={lado === 'A' ? { borderRight: '2px solid #e3e8d6' } : undefined}>
        <div className="num" style={{ padding: '6px 10px', textTransform: 'uppercase', background: colete.cor, color: textoSobre(colete.cor) }}>
          <div style={{ fontSize: 18 }}>Time {time.numero}</div>
          <div style={{ fontSize: 13, letterSpacing: 1, opacity: .85 }}>{colete.nome}</div>
        </div>
        {config.goleiros.length > 0 && (
          <div className="tr" style={{ minHeight: 38, fontSize: 14, paddingRight: 4 }}>
            <span className="no g">G</span>
            <label className="nome" style={{ display: 'flex' }}>
              <span className="vh">Goleiro do Time {time.numero}</span>
              <select className="sel" value={goleiros[lado] ?? ''}
                onChange={(ev) => aplicar((e) => escolherGoleiro(e, lado, ev.target.value || null))}>
                <option value="">sem goleiro</option>
                {config.goleiros.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          </div>
        )}
        {time.jogadores.map((j, i) => {
          const fora = expulso(estado, j.id)
          const azul = restanteAzul(estado, j.id, decorrido)
          return (
            <button key={j.id} className="tr linha-jogador" style={{ minHeight: 40, fontSize: 14, opacity: fora ? 0.55 : 1 }}
              aria-label={`Ações de ${j.nome}`} onClick={() => onJogador(lado, j)}>
              <span className="no">{i + 1}</span>
              <span className="nome" style={{ flex: '0 1 auto', textDecoration: fora ? 'line-through' : undefined }}>{j.nome}</span>
              <Bolinhas gols={golsPorJogador.get(j.id) ?? 0} />
              {cartoesDoJogador(estado, j.id).map((c, k) => <Cartao key={k} cor={c.cor} />)}
              {azul > 0 && <span className="tag" style={{ background: 'var(--azul)', color: '#fff', height: 20, fontSize: 13 }}>{formatarTempo(azul)}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <section className="panel">
      <div className="ph">
        <span className="row" style={{ gap: 8 }}>
          Escalações
          {goleiros.A && goleiros.B && (
            <button className="tag t-y" style={{ border: 0, cursor: 'pointer' }} onClick={() => aplicar(trocarGoleiros)}>⇄ Trocar G</button>
          )}
        </span>
        {lider.vitoriasSeguidas > 0 && (
          <span className="tag t-y">
            T{lider.numero}: {lider.vitoriasSeguidas} {lider.vitoriasSeguidas > 1 ? 'vitórias seguidas' : 'vitória'}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {LADOS.map(coluna)}
      </div>
    </section>
  )
}

// Uma bolinha por gol na partida; a partir de 4 gols vira "bolinha ×N".
function Bolinhas({ gols }: { gols: number }) {
  if (gols === 0) return null
  return (
    <span className="row" style={{ gap: 2, flex: 'none' }} aria-label={`${gols} ${gols > 1 ? 'gols' : 'gol'}`}>
      {gols <= 3
        ? Array.from({ length: gols }, (_, i) => <Bola key={i} />)
        : <><Bola /><span className="num" style={{ fontSize: 14 }}>×{gols}</span></>}
    </span>
  )
}
