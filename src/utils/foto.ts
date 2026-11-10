// Foto do jogador: quadrada e pequena, para caber no perfil sem precisar de um serviço de arquivos.
// Na carta, a pessoa aparece sem fundo: uma foto que já vem sem fundo (PNG ou WebP transparente) entra como está;
// as outras passam pelo recorte. Sem recorte (sem internet, ou não achou a pessoa), fica a foto com fundo, na moldura.

const LADO = 512
const LADO_COM_FUNDO = 256
const MAXIMO = 95_000 // o perfil aceita até 100 mil caracteres na foto

/** Foto com o fundo transparente (a carta mostra sem a moldura). As fotos com fundo são JPEG. */
export const fotoSemFundo = (foto: string | null | undefined) => !!foto && /^data:image\/(png|webp)/.test(foto)

/** Em foto em pé, o quadrado sai mais do alto (a cabeça fica em cima): 10% da sobra acima, 90% abaixo. */
export const SOBRA_ACIMA_EM_PE = 0.1

/** Corta a imagem num quadrado de `lado`: no meio da largura; na altura, mais para cima (não corta a cabeça). */
function quadrado(imagem: ImageBitmap, lado: number): HTMLCanvasElement {
  const menor = Math.min(imagem.width, imagem.height)
  const tela = document.createElement('canvas')
  tela.width = lado
  tela.height = lado
  tela.getContext('2d')!.drawImage(imagem, (imagem.width - menor) / 2, (imagem.height - menor) * SOBRA_ACIMA_EM_PE, menor, menor, 0, 0, lado, lado)
  return tela
}

/** Já veio sem fundo: tem pontos transparentes na borda. */
function temFundoTransparente(tela: HTMLCanvasElement): boolean {
  const { data: pontos } = tela.getContext('2d')!.getImageData(0, 0, tela.width, tela.height)
  let transparentes = 0
  for (let indice = 3; indice < pontos.length; indice += 4) if (pontos[indice] < 200) transparentes++
  return transparentes / (pontos.length / 4) > 0.05
}

/**
 * Enquadra a pessoa sem fundo do mesmo jeito em toda carta: um respiro acima da cabeça, centralizada pela cabeça
 * e os ombros encostados embaixo. Assim a cabeça não fica cortada em cima, mesmo que a foto tenha sido tirada colada.
 */
function enquadrar(tela: HTMLCanvasElement): HTMLCanvasElement {
  const lado = tela.width
  const { data: pontos } = tela.getContext('2d')!.getImageData(0, 0, lado, lado)
  const visivel = (linha: number, coluna: number) => pontos[(linha * lado + coluna) * 4 + 3] >= 128
  let topo = lado
  for (let linha = 0; linha < lado && topo === lado; linha++) for (let coluna = 0; coluna < lado; coluna++) if (visivel(linha, coluna)) { topo = linha; break }
  if (topo >= lado) return tela
  // centraliza pela cabeça (o quarto de cima da pessoa): ombro cortado ou braço aberto não puxam a foto para o lado
  const fimDaCabeca = Math.min(lado, topo + Math.round((lado - topo) * 0.25))
  let soma = 0
  let quantos = 0
  for (let linha = topo; linha < fimDaCabeca; linha++) for (let coluna = 0; coluna < lado; coluna++) if (visivel(linha, coluna)) { soma += coluna; quantos++ }
  const centro = quantos ? soma / quantos : lado / 2
  const RESPIRO = 0.08 // acima da cabeça
  // do alto da cabeça até embaixo passa a ocupar 92% da altura; aumentar demais deixa a foto borrada
  const escala = Math.min(1.25, (lado * (1 - RESPIRO)) / (lado - topo))
  const saida = document.createElement('canvas')
  saida.width = lado
  saida.height = lado
  const desenho = saida.getContext('2d')!
  desenho.imageSmoothingQuality = 'high'
  desenho.drawImage(tela, lado / 2 - centro * escala, lado - lado * escala, lado * escala, lado * escala)
  return saida
}

/** Sem fundo em WebP (pequeno); onde o WebP não existe, PNG, diminuindo até caber. */
function comTransparencia(tela: HTMLCanvasElement): string | null {
  for (let lado = tela.width; lado >= 192; lado = Math.round(lado * 0.75)) {
    const menor = document.createElement('canvas')
    menor.width = lado
    menor.height = lado
    menor.getContext('2d')!.drawImage(tela, 0, 0, lado, lado)
    const webp = menor.toDataURL('image/webp', 0.85)
    const foto = webp.startsWith('data:image/webp') ? webp : menor.toDataURL('image/png')
    if (foto.length < MAXIMO) return foto
  }
  return null
}

/** A foto para o perfil: sem fundo quando der; senão, JPEG com fundo (uns 20 KB). `semFundo` false: o recorte não deu certo. */
export async function fotoDoJogador(arquivo: Blob, aoRecortar?: () => void): Promise<{ foto: string; semFundo: boolean }> {
  const imagem = await createImageBitmap(arquivo)
  try {
    const tela = quadrado(imagem, LADO)
    if (temFundoTransparente(tela)) {
      const pronta = comTransparencia(enquadrar(tela))
      if (pronta) return { foto: pronta, semFundo: true }
    }
    aoRecortar?.()
    const { tirarFundo } = await import('./recorte')
    const recortada = await tirarFundo(tela).catch(() => null)
    const semFundo = recortada && comTransparencia(enquadrar(recortada))
    if (semFundo) return { foto: semFundo, semFundo: true }
    return { foto: quadrado(imagem, LADO_COM_FUNDO).toDataURL('image/jpeg', 0.8), semFundo: false }
  } finally {
    imagem.close()
  }
}
