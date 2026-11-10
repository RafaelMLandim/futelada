// Tira o fundo da foto do jogador, no próprio celular (MediaPipe, licença Apache 2.0). A carta mostra a pessoa
// sem fundo, como nas cartas de futebol. Os arquivos do recorte só baixam quando alguém escolhe uma foto
// (salvar a foto já precisa de internet), então o app não fica maior.

import type { ImageSegmenter } from '@mediapipe/tasks-vision'

const VERSAO = '1.1.1' // a mesma do package.json
const ARQUIVOS = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSAO}/wasm`
export const MODELOS = {
  /** Separa cabelo, rosto, corpo e roupa do fundo: contorno melhor (16 MB, baixa uma vez). */
  detalhado: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
  /** Só pessoa ou fundo: leve (250 KB), contorno mais grosseiro. */
  leve: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
}
type Modelo = keyof typeof MODELOS

const segmentadores = new Map<Modelo, Promise<ImageSegmenter>>()

function segmentador(modelo: Modelo): Promise<ImageSegmenter> {
  const pronto = segmentadores.get(modelo) ?? (async () => {
    const visao = await import('@mediapipe/tasks-vision')
    const arquivos = await visao.FilesetResolver.forVisionTasks(ARQUIVOS)
    return visao.ImageSegmenter.createFromOptions(arquivos, {
      baseOptions: { modelAssetPath: MODELOS[modelo] },
      runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false,
    })
  })()
  segmentadores.set(modelo, pronto)
  pronto.catch(() => segmentadores.delete(modelo)) // sem internet: tenta de novo na próxima foto
  return pronto
}

/**
 * Devolve a foto só com a pessoa (o fundo transparente), do mesmo tamanho. null quando não achou uma pessoa
 * (o recorte ficaria ruim): aí a carta usa a foto com fundo, na moldura.
 */
export async function tirarFundo(foto: HTMLCanvasElement, modelo: Modelo = 'leve'): Promise<HTMLCanvasElement | null> {
  const resultado = (await segmentador(modelo)).segment(foto)
  const mascaras = resultado.confidenceMasks ?? []
  try {
    const mascara = mascaras[0]
    if (!mascara) return null
    // no modelo detalhado a primeira máscara é o fundo; no leve, é a pessoa
    const valores = mascara.getAsFloat32Array()
    const pessoa = modelo === 'detalhado' ? (indice: number) => 1 - valores[indice] : (indice: number) => valores[indice]
    const tela = document.createElement('canvas')
    tela.width = mascara.width
    tela.height = mascara.height
    const contexto = tela.getContext('2d')!
    const pontos = contexto.createImageData(mascara.width, mascara.height)
    let daPessoa = 0
    let duvidosos = 0 // pontos em que o modelo não tem certeza se é pessoa ou fundo
    for (let indice = 0; indice < valores.length; indice++) {
      const certeza = pessoa(indice)
      if (certeza > 0.5) daPessoa++
      if (certeza > 0.25 && certeza < 0.75) duvidosos++
      pontos.data[indice * 4 + 3] = Math.round(Math.min(1, Math.max(0, (certeza - 0.15) / 0.7)) * 255)
    }
    // recorte ruim volta para a foto com fundo: pessoa pequena demais (longe) ou contorno incerto (foto antiga, quadro)
    const parte = daPessoa / valores.length
    if (parte < 0.15 || parte > 0.97 || duvidosos / daPessoa > 0.15) return null
    contexto.putImageData(pontos, 0, 0)
    const saida = document.createElement('canvas')
    saida.width = foto.width
    saida.height = foto.height
    const desenho = saida.getContext('2d')!
    desenho.drawImage(foto, 0, 0)
    desenho.globalCompositeOperation = 'destination-in'
    desenho.imageSmoothingQuality = 'high'
    desenho.drawImage(tela, 0, 0, foto.width, foto.height) // a máscara é menor: esticada, fica com a borda suave
    return saida
  } finally {
    mascaras.forEach((mascara) => mascara.close())
  }
}
