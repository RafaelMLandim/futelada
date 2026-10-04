// Jogos do torneio: quem joga em cada lado, resultado, próximos jogos e campeão.

import type { Lado } from '../../types/pelada'
import type { JogoTorneio, Origem, ResultadoJogo, Torneio } from '../../types/torneio'
import { classificacao } from './classificacao'

export function jogoPorId(torneio: Torneio, id: string): JogoTorneio | undefined {
  return torneio.jogos.find((j) => j.id === id)
}

/** Lado que venceu (pelo placar ou, empatado, pelos pênaltis). Null = empate ou não jogado. */
export function vencedor(jogo: JogoTorneio): Lado | null {
  const r = jogo.resultado
  if (!r) return null
  const [a, b] = r.penaltis && r.placar[0] === r.placar[1] ? r.penaltis : r.placar
  return a > b ? 'A' : b > a ? 'B' : null
}

/** Fase de grupos terminou? (para saber quem são os classificados) */
export function gruposTerminados(torneio: Torneio): boolean {
  const deGrupo = torneio.jogos.filter((j) => j.fase === 'grupo')
  return deGrupo.length > 0 && deGrupo.every((j) => j.resultado)
}

/** Resolve a origem para o id do time (null se ainda não dá para saber). */
export function resolverOrigem(torneio: Torneio, origem: Origem): string | null {
  switch (origem.tipo) {
    case 'time':
      return origem.time
    case 'vencedor':
    case 'perdedor': {
      const jogo = jogoPorId(torneio, origem.jogo)
      const lado = jogo ? vencedor(jogo) : null
      if (!jogo || !lado) return null
      const ladoQuer: Lado = origem.tipo === 'vencedor' ? lado : lado === 'A' ? 'B' : 'A'
      return resolverOrigem(torneio, ladoQuer === 'A' ? jogo.casa : jogo.fora)
    }
    case 'grupo':
      if (!gruposTerminados(torneio)) return null
      return classificacao(torneio, origem.grupo)[origem.posicao - 1]?.time ?? null
  }
}

export function timesDoJogo(torneio: Torneio, jogo: JogoTorneio): Record<Lado, string | null> {
  return { A: resolverOrigem(torneio, jogo.casa), B: resolverOrigem(torneio, jogo.fora) }
}

/** Jogos que já podem ser jogados (os dois times definidos e sem resultado), na ordem sugerida. */
export function jogosDisponiveis(torneio: Torneio): JogoTorneio[] {
  return torneio.jogos
    .filter((j) => !j.resultado)
    .filter((j) => {
      const t = timesDoJogo(torneio, j)
      return t.A !== null && t.B !== null
    })
    .sort((a, b) => a.ordem - b.ordem)
}

/** Registra o resultado. No mata-mata, empate no tempo normal exige pênaltis. */
export function registrarResultado(torneio: Torneio, jogoId: string, resultado: ResultadoJogo): Torneio {
  const jogo = jogoPorId(torneio, jogoId)
  if (!jogo) throw new Error('Jogo não encontrado')
  const empatou = resultado.placar[0] === resultado.placar[1]
  if (jogo.fase === 'mata' && empatou && (!resultado.penaltis || resultado.penaltis[0] === resultado.penaltis[1])) {
    throw new Error('Empate no mata-mata: precisa dos pênaltis')
  }
  const sequencia = torneio.jogos.filter((j) => j.resultado && j.id !== jogoId).length + 1
  const final: ResultadoJogo = { ...resultado, penaltis: jogo.fase === 'mata' ? resultado.penaltis : null, sequencia }
  return { ...torneio, jogos: torneio.jogos.map((j) => (j.id === jogoId ? { ...j, resultado: final } : j)) }
}

/** Campeão (id do time) quando o torneio acaba; null enquanto não acabou. */
export function campeao(torneio: Torneio): string | null {
  if (!torneio.sorteado || torneio.jogos.some((j) => !j.resultado)) return null
  if (torneio.regras.formato === 'pontos') return classificacao(torneio)[0]?.time ?? null
  const final = torneio.jogos.filter((j) => j.rodada === 'Final').at(-1)
  if (!final) return null
  const lado = vencedor(final)
  return lado ? timesDoJogo(torneio, final)[lado] : null
}
