// Chave do mata-mata. Os times entram em ordem de "semente" (1 = melhor colocado ou
// primeiro do sorteio). Quando o número de times não é potência de 2, as melhores
// sementes passam direto para a 2ª rodada ("bye").

import type { JogoTorneio, Origem } from '../../types/torneio'

/** Posições das sementes numa chave de `tamanho` (potência de 2): 1 e 2 só se cruzam na final. */
export function ordemDasSementes(tamanho: number): number[] {
  let ordem = [1, 2]
  while (ordem.length < tamanho) {
    const n = ordem.length * 2 + 1
    ordem = ordem.flatMap((s) => [s, n - s])
  }
  return ordem
}

export function nomeDaRodada(timesNaRodada: number): string {
  if (timesNaRodada === 2) return 'Final'
  if (timesNaRodada === 4) return 'Semifinal'
  if (timesNaRodada === 8) return 'Quartas de final'
  if (timesNaRodada === 16) return 'Oitavas de final'
  return `${timesNaRodada / 2} avos de final` // 32 times = 16 jogos: 16 avos de final
}

/**
 * Monta todos os jogos do mata-mata. `sementes` são as origens em ordem de semente.
 * Jogos de rodadas seguintes apontam para "vencedor do jogo X".
 * Com `idaEVolta`, cada confronto vira dois jogos (como na Libertadores): a ida e a volta com o
 * mando invertido; quem avança sai do placar agregado, decidido no jogo de volta (que é o jogo
 * apontado por "vencedor"). Numa rodada, todas as idas vêm antes das voltas. A final pode ser
 * em jogo único; a disputa de 3º lugar é sempre jogo único.
 */
export function montarChave(
  sementes: Origem[], terceiroLugar: boolean, prefixo = 'm', ordemInicial = 0, idaEVolta: { finalUnica: boolean } | null = null,
  /** Posições já prontas da 1ª rodada (de cima para baixo; null = W.O.), como na chave da Copa. */
  posicoesProntas: (Origem | null)[] | null = null,
): JogoTorneio[] {
  const total = posicoesProntas ? posicoesProntas.filter(Boolean).length : sementes.length
  if (total < 2) return []
  let tamanho = posicoesProntas ? posicoesProntas.length : 2
  while (tamanho < total) tamanho *= 2

  const jogos: JogoTorneio[] = []
  let ordem = ordemInicial
  const novoJogo = (rodada: string, casa: Origem, fora: Origem, extra: Partial<JogoTorneio> = {}): JogoTorneio => {
    const jogo: JogoTorneio = { id: `${prefixo}${jogos.length + 1}`, fase: 'mata', grupo: null, rodada, ordem: ordem++, casa, fora, resultado: null, ...extra }
    jogos.push(jogo)
    return jogo
  }
  /** Uma rodada inteira de confrontos; devolve o id do jogo que decide cada um (a volta ou o jogo único). */
  const rodada = (nome: string, confrontos: [Origem, Origem][]): string[] => {
    const final = nome === 'Final'
    if (!idaEVolta || (final && idaEVolta.finalUnica)) return confrontos.map(([casa, fora]) => novoJogo(nome, casa, fora).id)
    const idas = confrontos.map(([casa, fora]) => novoJogo(nome, casa, fora, { perna: 'ida' }))
    return confrontos.map(([casa, fora], i) => {
      const volta = novoJogo(nome, fora, casa, { perna: 'volta', outraPerna: idas[i].id }) // mando invertido
      idas[i].outraPerna = volta.id
      return volta.id
    })
  }

  // 1ª rodada: pares de sementes; quem não tem adversário (bye) passa direto
  const posicoes = posicoesProntas ?? ordemDasSementes(tamanho).map((s) => (s <= total ? sementes[s - 1] : null))
  const pares: [Origem, Origem][] = []
  const lugar: (Origem | number)[] = [] // origem que passa direto ou índice do confronto
  for (let i = 0; i < tamanho; i += 2) {
    const a = posicoes[i]
    const b = posicoes[i + 1]
    if (a && b) lugar.push(pares.push([a, b]) - 1)
    else lugar.push((a ?? b)!)
  }
  let decisivos = rodada(nomeDaRodada(tamanho), pares)
  let rodadaAtual: Origem[] = lugar.map((x) => (typeof x === 'number' ? { tipo: 'vencedor', jogo: decisivos[x] } : x))
  let semifinais: string[] = tamanho === 4 ? decisivos : []

  // Rodadas seguintes, até a final (a disputa de 3º lugar vem antes da final)
  while (rodadaAtual.length > 1) {
    const nome = nomeDaRodada(rodadaAtual.length)
    if (rodadaAtual.length === 2 && terceiroLugar && semifinais.length === 2) {
      novoJogo('Disputa de 3º lugar', { tipo: 'perdedor', jogo: semifinais[0] }, { tipo: 'perdedor', jogo: semifinais[1] })
    }
    const confrontos: [Origem, Origem][] = []
    for (let i = 0; i < rodadaAtual.length; i += 2) confrontos.push([rodadaAtual[i], rodadaAtual[i + 1]])
    decisivos = rodada(nome, confrontos)
    if (rodadaAtual.length === 4) semifinais = decisivos
    rodadaAtual = decisivos.map((jogo) => ({ tipo: 'vencedor', jogo }))
  }
  return jogos
}

