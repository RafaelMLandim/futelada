import { useState } from 'react'
import { Barra } from '../components/Barra'
import { Icone } from '../components/Icone'
import { artilharia, artilhariaDaTemporada, goleirosMenosVazados, temporada, vitoriasPorJogador } from '../logic'
import type { PeladaNoHistorico } from '../nuvem/tipos'
import { useConta, useHistorico } from '../store/conta'
import { useConfirmar } from '../utils/confirmacao'
import { compartilharImagem, imagemDoResumo } from '../utils/resumoDaPelada'

type Aba = 'temporada' | 'peladas'
const media = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

/** Histórico das peladas encerradas e ranking da temporada (no perfil de quem entrou com o Google). */
export function Historico({ onVoltar }: { onVoltar: () => void }) {
  const conta = useConta()
  const { peladas, apagar } = useHistorico()
  const [aba, setAba] = useState<Aba>('temporada')
  const [aberta, setAberta] = useState<PeladaNoHistorico | null>(null)

  return (
    <div className="scr" style={{ height: '100dvh' }}>
      <Barra titulo="Histórico" sub={peladas?.length ? `${peladas.length} ${peladas.length === 1 ? 'pelada' : 'peladas'}` : ''} />
      <div className="conteudo">
        {!conta.logado && conta.perfil !== undefined && (
          <section className="panel pb" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>O histórico fica guardado no seu perfil. Entre com o Google para usar.</div>
            <button className="btn" onClick={conta.entrar}>Entrar com Google</button>
          </section>
        )}
        {conta.logado && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className={'chip' + (aba === 'temporada' ? ' on' : '')} onClick={() => setAba('temporada')}>Temporada</button>
              <button className={'chip' + (aba === 'peladas' ? ' on' : '')} onClick={() => setAba('peladas')}>Peladas</button>
            </div>
            {peladas === null && <div className="vazio">Carregando…</div>}
            {peladas?.length === 0 && (
              <div className="vazio">Nenhuma pelada guardada ainda. Ao encerrar uma pelada, os resultados vêm para cá.</div>
            )}
            {!!peladas?.length && (aba === 'temporada' ? <Temporada peladas={peladas} /> : <ListaDePeladas peladas={peladas} onAbrir={setAberta} />)}
          </>
        )}
      </div>
      <div className="rodape">
        <button className="btn w sm" onClick={onVoltar}><Icone nome="inicio" /> Início</button>
      </div>
      {aberta && <PeladaAberta pelada={aberta} onFechar={() => setAberta(null)} onApagar={() => { setAberta(null); void apagar(aberta.id) }} />}
    </div>
  )
}

/** Ranking somando todas as peladas: vitórias, artilharia e goleiros. */
function Temporada({ peladas }: { peladas: PeladaNoHistorico[] }) {
  const t = temporada(peladas)
  const artilheiros = artilhariaDaTemporada(t)
  const col = { width: 34, textAlign: 'center' as const }
  return (
    <>
      <section className="panel">
        <div className="ph">Vitórias<span className="sub">{t.peladas} {t.peladas === 1 ? 'pelada' : 'peladas'}</span></div>
        <div className="tr mut" style={{ minHeight: 30, fontSize: 12 }}>
          <span style={{ width: 22 }} /><span className="nome" style={{ flex: 1 }}>Jogador</span>
          <span style={col}>PEL</span><span style={col}>J</span><span style={col}>V</span>
        </div>
        {t.jogadores.map((j, i) => (
          <div key={j.nome} className="tr" style={{ borderTop: '1px solid #e3e8d6' }}>
            <span className="num" style={{ width: 22, fontSize: 18 }}>{i + 1}</span>
            <span className="nome" style={{ flex: 1 }}>{j.nome}</span>
            <span style={col}>{j.peladas}</span><span style={col}>{j.jogos}</span>
            <span className="num" style={{ ...col, fontSize: 20 }}>{j.vitorias}</span>
          </div>
        ))}
      </section>
      {artilheiros.length > 0 && (
        <section className="panel">
          <div className="ph">Artilharia<span className="sub">⚽ gols · 👑 artilheiro do dia</span></div>
          {artilheiros.map((j, i) => (
            <div key={j.nome} className="tr" style={{ borderTop: i ? '1px solid #e3e8d6' : 0 }}>
              <span className="num" style={{ width: 22, fontSize: 18 }}>{i + 1}</span>
              <span className="nome" style={{ flex: 1 }}>{j.nome}</span>
              {j.artilheiroDoDia > 0 && <span className="mut">👑 {j.artilheiroDoDia}</span>}
              <span className="num" style={{ width: 34, textAlign: 'center', fontSize: 20 }}>{j.gols}</span>
            </div>
          ))}
        </section>
      )}
      {t.goleiros.length > 0 && (
        <section className="panel">
          <div className="ph">Goleiros<span className="sub">gols sofridos por jogo</span></div>
          {t.goleiros.map((g, i) => (
            <div key={g.nome} className="tr" style={{ borderTop: i ? '1px solid #e3e8d6' : 0 }}>
              <span className="num" style={{ width: 22, fontSize: 18 }}>{i + 1}</span>
              <span className="nome" style={{ flex: 1 }}>{g.nome}</span>
              <span className="mut">{g.jogos} jogos · {g.sofridos} gols</span>
              <span className="num" style={{ width: 40, textAlign: 'center', fontSize: 20 }}>{media(g.media)}</span>
            </div>
          ))}
        </section>
      )}
    </>
  )
}

