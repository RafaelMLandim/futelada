import { Barra } from '../components/Barra'
import { Camisa } from '../components/Camisa'
import { Icone } from '../components/Icone'
import { Cartao } from '../components/Cartao'
import { artilharia, cartoesDoDia, goleirosMenosVazados, placarDosColetes } from '../logic'
import type { Pelada } from '../store/usePelada'
import type { Partida } from '../types/pelada'
import { corDoTimeDaPelada, textoSobre } from '../utils/cores'
import { useConfirmar } from '../utils/confirmacao'
import { dataHoje } from '../utils/formatar'

type Linha = { numero: number; j: number; v: number; e: number; d: number }

function classificacao(historico: Partida[]): Linha[] {
  const mapa = new Map<number, Linha>()
  const linha = (n: number) => mapa.get(n) ?? mapa.set(n, { numero: n, j: 0, v: 0, e: 0, d: 0 }).get(n)!
  for (const p of historico) {
    const a = linha(p.timeA.numero)
    const b = linha(p.timeB.numero)
    a.j++
    b.j++
    if (p.resultado === 'empate') { a.e++; b.e++ }
    else if (p.resultado === 'A') { a.v++; b.d++ }
    else { b.v++; a.d++ }
  }
  return [...mapa.values()].sort((x, y) => y.v - x.v || y.e - x.e || x.d - y.d || x.numero - y.numero)
}

