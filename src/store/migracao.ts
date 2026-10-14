// Completa dados salvos em versões antigas do app com os valores padrão,
// para uma pelada salva antes de uma atualização continuar abrindo.

import { configPadrao, novaSessao } from '../logic'
import { numerarFila } from '../logic/fila'
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
  const config = {
    ...configPadrao, ...e?.config,
    coletes: { ...configPadrao.coletes, ...e?.config?.coletes },
    pagamento: { ...configPadrao.pagamento, ...e?.config?.pagamento },
  }
  const estado: Estado = {
    ...base,
    ...e,
    config,
    goleiros: e?.goleiros ?? base.goleiros,
    gols: e?.gols ?? [],
    cartoes: e?.cartoes ?? [],
    historico: (e?.historico ?? []).map(completarPartida),
    subiram: e?.subiram ?? [],
    machucados: e?.machucados ?? [],
    foraDoJogo: e?.foraDoJogo ?? [],
    pagamentos: e?.pagamentos ?? {},
    cobranca: e?.cobranca ?? null,
    caixaLancado: e?.caixaLancado ?? false,
  }
  // Dados antigos não tinham o número de cada time da fila
  return e?.filaTimes ? estado : numerarFila({ ...estado, filaTimes: [] })
}

export function completarApp(app: Partial<AppState>): AppState {
  return {
    estado: completarEstado(app.estado),
    iniciada: app.iniciada ?? false,
    crono: app.crono ?? cronoZerado,
    ...(app.configAntes && { configAntes: app.configAntes }),
    ...(app.desfazer && { desfazer: app.desfazer.map((d) => ({ ...d, estado: completarEstado(d.estado) })) }),
  }
}
