import { Barra } from '../components/Barra'
import { Camisa } from '../components/Camisa'
import { Icone } from '../components/Icone'
import { Cartao } from '../components/Cartao'
import { useContext, useState } from 'react'
import { VoltarAoInicio } from '../components/navegacao'
import { artilharia, cartoesDoDia, garcons, goleiroDaSelecao, goleirosMenosVazados, placarDosColetes, vitoriasPorJogador } from '../logic'
import { useConta } from '../store/conta'
import { cronometroComecou, guardarPeladaEncerrada, peladaEncerrada } from '../store/encerramento'
import type { Pelada } from '../store/usePelada'
import type { Partida } from '../types/pelada'
import { corDoTimeDaPelada, textoSobre } from '../utils/cores'
import { useConfirmar } from '../utils/confirmacao'
import { dataHoje } from '../utils/formatar'
import { GolsCorrigiveis } from './jogo/GolsDaPartida'
import { useAjudando, useSomenteLeitura } from '../utils/somenteLeitura'
import { fotosDaPelada } from '../store/carta'
import { useFotosDasContas } from '../store/denuncias'
import { FotoDoJogador } from '../components/FotoDoJogador'
import { contasDaPelada, jogadorGoleiro } from '../logic'
import { compartilharImagem, imagemDoResumo, nomeDoArquivo } from '../utils/resumoDaPelada'
import type { useCobranca } from '../store/cobranca'
import { Pagamentos } from './Pagamentos'
import { useLancarNoCaixa } from '../store/lancarNoCaixa'
import { reais } from '../utils/formatar'

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

/**
 * Tabela do dia. `data`: o dia da pelada (pelada compartilhada vista depois; sem ela, hoje). `cobranca`: o campo pago
 * do dono (para abrir o "Lançar no caixa" antes de encerrar).
 */
