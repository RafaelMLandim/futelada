import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Icone } from '../../components/Icone'
import { campeao, jogoPorId } from '../../logic/torneio'
import type { JogoTorneio, Origem, Torneio } from '../../types/torneio'
import { deitarTela } from '../../utils/nativo'
import { descreverOrigem, timePorId } from './nomes'
import { Confronto } from './TabelaTorneio'

// Mata-mata em tela cheia, como o pôster da Copa: lado 1 à esquerda, lado 2 à direita e a final
// no meio (PLANO.md, seção 9.4.3). Cada caixa é um confronto; quem passou por W.O. aparece tracejado.

/** A tela está em pé? (fora do componente: lê a janela) */
const telaEmPe = () => window.innerHeight > window.innerWidth

const LIGA = 18 // largura da linha que liga um jogo ao seguinte
/** Largura da caixa (maior em ida e volta: ida · volta · agregado). */
const Largura = createContext(156)

type No = { tipo: 'jogo'; jogo: JogoTorneio; filhos: [No, No] } | { tipo: 'vaga'; origem: Origem }

/** Árvore a partir de uma origem: "vencedor do jogo X" vira o jogo; o resto é uma vaga (time que entra ali). */
function arvore(t: Torneio, origem: Origem): No {
  if (origem.tipo !== 'vencedor') return { tipo: 'vaga', origem }
  const jogo = jogoPorId(t, origem.jogo)!
  // ida e volta: a caixa é a da volta, mas os lados seguem a ida (de cima para baixo)
  const base = jogo.perna === 'volta' ? jogoPorId(t, jogo.outraPerna ?? '') ?? jogo : jogo
  return { tipo: 'jogo', jogo, filhos: [arvore(t, base.casa), arvore(t, base.fora)] }
}
const niveis = (no: No): number => (no.tipo === 'vaga' ? 0 : 1 + Math.max(niveis(no.filhos[0]), niveis(no.filhos[1])))
/** Nome da rodada de cada nível (1 = a do jogo mais perto da final). */
function nomesDasRodadas(raizes: No[], total: number): string[] {
  const nomes = Array<string>(total).fill('')
  const visitar = (no: No, nivel: number) => {
    if (no.tipo === 'vaga') return
    if (!nomes[nivel - 1]) nomes[nivel - 1] = no.jogo.rodada
    no.filhos.forEach((f) => visitar(f, nivel + 1))
  }
  raizes.forEach((r) => visitar(r, 1))
  return nomes
}

/** Linha em "]" ligando os dois jogos de cima e de baixo ao jogo seguinte. */
function Ligacao({ lado, dois }: { lado: 'esq' | 'dir'; dois: boolean }) {
  const cor = 'var(--borda)'
  return (
    <div style={{ alignSelf: 'stretch', width: LIGA, position: 'relative', flex: 'none' }} aria-hidden="true">
      {dois && (
        <span style={{
          position: 'absolute', top: '25%', bottom: '25%', [lado === 'esq' ? 'left' : 'right']: 0, width: LIGA / 2,
          borderTop: `2px solid ${cor}`, borderBottom: `2px solid ${cor}`, [lado === 'esq' ? 'borderRight' : 'borderLeft']: `2px solid ${cor}`,
        }} />
      )}
      <span style={{ position: 'absolute', top: '50%', [lado === 'esq' ? 'right' : 'left']: 0, width: dois ? LIGA / 2 : LIGA, borderTop: `2px solid ${cor}` }} />
    </div>
  )
}

