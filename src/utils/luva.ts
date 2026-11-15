// Desenho da luva de goleiro padrão do app (inclinada, "voando no ângulo"), pintada com as cores do time: o corpo na
// cor principal, o velcro do punho na segunda cor e a palma clara. Contorno navy e sombra dura, como os botões.
// Um desenho só (texto SVG): a tela usa no componente LuvaDoGoleiro e as imagens (canvas) desenham a partir dele.

import { luminancia } from './cores'

const NAVY = '#10223a'
const BORDA = '#0b1a2c'

// dedos: x, y, largura, altura, rotação e o centro da rotação (o desenho é feito em 64 × 64)
const DEDOS = [
  [16.5, 13, 8.4, 25, -14.4, 20.7, 38],
  [25, 7.5, 8.8, 29, -3.2, 29.4, 36.5],
  [33.8, 9.5, 8.6, 27, 6.4, 38.1, 36.5],
  [42, 16, 7.6, 21.5, 17.6, 45.8, 37.5],
] as const
const PALMA = 'M16 30C16 27 18 26 21 26H45C48 26 50 28 50 31V40C50 47 45 51 38 51H27C20 51 16 47 16 40Z'
const DENTRO_DA_PALMA = 'M20 31C20 29.5 21 29 22.5 29H43.5C45 29 46 30 46 31.5V39.5C46 44.5 42.5 47.5 37.5 47.5H28C23.5 47.5 20 44.5 20 40Z'
const FORMAS = DEDOS.map(([x, y, largura, altura, rotacao, cx, cy]) =>
  `<rect x="${x}" y="${y}" width="${largura}" height="${altura}" rx="${largura / 2}" transform="rotate(${rotacao} ${cx} ${cy})"/>`).join('')
  + `<path d="${PALMA}"/><rect x="7" y="27" width="9.4" height="22" rx="4.7" transform="rotate(-38 15 45)"/>`
const PUNHO = '<rect x="18.5" y="47" width="27" height="13" rx="3"/>'

/** Cor do velcro quando o time não tem segunda cor: amarelo, ou branco se o time já é amarelado. */
function corDoVelcro(cor: string, segunda?: string) {
  if (segunda && segunda.toLowerCase() !== cor.toLowerCase()) return segunda
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16))
  return r > 180 && g > 150 && b < 120 ? '#f4f4f4' : '#ffd23f'
}

/** O que vai dentro do `<svg viewBox="0 0 64 64">` da luva. */
export function desenhoDaLuva({ cor = '#ffd23f', segunda }: { cor?: string; segunda?: string } = {}): string {
  const velcro = corDoVelcro(cor, segunda)
  // em luva clara a palma fica cinza (senão some)
  const palma = luminancia(cor) > 0.7 ? '#d9dfd3' : '#f7f7f2'
  return `<g transform="translate(1 3) rotate(32 32 36) scale(.86)">`
    + `<g transform="translate(2.2 2.2)" fill="${BORDA}" stroke="${BORDA}" stroke-width="5">${FORMAS}${PUNHO}</g>`
    + `<g fill="${NAVY}" stroke="${NAVY}" stroke-width="5">${FORMAS}${PUNHO}</g>`
    + `<g fill="${cor}">${FORMAS}</g>`
    + `<path d="${DENTRO_DA_PALMA}" fill="${palma}"/>`
    + `<g stroke="${NAVY}" stroke-width="1.6" opacity=".55"><path d="M25 20L25.8 28"/><path d="M33.8 16V27.5"/><path d="M42.3 19L41.5 28"/></g>`
    + `<rect x="18.5" y="47" width="27" height="13" rx="3" fill="${NAVY}"/>`
    + `<rect x="16.5" y="49.5" width="31" height="7.5" rx="2" fill="${velcro}" stroke="${NAVY}" stroke-width="2.4"/>`
    + `<path d="M22 53.2H42" stroke="${NAVY}" stroke-width="1.4" stroke-dasharray="1.2 2" opacity=".6"/>`
    + `</g>`
    + `<g stroke="${NAVY}" stroke-width="2.6" opacity=".7"><path d="M4 26L11 23"/><path d="M2 35L10 33"/><path d="M5 44L11 41"/></g>`
}

/** A luva como imagem (para desenhar no canvas). */
export function imagemDaLuva(opcoes: Parameters<typeof desenhoDaLuva>[0] = {}): Promise<HTMLImageElement> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" stroke-linecap="round" stroke-linejoin="round">${desenhoDaLuva(opcoes)}</svg>`
  return new Promise((resolver, falhar) => {
    const imagem = new Image()
    imagem.onload = () => resolver(imagem)
    imagem.onerror = falhar
    imagem.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
