// Desfazer a última ação do jogo (PLANO.md, seção 3.8.5): gol, fim de partida, machucado, entrada na lista...
// Guarda as últimas fotos do estado. Pagamentos e ajustes não entram: não voltam junto.

import type { Cronometro } from '../types/app'
import type { Estado } from '../types/pelada'

/** Foto de antes de uma ação. `crono` só quando a ação começou outra partida (para voltar o relógio dela). */
export type Desfazer = { estado: Estado; crono?: Cronometro; descricao: string }

export const LIMITE_DESFAZER = 10

// O que conta como "ação do jogo". Pagamento que chega da nuvem, por exemplo, não muda nada disto.
const CAMPOS: (keyof Estado)[] = ['fila', 'emCampo', 'placar', 'gols', 'cartoes', 'goleiros', 'historico', 'machucados']

export function mudouOJogo(antes: Estado, depois: Estado): boolean {
  return CAMPOS.some((c) => antes[c] !== depois[c]) || antes.config.coletes !== depois.config.coletes
}

const timeDoLado = (e: Estado, lado: 'A' | 'B') => e.emCampo?.[lado].numero

/** Texto curto do que a ação fez, para o "Desfazer …?". */
export function descreverMudanca(antes: Estado, depois: Estado): string {
  if (depois.historico.length > antes.historico.length) {
    const p = depois.historico[depois.historico.length - 1]
    return p.resultado === 'empate'
      ? `o fim da partida ${p.numero} (empate)`
      : `o fim da partida ${p.numero} (vitória do Time ${(p.resultado === 'A' ? p.timeA : p.timeB).numero})`
  }
  if (!antes.emCampo && depois.emCampo) return 'o início da partida'
  if (antes.config.coletes !== depois.config.coletes) return 'a troca dos coletes'
  if (depois.gols.length > antes.gols.length) {
    const g = depois.gols[depois.gols.length - 1]
    return `o gol do Time ${timeDoLado(depois, g.lado)}${g.autor ? ` (${g.autor})` : ''}`
  }
  if (depois.gols.length < antes.gols.length) return 'a remoção do gol'
  // mesmo autor, outro passe: foi o "quem deu o passe?" (assistências)
  const passe = depois.gols.find((g, indice) => g.autorId === antes.gols[indice]?.autorId && g.assistenciaId !== antes.gols[indice]?.assistenciaId)
  if (passe) return passe.assistencia ? `o passe para o gol (${passe.assistencia})` : 'o passe para o gol'
  if (antes.gols !== depois.gols || antes.historico !== depois.historico) return 'quem fez o gol'
  if (depois.machucados.length > antes.machucados.length) return `o machucado (${depois.machucados[depois.machucados.length - 1].jogador.nome})`
  if (antes.machucados !== depois.machucados) return 'a volta do machucado'
  if (antes.cartoes !== depois.cartoes) return 'o cartão'
  if (antes.goleiros !== depois.goleiros) return 'a troca de goleiro'
  const ids = new Set(antes.fila.map((j) => j.id))
  const entrou = depois.fila.find((j) => !ids.has(j.id))
  if (entrou && depois.fila.length > antes.fila.length) return `a entrada de ${entrou.nome} na lista`
  if (depois.fila.length < antes.fila.length) return 'a saída do jogador'
  return 'a última mudança na lista'
}

/** Volta para a foto, mantendo o que não é do jogo (pagamentos, link, caixa e ajustes de agora). */
export function restaurar(agora: Estado, foto: Estado): Estado {
  return {
    ...foto,
    pagamentos: agora.pagamentos,
    cobranca: agora.cobranca,
    caixaLancado: agora.caixaLancado,
    // dos ajustes, só voltam os que andam junto com os times
    config: { ...agora.config, coletes: foto.config.coletes, linha: foto.config.linha, goleiros: foto.config.goleiros },
  }
}
