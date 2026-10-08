// Jogos do torneio: quem joga em cada lado, resultado, próximos jogos e campeão.

import type { Lado } from '../../types/pelada'
import type { JogoTorneio, Origem, ResultadoJogo, Torneio } from '../../types/torneio'
import { classificacao, melhoresDaPosicao } from './classificacao'

export function jogoPorId(torneio: Torneio, id: string): JogoTorneio | undefined {
  return torneio.jogos.find((j) => j.id === id)
}

/**
 * Placar que decide o jogo, do ponto de vista dos lados dele: o próprio placar ou, no jogo de
 * volta do mata-mata em ida e volta, o agregado (ida + volta; o mando é invertido na volta).
 * Null se ainda falta jogo.
 */
export function placarDecisivo(torneio: Torneio, jogo: JogoTorneio, placar = jogo.resultado?.placar): [number, number] | null {
  if (!placar) return null
  if (jogo.perna !== 'volta') return placar
  const ida = jogoPorId(torneio, jogo.outraPerna ?? '')?.resultado
  if (!ida) return null
  // lado A da volta é o lado B da ida
  return [placar[0] + ida.placar[1], placar[1] + ida.placar[0]]
}

/**
 * Lado que venceu (pelo placar ou, empatado, pelos pênaltis). Null = empate ou não jogado.
 * No mata-mata em ida e volta, o jogo de ida não decide nada e o de volta usa o agregado.
 */
export function vencedor(jogo: JogoTorneio, torneio?: Torneio): Lado | null {
  const r = jogo.resultado
  if (!r || jogo.perna === 'ida') return null
  const placar = torneio ? placarDecisivo(torneio, jogo) : r.placar
  if (!placar) return null
  const [a, b] = r.penaltis && placar[0] === placar[1] ? r.penaltis : placar
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
      const lado = jogo ? vencedor(jogo, torneio) : null
      if (!jogo || !lado) return null
      const ladoQuer: Lado = origem.tipo === 'vencedor' ? lado : lado === 'A' ? 'B' : 'A'
      return resolverOrigem(torneio, ladoQuer === 'A' ? jogo.casa : jogo.fora)
    }
    case 'grupo':
      if (!gruposTerminados(torneio)) return null
      return classificacao(torneio, origem.grupo)[origem.posicao - 1]?.time ?? null
    case 'melhor':
      if (!gruposTerminados(torneio)) return null
      return melhoresDaPosicao(torneio, origem.posicao, origem.grupos)[origem.ordem - 1]?.time ?? null
  }
}

export function timesDoJogo(torneio: Torneio, jogo: JogoTorneio): Record<Lado, string | null> {
  return { A: resolverOrigem(torneio, jogo.casa), B: resolverOrigem(torneio, jogo.fora) }
}

/** Jogos que já podem ser jogados (os dois times definidos e sem resultado), na ordem sugerida. */
export function jogosDisponiveis(torneio: Torneio): JogoTorneio[] {
  return torneio.jogos
    .filter((j) => !j.resultado)
    .filter((j) => j.perna !== 'volta' || !!jogoPorId(torneio, j.outraPerna ?? '')?.resultado) // a volta só depois da ida
    .filter((j) => {
      const t = timesDoJogo(torneio, j)
      return t.A !== null && t.B !== null
    })
    .sort((a, b) => a.ordem - b.ordem)
}

/** O jogo precisa de pênaltis com este placar? (mata-mata empatado; em ida e volta, agregado empatado na volta) */
export function precisaDePenaltis(torneio: Torneio, jogo: JogoTorneio, placar: [number, number]): boolean {
  if (jogo.fase !== 'mata' || jogo.perna === 'ida') return false
  const decisivo = placarDecisivo(torneio, jogo, placar)
  return !!decisivo && decisivo[0] === decisivo[1]
}

/** Registra o resultado. No mata-mata, empate (no agregado, em ida e volta) exige pênaltis; a ida pode empatar. */
export function registrarResultado(torneio: Torneio, jogoId: string, resultado: ResultadoJogo): Torneio {
  const jogo = jogoPorId(torneio, jogoId)
  if (!jogo) throw new Error('Jogo não encontrado')
  if (jogo.perna === 'volta' && !jogoPorId(torneio, jogo.outraPerna ?? '')?.resultado) throw new Error('Falta o jogo de ida')
  const penaltis = precisaDePenaltis(torneio, jogo, resultado.placar)
  if (penaltis && (!resultado.penaltis || resultado.penaltis[0] === resultado.penaltis[1])) {
    throw new Error('Empate no mata-mata: precisa dos pênaltis')
  }
  const sequencia = torneio.jogos.filter((j) => j.resultado && j.id !== jogoId).length + 1
  const final: ResultadoJogo = { ...resultado, penaltis: penaltis ? resultado.penaltis : null, sequencia }
  return { ...torneio, jogos: torneio.jogos.map((j) => (j.id === jogoId ? { ...j, resultado: final } : j)) }
}

/** Campeão (id do time) quando o torneio acaba; null enquanto não acabou. */
export function campeao(torneio: Torneio): string | null {
  if (!torneio.sorteado || torneio.jogos.some((j) => !j.resultado)) return null
  if (torneio.regras.formato === 'pontos') return classificacao(torneio)[0]?.time ?? null
  const final = torneio.jogos.filter((j) => j.rodada === 'Final').at(-1) // em ida e volta, a volta
  if (!final) return null
  const lado = vencedor(final, torneio)
  return lado ? timesDoJogo(torneio, final)[lado] : null
}
