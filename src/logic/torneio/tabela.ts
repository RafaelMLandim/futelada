// Tabela de jogos de pontos corridos: todos contra todos (método do círculo).

export type Par = [string, string]

/**
 * Rodadas de todos contra todos. Com número ímpar de times, cada rodada um time folga.
 * Com ida e volta, o returno repete as rodadas com mando invertido.
 */
export function todosContraTodos(times: readonly string[], idaEVolta = false): Par[][] {
  const lista: (string | null)[] = [...times]
  if (lista.length % 2 === 1) lista.push(null) // folga
  const n = lista.length
  const rodadas: Par[][] = []
  for (let r = 0; r < n - 1; r++) {
    const rodada: Par[] = []
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i]
      const b = lista[n - 1 - i]
      if (a && b) rodada.push(r % 2 === 0 ? [a, b] : [b, a])
    }
    rodadas.push(rodada)
    // gira todos menos o primeiro
    lista.splice(1, 0, lista.pop()!)
  }
  if (!idaEVolta) return rodadas
  return [...rodadas, ...rodadas.map((rodada) => rodada.map(([a, b]): Par => [b, a]))]
}

/**
 * Ordem para jogar num campo só: evita que um time jogue duas seguidas quando dá.
 * Vai pegando o primeiro jogo da lista cujos times não jogaram o jogo anterior.
 */
export function ordenarSemRepetir<T>(jogos: readonly T[], timesDe: (jogo: T) => string[]): T[] {
  const resto = [...jogos]
  const ordem: T[] = []
  let anterior: string[] = []
  while (resto.length) {
    let i = resto.findIndex((j) => !timesDe(j).some((t) => anterior.includes(t)))
    if (i === -1) i = 0
    const [jogo] = resto.splice(i, 1)
    ordem.push(jogo)
    anterior = timesDe(jogo)
  }
  return ordem
}
