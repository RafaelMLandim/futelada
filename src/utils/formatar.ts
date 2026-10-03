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
