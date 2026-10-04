// Nomes para mostrar na tela: time de cada lado, ou o que ainda vai definir
// ("1º Grupo A", "Vencedor Semifinal 1").

import { nomeDoGrupo, resolverOrigem } from '../../logic/torneio'
import type { JogoTorneio, Origem, TimeTorneio, Torneio } from '../../types/torneio'

export function timePorId(torneio: Torneio, id: string | null): TimeTorneio | undefined {
  return torneio.times.find((t) => t.id === id)
}

/** "Rodada 2 · Grupo A", "Semifinal 1", "Final"… (no mata-mata numera os jogos da rodada). */
export function nomeDoJogo(torneio: Torneio, jogo: JogoTorneio): string {
  if (jogo.fase === 'grupo') return `${jogo.rodada} · ${nomeDoGrupo(jogo.grupo!)}`
  if (jogo.fase === 'liga') return jogo.rodada
  const mesmos = torneio.jogos.filter((j) => j.rodada === jogo.rodada && j.grupo === jogo.grupo)
  return mesmos.length > 1 ? `${jogo.rodada} ${mesmos.indexOf(jogo) + 1}` : jogo.rodada
}

/** Versão curta do nome da rodada, para caber na linha do jogo. */
const abreviar = (nome: string) =>
  nome.replace('Quartas de final', 'Quartas').replace('Oitavas de final', 'Oitavas').replace('Semifinal', 'Semi')

export function descreverOrigem(torneio: Torneio, origem: Origem): { nome: string; time?: TimeTorneio } {
  const time = timePorId(torneio, resolverOrigem(torneio, origem))
  if (time) return { nome: time.nome, time }
  switch (origem.tipo) {
    case 'grupo':
      return { nome: `${origem.posicao}º ${nomeDoGrupo(origem.grupo)}` }
    case 'vencedor':
    case 'perdedor': {
      const jogo = torneio.jogos.find((j) => j.id === origem.jogo)
      const quem = origem.tipo === 'vencedor' ? 'Venc.' : 'Perd.'
      return { nome: jogo ? `${quem} ${abreviar(nomeDoJogo(torneio, jogo))}` : quem }
    }
    default:
      return { nome: '?' }
  }
}
