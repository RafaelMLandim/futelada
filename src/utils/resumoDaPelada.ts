// Resumo da pelada para compartilhar, na identidade do app:
// - imagem da seleção da pelada (1080×1920, 9:16): a seleção no campo e a chuteira e luva de ouro;
// - carta do jogador, a do perfil (também 9:16);

import { artilharia, criterioDoArtilheiro, garcons, goleiroDaSelecao, goleirosMenosVazados, jogadorGoleiro, selecaoDaPelada, tabelaDaPelada } from '../logic'
import type { RelatorioDoAno } from '../logic'
import { FORMA_DA_CARTA, FORMA_DE_DENTRO_DA_CARTA, METAIS_DA_CARTA, type NivelDaCarta, type NumerosDaCarta } from '../logic/carta'
import type { Estado } from '../types/pelada'
import { fotoSemFundo } from './foto'
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


/** `deOutroSite`: pede permissão ao site da imagem; sem ela, não carrega (senão a imagem final não poderia ser gerada). */
function carregarImagem(src: string, deOutroSite = false): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image()
    if (deOutroSite) img.crossOrigin = 'anonymous'
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
 * No gol, o goleiro fixo que mais venceu (o mesmo critério da linha).
 */
/** O que vai no campo: os jogadores da seleção (com a plaquinha e os gols) e o goleiro. */
type SelecaoParaDesenhar = { jogadores: { id: string; nome: string; gols: number }[]; goleiro: string | null; vazio: string }

const selecaoDoDia = (estado: Estado): SelecaoParaDesenhar => ({
  jogadores: selecaoDaPelada(estado), goleiro: goleiroDaSelecao(estado)?.nome ?? null,
  vazio: 'A seleção aparece quando a primeira partida terminar',
})

/** Fotos dos jogadores, pelo id (dois "BRUNO" não se confundem). semFundo: só a pessoa (sai do círculo). */
type FotosDosJogadores = Map<string, { imagem: HTMLImageElement; semFundo: boolean }>

/** O jogador sem fundo, de pé sobre a plaquinha do nome (sem o círculo), com sombra para descolar do campo. */
function jogadorSoltoNaPeca(c: Ctx, foto: HTMLImageElement, x: number, y: number, raio: number) {
  const lado = raio * 2 // o mesmo tamanho do círculo: time grande continua cabendo
  const base = y + raio - 4 // a plaquinha do nome começa aqui
  c.save()
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 18; c.shadowOffsetY = 6
  c.drawImage(foto, x - lado / 2, base - lado, lado, lado)
  c.restore()
}

function rostoNaPeca(c: Ctx, foto: HTMLImageElement, x: number, y: number, raio: number) {
  const dentro = raio - 3
  c.save()
  c.beginPath(); c.arc(x, y, dentro, 0, Math.PI * 2); c.clip()
  c.drawImage(foto, x - dentro, y - dentro, dentro * 2, dentro * 2)
  c.restore()
}