function ListaDePeladas({ peladas, onAbrir }: { peladas: PeladaNoHistorico[]; onAbrir: (p: PeladaNoHistorico) => void }) {
  return (
    <section className="panel">
      <div className="ph">Peladas<span className="sub">toque para ver</span></div>
      {peladas.map((p, i) => {
        const partidas = p.estado.historico.length
        const artilheiro = artilharia(p.estado)[0]
        return (
          <button key={p.id} className="tr" onClick={() => onAbrir(p)}
            style={{ width: '100%', border: 0, borderTop: i ? '1px solid #e3e8d6' : 0, background: 'transparent', font: 'inherit', color: 'var(--navy)', textAlign: 'left', cursor: 'pointer', minHeight: 54 }}>
            <span style={{ flex: 1, display: 'grid', gap: 2 }}>
              <span style={{ fontWeight: 800 }}>{p.dia}</span>
              <span className="mut">{partidas} {partidas === 1 ? 'partida' : 'partidas'}{artilheiro ? ` · ⚽ ${artilheiro.nome} (${artilheiro.gols})` : ''}</span>
            </span>
            <span className="tag t-y">Ver →</span>
          </button>
        )
      })}
    </section>
  )
}

/** Uma pelada do histórico: resultados, destaques, compartilhar de novo e apagar. */
function PeladaAberta({ pelada, onFechar, onApagar }: { pelada: PeladaNoHistorico; onFechar: () => void; onApagar: () => void }) {
  const confirmar = useConfirmar()
  const { estado } = pelada
  const artilheiro = artilharia(estado)[0]
  const goleiro = goleirosMenosVazados(estado)[0]
  const destaque = vitoriasPorJogador(estado)[0]
  const [gerando, setGerando] = useState(false)
  const compartilhar = async () => {
    setGerando(true)
    await imagemDoResumo(estado).then((img) => compartilharImagem(img, `dois-ou-dez-${new Date(pelada.data).toISOString().slice(0, 10)}-selecao`)).catch(() => null)
    setGerando(false)
  }
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Pelada ${pelada.dia}`} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="ph">{pelada.dia}</div>
        <div style={{ overflowY: 'auto' }}>
          <div className="pb" style={{ display: 'grid', gap: 4, color: 'var(--navy)', fontWeight: 600 }}>
            {artilheiro && <div>⚽ Artilheiro: <b>{artilheiro.nome}</b> ({artilheiro.gols})</div>}
            {destaque && destaque.vitorias > 0 && <div>🏆 Mais vitórias: <b>{destaque.nome}</b> ({destaque.vitorias})</div>}
            {goleiro && <div>🧤 Menos vazado: <b>{goleiro.nome}</b> ({goleiro.sofridos} em {goleiro.jogos} {goleiro.jogos === 1 ? 'jogo' : 'jogos'})</div>}
          </div>
          {estado.historico.map((p) => (
            <div key={p.numero} className="tr" style={{ borderTop: '1px solid #e3e8d6' }}>
              <span className="mut" style={{ width: 26 }}>{p.numero}º</span>
              <span style={{ flex: 1, textAlign: 'right', fontWeight: p.resultado === 'A' ? 800 : 600 }}>Time {p.timeA.numero}</span>
              <span className="num" style={{ fontSize: 20, width: 56, textAlign: 'center' }}>{p.placar[0]} x {p.placar[1]}</span>
              <span style={{ flex: 1, fontWeight: p.resultado === 'B' ? 800 : 600 }}>Time {p.timeB.numero}</span>
            </div>
          ))}
        </div>
        <div className="pb" style={{ display: 'grid', gap: 8 }}>
          <button className="btn" disabled={gerando} onClick={compartilhar}>
            <Icone nome="compartilhar" /> {gerando ? 'Gerando a imagem…' : 'Compartilhar seleção'}
          </button>
          <button className="btn r sm" onClick={() => confirmar({
            titulo: 'Apagar esta pelada?', mensagem: `${pelada.dia} sai do histórico e da temporada.`, botao: 'Apagar', perigo: true, aoConfirmar: onApagar,
          })}><Icone nome="lixo" tamanho={20} /> Apagar do histórico</button>
          <button className="btn w sm" onClick={onFechar}>Fechar</button>
        </div>
      </section>
    </div>
  )
}
