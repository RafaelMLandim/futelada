// Música de fundo ("Jogo de Bola"): toca nos menus e na preparação da pelada ou do torneio, para quando o jogo
// começa (lá já tem apito e narração). Começa em volume médio, entra e sai devagar, e o botão no topo silencia
// (fica lembrado no celular). O celular só deixa tocar som depois do primeiro toque na tela.

import { useEffect, useSyncExternalStore } from 'react'

const ARQUIVO = `${import.meta.env.BASE_URL}sons/musica-de-fundo.mp3`
const VOLUME_MAXIMO = 0.18 // de ambiente: mesmo com o celular no volume máximo, fica baixinha (o arquivo já vem nivelado, sem picos)
const CHAVE_VOLUME = 'musica:volume'
const CHAVE_MUDO = 'musica:mudo'
const TRANSICAO = 800 // ms para entrar e sair

let audio: HTMLAudioElement | null = null
let pedidos = 0 // telas que querem a música agora
let liberado = false // já houve um toque na tela
let mudo = lerMudo()
let nivel = lerNivel() // 0 a 100, parte do volume máximo (começa no máximo)
let animacao = 0
const ouvintes = new Set<() => void>()

function lerMudo(): boolean {
  try {
    return localStorage.getItem(CHAVE_MUDO) === '1'
  } catch {
    return false
  }
}

function lerNivel(): number {
  try {
    const salvo = Number(localStorage.getItem(CHAVE_VOLUME) ?? '100')
    return Number.isFinite(salvo) ? Math.min(100, Math.max(0, salvo)) : 100
  } catch {
    return 100
  }
}

const volumeAgora = () => (VOLUME_MAXIMO * nivel) / 100

const avisar = () => ouvintes.forEach((ouvinte) => ouvinte())

/** Sobe ou desce o volume aos poucos; no fim de uma descida, pausa. */
function levarVolumeA(alvo: number) {
  if (!audio) return
  const elemento = audio
  const inicio = elemento.volume
  const comeco = Date.now()
  window.clearInterval(animacao)
  animacao = window.setInterval(() => {
    const parte = Math.min(1, (Date.now() - comeco) / TRANSICAO)
    elemento.volume = inicio + (alvo - inicio) * parte
    if (parte < 1) return
    window.clearInterval(animacao)
    if (alvo === 0) elemento.pause()
  }, 40)
}

/** Toca ou para conforme as telas abertas, o botão de silenciar e se o app está na frente. */
function atualizar() {
  const tocar = pedidos > 0 && !mudo && nivel > 0 && liberado && document.visibilityState === 'visible'
  if (tocar) {
    audio ??= Object.assign(new Audio(ARQUIVO), { loop: true, volume: 0, preload: 'auto' })
    if (audio.paused) void audio.play().catch(() => null)
    levarVolumeA(volumeAgora())
  } else if (audio && !audio.paused) {
    levarVolumeA(0)
  }
}

if (typeof window !== 'undefined') {
  const liberar = () => {
    liberado = true
    atualizar()
    window.removeEventListener('pointerdown', liberar)
    window.removeEventListener('keydown', liberar)
  }
  window.addEventListener('pointerdown', liberar)
  window.addEventListener('keydown', liberar)
  document.addEventListener('visibilitychange', atualizar) // app em segundo plano: para
}

/** A tela quer a música enquanto `ativa` (menus, preparação). */
export function useMusicaDeFundo(ativa: boolean) {
  useEffect(() => {
    if (!ativa) return
    pedidos++
    atualizar()
    avisar()
    return () => {
      pedidos--
      atualizar()
      avisar()
    }
  }, [ativa])
}

/** Para o botão do topo: se a música está nesta tela e se está silenciada. */
export function useBotaoDaMusica() {
  const estado = useSyncExternalStore(
    (ouvinte) => { ouvintes.add(ouvinte); return () => ouvintes.delete(ouvinte) },
    () => (pedidos > 0 ? (mudo || nivel === 0 ? 'mudo' : 'tocando') : 'fora'),
  )
  const volume = useSyncExternalStore((ouvinte) => { ouvintes.add(ouvinte); return () => ouvintes.delete(ouvinte) }, () => nivel)
  /** De 0 a 100 (100 = o volume de ambiente de sempre). Mexer no volume tira do mudo. */
  const mudarVolume = (novo: number) => {
    nivel = Math.min(100, Math.max(0, Math.round(novo)))
    mudo = false
    try {
      localStorage.setItem(CHAVE_VOLUME, String(nivel))
      localStorage.setItem(CHAVE_MUDO, '0')
    } catch {
      // sem armazenamento: vale até fechar o app
    }
    liberado = true
    if (audio && !audio.paused) { window.clearInterval(animacao); audio.volume = volumeAgora() }
    atualizar()
    avisar()
  }
  const alternar = () => {
    mudo = !(mudo || nivel === 0)
    if (!mudo && nivel === 0) nivel = 100 // ligar com o volume zerado: volta para o de sempre
    try {
      localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0')
      localStorage.setItem(CHAVE_VOLUME, String(nivel))
    } catch {
      // sem armazenamento: vale até fechar o app
    }
    liberado = true // o próprio toque no botão libera o som
    atualizar()
    avisar()
  }
  return { visivel: estado !== 'fora', mudo: estado === 'mudo', volume, alternar, mudarVolume }
}