const potenciaDe2 = (n: number) => n >= 1 && (n & (n - 1)) === 0
const proximaPotencia = (n: number) => { let p = 1; while (p < n) p *= 2; return p }
const doGrupo = (grupo: number, posicao: number): Origem => ({ tipo: 'grupo', grupo, posicao })
/** Posições de uma chave de `tamanho` com `sementes` em ordem (as primeiras ganham os W.O.). */
const semear = (sementes: Origem[], tamanho: number) => ordemDasSementes(tamanho).map((s) => (s <= sementes.length ? sementes[s - 1] : null))

/**
 * Chave do mata-mata depois dos grupos, em dois lados, como na Copa do Mundo (PLANO.md, seção 9.4.3).
 * Devolve as posições da 1ª rodada (metade de cima = lado 1, de baixo = lado 2; null = W.O.) ou
 * null quando não se aplica (3 ou mais classificados por grupo: usa o cruzamento simples).
 *
 * - Passam 2, com 2, 4, 8 ou 16 grupos: igual à Copa (1ºA x 2ºB, 1ºC x 2ºD… de um lado; 1ºB x 2ºA… do
 *   outro). O 1º e o 2º do mesmo grupo ficam em lados opostos: só se reencontram na final.
 * - Passam 2, outros números de grupos: lado 1 = 1º dos grupos A, C, E… e 2º dos B, D…; lado 2 o
 *   contrário. Em cada lado, os 1º com melhor campanha ganham os W.O. e enfrentam os 2º.
 * - Passa 1: 1ºA x 1ºB, 1ºC x 1ºD… (metade dos grupos de cada lado); quando não fecha, os campeões
 *   de grupo com melhor campanha ganham os W.O.
 */
export function chaveDosGrupos(grupos: number, classificados: number): (Origem | null)[] | null {
  const todos = Array.from({ length: grupos }, (_, g) => g)
  if (grupos < 2) return null
  if (classificados === 1) {
    if (potenciaDe2(grupos)) return todos.map((g) => doGrupo(g, 1))
    const melhores: Origem[] = todos.map((_, i) => ({ tipo: 'melhor', posicao: 1, grupos: todos, ordem: i + 1 }))
    return semear(melhores, proximaPotencia(grupos))
  }
  if (classificados === 2) {
    if (potenciaDe2(grupos)) { // 2, 4, 8, 16 grupos
      const lado1: Origem[] = []
      const lado2: Origem[] = []
      for (let g = 0; g < grupos; g += 2) {
        lado1.push(doGrupo(g, 1), doGrupo(g + 1, 2))
        lado2.push(doGrupo(g + 1, 1), doGrupo(g, 2))
      }
      return [...lado1, ...lado2]
    }
    const pares = todos.filter((g) => g % 2 === 0) // A, C, E…
    const impares = todos.filter((g) => g % 2 === 1) // B, D, F…
    const metade = proximaPotencia(grupos * 2) / 2
    const lado = (primeiros: number[], segundos: number[]) => semear([
      ...primeiros.map((_, i): Origem => ({ tipo: 'melhor', posicao: 1, grupos: primeiros, ordem: i + 1 })),
      ...segundos.map((_, i): Origem => ({ tipo: 'melhor', posicao: 2, grupos: segundos, ordem: i + 1 })),
    ], metade)
    return [...lado(pares, impares), ...lado(impares, pares)]
  }
  return null
}
