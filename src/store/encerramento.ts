// Pelada encerrada: vai para o histórico e para a turma de quem está logado (o dono da pelada).

import { fecharPartidaEmAndamento, peladaParaGuardar, resumoParaAsCartas } from '../logic'
import type { Cronometro } from '../types/app'
import type { Estado } from '../types/pelada'
import { obterNuvem } from '../nuvem'
import { dataHoje } from '../utils/formatar'
import { registrarDepois } from './cartasPendentes'
import { guardarNoHistorico } from './conta'
import { registrarNaTurma } from './turmas'

/** O cronômetro da partida em campo chegou a andar. */
export const cronometroComecou = (crono: Cronometro) => crono.rodando || crono.acumulado > 0

/** Como a pelada fica ao encerrar: a partida em andamento termina com o placar do momento e entra na conta. */
export const peladaEncerrada = (estado: Estado, crono: Cronometro) => fecharPartidaEmAndamento(estado, cronometroComecou(crono))

/**
 * Guarda a pelada encerrada no histórico e soma a presença de quem jogou na turma (usa o relógio).
 * Recebe a pelada já encerrada (`peladaEncerrada`); sem nenhuma partida, não guarda nada.
 */
export function guardarPeladaEncerrada(estado: Estado) {
  if (estado.historico.length === 0) return
  const agora = Date.now()
  void guardarNoHistorico(peladaParaGuardar(estado, agora, dataHoje())).catch(() => null)
  void registrarNaTurma(estado, agora).catch(() => null) // quem jogou: +1 de presença na turma
  registrarDepois(agora, estado.config.turma, resumoParaAsCartas(estado)) // sem sinal, sai quando a internet voltar
  const lista = estado.listaDaPelada
  if (lista) void obterNuvem().then((nuvem) => nuvem?.apagarLista(lista)).catch(() => null) // o link da pelada acabou
}