export function Tabela({ pelada, data, cobranca }: { pelada: Pelada; data?: string; cobranca?: ReturnType<typeof useCobranca> }) {
  const { app } = pelada
  const confirmar = useConfirmar()
  const conta = useConta()
  const somenteLeitura = useSomenteLeitura()
  // quem assumiu o controle da pelada de outra pessoa encerra, mas ela vai para o histórico do dono
  const ajudando = useAjudando()
  const { estado } = app
  // Ao encerrar, quem entrou com o Google guarda a pelada no histórico; depois volta para o início
  const voltarAoInicio = useContext(VoltarAoInicio)
  const encerrar = () => {
    if (!ajudando && conta.logado) guardarPeladaEncerrada(peladaEncerrada(estado, app.crono))
    pelada.encerrar()
    voltarAoInicio?.()
  }
  const { historico } = estado
  const tabela = classificacao(historico)
  const jogadores = estado.fila.length + (estado.emCampo ? estado.emCampo.A.jogadores.length + estado.emCampo.B.jogadores.length : 0)
  const gols = historico.reduce((t, p) => t + p.placar[0] + p.placar[1], 0) + estado.placar[0] + estado.placar[1]
  const col = { width: 28, textAlign: 'center' as const }
  const artilheiros = artilharia(estado)
  const goleiros = goleirosMenosVazados(estado)
  const goleiroNaSelecao = goleiroDaSelecao(estado) // o goleiro fixo que mais venceu
  const contas = contasDaPelada(estado) // id do jogador → conta (quem entrou com a conta tem foto)
  const fotos = useFotosDasContas(Object.values(contas))
  const comFotos = Object.keys(fotos).length > 0
  const lideresDePasse = garcons(estado)
  const cartoes = cartoesDoDia(estado)
  const placarColetes = placarDosColetes(estado)
  const vitorias = vitoriasPorJogador(estado)
  // Compartilhar: gera a imagem da seleção e abre direto o compartilhar do celular
  const [gerando, setGerando] = useState(false)
  const compartilhar = async (): Promise<boolean> => {
    setGerando(true)
    // como fica no histórico: a partida em andamento termina com o placar de agora e entra na conta
    const encerrada = peladaEncerrada(estado, app.crono)
    const ok = await fotosDaPelada(encerrada).then((fotos) => imagemDoResumo(encerrada, fotos)).then((img) => compartilharImagem(img, nomeDoArquivo('selecao'))).catch(() => false)
    setGerando(false)
    return ok
  }
  const [encerrando, setEncerrando] = useState(false)
  // a partida em andamento termina com o placar de agora e conta em tudo (vitória de quem está na frente ou empate)
  const partidaQueVaiFechar = (() => {
    if (!estado.emCampo || (estado.gols.length === 0 && !cronometroComecou(app.crono))) return null
    const [golsA, golsB] = estado.placar
    const { A, B } = estado.config.coletes
    const resultado = golsA === golsB ? 'empate' : `vitória do ${golsA > golsB ? A.nome : B.nome}`
    return `A partida em andamento (${A.nome} ${golsA} x ${golsB} ${B.nome}) termina agora e conta como ${resultado}.`
  })()
  // partida aberta nos resultados (gols dela, para marcar quem fez depois)
  const [partidaAberta, setPartidaAberta] = useState<number | null>(null)
  const aberta = historico.find((p) => p.numero === partidaAberta)
  // Na tabela, cada time tem cor própria (diferente dos coletes, que são do jogo)
  const coletes = [estado.config.coletes.A, estado.config.coletes.B]
  const corDoTime = (numero: number) => corDoTimeDaPelada(numero, coletes)

  // Campo pago ligado: só encerra depois de lançar no caixa (entra o que pagaram e sai o campo); senão o caixa fica errado
  const faltaLancarNoCaixa = estado.config.pagamento.ativo && !estado.caixaLancado && conta.logado && !ajudando
  const [lancarAntes, setLancarAntes] = useState(false)
  const noCaixa = useLancarNoCaixa(pelada)
  const [lancando, setLancando] = useState(false)
  // lança e segue para o encerramento de sempre (compartilhar ou encerrar)
  const lancarEEncerrar = async () => {
    setLancando(true)
    await noCaixa.lancar().catch(() => null)
    setLancando(false)
    setLancarAntes(false)
    if (historico.length > 0) setEncerrando(true)
    else encerrarDeVez()
  }
  const [campoPagoAberto, setCampoPagoAberto] = useState(false)
  // Encerrar apaga tudo: primeiro oferece compartilhar o resumo
  const fimDaPelada = () => {
    if (faltaLancarNoCaixa) return setLancarAntes(true)
    if (historico.length > 0) setEncerrando(true)
    else encerrarDeVez()
  }
  const encerrarDeVez = () => {
    confirmar({
      titulo: 'Encerrar a pelada?', mensagem: 'A lista, os goleiros, os times e a tabela de hoje serão apagados.',
      botao: 'Encerrar', perigo: true, aoConfirmar: encerrar,
    })
  }

  return (
    <div className="scr">
      <Barra titulo="Tabela" sub={data ?? dataHoje()} />
      <div className="conteudo">
        {historico.length > 0 && (
          <button className="btn" onClick={compartilhar} disabled={gerando}>
            <Icone nome="compartilhar" /> {gerando ? 'Gerando a imagem…' : 'Compartilhar resumo'}
          </button>
        )}
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
          {historico.length > 0 && <div className="mut" style={{ padding: '4px 12px', fontSize: 11 }}>{somenteLeitura ? 'Toque na partida para ver os gols.' : 'Toque na partida para ver os gols e marcar quem fez.'}</div>}
          {historico.map((p) => ( // da partida 1 (mais antiga) até a última
            <button key={p.numero} className="tr" aria-label={`Partida ${p.numero}`} onClick={() => setPartidaAberta(p.numero)}
              style={{ minHeight: 48, width: '100%', border: 0, font: 'inherit', color: 'var(--navy)', textAlign: 'left', cursor: 'pointer' }}>
              <span className="no">{p.numero}</span>
              <Camisa cor={corDoTime(p.timeA.numero)} tamanho={18} />
              <span className="nome" style={{ fontSize: 14, fontWeight: p.resultado === 'A' ? 800 : 600 }}>Time {p.timeA.numero}</span>
              <span className="led num" style={{ fontSize: 20, padding: '3px 8px', boxShadow: 'none', borderWidth: 1 }}>{p.placar[0]}-{p.placar[1]}</span>
              <span className="nome" style={{ fontSize: 14, textAlign: 'right', fontWeight: p.resultado === 'B' ? 800 : 600 }}>Time {p.timeB.numero}</span>
              <Camisa cor={corDoTime(p.timeB.numero)} tamanho={18} />
              {p.gols.some((g) => !g.autor) && <span className="tag t-warn" title="Gol sem autor">?</span>}
            </button>
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
          {artilheiros.length > 1 && (
            <div className="mut" style={{ padding: '4px 12px', fontSize: 11 }}>Desempate: menos jogos, mais vitórias, menos cartões, quem chegou primeiro.</div>
          )}
          {artilheiros.map((a, i) => (
            <div key={a.id} className="tr">
              <span className={'no' + (i === 0 ? ' g' : '')}>{i + 1}</span>
              <span className="nome">{a.nome}</span>
              <span className="num" style={{ fontSize: 22, minWidth: 28, textAlign: 'center' }}>{a.gols}</span>
            </div>
          ))}
        </section>

        {(estado.config.assistencias || lideresDePasse.length > 0) && (
          <section className="panel">
            <div className="ph">Assistências<span className="sub">Troféu Garçom</span></div>
            {lideresDePasse.length === 0 && <div className="pb mut">Nenhum passe para gol marcado ainda.</div>}
            {lideresDePasse.length > 1 && <div className="mut" style={{ padding: '4px 12px', fontSize: 11 }}>Desempate: menos jogos.</div>}
            {lideresDePasse.map((garcom, posicao) => (
              <div key={garcom.id} className="tr">
                <span className={'no' + (posicao === 0 ? ' g' : '')}>{posicao + 1}</span>
                <span className="nome">{garcom.nome}</span>
                <span className="num" style={{ fontSize: 22, minWidth: 28, textAlign: 'center' }}>{garcom.assistencias}</span>
              </div>
            ))}
          </section>
        )}

        {/* Vitórias de cada jogador, em qualquer time; os primeiros (tamanho da linha) são a seleção */}
        <section className="panel">
          <div className="ph">Seleção da pelada</div>
          {vitorias.length === 0
            ? <div className="pb mut">Os números aparecem quando a primeira partida terminar.</div>
            : <div className="tr" style={{ minHeight: 30, fontSize: 12, color: 'var(--mut)', letterSpacing: .8, background: '#e3e8d6' }}>
                <span style={{ width: 24 }} />{comFotos && <span className="foto-do-jogador espaco" aria-hidden="true" />}<span className="nome">JOGADOR</span>
                <span style={col}>J</span><span style={col}>V</span>
              </div>}
          {goleiroNaSelecao && (
            <div className="tr" style={{ background: '#fff6d0' }}>
              <span className="no g">G</span>
              <FotoDoJogador foto={fotos[contas[jogadorGoleiro(goleiroNaSelecao.nome).id]]} conta={contas[jogadorGoleiro(goleiroNaSelecao.nome).id]} nome={goleiroNaSelecao.nome} comEspaco={comFotos} />
              <span className="nome">{goleiroNaSelecao.nome}</span>
              <span style={col}>{goleiroNaSelecao.jogos}</span>
              <span className="num" style={{ ...col, fontSize: 22 }}>{goleiroNaSelecao.vitorias}</span>
            </div>
          )}
          {vitorias.map((v, i) => {
            const naSelecao = i < estado.config.linha && v.vitorias > 0
            return (
              <div key={v.id} className="tr" style={naSelecao ? { background: '#fff6d0' } : undefined}>
                <span className={'no' + (naSelecao ? ' g' : '')}>{i + 1}</span>
                <FotoDoJogador foto={fotos[contas[v.id]]} conta={contas[v.id]} nome={v.nome} comEspaco={comFotos} />
                <span className="nome">{v.nome}</span>
                <span style={col}>{v.jogos}</span>
                <span className="num" style={{ ...col, fontSize: 22 }}>{v.vitorias}</span>
              </div>
            )
          })}
        </section>

        {estado.config.goleiros.length > 0 && (
          <section className="panel">
            <div className="ph">Goleiro menos vazado<span className="sub">luva de ouro</span></div>
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
        {!somenteLeitura && <button className="btn r sm" onClick={fimDaPelada}><Icone nome="lixo" tamanho={20} /> Encerrar pelada</button>}
      </div>

      {aberta && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`Partida ${aberta.numero}`} onClick={() => setPartidaAberta(null)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Partida {aberta.numero}<span className="sub">Time {aberta.timeA.numero} {aberta.placar[0]} x {aberta.placar[1]} Time {aberta.timeB.numero}</span></div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              {aberta.gols.length === 0
                ? <div className="mut">Nenhum gol nesta partida.</div>
                : <GolsCorrigiveis pelada={pelada} partida={aberta.numero} gols={aberta.gols} times={{ A: aberta.timeA, B: aberta.timeB }}
                    coletes={aberta.coletes ?? estado.config.coletes} goleiros={aberta.goleiros} />}
              <button className="btn w sm" onClick={() => setPartidaAberta(null)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
      {encerrando && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Encerrar a pelada" onClick={() => setEncerrando(false)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Encerrar a pelada?</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                Depois de encerrar, a lista, os times e a tabela de hoje somem. Quer compartilhar o resumo antes?
              </div>
              {partidaQueVaiFechar && (
                <div className="mut" style={{ color: 'var(--navy)', fontWeight: 700 }}>⚽ {partidaQueVaiFechar}</div>
              )}
              {ajudando
                ? <div className="mut" style={{ color: 'var(--verde)', fontWeight: 700 }}>✓ Os resultados vão para o histórico de {ajudando.nomeDoDono ?? 'quem criou a pelada'}.</div>
                : conta.logado
                ? <div className="mut" style={{ color: 'var(--verde)', fontWeight: 700 }}>✓ Os resultados ficam guardados no seu histórico.</div>
                : (
                  <button className="btn w sm" style={{ textTransform: 'none' }} onClick={conta.entrar}>
                    Entrar com Google para guardar no histórico
                  </button>
                )}
              {/* compartilha a imagem e, se não cancelou, encerra */}
              <button className="btn" disabled={gerando} onClick={async () => { if (await compartilhar()) { setEncerrando(false); encerrar() } }}>
                <Icone nome="compartilhar" /> {gerando ? 'Gerando a imagem…' : 'Compartilhar e encerrar'}
              </button>
              <button className="btn r sm" onClick={() => { setEncerrando(false); encerrar() }}>Encerrar sem compartilhar</button>
              <button className="btn w sm" onClick={() => setEncerrando(false)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
      {lancarAntes && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Lance o campo no caixa" onClick={() => setLancarAntes(false)}>
          <section className="panel" onClick={(evento) => evento.stopPropagation()}>
            <div className="ph">Lance o campo no caixa</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <div className="mut" style={{ color: 'var(--navy)', fontWeight: 600, lineHeight: 1.4 }}>
                Feche a conta do campo antes de encerrar a pelada.
              </div>
              <div style={{ display: 'grid', gap: 2, fontWeight: 600, color: 'var(--navy)' }}>
                <div>Entrou: <b style={{ color: 'var(--verde)' }}>{reais(noCaixa.resumo.arrecadado)}</b> ({noCaixa.resumo.pagos} de {noCaixa.resumo.pessoas} pagaram)</div>
                <div>Campo: <b style={{ color: 'var(--vermelho)' }}>{reais(noCaixa.resumo.campo)}</b></div>
                <div>Caixa: <b>{noCaixa.resumo.sobra >= 0 ? '+' : ''}{reais(noCaixa.resumo.sobra)}</b></div>
              </div>
              <button className="btn" disabled={lancando} onClick={() => void lancarEEncerrar()}>{lancando ? 'Lançando…' : 'Lançar no caixa e encerrar'}</button>
              {cobranca && (
                <button className="btn w sm" onClick={() => { setLancarAntes(false); setCampoPagoAberto(true) }}>Conferir quem pagou</button>
              )}
              <button className="btn w sm" onClick={() => setLancarAntes(false)}>Voltar</button>
            </div>
          </section>
        </div>
      )}
      {campoPagoAberto && cobranca && <Pagamentos pelada={pelada} cobranca={cobranca} onFechar={() => setCampoPagoAberto(false)} />}
    </div>
  )
}
