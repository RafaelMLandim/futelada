// Pelada encerrada: vai para o histórico e para a turma de quem está logado (o dono da pelada).

import { peladaParaGuardar, resumoParaAsCartas } from '../logic'
import type { Estado } from '../types/pelada'
import { obterNuvem } from '../nuvem'
import { dataHoje } from '../utils/formatar'
import { registrarDepois } from './cartasPendentes'
import { guardarNoHistorico } from './conta'
import { registrarNaTurma } from './turmas'

/** Guarda a pelada encerrada no histórico e soma a presença de quem jogou na turma (usa o relógio). */
export function guardarPeladaEncerrada(estado: Estado) {
  const agora = Date.now()
  void guardarNoHistorico(peladaParaGuardar(estado, agora, dataHoje())).catch(() => null)
  void registrarNaTurma(estado, agora).catch(() => null) // quem jogou: +1 de presença na turma
  registrarDepois(agora, estado.config.turma, resumoParaAsCartas(estado)) // sem sinal, sai quando a internet voltar
  const lista = estado.listaDaPelada
  if (lista) void obterNuvem().then((nuvem) => nuvem?.apagarLista(lista)).catch(() => null) // o link da pelada acabou
}
