// Resumo da pelada para compartilhar, na identidade do app:
// - imagem da seleção da pelada (1080×1920, 9:16): a seleção no campo e a chuteira e luva de ouro;
// - cartinha de um jogador (também 9:16);

import { artilharia, criterioDoArtilheiro, fichaDoJogador, garcons, goleirosMenosVazados, selecaoDaPelada } from '../logic'
import type { RelatorioDoAno } from '../logic'
import type { Estado } from '../types/pelada'
import { dataHoje } from './formatar'
import { compartilharArquivoNativo, nativo } from './nativo'


const L = 1080
/** Altura das imagens: 1080×1920 (9:16), a tela inteira do celular (status, stories). */
const ALTURA = 1920
const NAVY = '#10223A'
const AMARELO = '#FFD23F'
const VERDE = '#1F6B33'
const VERDE_CLARO = '#23763A'
const CINZA = '#c9d4e3'
const CONDENSADA = '"Barlow Condensed", sans-serif'
const NORMAL = 'Barlow, sans-serif'

type Ctx = CanvasRenderingContext2D
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

// ---------- desenho ----------

/** Escreve o texto no tamanho que couber em `max` (diminui a fonte se precisar). */
function texto(c: Ctx, t: string, x: number, y: number, o: { tam: number; max?: number; cor?: string; peso?: number; fonte?: string; alinha?: CanvasTextAlign }) {
  let tam = o.tam
  const fonte = (n: number) => `${o.peso ?? 800} ${n}px ${o.fonte ?? CONDENSADA}`
  c.font = fonte(tam)
  while (o.max && tam > 12 && c.measureText(t).width > o.max) c.font = fonte(--tam)
  c.fillStyle = o.cor ?? '#fff'
  c.textAlign = o.alinha ?? 'left'
  c.fillText(t, x, y)
}

function retangulo(c: Ctx, x: number, y: number, l: number, a: number, r: number) {
  c.beginPath()
  c.roundRect(x, y, l, a, r)
}

/** Camisa (mesmo desenho do app) centrada em (x, y), com `numero` no peito. Ocupa de y - 168e a y + 170e. */
function camisa(c: Ctx, x: number, y: number, cor: string, numero: string, corNumero: string, e: number) {
  c.save()
  c.translate(x - 256 * e, y - 260 * e)
  c.scale(e, e)
  c.beginPath()
  c.moveTo(150, 120); c.lineTo(205, 92); c.quadraticCurveTo(256, 128, 307, 92); c.lineTo(362, 120); c.lineTo(430, 190)
  c.lineTo(384, 236); c.lineTo(352, 208); c.lineTo(352, 430); c.lineTo(160, 430); c.lineTo(160, 208); c.lineTo(128, 236)
  c.lineTo(82, 190); c.closePath()
  c.fillStyle = cor
  c.fill()
  c.lineWidth = 12
  c.strokeStyle = NAVY
  c.stroke()
  c.restore()
  if (numero) texto(c, numero, x, y + 70 * e, { tam: Math.round(180 * e), cor: corNumero, alinha: 'center' })
}


function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = src
  })
}

type Recursos = {
  logo: HTMLImageElement | null
  artilheiro: HTMLImageElement | null; goleiro: HTMLImageElement | null; garcom: HTMLImageElement | null // silhuetas dos troféus (public/silhuetas)
}

async function prepararTela(altura: number): Promise<{ c: Ctx; tela: HTMLCanvasElement; r: Recursos }> {
  await Promise.all([`800 72px ${CONDENSADA}`, `600 30px ${NORMAL}`, `700 30px ${NORMAL}`].map((f) => document.fonts.load(f).catch(() => null)))
  const [logo, artilheiro, goleiro, garcom] = await Promise.all([
    carregarImagem(`${import.meta.env.BASE_URL}logo.png`),
    carregarImagem(`${import.meta.env.BASE_URL}silhuetas/artilheiro.svg`),
    carregarImagem(`${import.meta.env.BASE_URL}silhuetas/goleiro.svg`),
    carregarImagem(`${import.meta.env.BASE_URL}silhuetas/garcom.png`),
  ])
  const tela = document.createElement('canvas')
  tela.width = L
  tela.height = altura
  return { c: tela.getContext('2d')!, tela, r: { logo, artilheiro, goleiro, garcom } }
}