/** A foto genérica: cabeça e ombros, para quem ainda não tem foto. */
function silhuetaNaPeca(c: Ctx, x: number, y: number, raio: number) {
  const dentro = raio - 3
  c.save()
  c.beginPath(); c.arc(x, y, dentro, 0, Math.PI * 2); c.clip()
  c.fillStyle = '#2a3b52'; c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
  c.fillStyle = CINZA
  c.beginPath(); c.arc(x, y - raio * 0.2, raio * 0.36, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.ellipse(x, y + raio * 0.86, raio * 0.68, raio * 0.62, 0, 0, Math.PI * 2); c.fill()
  c.restore()
}

function selecaoNoCampo(c: Ctx, sel: SelecaoParaDesenhar, topo: number, base: number, comTitulo = true, fotos: FotosDosJogadores = new Map()) {
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
  const peca = (x: number, v: number, nome: string, numero: string, gols: number, corCamisa: string, corNumero: string, espaco = 999, jogadorId = '') => {
    const y = ponto(0.5, v)[1]
    const e = (0.85 + 0.35 * v) * k // mais perto = maior
    const raio = 62 * e
    // gols: uma aba que sai de trás da peça (a peça fica por cima) com o número; fileira cheia = aba menor
    const t = Math.min(1, Math.max(0.6, (espaco / 2 - raio - 6) / (raio * 0.95)))
    const aba = raio * 0.95 * t // parte que aparece, à direita da peça
    const alturaDaAba = raio * 1.05 * t
    // solto (sem círculo): a aba vem na frente, ao lado do ombro, sem cobrir o rosto
    const abaDosGols = (solto: boolean) => {
      if (gols <= 0) return
      const topoDaAba = solto ? y + raio - 10 - alturaDaAba : y - alturaDaAba * 0.55
      const inicio = solto ? x + raio * 0.72 : x
      const largura = solto ? aba + raio * 0.42 : raio + aba
      c.save()
      c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 10; c.shadowOffsetY = 4
      retangulo(c, inicio, topoDaAba, largura, alturaDaAba, alturaDaAba * 0.24); c.fillStyle = NAVY; c.fill()
      c.restore()
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.75)'; c.stroke()
      const meio = solto ? inicio + largura / 2 : x + raio + aba / 2 - 2
      texto(c, String(gols), meio, topoDaAba + alturaDaAba * 0.6, { tam: Math.round(alturaDaAba * 0.6), alinha: 'center' })
      texto(c, gols === 1 ? 'GOL' : 'GOLS', meio, topoDaAba + alturaDaAba * 0.88, { tam: Math.round(alturaDaAba * 0.22), alinha: 'center' })
    }
    // a foto de quem tem conta; quem não tem foto fica com a silhueta (o "G" sem goleiro fixo continua com a camisa)
    const foto = fotos.get(jogadorId)
    const solto = foto?.semFundo === true
    if (!solto) abaDosGols(false) // a aba sai de trás do círculo
    if (!solto) {
      c.save()
      c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 16; c.shadowOffsetY = 6
      c.beginPath(); c.arc(x, y, raio, 0, Math.PI * 2); c.fillStyle = NAVY; c.fill()
      c.restore()
      c.beginPath(); c.arc(x, y, raio, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = AMARELO; c.stroke()
    }
    if (foto && solto) { jogadorSoltoNaPeca(c, foto.imagem, x, y, raio); abaDosGols(true) } // sem círculo: a aba vem na frente
    else if (foto) rostoNaPeca(c, foto.imagem, x, y, raio)
    else if (nome) silhuetaNaPeca(c, x, y, raio)
    else camisa(c, x, y + 4 * e, corCamisa, numero, corNumero, 0.17 * e)
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
      peca(x, v, j.nome, '', j.gols, AMARELO, NAVY, espaco, j.id) // foto (ou silhueta); ao lado, os gols
    }
  })
  if (selecao.length) peca(L / 2, vs[linhas.length], sel.goleiro ?? '', 'G', 0, '#fff', NAVY, 999, sel.goleiro ? jogadorGoleiro(sel.goleiro).id : '')
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

/** Baixa as fotos para desenhar; a que não carregar fica de fora (o jogador sai com a silhueta). */
async function carregarFotos(fotos: Record<string, string>): Promise<FotosDosJogadores> {
  const carregadas = await Promise.all(Object.entries(fotos).map(async ([id, foto]) => [id, await carregarImagem(foto, true)] as const))
  return new Map(carregadas.flatMap(([id, imagem]) => (imagem ? [[id, { imagem, semFundo: fotoSemFundo(fotos[id]) }] as const] : [])))
}

