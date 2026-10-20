// Início da partida, placar e vitória.

import type { Estado, Gol, Jogador, Lado, Placar } from '../types/pelada'
import { mandarParaFila, registrarPartida, substituirTimes } from './campo'
import { tirarProximoTime } from './fila'
import { goleiroUnicoVaiPara, sincronizarGoleiros } from './goleiros'
import { outro } from './lado'
import { embaralhar, type Aleatorio } from './torneio/sorteio'

export function podeComecar(estado: Estado): boolean {
  return estado.emCampo === null && estado.fila.length > estado.config.linha
}

/**
 * Contra panelinha: mistura os jogadores dos dois primeiros times da lista (os que vão
 * jogar o primeiro jogo). Só antes do primeiro jogo do dia.
 */
export function sortearPrimeirosTimes(estado: Estado, aleatorio: Aleatorio = Math.random): Estado {
  if (estado.emCampo || estado.historico.length > 0) return estado
  const n = Math.min(estado.config.linha * 2, estado.fila.length)
  return { ...estado, fila: [...embaralhar(estado.fila.slice(0, n), aleatorio), ...estado.fila.slice(n)] }
}

export function comecar(estado: Estado): Estado {
  if (!podeComecar(estado)) throw new Error('Jogadores insuficientes para começar')
  const a = tirarProximoTime(estado)
  const b = tirarProximoTime(a.estado)
  return sincronizarGoleiros({ ...b.estado, emCampo: { A: a.time, B: b.time }, placar: [0, 0], gols: [], cartoes: [], foraDoJogo: [] })
}

/** Gol para `lado`. Gol contra: `autor` é do outro time (não conta na artilharia dele). */
export function gol(estado: Estado, lado: Lado, autor: Jogador | null = null, tempoMs?: number, contra = false): Estado {
  const placar: Placar = [...estado.placar]
  placar[lado === 'A' ? 0 : 1]++
  const novo: Gol = {
    lado,
    autorId: autor?.id ?? null,
    autor: autor?.nome ?? null,
    goleiroSofreu: estado.goleiros[outro(lado)],
    tempoMs,
    ...(contra && { contra: true }),
  }
  return { ...estado, placar, gols: [...estado.gols, novo] }
}

/** Quem deu o passe para o gol de número `indice` da partida (null = ninguém ou não sabe). */
export function passe(estado: Estado, indice: number, jogador: Jogador | null): Estado {
  const atual = estado.gols[indice]
  if (!atual) return estado
  const { assistenciaId: _id, assistencia: _nome, ...semPasse } = atual
  const novo: Gol = jogador ? { ...semPasse, assistenciaId: jogador.id, assistencia: jogador.nome } : semPasse
  return { ...estado, gols: estado.gols.map((g, i) => (i === indice ? novo : g)) }
}

/** Algum time chegou ao limite de gols? (sem limite configurado, nunca) */
export function acabouPorGols(estado: Estado): boolean {
  const { gols } = estado.config
  return gols !== null && (estado.placar[0] >= gols || estado.placar[1] >= gols)
}

/**
 * Um time venceu. Quem perde vai para o fim da fila, na ordem do time.
 * Com limite de vitórias ligado e atingido, sai só o vencedor.
 */
export function vitoria(estado: Estado, vencedor: Lado): Estado {
  const { emCampo, config } = estado
  if (!emCampo) return estado
  const perdedor = outro(vencedor)
  const venc = { ...emCampo[vencedor], vitoriasSeguidas: emCampo[vencedor].vitoriasSeguidas + 1 }
  const limiteAtingido = config.limiteVitorias !== null && venc.vitoriasSeguidas >= config.limiteVitorias

  let s = registrarPartida(estado, vencedor, [limiteAtingido ? venc.numero : emCampo[perdedor].numero])
  s = goleiroUnicoVaiPara(s, limiteAtingido ? perdedor : vencedor)

  if (limiteAtingido) {
    s = mandarParaFila(s, venc)
    return substituirTimes(s, [vencedor], { lado: perdedor, time: { ...emCampo[perdedor], vitoriasSeguidas: 0 } })
  }
  s = mandarParaFila(s, emCampo[perdedor])
  return substituirTimes(s, [perdedor], { lado: vencedor, time: venc })
}

/** Remove um gol da partida em andamento (marcado por engano), pelo índice na lista. */
export function removerGol(estado: Estado, indice: number): Estado {
  const removido = estado.gols[indice]
  if (!removido) return estado
  const placar: Placar = [...estado.placar]
  const i = removido.lado === 'A' ? 0 : 1
  placar[i] = Math.max(0, placar[i] - 1)
  return { ...estado, placar, gols: estado.gols.filter((_, k) => k !== indice) }
}