function cabecalho(c: Ctx, r: Recursos, titulo: string, sub = dataHoje().toUpperCase()) {
  c.fillStyle = NAVY; c.fillRect(0, 0, L, 210)
  if (r.logo) c.drawImage(r.logo, 36, 22, 166, 166)
  texto(c, titulo, 222, 112, { tam: 84, cor: AMARELO, max: L - 260 })
  texto(c, sub, 224, 162, { tam: 34, cor: CINZA, peso: 600, fonte: NORMAL, max: L - 260 })
  c.fillStyle = AMARELO; c.fillRect(0, 210, L, 10)
}

function rodape(c: Ctx, y: number, altura: number, esquerda: string) {
  c.fillStyle = AMARELO; c.fillRect(0, y, L, 8)
  c.fillStyle = NAVY; c.fillRect(0, y + 8, L, altura - 8)
  const meio = y + 8 + (altura - 8) / 2 + 11
  texto(c, esquerda, 40, meio, { tam: 32, peso: 600, fonte: NORMAL, max: 600 })
  texto(c, 'dois-ou-dez.web.app', L - 40, meio, { tam: 32, cor: AMARELO, peso: 700, fonte: NORMAL, alinha: 'right' })
}

/** Linhas da formação (de cima para baixo) para `n` jogadores de linha. */
function formacao(n: number): number[] {
  if (n <= 3) return [n]
  if (n <= 6) return [Math.ceil(n / 2), Math.floor(n / 2)]
  const resto = n - 3
  return [3, Math.ceil(resto / 2), Math.floor(resto / 2)].filter(Boolean)
}

/** Fundo de estádio: azul-marinho com luz de refletor no alto. */
function estadio(c: Ctx, topo: number, base: number) {
  const fundo = c.createLinearGradient(0, topo, 0, base)
  fundo.addColorStop(0, '#0a1626'); fundo.addColorStop(1, NAVY)
  c.fillStyle = fundo; c.fillRect(0, topo, L, base - topo)
  // fachos de luz dos refletores
  c.save()
  c.globalCompositeOperation = 'lighter'
  for (const [x, ang] of [[120, 0.5], [L - 120, -0.5]] as const) {
    const g = c.createLinearGradient(x, topo, x + ang * 500, topo + 600)
    g.addColorStop(0, 'rgba(255,240,190,.20)'); g.addColorStop(1, 'rgba(255,240,190,0)')
    c.fillStyle = g
    c.beginPath(); c.moveTo(x - 20, topo); c.lineTo(x + 20, topo); c.lineTo(x + ang * 900 + 260, topo + 700); c.lineTo(x + ang * 900 - 260, topo + 700); c.closePath(); c.fill()
  }
  const brilho = c.createRadialGradient(L / 2, topo + 40, 10, L / 2, topo + 40, 520)
  brilho.addColorStop(0, 'rgba(255,210,63,.22)'); brilho.addColorStop(1, 'rgba(255,210,63,0)')
  c.fillStyle = brilho; c.fillRect(0, topo, L, base - topo)
  c.restore()
}

/**
 * Seleção da pelada num campo em perspectiva (como as artes de "seleção da rodada"):
 * cada jogador é uma peça com a camisa (nº = vitórias), a plaquinha do nome e os gols.
 * O goleiro menos vazado fica no gol.
 */
/** O que vai no campo: os jogadores da seleção (com a plaquinha e os gols) e o goleiro. */
type SelecaoParaDesenhar = { jogadores: { id: string; nome: string; gols: number }[]; goleiro: string | null; vazio: string }

const selecaoDoDia = (estado: Estado): SelecaoParaDesenhar => ({
  jogadores: selecaoDaPelada(estado), goleiro: goleirosMenosVazados(estado)[0]?.nome ?? null,
  vazio: 'A seleção aparece quando a primeira partida terminar',
})

