// Estatísticas do torneio: artilharia, goleiro menos vazado e cartões (com suspensos).
// Só contam os jogos encerrados (pênaltis não entram).

import type { Torneio } from '../../types/torneio'
import { situacaoDisciplinar } from './suspensoes'

export type ArtilheiroTorneio = { id: string; nome: string; time: string; gols: number }
export type GoleiroTorneio = { nome: string; time: string; jogos: number; sofridos: number; media: number }
export type CartoesTorneio = {
  id: string; nome: string; time: string
  amarelos: number; vermelhos: number; azuis: number
  acumulados: number // amarelos que contam para a suspensão (0 a 2)
  suspenso: boolean
}

const timeDoJogador = (t: Torneio) => {
  const mapa = new Map<string, string>()
  for (const time of t.times) for (const j of time.jogadores) mapa.set(j.id, time.id)
  return mapa
}

const resultados = (t: Torneio) => t.jogos.flatMap((j) => (j.resultado ? [j.resultado] : []))

export function artilhariaDoTorneio(t: Torneio): ArtilheiroTorneio[] {
  const times = timeDoJogador(t)
  const mapa = new Map<string, ArtilheiroTorneio>()
  for (const g of resultados(t).flatMap((r) => r.gols)) {
    if (!g.autorId || !g.autor || g.contra) continue // gol contra não conta na artilharia
    const a = mapa.get(g.autorId) ?? { id: g.autorId, nome: g.autor, time: times.get(g.autorId) ?? '', gols: 0 }
    a.gols++
    mapa.set(g.autorId, a)
  }
  return [...mapa.values()].sort((x, y) => y.gols - x.gols || x.nome.localeCompare(y.nome))
}

export function goleirosDoTorneio(t: Torneio): GoleiroTorneio[] {
  // quem jogou no gol pode ser qualquer jogador do time (o time vem pelo nome, que é único no torneio)
  const timeDoGoleiro = new Map(t.times.flatMap((time) => time.jogadores.map((jogador) => [jogador.nome, time.id] as const)))
  const mapa = new Map<string, GoleiroTorneio>()
  const linha = (nome: string) =>
    mapa.get(nome) ?? mapa.set(nome, { nome, time: timeDoGoleiro.get(nome) ?? '', jogos: 0, sofridos: 0, media: 0 }).get(nome)!
  for (const r of resultados(t)) {
    for (const nome of [r.goleiros.A, r.goleiros.B]) if (nome) linha(nome).jogos++
    for (const g of r.gols) if (g.goleiroSofreu) linha(g.goleiroSofreu).sofridos++
  }
  return [...mapa.values()]
    .map((g) => ({ ...g, media: g.jogos ? g.sofridos / g.jogos : 0 }))
    .sort((x, y) => x.media - y.media || y.jogos - x.jogos || x.nome.localeCompare(y.nome))
}

export function cartoesDoTorneio(t: Torneio): CartoesTorneio[] {
  const times = timeDoJogador(t)
  const { suspensos, amarelos } = situacaoDisciplinar(t)
  const mapa = new Map<string, CartoesTorneio>()
  for (const c of resultados(t).flatMap((r) => r.cartoes)) {
    const linha = mapa.get(c.jogadorId) ?? {
      id: c.jogadorId, nome: c.nome, time: times.get(c.jogadorId) ?? '',
      amarelos: 0, vermelhos: 0, azuis: 0, acumulados: 0, suspenso: false,
    }
    if (c.cor === 'amarelo') linha.amarelos++
    else if (c.cor === 'vermelho') linha.vermelhos++
    else linha.azuis++
    mapa.set(c.jogadorId, linha)
  }
  return [...mapa.values()]
    .map((l) => ({ ...l, acumulados: amarelos.get(l.id) ?? 0, suspenso: suspensos.has(l.id) }))
    .sort((x, y) => Number(y.suspenso) - Number(x.suspenso) || y.vermelhos - x.vermelhos || y.amarelos - x.amarelos || x.nome.localeCompare(y.nome))
}
