// Pelada encerrada: vai para o histórico e para a turma de quem está logado (o dono da pelada).

import { peladaParaGuardar } from '../logic'
import type { Estado } from '../types/pelada'
import { dataHoje } from '../utils/formatar'
import { guardarNoHistorico } from './conta'
import { registrarNaTurma } from './turmas'

/** Guarda a pelada encerrada no histórico e soma a presença de quem jogou na turma (usa o relógio). */
export function guardarPeladaEncerrada(estado: Estado) {
  const agora = Date.now()
  void guardarNoHistorico(peladaParaGuardar(estado, agora, dataHoje())).catch(() => null)
  void registrarNaTurma(estado, agora).catch(() => null) // quem jogou: +1 de presença na turma
}
