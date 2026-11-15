// Carta do jogador no torneio (PLANO.md, seção 22.2): os números de quem joga com a conta (entrou pelo link do time),
// somados por torneio. O celular do organizador manda o resumo; o servidor confere e grava (o jogador só lê).

import type { Lado } from '../../types/pelada'
import type { Torneio } from '../../types/torneio'
import { LADOS } from '../lado'
import { classificacao } from './classificacao'
import { artilhariaDoTorneio, assistenciasDoTorneio, goleirosDoTorneio } from './estatisticas'
import { campeao, timesDoJogo, vencedor } from './jogos'

/** O que uma conta fez em um torneio (o que vai para a carta dela). */
export type ResumoDoTorneioNaCarta = {
  conta: string
  jogos: number; vitorias: number; empates: number; gols: number; assistencias: number
  amarelos: number; vermelhos: number; golsContra: number; jogosSemSofrer: number
  // só no fim do torneio (com o campeão)
  campeao: boolean; vice: boolean; artilheiro: boolean; garcom: boolean; luvaDeOuro: boolean
  melhorJogador: boolean // escolhido pelo organizador
}

const OUTRO: Record<Lado, Lado> = { A: 'B', B: 'A' }

/** O time que perdeu a final (mata-mata) ou o 2º da tabela (pontos corridos). Só com o torneio terminado. */
function viceCampeao(torneio: Torneio): string | null {
  if (!campeao(torneio)) return null
  if (torneio.regras.formato === 'pontos') return classificacao(torneio)[1]?.time ?? null
  const final = torneio.jogos.filter((jogo) => jogo.rodada === 'Final').at(-1)
  const lado = final ? vencedor(final, torneio) : null
  return final && lado ? timesDoJogo(torneio, final)[OUTRO[lado]] : null
}

/**
 * Os números de cada conta no torneio. Só contam os jogos encerrados; quem jogou só com o nome fica de fora.
 * Vitória e empate seguem o placar do jogo (decidido nos pênaltis conta como empate). Sem levar gol: quem começou no gol
 * e o time não sofreu gol. Campeão, vice e os prêmios (artilheiro, garçom, luva de ouro; empate no 1º lugar vale para
 * todos) só no fim, para quem jogou ao menos um jogo.
 */
export function resumoDoTorneioParaAsCartas(torneio: Torneio): ResumoDoTorneioNaCarta[] {
  const contaDoJogador = new Map<string, string>()
  const timeDoJogador = new Map<string, string>()
  const contaPeloNome = new Map<string, string>()
  const goleiros = new Set<string>()
  for (const time of torneio.times) {
    for (const jogador of time.jogadores) {
      timeDoJogador.set(jogador.id, time.id)
      if (jogador.goleiro) goleiros.add(jogador.id)
      if (jogador.conta) { contaDoJogador.set(jogador.id, jogador.conta); contaPeloNome.set(jogador.nome, jogador.conta) }
    }
  }
  const resumos = new Map<string, ResumoDoTorneioNaCarta>()
  const resumoDe = (conta: string | undefined) => {
    if (!conta) return null
    const atual = resumos.get(conta) ?? {
      conta, jogos: 0, vitorias: 0, empates: 0, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0, golsContra: 0, jogosSemSofrer: 0,
      campeao: false, vice: false, artilheiro: false, garcom: false, luvaDeOuro: false, melhorJogador: false,
    }
    resumos.set(conta, atual)
    return atual
  }
  const doJogador = (id: string | null | undefined) => (id ? resumoDe(contaDoJogador.get(id)) : null)

  for (const jogo of torneio.jogos) {
    const resultado = jogo.resultado
    if (!resultado) continue
    const [golsA, golsB] = resultado.placar
    for (const lado of LADOS) {
      const meus = lado === 'A' ? golsA : golsB
      const deles = lado === 'A' ? golsB : golsA
      for (const id of resultado.jogaram[lado]) {
        const resumo = doJogador(id)
        if (!resumo) continue
        resumo.jogos++
        if (meus > deles) resumo.vitorias++
        else if (meus === deles) resumo.empates++
      }
      // quem começou no gol (jogos antigos: o primeiro titular, se era goleiro)
      const primeiro = resultado.titulares?.[lado][0]
      const noGol = resultado.noGol ? resultado.noGol[lado] : primeiro && goleiros.has(primeiro) ? primeiro : null
      if (noGol && deles === 0) {
        const resumo = doJogador(noGol)
        if (resumo) resumo.jogosSemSofrer++
      }
    }
    for (const gol of resultado.gols) {
      const autor = doJogador(gol.autorId)
      if (autor) { if (gol.contra) autor.golsContra++; else autor.gols++ }
      if (!gol.contra) { const garcom = doJogador(gol.assistenciaId); if (garcom) garcom.assistencias++ }
    }
    for (const cartao of resultado.cartoes) {
      const resumo = doJogador(cartao.jogadorId)
      if (resumo && cartao.cor === 'amarelo') resumo.amarelos++
      if (resumo && cartao.cor === 'vermelho') resumo.vermelhos++
    }
  }

  const timeCampeao = campeao(torneio)
  if (timeCampeao) {
    const timeVice = viceCampeao(torneio)
    for (const [id, conta] of contaDoJogador) {
      const resumo = resumos.get(conta)
      if (!resumo || resumo.jogos === 0) continue
      if (timeDoJogador.get(id) === timeCampeao) resumo.campeao = true
      if (timeDoJogador.get(id) === timeVice) resumo.vice = true
    }
    const artilharia = artilhariaDoTorneio(torneio)
    for (const linha of artilharia) if (linha.gols > 0 && linha.gols === artilharia[0].gols) { const r = doJogador(linha.id); if (r?.jogos) r.artilheiro = true }
    const garcons = assistenciasDoTorneio(torneio)
    for (const linha of garcons) if (linha.assistencias > 0 && linha.assistencias === garcons[0].assistencias) { const r = doJogador(linha.id); if (r?.jogos) r.garcom = true }
    // o melhor jogador, escolhido pelo organizador
    const melhor = doJogador(torneio.melhorJogador)
    if (melhor?.jogos) melhor.melhorJogador = true
    const goleiros = goleirosDoTorneio(torneio)
    const goleiroMenosVazado = goleiros[0]
    if (goleiroMenosVazado) {
      for (const linha of goleiros) {
        if (linha.media !== goleiroMenosVazado.media || linha.jogos !== goleiroMenosVazado.jogos) continue
        const resumo = resumoDe(contaPeloNome.get(linha.nome))
        if (resumo?.jogos) resumo.luvaDeOuro = true
      }
    }
  }
  return [...resumos.values()].filter((resumo) => resumo.jogos > 0)
}