/** Imagem da seleção da pelada (1080×1920, 9:16): a seleção no campo e, embaixo, chuteira e luva de ouro. */
export async function imagemDoResumo(estado: Estado, fotos: Record<string, string> = {}): Promise<Blob> {
  const { c, tela, r } = await prepararTela(ALTURA)
  const fotosDosJogadores = await carregarFotos(fotos)
  cabecalho(c, r, 'SELEÇÃO DA PELADA')
  const faixa = ALTURA - 98 - 430 // embaixo do campo: chuteira e luva de ouro
  selecaoNoCampo(c, selecaoDoDia(estado), 220, faixa, false, fotosDosJogadores)
  trofeusNaFaixa(c, premiosDoDia(estado), r, faixa, 430)
  rodape(c, ALTURA - 98, 98, numerosDoDia(estado))
  return paraPng(tela)
}

/**
 * Time do ano da turma (1080×1920): quem mais veio às peladas (no empate, mais gols) no campo ("11/11"),
 * o goleiro do ano no gol e, embaixo, o artilheiro e o goleiro do ano.
 */
export async function imagemDoTimeDoAno(r: RelatorioDoAno, turma: string, fotos: Record<string, string> = {}): Promise<Blob> {
  const { c, tela, r: recursos } = await prepararTela(ALTURA)
  const fotosDosJogadores = await carregarFotos(fotos)
  cabecalho(c, recursos, 'TIME DO ANO', `TEMPORADA ${r.ano} · ${turma.toUpperCase()}`)
  const faixa = ALTURA - 98 - 430
  selecaoNoCampo(c, {
    jogadores: r.timeDoAno.map((j) => ({ id: j.id, nome: `${j.nome} · ${j.peladas}/${r.peladas}`, gols: j.gols })),
    goleiro: r.goleiroDoAno?.nome ?? null,
    vazio: 'O Time do ano aparece com as peladas encerradas',
  }, 220, faixa, false, fotosDosJogadores)
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

/**
 * Tabela da pelada para o grupo (1080 de largura; a altura cresce com a lista): cada jogador com jogos, vitórias,
 * empates, derrotas, gols e assistências. `dia`: a data da pelada ("SÁB, 07 DE NOV").
 */
export async function imagemDaTabela(estado: Estado, dia: string): Promise<Blob> {
  const linhas = tabelaDaPelada(estado)
  const alturaDaLinha = 66
  const topoDaTabela = 260
  const altura = Math.max(1350, topoDaTabela + 76 + linhas.length * alturaDaLinha + 60 + 98)
  const { c, tela, r } = await prepararTela(altura)
  // fundo de gramado listrado, como no app
  for (let y = 220; y < altura; y += 120) { c.fillStyle = Math.floor(y / 120) % 2 ? VERDE : VERDE_CLARO; c.fillRect(0, y, L, 120) }
  cabecalho(c, r, 'TABELA DA PELADA', dia.toUpperCase())
  const esquerda = 36
  const largura = L - esquerda * 2
  // colunas: posição, nome e os números (da direita para a esquerda)
  const colunas = ['J', 'V', 'E', 'D', 'G', 'A'] as const
  const larguraDoNumero = 92
  const xDoNumero = (indice: number) => esquerda + largura - (colunas.length - indice) * larguraDoNumero + larguraDoNumero / 2
  c.save()
  c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 20; c.shadowOffsetY = 8
  retangulo(c, esquerda, topoDaTabela, largura, 76 + linhas.length * alturaDaLinha, 18); c.fillStyle = '#fff'; c.fill()
  c.restore()
  // cabeçalho da tabela
  c.save(); retangulo(c, esquerda, topoDaTabela, largura, 76, 18); c.clip(); c.fillStyle = NAVY; c.fillRect(esquerda, topoDaTabela, largura, 76); c.restore()
  texto(c, 'JOGADOR', esquerda + 96, topoDaTabela + 52, { tam: 38, cor: AMARELO })
  colunas.forEach((coluna, indice) => texto(c, coluna, xDoNumero(indice), topoDaTabela + 52, { tam: 38, cor: AMARELO, alinha: 'center' }))
  linhas.forEach((linha, indice) => {
    const y = topoDaTabela + 76 + indice * alturaDaLinha
    if (indice % 2) { c.fillStyle = '#eef2e4'; c.fillRect(esquerda, y, largura, alturaDaLinha) }
    const base = y + alturaDaLinha / 2 + 13
    texto(c, `${indice + 1}`, esquerda + 48, base, { tam: 36, cor: '#6b7a8c', alinha: 'center' })
    texto(c, `${linha.goleiro ? '🧤 ' : ''}${linha.nome}`, esquerda + 96, base, { tam: 38, cor: NAVY, max: xDoNumero(0) - larguraDoNumero / 2 - esquerda - 110 })
    const valores = [linha.jogos, linha.vitorias, linha.empates, linha.derrotas, linha.gols, linha.assistencias]
    valores.forEach((valor, coluna) => texto(c, `${valor}`, xDoNumero(coluna), base, {
      tam: 38, alinha: 'center', cor: coluna === 1 && valor > 0 ? '#1F6B33' : coluna === 3 && valor > 0 ? '#c8352b' : valor > 0 ? NAVY : '#a9b4c2',
    }))
  })
  texto(c, 'J jogos · V vitórias · E empates · D derrotas · G gols · A assistências', L / 2, topoDaTabela + 76 + linhas.length * alturaDaLinha + 44,
    { tam: 26, peso: 600, fonte: NORMAL, alinha: 'center', max: L - 60 })
  rodape(c, altura - 98, 98, numerosDoDia(estado))
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

/** Uma insígnia para a imagem da carta: o desenho (SVG em data URL), o nome e o nível. */
export type InsigniaNaImagem = { imagem: string; nome: string; nivel: string; destaque?: boolean } // destaque: a Lenda

/**
 * A carta do perfil como imagem: no topo, a turma da carta; a carta (cor do nível, foto, números da temporada e
 * logo) e, embaixo, as melhores conquistas dela.
 */
export async function imagemDaCarta(carta: {
  nome: string; foto: string | null; numeros: NumerosDaCarta; rotulo: string; nivel: NivelDaCarta
  titulo?: string; subtitulo?: string; insignias?: InsigniaNaImagem[]
}): Promise<Blob> {
  const { nome, foto, numeros, rotulo, nivel, titulo = 'MINHA CARTA', subtitulo = rotulo, insignias = [] } = carta
  const A = ALTURA
  const { c, tela, r } = await prepararTela(A)
  estadio(c, 0, A)
  const { metal: [claro, meio, brilho], borda: [bordaClara, bordaEscura], tinta } = METAIS_DA_CARTA[nivel]

  if (r.logo) c.drawImage(r.logo, 40, 150, 130, 130)
  texto(c, titulo.toUpperCase(), 190, 230, { tam: 76, cor: AMARELO, max: 850 })
  texto(c, subtitulo.toUpperCase(), 192, 272, { tam: 32, cor: CINZA, peso: 600, fonte: NORMAL, max: 840 })

  // a carta, na mesma tela de 740 x 1060 do app (sobe um pouco quando tem conquistas embaixo)
  const [x, y] = [170, insignias.length ? 330 : 400]
  c.save()
  c.translate(x, y)
  const forma = new Path2D(FORMA_DA_CARTA)
  c.save()
  c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 40; c.shadowOffsetY = 16
  const fundo = c.createLinearGradient(0, 0, 740, 1060)
  fundo.addColorStop(0, claro); fundo.addColorStop(0.5, meio); fundo.addColorStop(1, brilho)
  c.fillStyle = fundo; c.fill(forma)
  c.restore()

  c.save()
  c.clip(forma)
  if (nivel === 'diamante') {
    // holográfico e facetas
    const arco = c.createLinearGradient(0, 0, 740, 520)
    ;['#ff4fa3', '#ffe24a', '#4dff9a', '#4ad2ff', '#9a5cff', '#ff4fa3', '#ffe24a'].forEach((cor, indice) => arco.addColorStop(indice / 6, cor))
    c.globalAlpha = 0.34; c.fillStyle = arco; c.fillRect(0, 0, 740, 1060)
    c.globalAlpha = 0.36; c.fillStyle = '#fff'
    for (const faceta of ['M0 64L180 0 120 240Z', 'M740 64L560 0 620 240Z', 'M0 620L150 760 0 860Z', 'M740 620L590 760 740 860Z', 'M370 1060L230 900H510Z']) c.fill(new Path2D(faceta))
  } else if (nivel !== 'lendaria') {
    // metal escovado: riscos finos na horizontal, sempre iguais para a mesma carta
    c.lineWidth = 1
    for (let linha = 0; linha < 1060; linha += 2) {
      const sorteio = Math.abs(Math.sin(linha * 12.9898) * 43758.5453) % 1
      c.globalAlpha = (0.04 + sorteio * 0.16) * (nivel === 'bronze' ? 0.5 : 1)
      c.strokeStyle = sorteio > 0.5 ? '#fff' : tinta
      c.beginPath(); c.moveTo(0, linha); c.lineTo(740, linha); c.stroke()
    }
  }
  c.restore()

  // marcações do campo
  c.save()
  c.clip(forma)
  c.globalAlpha = 0.16; c.strokeStyle = tinta; c.lineWidth = 3
  c.beginPath(); c.arc(370, 300, 170, 0, Math.PI * 2); c.moveTo(0, 300); c.lineTo(740, 300); c.moveTo(180, 0); c.lineTo(180, 110); c.lineTo(560, 110); c.lineTo(560, 0); c.stroke()
  c.restore()

  const borda = c.createLinearGradient(0, 0, 740, 1060)
  borda.addColorStop(0, bordaClara); borda.addColorStop(0.5, bordaEscura); borda.addColorStop(1, bordaClara)
  c.lineWidth = 14; c.strokeStyle = borda; c.stroke(forma)
  c.save()
  c.globalAlpha = 0.4; c.lineWidth = 2; c.strokeStyle = tinta; c.stroke(new Path2D(FORMA_DE_DENTRO_DA_CARTA))
  c.restore()

  // aproveitamento e logo
  texto(c, String(numeros.aproveitamento), 170, 245, { tam: 150, cor: tinta, alinha: 'center' })
  texto(c, '% APROV.', 170, 285, { tam: 24, cor: tinta, peso: 700, fonte: NORMAL, alinha: 'center' })
  if (r.logo) c.drawImage(r.logo, 118, 305, 104, 104)

  // foto (a da conta do Google pode não deixar desenhar: aí vai a inicial)
  const [fotoX, fotoY, lado] = [288, 100, 378]
  const semFundo = fotoSemFundo(foto) ? await carregarImagem(foto!, true) : null
  if (semFundo) {
    // sem fundo: sem moldura, maior, e some aos poucos embaixo (igual à carta na tela)
    const [x, y, tamanho] = [244, 53, 459]
    const pessoa = document.createElement('canvas')
    pessoa.width = tamanho
    pessoa.height = tamanho
    const desenho = pessoa.getContext('2d')!
    desenho.drawImage(semFundo, 0, 0, tamanho, tamanho)
    const sumir = desenho.createLinearGradient(0, tamanho * 0.78, 0, tamanho)
    sumir.addColorStop(0, '#000'); sumir.addColorStop(1, 'rgba(0,0,0,0)')
    desenho.globalCompositeOperation = 'destination-in'
    desenho.fillStyle = sumir; desenho.fillRect(0, 0, tamanho, tamanho) // acima de 78% o degradê é opaco: a pessoa fica inteira
    c.drawImage(pessoa, x, y)
  } else {
    c.save()
    retangulo(c, fotoX, fotoY, lado, lado, 26); c.fillStyle = NAVY; c.fill(); c.clip()
    const imagem = foto ? await carregarImagem(foto, true) : null
    if (imagem) c.drawImage(imagem, fotoX, fotoY, lado, lado)
    else texto(c, nome.charAt(0).toUpperCase(), fotoX + lado / 2, fotoY + 250, { tam: 200, cor: AMARELO, alinha: 'center' })
    c.restore()
    retangulo(c, fotoX, fotoY, lado, lado, 26); c.lineWidth = 4; c.strokeStyle = tinta; c.stroke()
  }

  // nome entre filetes
  c.fillStyle = tinta
  c.fillRect(70, 530, 600, 4)
  texto(c, nome.toUpperCase(), 370, 620, { tam: 88, max: 590, cor: tinta, alinha: 'center' })
  c.fillStyle = tinta
  c.fillRect(70, 652, 600, 4)

  // números em duas colunas
  const colunas: [string, number][][] = [
    [['JOG', numeros.jogos], ['VIT', numeros.vitorias], ['GOL', numeros.gols]],
    [['ASS', numeros.assistencias], ['EMP', numeros.empates], ['PEL', numeros.peladas]],
  ]
  colunas.forEach((coluna, indice) => {
    coluna.forEach(([sigla, valor], linha) => {
      const centro = indice === 0 ? 215 : 525
      const base = 750 + linha * 74
      texto(c, String(valor), centro + 10, base, { tam: 66, cor: tinta, alinha: 'right' })
      texto(c, sigla, centro + 24, base, { tam: 50, cor: tinta })
    })
  })
  c.fillStyle = tinta
  c.fillRect(368, 684, 4, 214)
  c.restore()

  // as melhores conquistas, lado a lado embaixo da carta; a Lenda vai no meio, maior e brilhando
  const lenda = insignias.find((insignia) => insignia.destaque)
  const outras = insignias.filter((insignia) => insignia !== lenda)
  const emOrdem = lenda ? [...outras.slice(0, Math.floor(outras.length / 2)), lenda, ...outras.slice(Math.floor(outras.length / 2))] : outras
  const desenhos = await Promise.all(emOrdem.map((insignia) => carregarImagem(insignia.imagem)))
  if (emOrdem.length) {
    texto(c, 'MELHORES CONQUISTAS', L / 2, 1440, { tam: 34, cor: AMARELO, alinha: 'center' })
    const largura = 180
    const inicio = L / 2 - (emOrdem.length * largura) / 2
    emOrdem.forEach((insignia, indice) => {
      const centro = inicio + largura * indice + largura / 2
      const desenho = desenhos[indice]
      if (insignia.destaque) {
        // raios dourados atrás, como no perfil
        c.save()
        const brilho = c.createRadialGradient(centro, 1572, 10, centro, 1572, 100)
        brilho.addColorStop(0, 'rgba(255,214,90,.55)'); brilho.addColorStop(1, 'rgba(255,214,90,0)')
        c.fillStyle = brilho
        c.beginPath(); c.arc(centro, 1572, 100, 0, Math.PI * 2); c.fill()
        c.strokeStyle = 'rgba(245,200,70,.5)'; c.lineWidth = 4
        for (let raio = 0; raio < 12; raio++) {
          const angulo = (raio / 12) * Math.PI * 2
          c.beginPath(); c.moveTo(centro + Math.cos(angulo) * 66, 1572 + Math.sin(angulo) * 66); c.lineTo(centro + Math.cos(angulo) * 98, 1572 + Math.sin(angulo) * 98); c.stroke()
        }
        c.restore()
        if (desenho) { c.save(); c.shadowColor = 'rgba(245,190,40,.95)'; c.shadowBlur = 30; c.drawImage(desenho, centro - 80, 1490, 160, 165); c.restore() }
      } else if (desenho) c.drawImage(desenho, centro - 66, 1500, 132, 136)
      texto(c, insignia.nome, centro, 1680, { tam: insignia.destaque ? 30 : 26, cor: insignia.destaque ? AMARELO : undefined, alinha: 'center', max: largura - 12 })
      texto(c, insignia.nivel, centro, 1714, { tam: 22, cor: CINZA, peso: 600, fonte: NORMAL, alinha: 'center' })
    })
  }

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
