// Criação e configuração da sessão (a pelada do dia).

import type { Colete, Config, Estado, Lado } from '../types/pelada'
import { numerarFila } from './fila'
import { outro } from './lado'

export const configPadrao: Config = {
  linha: 4,
  tempoMin: 10,
  gols: 2, // na pelada, por padrão 2 gols terminam a partida
  limiteVitorias: null,
  goleiros: [],
  coletes: {
    A: { nome: 'Vermelho', cor: '#D62828' },
    B: { nome: 'Azul', cor: '#1E5FBF' },
  },
  minutosAzul: 2,
  som: true,
  acrescimos: true,
  sortearInicio: true,
  pagamento: { ativo: false, valorCampo: 0, modo: 'proporcional', valorFixo: 0, chavePix: '', recebedor: '', confirmarAuto: false },
}

export function novaSessao(config: Config = configPadrao): Estado {
  return {
    config,
    fila: [],
    filaTimes: [],
    emCampo: null,
    placar: [0, 0],
    gols: [],
    cartoes: [],
    goleiros: { A: null, B: null },
    historico: [],
    subiram: [],
    proximoNumero: 1,
    pagamentos: {},
    cobranca: null,
    caixaLancado: false,
  }
}

/** Muda o tamanho da linha. Os times em campo continuam; só a fila se reorganiza. */
export function alterarLinha(estado: Estado, linha: number): Estado {
  return numerarFila({ ...estado, config: { ...estado.config, linha: Math.max(1, linha) } })
}

/** Escolhe o colete de um lado. Se for a cor do outro lado, os dois trocam. */
export function definirColete(estado: Estado, lado: Lado, colete: Colete): Estado {
  const coletes = { ...estado.config.coletes }
  const o = outro(lado)
  if (coletes[o].cor === colete.cor) coletes[o] = coletes[lado]
  coletes[lado] = colete
  return { ...estado, config: { ...estado.config, coletes } }
}
