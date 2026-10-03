// Início da partida, placar e vitória.

import type { Estado, Gol, Jogador, Lado, Placar } from '../types/pelada'
import { mandarParaFila, registrarPartida, substituirTimes } from './campo'
import { tirarProximoTime } from './fila'
import { goleiroUnicoVaiPara, sincronizarGoleiros } from './goleiros'
import { outro } from './lado'

export function podeComecar(estado: Estado): boolean {
  return estado.emCampo === null && estado.fila.length > estado.config.linha
}

export function comecar(estado: Estado): Estado {
  if (!podeComecar(estado)) throw new Error('Jogadores insuficientes para começar')
  const a = tirarProximoTime(estado)
  const b = tirarProximoTime(a.estado)
  return sincronizarGoleiros({ ...b.estado, emCampo: { A: a.time, B: b.time }, placar: [0, 0], gols: [], cartoes: [] })
}

/** Gol do time do `lado`. `autor` = quem fez (null se não informado). */
export function gol(estado: Estado, lado: Lado, autor: Jogador | null = null): Estado {
  const placar: Placar = [...estado.placar]
  placar[lado === 'A' ? 0 : 1]++
  const novo: Gol = {
    lado,
    autorId: autor?.id ?? null,
    autor: autor?.nome ?? null,
    goleiroSofreu: estado.goleiros[outro(lado)],
  }
  return { ...estado, placar, gols: [...estado.gols, novo] }
}

/** Algum time chegou ao limite de gols? */
export function acabouPorGols(estado: Estado): boolean {
  return estado.placar[0] >= estado.config.gols || estado.placar[1] >= estado.config.gols
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
