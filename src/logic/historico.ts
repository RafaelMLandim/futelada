// Histórico das peladas encerradas e ranking da temporada (fica no perfil de quem entrou com o Google).
// PLANO.md, seção 12.2.

import type { Estado } from '../types/pelada'
import { normalizarNome } from '../utils/formatar'
import { artilharia, goleirosMenosVazados, vitoriasPorJogador } from './estatisticas'

/** Uma pelada encerrada, como fica guardada: o estado do dia só com as partidas terminadas. */
export type PeladaGuardada = { data: number; dia: string; estado: Estado }

/**
 * O que vai para o histórico ao encerrar: as partidas terminadas e a configuração.
 * A partida em andamento (não terminou) e o campo pago ficam de fora.
 */
export function peladaParaGuardar(estado: Estado, data: number, dia: string): PeladaGuardada {
  return {
    data, dia,
    estado: {
      ...estado,
      fila: [], filaTimes: [], emCampo: null, placar: [0, 0], gols: [], cartoes: [], subiram: [],
      pagamentos: {}, cobranca: null,
    },
  }
}

export type LinhaDaTemporada = {
  nome: string
  peladas: number // presença
  jogos: number; vitorias: number; gols: number
  artilheiroDoDia: number // vezes que foi o artilheiro da pelada
}
export type GoleiroDaTemporada = { nome: string; peladas: number; jogos: number; sofridos: number; media: number }
export type Temporada = { jogadores: LinhaDaTemporada[]; goleiros: GoleiroDaTemporada[]; peladas: number }

/**
 * Soma todas as peladas. O mesmo jogador em peladas diferentes é reconhecido pelo nome
 * (sem acento e maiúsculas), porque cada pelada tem a sua lista.
 */
export function temporada(peladas: Pick<PeladaGuardada, 'estado'>[]): Temporada {
  const jogadores = new Map<string, LinhaDaTemporada>()
  const goleiros = new Map<string, GoleiroDaTemporada>()
  for (const { estado } of peladas) {
    const artilheiro = artilharia(estado)[0]
    for (const v of vitoriasPorJogador(estado)) {
      const chave = normalizarNome(v.nome)
      const l = jogadores.get(chave) ?? jogadores.set(chave, { nome: v.nome, peladas: 0, jogos: 0, vitorias: 0, gols: 0, artilheiroDoDia: 0 }).get(chave)!
      l.peladas++
      l.jogos += v.jogos
      l.vitorias += v.vitorias
      l.gols += v.gols
      if (artilheiro?.id === v.id) l.artilheiroDoDia++
    }
    for (const g of goleirosMenosVazados(estado)) {
      const chave = normalizarNome(g.nome)
      const l = goleiros.get(chave) ?? goleiros.set(chave, { nome: g.nome, peladas: 0, jogos: 0, sofridos: 0, media: 0 }).get(chave)!
      l.peladas++
      l.jogos += g.jogos
      l.sofridos += g.sofridos
    }
  }
  return {
    peladas: peladas.length,
    jogadores: [...jogadores.values()]
      .sort((x, y) => y.vitorias - x.vitorias || y.gols - x.gols || x.jogos - y.jogos || x.nome.localeCompare(y.nome)),
    goleiros: [...goleiros.values()]
      .map((g) => ({ ...g, media: g.jogos ? g.sofridos / g.jogos : 0 }))
      .sort((x, y) => x.media - y.media || y.jogos - x.jogos || x.nome.localeCompare(y.nome)),
  }
}

/** Artilharia da temporada: mais gols → mais vezes artilheiro do dia → menos jogos → nome. */
export const artilhariaDaTemporada = (t: Temporada) =>
  t.jogadores.filter((j) => j.gols > 0)
    .sort((x, y) => y.gols - x.gols || y.artilheiroDoDia - x.artilheiroDoDia || x.jogos - y.jogos || x.nome.localeCompare(y.nome))