/** Vaga de quem passou por W.O. (entra direto na rodada seguinte). */
function PassouDireto({ torneio, origem, colunas }: { torneio: Torneio; origem: Origem; colunas: number }) {
  const COL = useContext(Largura)
  const o = descreverOrigem(torneio, origem)
  return (
    <div style={{ width: colunas * (COL + LIGA) - LIGA, display: 'flex', alignItems: 'center', padding: '6px 0' }}>
      <div style={{ width: COL, border: '2px dashed #9aa4ae', borderRadius: 5, padding: '5px 8px', fontSize: 12, fontWeight: 700, color: 'var(--navy)', background: '#fff' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nome}</div>
        <div className="mut" style={{ fontSize: 11 }}>passa por W.O.</div>
      </div>
      <div style={{ flex: 1, borderTop: '2px dashed #9aa4ae' }} />
    </div>
  )
}

/** Um jogo e tudo o que vem antes dele, em `colunas` colunas (lado esquerdo cresce para a esquerda). */
function Ramo({ torneio, no, colunas, lado }: { torneio: Torneio; no: Extract<No, { tipo: 'jogo' }>; colunas: number; lado: 'esq' | 'dir' }) {
  const COL = useContext(Largura)
  const [a, b] = no.filhos
  const temAntes = colunas > 1 && (a.tipo === 'jogo' || b.tipo === 'jogo')
  const antes = (f: No) => f.tipo === 'jogo'
    ? <Ramo torneio={torneio} no={f} colunas={colunas - 1} lado={lado} />
    : <PassouDireto torneio={torneio} origem={f.origem} colunas={colunas - 1} />
  return (
    <div style={{ display: 'flex', flexDirection: lado === 'esq' ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'flex-end' }}>
      {temAntes && (
        <>
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr' }}>
            {[a, b].map((f, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: lado === 'esq' ? 'flex-end' : 'flex-start' }}>{antes(f)}</div>)}
          </div>
          <Ligacao lado={lado} dois />
        </>
      )}
      <div style={{ width: COL, flex: 'none', padding: '6px 0' }}><Confronto torneio={torneio} jogo={no.jogo} /></div>
    </div>
  )
}

/** Um lado inteiro da chave (ou a vaga de quem chega direto à final). */
function Lado({ torneio, no, colunas, lado }: { torneio: Torneio; no: No; colunas: number; lado: 'esq' | 'dir' }) {
  if (colunas === 0) return null
  const conteudo = no.tipo === 'jogo'
    ? <Ramo torneio={torneio} no={no} colunas={colunas} lado={lado} />
    : <PassouDireto torneio={torneio} origem={no.origem} colunas={colunas} />
  return (
    <div style={{ display: 'flex', flexDirection: lado === 'esq' ? 'row' : 'row-reverse', alignItems: 'center' }}>
      {conteudo}
      <Ligacao lado={lado} dois={false} />
    </div>
  )
}