function selecaoNoCampo(c: Ctx, sel: SelecaoParaDesenhar, topo: number, base: number, comTitulo = true) {
  c.save()
  c.beginPath(); c.rect(0, topo, L, base - topo); c.clip()
  estadio(c, topo, base)

  // título grande, inclinado
  if (comTitulo) {
    c.save()
    c.transform(1, 0, -0.16, 1, 0, 0)
    texto(c, 'SELEÇÃO', 64 + topo * 0.16, topo + 90, { tam: 92 })
    texto(c, 'DA PELADA', 70 + (topo + 138) * 0.16, topo + 138, { tam: 54, cor: AMARELO })
    c.restore()
  }

  // campo em perspectiva: do alto (estreito) até embaixo (largo, passando da imagem)
  const cTopo = topo + (comTitulo ? 150 : 80)
  const cBase = base
  const lTopo = 700
  const lBase = 1500
  const ponto = (u: number, v: number) => {
    const w = lTopo + (lBase - lTopo) * v
    return [L / 2 + (u - 0.5) * w, cTopo + (cBase - cTopo) * v] as const
  }
  const quad = (u0: number, v0: number, u1: number, v1: number) => {
    const ps = [ponto(u0, v0), ponto(u1, v0), ponto(u1, v1), ponto(u0, v1)]
    c.beginPath(); ps.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath()
  }
  const faixas = 8
  for (let i = 0; i < faixas; i++) {
    quad(0, i / faixas, 1, (i + 1) / faixas)
    c.fillStyle = i % 2 ? VERDE_CLARO : VERDE
    c.fill()
  }
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 4
  quad(0.04, 0, 0.96, 1.2); c.stroke()
  quad(0.27, 0.72, 0.73, 1.2); c.stroke() // área
  quad(0.39, 0.9, 0.61, 1.2); c.stroke() // pequena área
  c.beginPath() // meio-campo (arco no alto)
  for (let k = 0; k <= 24; k++) {
    const a = (Math.PI * k) / 24
    const [x, y] = ponto(0.5 + Math.cos(a) * 0.16, Math.sin(a) * 0.22)
    if (k) c.lineTo(x, y); else c.moveTo(x, y)
  }
  c.stroke()

  // peças
  const selecao = sel.jogadores
  const linhas = formacao(selecao.length)
  // o gol sempre tem uma peça: o goleiro menos vazado ou, sem goleiro fixo, só o "G" (sem nome)
  const niveis = linhas.length + 1
  // fileiras do alto até ~2/3 do campo (o goleiro mais embaixo, na área); nada fica atrás dos cartões
  const ultimo = 0.8
  // time grande (muitas fileiras ou muita gente na fileira): peças menores para não encavalarem
  // tamanho das peças pelo espaço entre as fileiras (peça + plaquinha do nome cabem no passo)
  // as fileiras ficam juntas (no máximo 0.26 do campo entre elas): com goleiro, encostadas nele;
  // sem goleiro, centralizadas
  const dv = niveis > 1 ? Math.min(0.26, (ultimo - 0.08) / (niveis - 1)) : 0
  const primeira = ultimo - dv * (niveis - 1)
  const vs = Array.from({ length: niveis }, (_, i) => (niveis <= 1 ? 0.35 : primeira + dv * i))
  const passo = niveis > 1 ? (cBase - cTopo) * dv : 400
  const k = Math.max(0.55, Math.min(1.3, (passo - 58) / (124 * 1.1)))
  // x já em pixels: assim dá para limitar a fileira à largura da imagem
  const peca = (x: number, v: number, nome: string, numero: string, gols: number, corCamisa: string, corNumero: string, espaco = 999) => {
    const y = ponto(0.5, v)[1]
    const e = (0.85 + 0.35 * v) * k // mais perto = maior
    const raio = 62 * e
    // gols: uma aba que sai de trás da peça (a peça fica por cima) com o número; fileira cheia = aba menor
    const t = Math.min(1, Math.max(0.6, (espaco / 2 - raio - 6) / (raio * 0.95)))
    const aba = raio * 0.95 * t // parte que aparece, à direita da peça
    const alturaDaAba = raio * 1.05 * t
    if (gols > 0) {
      const topoDaAba = y - alturaDaAba * 0.55
      c.save()
      c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 10; c.shadowOffsetY = 4
      retangulo(c, x, topoDaAba, raio + aba, alturaDaAba, alturaDaAba * 0.24); c.fillStyle = NAVY; c.fill()
      c.restore()
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.75)'; c.stroke()
      const meio = x + raio + aba / 2 - 2
      texto(c, String(gols), meio, topoDaAba + alturaDaAba * 0.6, { tam: Math.round(alturaDaAba * 0.6), alinha: 'center' })
      texto(c, gols === 1 ? 'GOL' : 'GOLS', meio, topoDaAba + alturaDaAba * 0.88, { tam: Math.round(alturaDaAba * 0.22), alinha: 'center' })
    }
    c.save()
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 16; c.shadowOffsetY = 6
    c.beginPath(); c.arc(x, y, raio, 0, Math.PI * 2); c.fillStyle = NAVY; c.fill()
    c.restore()
    c.beginPath(); c.arc(x, y, raio, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = AMARELO; c.stroke()
    camisa(c, x, y + 4 * e, corCamisa, numero, corNumero, 0.17 * e)
    // plaquinha do nome (o "G" sem goleiro fixo não tem nome)
    if (nome) {
      c.font = `800 ${Math.round(30 * e)}px ${CONDENSADA}`
      const largura = Math.min(250 * k + 20, espaco - 12, c.measureText(nome).width + 30)
      retangulo(c, x - largura / 2, y + raio - 6, largura, 40 * e, 6); c.fillStyle = AMARELO; c.fill()
      texto(c, nome, x, y + raio - 6 + 30 * e, { tam: Math.round(30 * e), cor: NAVY, alinha: 'center', max: largura - 12 })
    }
  }
  if (selecao.length === 0) {
    texto(c, sel.vazio, L / 2, (cTopo + cBase) / 2, { tam: 34, peso: 600, fonte: NORMAL, alinha: 'center', max: L - 160 })
  }
  let i = 0
  linhas.forEach((qtd, li) => {
    for (let col = 0; col < qtd; col++, i++) {
      const j = selecao[i]
      if (!j) continue
      const v = vs[li]
      const abertura = Math.min(0.8, 0.2 + 0.2 * (qtd - 1)) // mais gente na fileira = mais aberta
      const margem = 62 * k * (0.85 + 0.35 * v) + 70 // peça + metade da plaquinha cabem dentro da imagem
      const largura = Math.min(abertura * (lTopo + (lBase - lTopo) * v), L - 2 * margem)
      const x = qtd === 1 ? L / 2 : L / 2 - largura / 2 + (largura * col) / (qtd - 1)
      const espaco = qtd > 1 ? largura / (qtd - 1) : 999 // distância até a peça vizinha
      peca(x, v, j.nome, '', j.gols, AMARELO, NAVY, espaco) // camisa sem número; ao lado, os gols
    }
  })
  if (selecao.length) peca(L / 2, vs[linhas.length], sel.goleiro ?? '', 'G', 0, '#fff', NAVY)
  c.restore()
}

