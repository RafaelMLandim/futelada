// Formato do torneio na nuvem: o Firestore não aceita lista dentro de lista, então os grupos
// (`string[][]`) vão como `[{ times: [...] }]` e voltam ao formato do app na leitura.

import type { BaseTorneio } from '../logic/torneio'

export const baseParaNuvem = (base: BaseTorneio) => ({ ...base, grupos: base.grupos.map((times) => ({ times })) })

export function baseDaNuvem(dados: Record<string, unknown>): BaseTorneio {
  const grupos = (dados.grupos ?? []) as ({ times: string[] } | string[])[]
  return { ...(dados as BaseTorneio), grupos: grupos.map((g) => (Array.isArray(g) ? g : g.times)) }
}

/** Tem lista dentro de lista em algum lugar? (o Firestore recusa o documento inteiro) */
export function temListaDentroDeLista(valor: unknown): boolean {
  if (Array.isArray(valor)) return valor.some((v) => Array.isArray(v) || temListaDentroDeLista(v))
  if (valor && typeof valor === 'object') return Object.values(valor).some(temListaDentroDeLista)
  return false
}
