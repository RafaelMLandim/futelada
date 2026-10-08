import { describe, expect, it } from 'vitest'
import { artilhariaDaTemporada, comecar, configPadrao, gol, peladaParaGuardar, temporada, vitoria } from '..'
import { LISTA, sessao } from './utils'

/** Uma pelada com um jogo: Time 1 vence com gols de quem for passado (nomes do time A). */
function peladaCom(golsDoA: number[], lista = LISTA) {
  let s = comecar(sessao(lista, { ...configPadrao, goleiros: ['Zé', 'Tião'] }))
  for (const i of golsDoA) s = gol(s, 'A', s.emCampo!.A.jogadores[i])
  return vitoria(s, 'A')
}

describe('histórico das peladas', () => {
  it('guarda só as partidas terminadas (a em andamento fica de fora)', () => {
    let s = peladaCom([0])
    s = gol(s, 'A', s.emCampo!.A.jogadores[0]) // gol na partida que não terminou
    const g = peladaParaGuardar(s, 1000, 'TER, 06 DE OUT')
    expect(g).toMatchObject({ data: 1000, dia: 'TER, 06 DE OUT' })
    expect(g.estado.historico).toHaveLength(1)
    expect(g.estado.gols).toEqual([])
    expect(g.estado.emCampo).toBeNull()
  })

  it('soma as peladas pelo nome (ids diferentes a cada pelada)', () => {
    const p1 = peladaParaGuardar(peladaCom([0, 0]), 1, 'a') // João 2 gols
    const p2 = peladaParaGuardar(peladaCom([0, 1], ['joão', ...LISTA.slice(1)]), 2, 'b') // "joão" 1, Carlos 1
    const t = temporada([p1, p2])
    expect(t.peladas).toBe(2)
    const joao = t.jogadores.find((j) => j.nome === 'João')!
    expect(joao).toMatchObject({ peladas: 2, jogos: 2, vitorias: 2, gols: 3, artilheiroDoDia: 2 })
    expect(artilhariaDaTemporada(t).map((j) => [j.nome, j.gols])).toEqual([['João', 3], ['Carlos', 1]])
    // goleiro: Tião (lado B) sofreu os 4 gols em 2 jogos
    expect(t.goleiros.find((g) => g.nome === 'Tião')).toMatchObject({ peladas: 2, jogos: 2, sofridos: 4, media: 2 })
  })
})
