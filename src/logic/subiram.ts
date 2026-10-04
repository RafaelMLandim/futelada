// Marca quem "subiu" (mudou de time) na última movimentação: completou um time
// incompleto, subiu na fila porque alguém foi embora ou entrou em campo no lugar
// de alguém. A marca vale só para aquele momento: na próxima movimentação é refeita.

import type { Estado, Subiu } from '../types/pelada'
import { timesDaFila } from './fila'

/** Em qual time está cada jogador (campo e fila). */
function timeDeCadaJogador(estado: Estado): Map<string, number> {
  const mapa = new Map<string, number>()
  const times = [...(estado.emCampo ? [estado.emCampo.A, estado.emCampo.B] : []), ...timesDaFila(estado)]
  for (const t of times) for (const j of t.jogadores) mapa.set(j.id, t.numero)
  return mapa
}

/**
 * Compara antes e depois de uma ação. Se alguém mudou de time, as marcas passam a
 * ser só essas mudanças. Se a ação não mexeu nos times (gol, cartão…), mantém as marcas.
 */
export function atualizarSubiram(antes: Estado, depois: Estado): Estado {
  // Mudar o tamanho da linha recorta a lista de novo: ninguém "subiu", só limpa as marcas
  if (antes.config.linha !== depois.config.linha) return { ...depois, subiram: [] }
  // Começar o primeiro jogo (com o sorteio dos 2 primeiros times) não é "subir"
  if (!antes.emCampo && depois.emCampo && antes.historico.length === 0) return { ...depois, subiram: [] }
  const de = timeDeCadaJogador(antes)
  const para = timeDeCadaJogador(depois)
  const mudaram: Subiu[] = []
  for (const [id, numero] of para) {
    const anterior = de.get(id)
    if (anterior !== undefined && anterior !== numero) mudaram.push({ jogadorId: id, de: anterior, para: numero })
  }
  return mudaram.length ? { ...depois, subiram: mudaram } : depois
}

export function subiuDe(estado: Estado, jogadorId: string): number | null {
  return estado.subiram.find((s) => s.jogadorId === jogadorId)?.de ?? null
}
