// Empate: saem os dois (se der) ou a moeda decide quem sai.

import type { Estado, Lado } from '../types/pelada'
import { mandarParaFila, registrarPartida, substituirTimes } from './campo'
import { timesCompletosNaFila } from './fila'
import { goleiroUnicoVaiPara } from './goleiros'
import { outro } from './lado'

/** No empate saem os dois só se houver dois times completos esperando. */
export function empateSaemOsDois(estado: Estado): boolean {
  return timesCompletosNaFila(estado) >= 2
}

/**
 * Empate. `moeda` é o lado sorteado no cara ou coroa:
 * - saem os dois: o time sorteado entra primeiro na fila;
 * - sai só um: o time sorteado é o que sai.
 */
export function empate(estado: Estado, moeda: Lado): Estado {
  const { emCampo } = estado
  if (!emCampo) return estado

  if (empateSaemOsDois(estado)) {
    const primeiro = emCampo[moeda]
    const segundo = emCampo[outro(moeda)]
    const s = registrarPartida(estado, 'empate', [primeiro.numero, segundo.numero])
    return substituirTimes(mandarParaFila(s, primeiro, segundo), ['A', 'B'])
  }

  const sai = emCampo[moeda]
  const fica = outro(moeda)
  let s = registrarPartida(estado, 'empate', [sai.numero])
  s = goleiroUnicoVaiPara(mandarParaFila(s, sai), fica)
  return substituirTimes(s, [moeda], { lado: fica, time: emCampo[fica] })
}
