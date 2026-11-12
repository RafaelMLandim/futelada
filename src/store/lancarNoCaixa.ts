// Fechar a conta do campo pago no caixa (tela do campo pago e o bloqueio do encerrar, na Tabela).

import { lancamentosDaPelada, resumoPagamentos } from '../logic'
import { useCaixa } from './conta'
import type { Pelada } from './usePelada'

const agoraEDia = (): [number, string] => [Date.now(), new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })]

/** Fecha a conta do dia no caixa: entra o que pagaram e sai o campo (uma vez por pelada). Devolve a sobra (pode ser negativa). */
export function useLancarNoCaixa(pelada: Pelada) {
  const caixa = useCaixa()
  const resumo = resumoPagamentos(pelada.app.estado)
  const lancar = async (): Promise<number> => {
    await caixa.lancar(lancamentosDaPelada(resumo, ...agoraEDia(), pelada.app.estado.config.turma))
    pelada.aplicar((e) => ({ ...e, caixaLancado: true }))
    return resumo.sobra
  }
  return { resumo, lancar }
}

