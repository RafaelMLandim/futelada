export const formatarTempo = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const dataHoje = () =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '')

/** Compara nomes ignorando maiúsculas, acentos e espaços extras. */
export const normalizarNome = (nome: string) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

export const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Padrão dos nomes no cadastro (jogadores, goleiros e times): sempre em MAIÚSCULAS. */
export const maiusculas = (nome: string) => nome.toLocaleUpperCase('pt-BR')

/**
 * Minuto do gol como no futebol: 2min30s → 3'. Depois do tempo regulamentar
 * (ex.: 10 min) fica 10+1'. Sem tempo registrado, null.
 */
export function minutoDoGol(tempoMs: number | undefined, tempoMin: number): string | null {
  if (tempoMs === undefined) return null
  const minuto = Math.floor(tempoMs / 60_000) + 1
  return minuto > tempoMin ? `${tempoMin}+${minuto - tempoMin}'` : `${minuto}'`
}

/** R$ 10,00 */
export const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
