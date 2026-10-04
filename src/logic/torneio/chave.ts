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
  return `${timesNaRodada} avos de final`
}

/**
 * Monta todos os jogos do mata-mata. `sementes` são as origens em ordem de semente.
 * Jogos de rodadas seguintes apontam para "vencedor do jogo X".
 */
export function montarChave(sementes: Origem[], terceiroLugar: boolean, prefixo = 'm', ordemInicial = 0): JogoTorneio[] {
  const total = sementes.length
  if (total < 2) return []
  let tamanho = 2
  while (tamanho < total) tamanho *= 2

  const jogos: JogoTorneio[] = []
  let ordem = ordemInicial
  const novoJogo = (rodada: string, casa: Origem, fora: Origem): JogoTorneio => {
    const jogo: JogoTorneio = { id: `${prefixo}${jogos.length + 1}`, fase: 'mata', grupo: null, rodada, ordem: ordem++, casa, fora, resultado: null }
    jogos.push(jogo)
    return jogo
  }

  // 1ª rodada: pares de sementes; quem não tem adversário (bye) passa direto
  const posicoes = ordemDasSementes(tamanho).map((s) => (s <= total ? sementes[s - 1] : null))
  let rodadaAtual: Origem[] = []
  const semifinais: string[] = []
  const nome1 = nomeDaRodada(tamanho)
  for (let i = 0; i < tamanho; i += 2) {
    const a = posicoes[i]
    const b = posicoes[i + 1]
    if (a && b) {
      const jogo = novoJogo(nome1, a, b)
      if (tamanho === 4) semifinais.push(jogo.id)
      rodadaAtual.push({ tipo: 'vencedor', jogo: jogo.id })
    } else {
      rodadaAtual.push((a ?? b)!)
    }
  }

  // Rodadas seguintes, até a final (a disputa de 3º lugar vem antes da final)
  while (rodadaAtual.length > 1) {
    const nome = nomeDaRodada(rodadaAtual.length)
    if (rodadaAtual.length === 2 && terceiroLugar && semifinais.length === 2) {
      novoJogo('Disputa de 3º lugar', { tipo: 'perdedor', jogo: semifinais[0] }, { tipo: 'perdedor', jogo: semifinais[1] })
    }
    const proxima: Origem[] = []
    for (let i = 0; i < rodadaAtual.length; i += 2) {
      const jogo = novoJogo(nome, rodadaAtual[i], rodadaAtual[i + 1])
      if (rodadaAtual.length === 4) semifinais.push(jogo.id)
      proxima.push({ tipo: 'vencedor', jogo: jogo.id })
    }
    rodadaAtual = proxima
  }
  return jogos
}