export function Tabela({ pelada }: { pelada: Pelada }) {
  const { app, encerrar } = pelada
  const confirmar = useConfirmar()
  const { estado } = app
  const { historico } = estado
  const tabela = classificacao(historico)
  const jogadores = estado.fila.length + (estado.emCampo ? estado.emCampo.A.jogadores.length + estado.emCampo.B.jogadores.length : 0)
  const gols = historico.reduce((t, p) => t + p.placar[0] + p.placar[1], 0) + estado.placar[0] + estado.placar[1]
  const col = { width: 28, textAlign: 'center' as const }
  const artilheiros = artilharia(estado)
  const goleiros = goleirosMenosVazados(estado)
  const cartoes = cartoesDoDia(estado)
  const placarColetes = placarDosColetes(estado)
  // Na tabela, cada time tem cor própria (diferente dos coletes, que são do jogo)
  const coletes = [estado.config.coletes.A, estado.config.coletes.B]
  const corDoTime = (numero: number) => corDoTimeDaPelada(numero, coletes)

  const fimDaPelada = () => {
    confirmar({
      titulo: 'Encerrar a pelada?', mensagem: 'A lista, os goleiros, os times e a tabela de hoje serão apagados.',
      botao: 'Encerrar', perigo: true, aoConfirmar: encerrar,
    })
  }

  return (
    <div className="scr">
      <Barra titulo="Tabela" sub={dataHoje()} />
      <div className="conteudo">
        <section className="panel">
          <div className="ph">{placarColetes.coletes.map((c) => c.nome).join(' x ')}<span className="sub">vitórias por colete</span></div>
          <div className="pb" style={{ display: 'grid', gridTemplateColumns: `repeat(${placarColetes.coletes.length + 1}, minmax(0, 1fr))`, gap: 8 }}>
            {placarColetes.coletes.map((c) => (
              <div key={c.cor} style={{ background: c.cor, color: textoSobre(c.cor), border: '2px solid var(--borda)', borderRadius: 5, textAlign: 'center', padding: '6px 4px' }}>
                <div className="num" style={{ fontSize: 34 }}>{c.vitorias}</div>
                <div className="num" style={{ fontSize: 14, textTransform: 'uppercase' }}>{c.nome}</div>
              </div>
            ))}
            <div style={{ border: '2px solid var(--borda)', borderRadius: 5, textAlign: 'center', padding: '6px 4px', background: '#e3e8d6' }}>
              <div className="num" style={{ fontSize: 34 }}>{placarColetes.empates}</div>
              <div className="num" style={{ fontSize: 14, textTransform: 'uppercase' }}>Empates</div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="ph">Resultados<span className="sub">{historico.length} partidas</span></div>
          {historico.length === 0 && <div className="pb mut">Nenhuma partida terminou ainda.</div>}
          {historico.map((p) => ( // da partida 1 (mais antiga) até a última
            <div key={p.numero} className="tr" style={{ minHeight: 48 }}>
              <span className="no">{p.numero}</span>
              <Camisa cor={corDoTime(p.timeA.numero)} tamanho={18} />
              <span className="nome" style={{ fontSize: 14, fontWeight: p.resultado === 'A' ? 800 : 600 }}>Time {p.timeA.numero}</span>
              <span className="led num" style={{ fontSize: 20, padding: '3px 8px', boxShadow: 'none', borderWidth: 1 }}>{p.placar[0]}-{p.placar[1]}</span>
              <span className="nome" style={{ fontSize: 14, textAlign: 'right', fontWeight: p.resultado === 'B' ? 800 : 600 }}>Time {p.timeB.numero}</span>
              <Camisa cor={corDoTime(p.timeB.numero)} tamanho={18} />
            </div>
          ))}
        </section>

        {tabela.length > 0 && (
          <section className="panel">
            <div className="ph">Classificação do dia</div>
            <div className="tr" style={{ minHeight: 30, fontSize: 12, color: 'var(--mut)', letterSpacing: .8, background: '#e3e8d6' }}>
              <span style={{ width: 24 }} /><span style={{ width: 18 }} /><span className="nome">TIME</span>
              <span style={col}>J</span><span style={col}>V</span><span style={col}>E</span><span style={col}>D</span>
            </div>
            {tabela.map((l, i) => (
              <div key={l.numero} className="tr">
                <span className={'no' + (i === 0 ? ' g' : '')}>{i + 1}</span>
                <Camisa cor={corDoTime(l.numero)} tamanho={18} />
                <span className="nome">Time {l.numero}</span>
                <span style={col}>{l.j}</span><span style={col}>{l.v}</span><span style={col}>{l.e}</span><span style={col}>{l.d}</span>
              </div>
            ))}
          </section>
        )}

        <section className="panel">
          <div className="ph">Artilharia<span className="sub">gols</span></div>
          {artilheiros.length === 0 && <div className="pb mut">Nenhum gol com autor marcado ainda.</div>}
          {artilheiros.map((a, i) => (
            <div key={a.id} className="tr">
              <span className={'no' + (i === 0 ? ' g' : '')}>{i + 1}</span>
              <span className="nome">{a.nome}</span>
              <span className="num" style={{ fontSize: 22, minWidth: 28, textAlign: 'center' }}>{a.gols}</span>
            </div>
          ))}
        </section>

        {estado.config.goleiros.length > 0 && (
          <section className="panel">
            <div className="ph">Goleiro menos vazado</div>
            <div className="tr" style={{ minHeight: 30, fontSize: 12, color: 'var(--mut)', letterSpacing: .8, background: '#e3e8d6' }}>
              <span style={{ width: 24 }} /><span className="nome">GOLEIRO</span>
              <span style={col}>J</span><span style={col}>GS</span><span style={{ ...col, width: 44 }}>MÉDIA</span>
            </div>
            {goleiros.length === 0 && <div className="pb mut">Os números aparecem quando a primeira partida terminar.</div>}
            {goleiros.map((g, i) => (
              <div key={g.nome} className="tr">
                <span className={'no' + (i === 0 ? ' g' : '')}>{i + 1}</span>
                <span className="nome">{g.nome}</span>
                <span style={col}>{g.jogos}</span><span style={col}>{g.sofridos}</span>
                <span style={{ ...col, width: 44 }}>{g.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
              </div>
            ))}
          </section>
        )}

        <section className="panel">
          <div className="ph">Cartões</div>
          {cartoes.length === 0 && <div className="pb mut">Nenhum cartão hoje.</div>}
          {cartoes.map((c) => (
            <div key={c.id} className="tr">
              <span className="nome">{c.nome}</span>
              {(['amarelo', 'vermelho', 'azul'] as const).map((cor) => (
                <span key={cor} className="row" style={{ gap: 4, width: 38, justifyContent: 'flex-end', opacity: c[cor] ? 1 : 0.25 }}>
                  <Cartao cor={cor} /><span className="num" style={{ fontSize: 18 }}>{c[cor]}</span>
                </span>
              ))}
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="ph">Na pelada hoje</div>
          <div className="pb row" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
            <div><div className="num" style={{ fontSize: 34 }}>{jogadores}</div><div className="mut">jogadores</div></div>
            <div><div className="num" style={{ fontSize: 34 }}>{historico.length}</div><div className="mut">partidas</div></div>
            <div><div className="num" style={{ fontSize: 34 }}>{gols}</div><div className="mut">gols</div></div>
          </div>
        </section>

        <div style={{ flex: 1 }} />
        <button className="btn r sm" onClick={fimDaPelada}><Icone nome="lixo" tamanho={20} /> Encerrar pelada</button>
      </div>
    </div>
  )
}