function numerosDoDia(estado: Estado): string {
  const jogadores = new Set(estado.historico.flatMap((p) => [...p.timeA.jogadores, ...p.timeB.jogadores].map((j) => j.id))).size
  // gols: inclui a partida em andamento, como a artilharia
  const gols = estado.historico.reduce((t, p) => t + p.placar[0] + p.placar[1], 0) + estado.placar[0] + estado.placar[1]
  return `${plural(jogadores, 'jogador', 'jogadores')} · ${plural(estado.historico.length, 'partida', 'partidas')} · ${plural(gols, 'gol', 'gols')}`
}

const paraPng = (tela: HTMLCanvasElement): Promise<Blob> =>
  new Promise((ok, erro) => tela.toBlob((b) => (b ? ok(b) : erro(new Error('Não deu para gerar a imagem'))), 'image/png'))

// ---------- imagens ----------

/** Os troféus: título, nome e detalhe de cada um (null = ninguém). */
type Premio = { nome: string; detalhe: string } | null
type Premios = {
  chuteira: Premio; luva: Premio; garcom: Premio
  tituloChuteira?: string; tituloLuva?: string; tituloGarcom?: string; semChuteira?: string
}

function premiosDoDia(estado: Estado): Premios {
  // um só artilheiro (com os critérios de desempate); o critério aparece se houve empate em gols
  const artilheiros = artilharia(estado)
  const artilheiro = artilheiros[0]
  const criterio = criterioDoArtilheiro(artilheiros)
  const goleiro = goleirosMenosVazados(estado)[0]
  const garcom = garcons(estado)[0]
  return {
    chuteira: artilheiro ? { nome: artilheiro.nome, detalhe: plural(artilheiro.gols, 'gol', 'gols') + (criterio ? ` · desempate: ${criterio}` : '') } : null,
    luva: goleiro ? { nome: goleiro.nome, detalhe: `${plural(goleiro.sofridos, 'gol sofrido', 'gols sofridos')} em ${plural(goleiro.jogos, 'jogo', 'jogos')}` } : null,
    garcom: garcom ? { nome: garcom.nome, detalhe: plural(garcom.assistencias, 'assistência', 'assistências') } : null,
  }
}

