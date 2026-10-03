// Goleiros fixos. Um goleiro em cada gol. Quando um time perde, o goleiro fica
// em campo e defende o time que entra. Com um só goleiro, ele fica com o time que continua.

import type { Estado, Lado } from '../types/pelada'
import { LADOS, outro } from './lado'

/** Com um único goleiro em campo, ele passa para o lado que continua jogando. */
export function goleiroUnicoVaiPara(estado: Estado, lado: Lado): Estado {
  const { A, B } = estado.goleiros
  if ((A === null) === (B === null)) return estado // nenhum ou um em cada gol
  return { ...estado, goleiros: { A: null, B: null, [lado]: A ?? B } }
}

/** Ajusta os gols à lista cadastrada: tira quem saiu da lista e preenche gol vazio. */
export function sincronizarGoleiros(estado: Estado): Estado {
  const lista = estado.config.goleiros.map((g) => g.trim()).filter(Boolean)
  const g = { ...estado.goleiros }
  for (const lado of LADOS) {
    if (g[lado] !== null && !lista.includes(g[lado]!)) g[lado] = null
  }
  for (const lado of LADOS) {
    if (g[lado] === null) g[lado] = lista.find((n) => n !== g.A && n !== g.B) ?? null
  }
  return { ...estado, goleiros: g }
}

export function definirGoleiros(estado: Estado, goleiros: string[]): Estado {
  return sincronizarGoleiros({ ...estado, config: { ...estado.config, goleiros } })
}

/** Escolhe o goleiro de um gol. Se ele estava no outro gol, os dois trocam. */
export function escolherGoleiro(estado: Estado, lado: Lado, nome: string | null): Estado {
  const g = { ...estado.goleiros }
  const outroLado = outro(lado)
  if (nome !== null && g[outroLado] === nome) g[outroLado] = g[lado]
  g[lado] = nome
  return { ...estado, goleiros: g }
}

export function trocarGoleiros(estado: Estado): Estado {
  return { ...estado, goleiros: { A: estado.goleiros.B, B: estado.goleiros.A } }
}
