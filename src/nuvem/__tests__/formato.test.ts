import { describe, expect, it } from 'vitest'
import { comecarIntervalo, golNaPartida, iniciarPartida, registrarResultado, separar } from '../../logic/torneio'
import { resultado, sorteado, torneioCom } from '../../logic/torneio/__tests__/utils'
import { baseDaNuvem, baseParaNuvem, temListaDentroDeLista } from '../formato'

// O Firestore recusa "lista dentro de lista" (o sorteio dos grupos não ia para a nuvem).
describe('torneio no formato da nuvem', () => {
  it('nenhum documento do torneio tem lista dentro de lista (grupos, chave, jogos, partidas, resultados)', () => {
    let t = sorteado(torneioCom(12, 'grupos', { grupos: 4, classificamPorGrupo: 2, tempos: 2, intervaloMin: 2 }))
    t = registrarResultado(t, t.jogos[0].id, resultado(1, 0))
    t = iniciarPartida(t, t.jogos[1].id)
    t = golNaPartida(t, t.jogos[1].id, 'A', t.times[0].jogadores[0], 1000)
    t = comecarIntervalo(t, t.jogos[1].id)
    const partes = separar(t)
    expect(temListaDentroDeLista(partes.base)).toBe(true) // é o problema: os grupos
    expect(temListaDentroDeLista(baseParaNuvem(partes.base!))).toBe(false)
    for (const p of partes.partidas) expect(temListaDentroDeLista(p)).toBe(false)
    for (const r of Object.values(partes.resultados)) expect(temListaDentroDeLista(r)).toBe(false)
  })

  it('vai e volta da nuvem igual (e lê o formato antigo)', () => {
    const t = sorteado(torneioCom(9, 'grupos', { grupos: 3 }))
    const base = separar(t).base!
    expect(baseDaNuvem(JSON.parse(JSON.stringify(baseParaNuvem(base))))).toEqual(base)
    expect(baseDaNuvem(JSON.parse(JSON.stringify(base))).grupos).toEqual(base.grupos)
  })
})
