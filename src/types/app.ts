// Tipos do estado do aplicativo (o que fica salvo no celular).

import type { Estado } from './pelada'

export type Cronometro = { rodando: boolean; inicio: number; acumulado: number }

export type AppState = {
  estado: Estado
  iniciada: boolean // passou da tela de configuração
  desfazer: Estado[]
  crono: Cronometro
}
