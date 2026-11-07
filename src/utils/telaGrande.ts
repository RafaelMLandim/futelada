// Tablet e computador: o app ocupa a tela toda e é desenhado para celular (uns 520 px de largura). Em telas
// maiores ele aumenta (zoom), para letras e botões não ficarem miúdos. No celular não muda nada.

const LARGURA_DO_APP = 540 // largura de celular grande (a medida do desenho)
const ALTURA_CONFORTAVEL = 640 // em pé: abaixo disso, aumentar faria a tela rolar demais
const ALTURA_DEITADA = 720 // deitada, a altura é o que falta: aumenta menos
const ZOOM_MAXIMO = 1.6

/** Tela deitada e larga (tablet deitado, computador). */
const deitada = (largura: number, altura: number) => largura >= 900 && largura * 4 >= altura * 5

/** Quanto aumentar o app nesta tela (1 = tamanho de celular). */
export function zoomDaTela(largura: number, altura: number): number {
  const zoom = deitada(largura, altura)
    ? Math.min(altura / ALTURA_DEITADA, ZOOM_MAXIMO)
    : Math.min(largura / LARGURA_DO_APP, altura / ALTURA_CONFORTAVEL, ZOOM_MAXIMO)
  // aumentos pequenos não valem a pena (o texto fica borrado em alguns tamanhos): só a partir de 10%
  return zoom < 1.1 ? 1 : Math.round(zoom * 20) / 20
}

/** Aplica o zoom agora e sempre que a tela mudar de tamanho (girar o tablet, redimensionar a janela). */
export function ajustarAoTamanhoDaTela(): void {
  const aplicar = () => {
    const zoom = zoomDaTela(window.innerWidth, window.innerHeight)
    document.documentElement.style.setProperty('--zoom', String(zoom))
    document.documentElement.style.zoom = zoom === 1 ? '' : String(zoom)
  }
  aplicar()
  window.addEventListener('resize', aplicar)
}
