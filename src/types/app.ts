// Tipos do estado do aplicativo (o que fica salvo no celular).

import type { Desfazer } from '../store/desfazer'
import type { Config, Estado } from './pelada'

export type Cronometro = {
  rodando: boolean; inicio: number; acumulado: number
  acrescimoMin?: number // minutos de acréscimo dados depois do tempo (somam ao tempo da partida)
}

export type AppState = {
  estado: Estado
  iniciada: boolean // passou da tela de configuração
  crono: Cronometro
  configAntes?: Config // ajustes de quando esta pelada nasceu (cancelar volta para eles)
  desfazer?: Desfazer[] // últimas ações do jogo, da mais antiga para a mais recente
  compartilhada?: string // código da pelada compartilhada na nuvem (PLANO.md, seção 16)
  chaveDeControle?: string // chave do link para outra pessoa assumir o controle
}