/**
 * Faixa com os troféus em pedestal, lado a lado: chuteira de ouro (sempre), luva de ouro (só com goleiro fixo)
 * e Troféu Garçom (só se alguém deu passe para gol).
 */
function trofeusNaFaixa(c: Ctx, premios: Premios, r: Recursos, y: number, altura: number) {
  const fundo = c.createLinearGradient(0, y, 0, y + altura)
  fundo.addColorStop(0, '#0a1626'); fundo.addColorStop(1, NAVY)
  c.fillStyle = fundo; c.fillRect(0, y, L, altura)
  c.fillStyle = AMARELO; c.fillRect(0, y, L, 8)
  const { chuteira, luva, garcom } = premios
  const trofeus = [
    { titulo: premios.tituloChuteira ?? 'CHUTEIRA DE OURO', nome: chuteira?.nome ?? '—', detalhe: chuteira?.detalhe ?? premios.semChuteira ?? 'Nenhum gol com autor',
      silhueta: r.artilheiro, largura: 240, altura: 180, ajuste: 4 },
    ...(luva ? [{ titulo: premios.tituloLuva ?? 'LUVA DE OURO', nome: luva.nome, detalhe: luva.detalhe, silhueta: r.goleiro, largura: 320, altura: 180, ajuste: 8 }] : []),
    ...(garcom ? [{ titulo: premios.tituloGarcom ?? 'TROFÉU GARÇOM', nome: garcom.nome, detalhe: garcom.detalhe, silhueta: r.garcom, largura: 240, altura: 190, ajuste: 4 }] : []),
  ]
  const coluna = L / trofeus.length
  const tres = trofeus.length === 3 // três troféus: tudo um pouco menor para caber
  const base = y + 214 // topo do pedestal
  trofeus.forEach((trofeu, indice) => {
    const x = coluna * indice + coluna / 2
    if (indice > 0) { c.fillStyle = 'rgba(255,210,63,.35)'; c.fillRect(coluna * indice - 1, y + 40, 2, altura - 80) }
    const luz = c.createRadialGradient(x, base - 70, 10, x, base - 70, 190)
    luz.addColorStop(0, 'rgba(255,210,63,.28)'); luz.addColorStop(1, 'rgba(255,210,63,0)')
    c.fillStyle = luz; c.fillRect(x - coluna / 2, y + 10, coluna, 300)
    silhuetaDourada(c, trofeu.silhueta, x, base - trofeu.ajuste, tres ? trofeu.largura * 0.8 : trofeu.largura, trofeu.altura)
    pedestal(c, x, base, tres ? 160 : 190)
    const maximo = coluna - 40
    texto(c, trofeu.titulo, x, base + 118, { tam: tres ? 28 : 32, cor: AMARELO, alinha: 'center', max: maximo })
    texto(c, trofeu.nome, x, base + 168, { tam: tres ? 44 : 52, alinha: 'center', max: maximo })
    texto(c, trofeu.detalhe, x, base + 202, { tam: tres ? 22 : 26, cor: CINZA, peso: 600, fonte: NORMAL, alinha: 'center', max: maximo })
  })
}

