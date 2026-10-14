import { describe, expect, it } from 'vitest'
import { artilharia, comecar, definirAutorDoGol, gol, inverterColetes, vitoria } from '..'
import { sessao } from './utils'

// A B C D (Time 1) x E F G H (Time 2); fila I J K L (Time 3)
const inicio = () => comecar(sessao('ABCDEFGHIJKL'.split('')))

describe('correções no meio da pelada', () => {
  it('inverter os coletes: os lados trocam de cor e o resto fica igual', () => {
    const s = inicio()
    const { A, B } = s.config.coletes
    const t = inverterColetes(s)
    expect(t.config.coletes).toEqual({ A: B, B: A })
    expect(t.emCampo).toBe(s.emCampo)
    expect(inverterColetes(t).config.coletes).toEqual(s.config.coletes)
  })

  it('marca depois quem fez o gol "sem autor", na partida em andamento', () => {
    const s = gol(inicio(), 'A', null, 60_000)
    const c = s.emCampo!.A.jogadores[2]
    const t = definirAutorDoGol(s, null, 0, c)
    expect(t.gols[0]).toMatchObject({ lado: 'A', autorId: c.id, autor: 'C', tempoMs: 60_000 })
    expect(t.placar).toEqual(s.placar)
    expect(artilharia(t).map((a) => a.nome)).toEqual(['C'])
    expect(definirAutorDoGol(s, null, 5, c)).toBe(s) // gol que não existe: nada muda
  })

  it('marca depois quem fez numa partida que já acabou, sem mudar o resultado', () => {
    let s = gol(gol(inicio(), 'B'), 'B')
    s = vitoria(s, 'B')
    const f = s.historico[0].timeB.jogadores[1]
    const t = definirAutorDoGol(s, 1, 1, f)
    expect(t.historico[0].gols[1]).toMatchObject({ autor: 'F' })
    expect(t.historico[0].gols[0].autor).toBeNull()
    expect(t.historico[0].resultado).toBe('B')
    expect(t.fila).toBe(s.fila)
    expect(artilharia(t)[0]).toMatchObject({ nome: 'F', gols: 1 })
  })

  it('gol contra marcado depois não conta na artilharia; e dá para desmarcar', () => {
    const s = gol(inicio(), 'A')
    const e = s.emCampo!.B.jogadores[0]
    const t = definirAutorDoGol(s, null, 0, e, true)
    expect(t.gols[0]).toMatchObject({ autor: 'E', contra: true })
    expect(artilharia(t)).toEqual([])
    const a = s.emCampo!.A.jogadores[0]
    expect(definirAutorDoGol(t, null, 0, a).gols[0].contra).toBeUndefined()
  })
})
