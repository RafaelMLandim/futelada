// Sorteio: embaralha uma lista (Fisher–Yates). `aleatorio` é trocável nos testes.

export type Aleatorio = () => number

export function embaralhar<T>(lista: readonly T[], aleatorio: Aleatorio = Math.random): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}