/** Imagem da seleção da pelada (1080×1920, 9:16): a seleção no campo e, embaixo, chuteira e luva de ouro. */
export async function imagemDoResumo(estado: Estado): Promise<Blob> {
  const { c, tela, r } = await prepararTela(ALTURA)
  cabecalho(c, r, 'SELEÇÃO DA PELADA')
  const faixa = ALTURA - 98 - 430 // embaixo do campo: chuteira e luva de ouro
  selecaoNoCampo(c, selecaoDoDia(estado), 220, faixa, false)
  trofeusNaFaixa(c, premiosDoDia(estado), r, faixa, 430)
  rodape(c, ALTURA - 98, 98, numerosDoDia(estado))
  return paraPng(tela)
}

/**
 * Time do ano da turma (1080×1920): quem mais veio às peladas (no empate, mais gols) no campo ("11/11"),
 * o goleiro do ano no gol e, embaixo, o artilheiro e o goleiro do ano.
 */
export async function imagemDoTimeDoAno(r: RelatorioDoAno, turma: string): Promise<Blob> {
  const { c, tela, r: recursos } = await prepararTela(ALTURA)
  cabecalho(c, recursos, 'TIME DO ANO', `TEMPORADA ${r.ano} · ${turma.toUpperCase()}`)
  const faixa = ALTURA - 98 - 430
  selecaoNoCampo(c, {
    jogadores: r.timeDoAno.map((j) => ({ id: j.id, nome: `${j.nome} · ${j.peladas}/${r.peladas}`, gols: j.gols })),
    goleiro: r.goleiroDoAno?.nome ?? null,
    vazio: 'O Time do ano aparece com as peladas encerradas',
  }, 220, faixa, false)
  trofeusNaFaixa(c, {
    tituloChuteira: 'ARTILHEIRO DO ANO', tituloLuva: 'GOLEIRO DO ANO',
    chuteira: r.artilheiro ? { nome: r.artilheiro.nome, detalhe: `${plural(r.artilheiro.gols, 'gol', 'gols')} em ${plural(r.artilheiro.peladas, 'pelada', 'peladas')}` } : null,
    luva: r.goleiroDoAno ? { nome: r.goleiroDoAno.nome, detalhe: `${r.goleiroDoAno.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} gols sofridos por jogo` } : null,
    tituloGarcom: 'GARÇOM DO ANO',
    garcom: r.garcom ? { nome: r.garcom.nome, detalhe: plural(r.garcom.assistencias, 'assistência', 'assistências') } : null,
  }, recursos, faixa, 430)
  rodape(c, ALTURA - 98, 98, `${plural(r.peladas, 'pelada', 'peladas')} no ano · número = presença`)
  return paraPng(tela)
}

// ---------- troféus: chuteira e luva de ouro ----------

/** Dourado com brilho para os troféus. */
function ouro(c: CanvasRenderingContext2D, x: number, y: number, l: number, a: number) {
  const g = c.createLinearGradient(x, y, x + l, y + a)
  g.addColorStop(0, '#fff3c0'); g.addColorStop(0.3, '#FFD23F'); g.addColorStop(0.62, '#c9971c'); g.addColorStop(1, '#ffe27a')
  return g
}

/** Pedestal do troféu (preto com plaquinha dourada), centrado em x, com o topo em y. */
function pedestal(c: Ctx, x: number, y: number, l: number) {
  const a = l * 0.42
  c.save()
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 24; c.shadowOffsetY = 10
  c.beginPath()
  c.moveTo(x - l * 0.36, y); c.lineTo(x + l * 0.36, y); c.lineTo(x + l * 0.5, y + a); c.lineTo(x - l * 0.5, y + a); c.closePath()
  const preto = c.createLinearGradient(x - l / 2, y, x + l / 2, y)
  preto.addColorStop(0, '#05080c'); preto.addColorStop(0.5, '#2a3340'); preto.addColorStop(1, '#05080c')
  c.fillStyle = preto; c.fill()
  c.restore()
  c.fillStyle = ouro(c, x - l * 0.4, y, l * 0.8, 6); c.fillRect(x - l * 0.38, y - 6, l * 0.76, 8)
  retangulo(c, x - l * 0.26, y + a * 0.32, l * 0.52, a * 0.4, 4); c.fillStyle = ouro(c, x - l * 0.26, y + a * 0.32, l * 0.52, a * 0.4); c.fill()
}