/** Mata-mata em tela cheia (botão "Ver chave em tela cheia"); fecha no X ou no "voltar" do celular. */
export function ChaveCompleta({ torneio, onFechar }: { torneio: Torneio; onFechar: () => void }) {
  const COL = torneio.regras.mataIdaEVolta ? 186 : 156
  const [zoom, setZoom] = useState(1)
  // Ao abrir: diminui até caber na tela (sem ficar ilegível) e centraliza na final
  const area = useRef<HTMLDivElement>(null)
  const chave = useRef<HTMLDivElement>(null)
  const ajustou = useRef(false)
  // Sempre deitada: pede ao celular para deitar a tela; se ele não deixar (iPhone, navegador),
  // o desenho gira 90° e é só virar o celular. Ao fechar, a tela volta ao normal.
  const [emPe, setEmPe] = useState(telaEmPe)
  const emPeAgora = useRef(emPe)
  useEffect(() => {
    void deitarTela(true)
    // mudou de posição (deitou de verdade, ou voltou): ajusta o tamanho de novo
    const aoMudar = () => {
      const novo = telaEmPe()
      if (novo === emPeAgora.current) return // só a barra do navegador aparecendo/sumindo
      emPeAgora.current = novo
      ajustou.current = false
      setEmPe(novo)
      setZoom(1)
    }
    window.addEventListener('resize', aoMudar)
    return () => { window.removeEventListener('resize', aoMudar); void deitarTela(false) }
  }, [])
  useLayoutEffect(() => {
    const a = area.current
    const c = chave.current
    if (!a || !c) return
    if (!ajustou.current) {
      ajustou.current = true
      const cabe = Math.min(a.clientWidth / c.scrollWidth, a.clientHeight / c.scrollHeight)
      if (cabe < 1) { setZoom(Math.max(0.6, +cabe.toFixed(2))); return }
    }
    a.scrollLeft = (a.scrollWidth - a.clientWidth) / 2
  }, [zoom, emPe])
  const final = torneio.jogos.filter((j) => j.fase === 'mata' && j.rodada === 'Final' && j.perna !== 'ida').at(-1)
  if (!final) return null
  const base = final.perna === 'volta' ? jogoPorId(torneio, final.outraPerna ?? '') ?? final : final
  const esq = arvore(torneio, base.casa)
  const dir = arvore(torneio, base.fora)
  const colunas = Math.max(niveis(esq), niveis(dir))
  const rodadas = nomesDasRodadas([esq, dir], colunas)
  const terceiro = torneio.jogos.find((j) => j.rodada === 'Disputa de 3º lugar')
  const vencedor = campeao(torneio)
  const titulo = (nome: string, chave: string) => (
    <div key={chave} className="num" style={{ width: COL + LIGA, flex: 'none', textAlign: 'center', fontSize: 13, letterSpacing: 1, color: '#c9d4e3', textTransform: 'uppercase' }}>{nome}</div>
  )
  const botao = (rotulo: string, conteudo: ReactNode, onClick: () => void) => (
    <button className="ib s" aria-label={rotulo} onClick={onClick} style={{ background: 'transparent', borderColor: '#c9d4e3', color: '#fff' }}>{conteudo}</button>
  )

  return (
    // .modal: o "voltar" do celular fecha (toca no fundo); o conteúdo ocupa a tela toda
    <div className="modal" role="dialog" aria-modal="true" aria-label="Mata-mata em tela cheia" onClick={(ev) => { if (ev.target === ev.currentTarget) onFechar() }}
      style={{
        padding: 0, alignItems: 'stretch', justifyContent: 'stretch', background: 'var(--navy)', flexDirection: 'column',
        // celular em pé e travado: a chave aparece deitada (girada 90°), ocupando a tela toda
        ...(emPe && { inset: 'auto', top: 0, left: '100vw', width: '100dvh', height: '100vw', transform: 'rotate(90deg)', transformOrigin: 'top left' }),
      }}>
      <header className="bar" style={{ flex: 'none' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="h1">Mata-mata</h1>
          <p className="bsub">{torneio.nome}</p>
        </div>
        {botao('Diminuir', <Icone nome="menos" />, () => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2))))}
        {botao('Aumentar', <Icone nome="mais" />, () => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2))))}
        <button className="ib s" aria-label="Fechar tela cheia" onClick={onFechar}><span style={{ fontSize: 22, lineHeight: 1 }}>×</span></button>
      </header>
      <Largura.Provider value={COL}>
      <div ref={area} style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#1F6B33', display: 'flex', flexDirection: 'column' }}>
        {/* chave pequena (só a final, semi e final…): fica no meio da tela, não grudada no topo */}
        <div ref={chave} style={{ zoom, minWidth: 'min-content', margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, gap: 10 }}>
          {/* nomes das rodadas: lado 1 (da primeira para a semifinal), final, lado 2 (espelhado) */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {rodadas.slice().reverse().map((n, i) => titulo(n, `e${i}`))}
            <div className="num" style={{ width: COL, textAlign: 'center', fontSize: 15, letterSpacing: 1, color: 'var(--amarelo)' }}>FINAL</div>
            {rodadas.map((n, i) => titulo(n, `d${i}`))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Lado torneio={torneio} no={esq} colunas={colunas} lado="esq" />
            {/* a caixa da final fica no meio (na altura das linhas das semifinais): o troféu e o campeão
                ocupam o mesmo espaço em cima e embaixo, sem empurrar a caixa */}
            <div style={{ width: COL, flex: 'none', position: 'relative', padding: '64px 0' }}>
              <div style={{ position: 'absolute', top: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <Icone nome="trofeu" tamanho={34} />
              </div>
              <Confronto torneio={torneio} jogo={final} />
              {vencedor && (
                <div className="led num" style={{ position: 'absolute', top: 'calc(100% - 56px)', left: 0, right: 0, textAlign: 'center', padding: '6px 4px', fontSize: 18, textTransform: 'uppercase' }}>
                  <div style={{ fontSize: 11, color: '#c9d4e3', letterSpacing: 1 }}>CAMPEÃO</div>
                  {timePorId(torneio, vencedor)?.nome}
                </div>
              )}
            </div>
            <Lado torneio={torneio} no={dir} colunas={colunas} lado="dir" />
          </div>
          {terceiro && (
            <div style={{ width: COL, marginTop: 8 }}>
              <div className="num" style={{ textAlign: 'center', fontSize: 13, letterSpacing: 1, color: '#c9d4e3', marginBottom: 4 }}>DISPUTA DE 3º LUGAR</div>
              <Confronto torneio={torneio} jogo={terceiro} />
            </div>
          )}
        </div>
      </div>
      </Largura.Provider>
      <div className="mut" style={{ flex: 'none', textAlign: 'center', color: '#c9d4e3', padding: '6px 10px calc(6px + env(safe-area-inset-bottom))', fontSize: 12 }}>
        {emPe ? 'Vire o celular para ler a chave' : 'Arraste para ver tudo · − e + mudam o tamanho'}
      </div>
    </div>
  )
}
