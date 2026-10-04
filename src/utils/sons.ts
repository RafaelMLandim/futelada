// Sons do jogo (apitos e som de gol) gerados pelo navegador (Web Audio),
// sem arquivo de áudio: funciona offline. O celular só libera o som depois de um toque na tela,
// por isso o contexto é criado no primeiro apito (o do play).

let contexto: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    contexto ??= new AudioContext()
    if (contexto.state === 'suspended') void contexto.resume()
    return contexto
  } catch {
    return null // navegador sem suporte a áudio
  }
}

/** Um silvo de apito: tom agudo com o "trinado" da bolinha dentro do apito. */
function silvo(ctx: AudioContext, inicio: number, duracao: number) {
  const tom = ctx.createOscillator()
  tom.type = 'sine'
  tom.frequency.value = 2900

  // Trinado: a frequência oscila rápido
  const trinado = ctx.createOscillator()
  trinado.frequency.value = 38
  const profundidade = ctx.createGain()
  profundidade.gain.value = 220
  trinado.connect(profundidade).connect(tom.frequency)

  // Volume: sobe rápido, mantém e cai no fim
  const volume = ctx.createGain()
  volume.gain.setValueAtTime(0, inicio)
  volume.gain.linearRampToValueAtTime(0.3, inicio + 0.02)
  volume.gain.setValueAtTime(0.3, inicio + duracao - 0.06)
  volume.gain.linearRampToValueAtTime(0, inicio + duracao)

  // Sopro: um pouco de ruído filtrado junto do tom
  const ruido = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duracao), ctx.sampleRate)
  const dados = buffer.getChannelData(0)
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1
  ruido.buffer = buffer
  const filtro = ctx.createBiquadFilter()
  filtro.type = 'bandpass'
  filtro.frequency.value = 2900
  filtro.Q.value = 3
  const volumeRuido = ctx.createGain()
  volumeRuido.gain.value = 0.25

  tom.connect(volume)
  ruido.connect(filtro).connect(volumeRuido).connect(volume)
  volume.connect(ctx.destination)

  for (const fonte of [tom, trinado, ruido]) {
    fonte.start(inicio)
    fonte.stop(inicio + duracao)
  }
}

/** Apito de início (ou recomeço) da partida: um silvo curto. */
export function apitoInicio() {
  const ctx = audio()
  if (ctx) silvo(ctx, ctx.currentTime + 0.01, 0.5)
}

/** Apito de fim de jogo: dois curtos e um longo. */
export function apitoFim() {
  const ctx = audio()
  if (!ctx) return
  const t = ctx.currentTime + 0.01
  silvo(ctx, t, 0.3)
  silvo(ctx, t + 0.45, 0.3)
  silvo(ctx, t + 0.9, 1.1)
}

/** Uma nota de videogame (onda quadrada, timbre 8 bits). */
function nota(ctx: AudioContext, freq: number, inicio: number, duracao: number, tipo: OscillatorType = 'square', vol = 0.12) {
  const osc = ctx.createOscillator()
  osc.type = tipo
  osc.frequency.value = freq
  const volume = ctx.createGain()
  volume.gain.setValueAtTime(vol, inicio)
  volume.gain.setValueAtTime(vol, inicio + duracao * 0.8)
  volume.gain.linearRampToValueAtTime(0, inicio + duracao)
  osc.connect(volume).connect(ctx.destination)
  osc.start(inicio)
  osc.stop(inicio + duracao)
}

// Notas (Hz)
const DO4 = 262, SOL4 = 392, DO5 = 523, MI5 = 659, SOL5 = 784, LA5 = 880, DO6 = 1047

/** Fanfarrinha de 8 bits (melodia original), usada se o áudio de gol não tocar. Dura ~1 s. */
function fanfarra(): number {
  const ctx = audio()
  if (!ctx) return 0
  const t = ctx.currentTime + 0.01
  const r = 0.075 // duração de uma nota rápida
  // Melodia: arpejo subindo e nota final segurada
  const melodia: [number, number][] = [[DO5, r], [MI5, r], [SOL5, r], [DO6, r], [SOL5, r], [LA5, r], [DO6, 0.4]]
  let tempo = t
  for (const [freq, dur] of melodia) {
    nota(ctx, freq, tempo, dur)
    tempo += dur
  }
  // Baixo acompanhando (onda triangular, mais grave)
  nota(ctx, DO4, t, r * 3, 'triangle', 0.2)
  nota(ctx, SOL4, t + r * 3, r * 3, 'triangle', 0.2)
  nota(ctx, DO5, t + r * 6, 0.4, 'triangle', 0.2)
  return tempo - t
}

// Áudio de gol (pasta public/sons).
const AUDIO_DE_GOL = `${import.meta.env.BASE_URL}sons/goal.mp3`
let tocando: HTMLAudioElement | null = null

/**
 * Som de gol: toca o áudio de gol.
 * `depois` é chamado quando o som termina (usado para o apito final).
 * Se o áudio não tocar, usa a fanfarrinha de 8 bits.
 */
export function somDeGol(depois?: () => void) {
  tocando?.pause()
  const audioGol = new Audio(AUDIO_DE_GOL)
  tocando = audioGol
  let terminou = false
  const fim = () => {
    if (terminou) return
    terminou = true
    depois?.()
  }
  audioGol.addEventListener('ended', fim, { once: true })
  audioGol.play().catch(() => {
    const duracao = fanfarra()
    window.setTimeout(fim, duracao * 1000 + 150)
  })
}

/** Um "tim" metálico: algumas frequências que não combinam entre si, caindo rápido. */
function tilintar(ctx: AudioContext, inicio: number, vol: number, base = 2400) {
  for (const [mult, peso] of [[1, 1], [1.48, 0.6], [2.13, 0.45], [2.97, 0.3]] as const) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = base * mult
    const volume = ctx.createGain()
    volume.gain.setValueAtTime(vol * peso, inicio)
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.35)
    osc.connect(volume).connect(ctx.destination)
    osc.start(inicio)
    osc.stop(inicio + 0.36)
  }
}

/**
 * Som da moeda: o peteleco, ela girando no ar e caindo (com uma quicada).
 * `duracao` é o tempo da animação até a moeda cair, em segundos.
 */
export function somDeMoeda(duracao = 1.4) {
  const ctx = audio()
  if (!ctx) return
  const t = ctx.currentTime + 0.01
  tilintar(ctx, t, 0.25, 2600) // peteleco
  // Girando no ar: tilintares rápidos e baixinhos
  for (let s = 0.12; s < duracao - 0.15; s += 0.09) tilintar(ctx, t + s, 0.035, 3000 + Math.random() * 400)
  // Caiu: batida forte e duas quicadas
  tilintar(ctx, t + duracao, 0.3, 2200)
  tilintar(ctx, t + duracao + 0.13, 0.15, 2300)
  tilintar(ctx, t + duracao + 0.22, 0.07, 2350)
}
