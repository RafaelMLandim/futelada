// Tipos do estado do aplicativo (o que fica salvo no celular).

import type { Estado } from './pelada'

export type Cronometro = {
  rodando: boolean; inicio: number; acumulado: number
  acrescimoMin?: number // minutos de acréscimo dados depois do tempo (somam ao tempo da partida)
}

export type AppState = {
  estado: Estado
  iniciada: boolean // passou da tela de configuração
  crono: Cronometro
}
