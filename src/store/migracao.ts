// Completa dados salvos em versões antigas do app com os valores padrão,
// para uma pelada salva antes de uma atualização continuar abrindo.

import { configPadrao, novaSessao } from '../logic'
import type { AppState } from '../types/app'
import type { Estado, Partida } from '../types/pelada'
import { cronoZerado } from './cronometro'

const completarPartida = (p: Partida): Partida => ({
  ...p,
  gols: p.gols ?? [],
  cartoes: p.cartoes ?? [],
  goleiros: p.goleiros ?? { A: null, B: null },
})

export function completarEstado(e: Partial<Estado> | undefined): Estado {
  const base = novaSessao(configPadrao)
  const config = { ...configPadrao, ...e?.config, coletes: { ...configPadrao.coletes, ...e?.config?.coletes } }
  return {
    ...base,
    ...e,
    config,
    goleiros: e?.goleiros ?? base.goleiros,
    gols: e?.gols ?? [],
    cartoes: e?.cartoes ?? [],
    historico: (e?.historico ?? []).map(completarPartida),
  }
}

export function completarApp(app: Partial<AppState>): AppState {
  return {
    estado: completarEstado(app.estado),
    iniciada: app.iniciada ?? false,
    desfazer: (app.desfazer ?? []).map(completarEstado),
    crono: app.crono ?? cronoZerado,
  }
}