/**
 * Silhueta dourada (jogador chutando ou goleiro voando, de public/silhuetas) em cima do pedestal:
 * cabe em `larg` × `alt`, centrada em x, com a base em y. A imagem preta vira dourada.
 */
function silhuetaDourada(c: Ctx, img: HTMLImageElement | null, x: number, y: number, larg: number, alt: number) {
  if (!img) return
  const e = Math.min(larg / img.width, alt / img.height)
  const l = Math.round(img.width * e)
  const a = Math.round(img.height * e)
  const tinta = document.createElement('canvas')
  tinta.width = l; tinta.height = a
  const t = tinta.getContext('2d')!
  t.drawImage(img, 0, 0, l, a)
  t.globalCompositeOperation = 'source-in'
  t.fillStyle = ouro(t, 0, 0, l, a)
  t.fillRect(0, 0, l, a)
  c.save()
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 16; c.shadowOffsetY = 6
  c.drawImage(tinta, x - l / 2, y - a, l, a)
  c.restore()
}

/** Contorno da cartinha (formato das cartas do FIFA). */
function formaDaCarta(c: Ctx, x: number, y: number, l: number, a: number) {
  c.beginPath()
  c.moveTo(x + l * 0.14, y)
  c.lineTo(x + l * 0.86, y)
  c.quadraticCurveTo(x + l * 0.9, y + a * 0.05, x + l, y + a * 0.06)
  c.lineTo(x + l, y + a * 0.8)
  c.quadraticCurveTo(x + l, y + a * 0.86, x + l * 0.9, y + a * 0.9)
  c.lineTo(x + l * 0.5, y + a)
  c.lineTo(x + l * 0.1, y + a * 0.9)
  c.quadraticCurveTo(x, y + a * 0.86, x, y + a * 0.8)
  c.lineTo(x, y + a * 0.06)
  c.quadraticCurveTo(x + l * 0.1, y + a * 0.05, x + l * 0.14, y)
  c.closePath()
}

