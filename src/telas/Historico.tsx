import { useState } from 'react'
import { Barra } from '../components/Barra'
import { Carrossel, CarrosselDeTurmas } from '../components/CarrosselDeTurmas'
import { Icone } from '../components/Icone'
import { anosDasPeladas, artilharia, goleirosMenosVazados, peladasDaTurma, relatorioDoAno, vitoriasPorJogador } from '../logic'
import type { PeladaNoHistorico, Turma } from '../nuvem/tipos'
import { useJogadoresDaTurma, useTurmas } from '../store/turmas'
import { useConta, useHistorico } from '../store/conta'
import { useConfirmar } from '../utils/confirmacao'
import { compartilharImagem, imagemDoResumo, imagemDoTimeDoAno } from '../utils/resumoDaPelada'

type Aba = 'temporada' | 'peladas'
const qtd = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const media = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

/** Histórico das peladas encerradas e ranking da temporada (no perfil de quem entrou com o Google). O início fica no menu da foto. */
export function Historico() {
  const conta = useConta()
  const { peladas, apagar } = useHistorico()
  const [aba, setAba] = useState<Aba>('temporada')
  const [aberta, setAberta] = useState<PeladaNoHistorico | null>(null)
  // Turma e ano (temporada): as peladas sem turma (de antes das turmas) ficam com a primeira
  const { turmas } = useTurmas()
  const [turmaEscolhida, setTurmaEscolhida] = useState<string | null>(null)
  const turma = turmas?.find((t) => t.id === turmaEscolhida) ?? turmas?.[0] ?? null
  const daTurma = peladas && turma ? peladasDaTurma(peladas, turma.id, turmas?.[0]?.id ?? null) : (peladas ?? [])
  const anos = anosDasPeladas(daTurma)
  const [anoEscolhido, setAnoEscolhido] = useState<number | null>(null)
  const ano = anoEscolhido !== null && anos.includes(anoEscolhido) ? anoEscolhido : anos[0]

  return (
    <div className="scr" style={{ height: '100dvh' }}>
      <Barra titulo="Histórico" sub={turma ? `${turma.nome} · ${daTurma.length} ${daTurma.length === 1 ? 'pelada' : 'peladas'}` : ''} />
      <div className="conteudo">
        {!conta.logado && conta.perfil !== undefined && (
          <section className="panel pb" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>O histórico fica guardado no seu perfil. Entre com o Google para usar.</div>
            <button className="btn" onClick={conta.entrar}>Entrar com Google</button>
          </section>
        )}
        {conta.logado && (
          <>
            {/* várias turmas: escolhe de qual é o histórico; vários anos: a temporada */}
            {!!turmas && turmas.length > 0 && (
              <section className="panel">
                <div className="ph">Turma{turmas.length > 1 && <span className="sub">{turmas.indexOf(turma!) + 1} de {turmas.length}</span>}</div>
                <div className="pb"><CarrosselDeTurmas turmas={turmas} turma={turma?.id ?? null} onEscolher={setTurmaEscolhida} /></div>
              </section>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className={'chip' + (aba === 'temporada' ? ' on' : '')} onClick={() => setAba('temporada')}>Temporada</button>
              <button className={'chip' + (aba === 'peladas' ? ' on' : '')} onClick={() => setAba('peladas')}>Peladas</button>
            </div>
            {peladas === null && <div className="vazio">Carregando…</div>}
            {peladas !== null && daTurma.length === 0 && (
              <div className="vazio">Nenhuma pelada guardada {turma ? `na ${turma.nome}` : ''} ainda. Ao encerrar uma pelada, os resultados vêm para cá.</div>
            )}
            {aba === 'temporada' && anos.length > 0 && (
              <section className="panel">
                <div className="ph">Temporada{anos.length > 1 && <span className="sub">{anos.length} temporadas</span>}</div>
                <div className="pb">
                  {/* da mais antiga para a mais nova: → vai para a seguinte */}
                  <Carrossel itens={[...anos].reverse()} atual={ano} onEscolher={setAnoEscolhido} nome={(a) => `Temporada ${a}`}
                    rotulo={{ anterior: 'Temporada anterior', proximo: 'Próxima temporada' }} />
                </div>
              </section>
            )}
            {daTurma.length > 0 && (aba === 'temporada'
              ? <Relatorio peladas={daTurma} ano={ano} turma={turma} />
              : <ListaDePeladas peladas={daTurma} onAbrir={setAberta} />)}
          </>
        )}
      </div>
      {aberta && <PeladaAberta pelada={aberta} onFechar={() => setAberta(null)} onApagar={() => { setAberta(null); void apagar(aberta.id) }} />}
    </div>
  )
}

/** Relatório da temporada da turma (PLANO.md, seção 15.2): destaques, Time do ano e o ranking. */
function Relatorio({ peladas, ano, turma }: { peladas: PeladaNoHistorico[]; ano: number; turma: Turma | null }) {
  const jogadoresDaTurma = useJogadoresDaTurma(turma?.id ?? null)
  const r = relatorioDoAno(peladas, jogadoresDaTurma, ano)
  const col = { width: 34, textAlign: 'center' as const }
  const [gerando, setGerando] = useState(false)
  const compartilhar = async () => {
    setGerando(true)
    await imagemDoTimeDoAno(r, turma?.nome ?? 'Minha pelada').then((img) => compartilharImagem(img, `dois-ou-dez-time-do-ano-${ano}`)).catch(() => null)
    setGerando(false)
  }
  const destaque = (titulo: string, nome: string | undefined, detalhe: string) => (
    <div className="panel" style={{ padding: '10px 12px', display: 'grid', gap: 2, alignContent: 'start' }}>
      <div className="mut" style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>{titulo}</div>
      <div className="num" style={{ fontSize: 22, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome ?? '—'}</div>
      <div className="mut">{nome ? detalhe : 'Ainda não tem'}</div>
    </div>
  )
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {destaque('Artilheiro do ano', r.artilheiro?.nome, qtd(r.artilheiro?.gols ?? 0, 'gol', 'gols'))}
        {destaque('Goleiro do ano', r.goleiroDoAno?.nome, `${media(r.goleiroDoAno?.media ?? 0)} gols sofridos por jogo`)}
        {destaque('Mais vitórias', r.jogadores[0]?.nome, qtd(r.jogadores[0]?.vitorias ?? 0, 'vitória', 'vitórias'))}
        {destaque('Mais presente', r.maisPresente?.nome, `${r.maisPresente?.peladas ?? 0} de ${qtd(r.peladas, 'pelada', 'peladas')}`)}
      </div>

      <section className="panel">
        <div className="ph">Time do ano<span className="sub">presença · gols</span></div>
        {r.timeDoAno.length === 0 && <div className="pb mut">O Time do ano aparece com as peladas encerradas.</div>}
        {r.timeDoAno.map((j, i) => (
          <div key={j.id} className="tr" style={{ borderTop: i ? '1px solid #e3e8d6' : 0 }}>
            <span className="num" style={{ width: 22, fontSize: 18 }}>{i + 1}</span>
            <span className="nome" style={{ flex: 1 }}>{j.nome}{r.artilheiro?.id === j.id && ' ⚽'}</span>
            <span className="mut">{qtd(j.gols, 'gol', 'gols')}</span>
            <span className="num" style={{ width: 52, textAlign: 'center', fontSize: 20 }}>{j.peladas}/{r.peladas}</span>
          </div>
        ))}
        {r.goleiroDoAno && (
          <div className="tr" style={{ borderTop: '1px solid #e3e8d6' }}>
            <span className="no g">G</span>
            <span className="nome" style={{ flex: 1 }}>{r.goleiroDoAno.nome}</span>
            <span className="mut">goleiro do ano</span>
          </div>
        )}
        <div className="pb" style={{ display: 'grid', gap: 8 }}>
          <div className="mut">Quem mais veio às peladas do ano; no empate, quem fez mais gols. Precisa de pelo menos {qtd(r.minimo, 'pelada', 'peladas')} (65% do ano).</div>
          {r.timeDoAno.length > 0 && (
            <button className="btn" disabled={gerando} onClick={compartilhar}>
              <Icone nome="compartilhar" /> {gerando ? 'Gerando a imagem…' : 'Compartilhar o Time do ano'}
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="ph">Vitórias<span className="sub">{r.peladas} {r.peladas === 1 ? 'pelada' : 'peladas'}</span></div>
        <div className="tr mut" style={{ minHeight: 30, fontSize: 12 }}>
          <span style={{ width: 22 }} /><span className="nome" style={{ flex: 1 }}>Jogador</span>
          <span style={col}>PEL</span><span style={col}>J</span><span style={col}>V</span>
        </div>
        {r.jogadores.map((j, i) => (
          <div key={j.id} className="tr" style={{ borderTop: '1px solid #e3e8d6' }}>
            <span className="num" style={{ width: 22, fontSize: 18 }}>{i + 1}</span>
            <span className="nome" style={{ flex: 1 }}>{j.nome}</span>
            <span style={col}>{j.peladas}</span><span style={col}>{j.jogos}</span>
            <span className="num" style={{ ...col, fontSize: 20 }}>{j.vitorias}</span>
          </div>
        ))}
      </section>

      {r.jogadores.some((j) => j.gols > 0) && (
        <section className="panel">
          <div className="ph">Artilharia<span className="sub">⚽ gols · 👑 artilheiro do dia</span></div>
          {[...r.jogadores].filter((j) => j.gols > 0).sort((a, b) => b.gols - a.gols || b.artilheiroDoDia - a.artilheiroDoDia || a.peladas - b.peladas).map((j, i) => (
            <div key={j.id} className="tr" style={{ borderTop: i ? '1px solid #e3e8d6' : 0 }}>
              <span className="num" style={{ width: 22, fontSize: 18 }}>{i + 1}</span>
              <span className="nome" style={{ flex: 1 }}>{j.nome}</span>
              {j.artilheiroDoDia > 0 && <span className="mut">👑 {j.artilheiroDoDia}</span>}
              <span className="num" style={{ width: 34, textAlign: 'center', fontSize: 20 }}>{j.gols}</span>
            </div>
          ))}
        </section>
      )}

      {r.goleiros.length > 0 && (
        <section className="panel">
          <div className="ph">Goleiros<span className="sub">gols sofridos por jogo</span></div>
          {r.goleiros.map((g, i) => (
            <div key={g.nome} className="tr" style={{ borderTop: i ? '1px solid #e3e8d6' : 0 }}>
              <span className="num" style={{ width: 22, fontSize: 18 }}>{i + 1}</span>
              <span className="nome" style={{ flex: 1 }}>{g.nome}</span>
              <span className="mut">{qtd(g.peladas, 'pelada', 'peladas')} · {qtd(g.jogos, 'jogo', 'jogos')}</span>
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
