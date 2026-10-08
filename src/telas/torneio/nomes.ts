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
  // ida e volta: numera os confrontos (ida e volta do mesmo confronto têm o mesmo número)
  const mesmos = torneio.jogos.filter((j) => j.rodada === jogo.rodada && j.grupo === jogo.grupo && j.perna === jogo.perna)
  const nome = mesmos.length > 1 ? `${jogo.rodada} ${mesmos.indexOf(jogo) + 1}` : jogo.rodada
  return jogo.perna ? `${nome} · ${jogo.perna}` : nome
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
    case 'melhor': {
      // "Melhor 1º A/C", "2º melhor 1º A/C/E" (sai quando a fase de grupos acaba)
      const letras = origem.grupos.map((g) => nomeDoGrupo(g).replace('Grupo ', '')).join('/')
      if (origem.grupos.length === 1) return { nome: `${origem.posicao}º ${nomeDoGrupo(origem.grupos[0])}` }
      return { nome: `${origem.ordem === 1 ? 'Melhor' : `${origem.ordem}º melhor`} ${origem.posicao}º ${letras}` }
    }
    case 'vencedor':
    case 'perdedor': {
      const jogo = torneio.jogos.find((j) => j.id === origem.jogo)
      const quem = origem.tipo === 'vencedor' ? 'Venc.' : 'Perd.'
      // "Venc. Semi 1" (o confronto, sem o "· volta" do jogo que decide)
      return { nome: jogo ? `${quem} ${abreviar(nomeDoJogo(torneio, jogo).replace(' · volta', ''))}` : quem }
    }
    default:
      return { nome: '?' }
  }
}