/** Ficha do jogador como cartinha do FIFA (preta e dourada): "nota" = vitórias e os números do dia. */
export async function imagemDoJogador(estado: Estado, jogadorId: string): Promise<Blob> {
  const f = fichaDoJogador(estado, jogadorId)
  if (!f) throw new Error('Jogador sem partidas')
  const A = ALTURA
  const { c, tela, r } = await prepararTela(A)
  estadio(c, 0, A)
  const OURO = '#E9C46A'

  // acima da carta: logo e título
  if (r.logo) c.drawImage(r.logo, 40, 150, 130, 130)
  texto(c, 'FICHA DO JOGADOR', 190, 230, { tam: 76, cor: AMARELO })
  texto(c, dataHoje().toUpperCase(), 192, 272, { tam: 32, cor: CINZA, peso: 600, fonte: NORMAL })

  // carta
  const [x, y, lc, ac] = [170, 470, 740, 1060] // carta no meio da tela
  c.save()
  c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 40; c.shadowOffsetY = 16
  formaDaCarta(c, x, y, lc, ac)
  const preto = c.createLinearGradient(x, y, x + lc, y + ac)
  preto.addColorStop(0, '#1b222c'); preto.addColorStop(0.5, '#0c1016'); preto.addColorStop(1, '#1d242e')
  c.fillStyle = preto; c.fill()
  c.restore()
  const borda = c.createLinearGradient(x, y, x + lc, y + ac)
  borda.addColorStop(0, '#fbe6a2'); borda.addColorStop(0.45, '#c9a227'); borda.addColorStop(1, '#f5d77a')
  formaDaCarta(c, x, y, lc, ac); c.lineWidth = 14; c.strokeStyle = borda; c.stroke()
  formaDaCarta(c, x + 26, y + 26, lc - 52, ac - 52); c.lineWidth = 2; c.strokeStyle = 'rgba(233,196,106,.55)'; c.stroke()

  // linhas douradas geométricas (como nas cartas TOTW)
  c.save()
  formaDaCarta(c, x, y, lc, ac); c.clip()
  c.strokeStyle = 'rgba(233,196,106,.35)'; c.lineWidth = 2
  for (const [x1, y1, x2, y2] of [[0.55, 0.05, 0.95, 0.45], [0.7, 0.04, 0.4, 0.5], [0.95, 0.2, 0.62, 0.52], [0.45, 0.12, 0.9, 0.3]]) {
    c.beginPath(); c.moveTo(x + lc * x1, y + ac * y1); c.lineTo(x + lc * x2, y + ac * y2); c.stroke()
  }
  c.restore()

  // nota (vitórias) e posição, no canto
  texto(c, String(f.vitorias), x + 130, y + 200, { tam: 150, cor: OURO, alinha: 'center' })
  texto(c, f.naSelecao ? 'SEL' : `#${f.posicao}`, x + 130, y + 262, { tam: 58, cor: OURO, alinha: 'center' })
  texto(c, 'VITÓRIAS', x + 130, y + 298, { tam: 22, cor: CINZA, peso: 700, fonte: NORMAL, alinha: 'center' })
  if (r.logo) c.drawImage(r.logo, x + 82, y + 316, 96, 96)

  // camisa grande com a inicial
  camisa(c, x + lc * 0.6, y + 300, AMARELO, f.nome.charAt(0), NAVY, 0.62)

  // nome entre filetes dourados
  c.fillStyle = OURO
  c.fillRect(x + 70, y + 520, lc - 140, 3)
  texto(c, f.nome, x + lc / 2, y + 610, { tam: 96, max: lc - 120, alinha: 'center' })
  c.fillRect(x + 70, y + 640, lc - 140, 3)

  // atributos em duas colunas
  const aproveitamento = f.jogos ? Math.round(((f.vitorias * 3 + f.empates) / (f.jogos * 3)) * 100) : 0
  const cartoes = f.amarelos + f.vermelhos + f.azuis
  const colunas: [string, string][][] = [
    [[String(f.vitorias), 'VIT'], [String(f.jogos), 'JOG'], [String(f.gols), 'GOL']],
    [[String(f.empates), 'EMP'], [String(cartoes), 'CRT'], [`${aproveitamento}%`, 'APR']],
  ]
  colunas.forEach((col, ci) => {
    col.forEach(([valor, rotulo], li) => {
      const cx = x + (ci === 0 ? 150 : lc / 2 + 70)
      const cy = y + 720 + li * 74
      texto(c, valor, cx + 120, cy, { tam: 64, alinha: 'right' })
      texto(c, rotulo, cx + 140, cy, { tam: 52, cor: OURO })
    })
  })
  c.fillRect(x + lc / 2, y + 670, 3, 220)

  if (f.naSelecao) texto(c, '★ SELEÇÃO DA PELADA ★', x + lc / 2, y + 935, { tam: 34, cor: OURO, peso: 700, fonte: NORMAL, alinha: 'center' })

  texto(c, 'dois-ou-dez.web.app', L / 2, A - 60, { tam: 26, cor: AMARELO, peso: 700, fonte: NORMAL, alinha: 'center' })
  return paraPng(tela)
}

// ---------- compartilhar ----------

/** Abre o compartilhar do celular com a imagem; sem suporte, baixa o arquivo. Devolve false se cancelou. */
export async function compartilharImagem(imagem: Blob, nome: string): Promise<boolean> {
  if (nativo()) return compartilharArquivoNativo(imagem, `${nome}.png`)
  const arquivo = new File([imagem], `${nome}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: 'Dois ou Dez' })
      return true
    } catch {
      return false // cancelou o compartilhar
    }
  }
  const url = URL.createObjectURL(imagem)
  const link = document.createElement('a')
  link.href = url
  link.download = arquivo.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}

export const nomeDoArquivo = (sufixo: string) => `dois-ou-dez-${new Date().toISOString().slice(0, 10)}-${sufixo}`

/** Gera e compartilha a ficha (cartinha) de um jogador. */
export async function compartilharFicha(estado: Estado, jogadorId: string, nome: string): Promise<void> {
  await compartilharImagem(await imagemDoJogador(estado, jogadorId), nomeDoArquivo(`ficha-${nome.toLowerCase().replace(/\s+/g, '-')}`))
}
