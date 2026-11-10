import { describe, expect, it } from 'vitest'
import { conquistaLendaria, conquistasDaCarta, nivelDaCarta, numerosDaCarta, peladasDaTemporada, resumoParaAsCartas, temporadasDaCarta, turmasDaCarta, type PeladaDaCarta } from '../carta'
import type { Estado, Partida } from '../../types/pelada'

const pelada = (id: string, turma: string, parcial: Partial<PeladaDaCarta>): PeladaDaCarta => ({
  id, turma, nomeDaTurma: turma === 'terca' ? 'Terça' : 'Sábado', data: 1,
  jogos: 0, vitorias: 0, empates: 0, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0, ...parcial,
})

describe('carta do jogador', () => {
  const peladas = [
    pelada('a', 'terca', { jogos: 4, vitorias: 2, empates: 1, gols: 3, assistencias: 1, amarelos: 1 }),
    pelada('b', 'terca', { jogos: 2, vitorias: 1, gols: 1 }),
    pelada('c', 'sabado', { jogos: 3, vitorias: 3, gols: 5, assistencias: 2, vermelhos: 1 }),
  ]

  it('soma todas as peladas, em qualquer turma', () => {
    expect(numerosDaCarta(peladas)).toMatchObject({ peladas: 3, jogos: 9, vitorias: 6, empates: 1, derrotas: 2, gols: 9, assistencias: 3 })
  })

  it('o filtro mostra só uma turma', () => {
    expect(numerosDaCarta(peladas, 'sabado')).toMatchObject({ peladas: 1, jogos: 3, gols: 5, derrotas: 0, aproveitamento: 100 })
  })

  it('aproveitamento conta 3 pontos por vitória e 1 por empate', () => {
    expect(numerosDaCarta(peladas, 'terca').aproveitamento).toBe(56) // 10 de 18 pontos
  })

  it('sem jogos, tudo zerado (a carta começa do zero)', () => {
    expect(numerosDaCarta([])).toMatchObject({ jogos: 0, aproveitamento: 0, derrotas: 0 })
  })

  it('o filtro lista a turma mais jogada primeiro', () => {
    expect(turmasDaCarta(peladas).map((turma) => [turma.nome, turma.peladas])).toEqual([['Terça', 2], ['Sábado', 1]])
  })

  describe('resumo ao encerrar', () => {
    const zico = { id: 'z', nome: 'ZICO', conta: 'conta-zico' }
    const socrates = { id: 's', nome: 'SÓCRATES' }
    const adversario = { id: 'a', nome: 'ADVERSÁRIO', conta: 'conta-adv' }
    const partida = (numero: number, resultado: Partida['resultado'], extra: Partial<Partida> = {}) => ({
      numero, timeA: { numero: 1, jogadores: [zico, socrates], vitoriasSeguidas: 0 }, timeB: { numero: 2, jogadores: [adversario], vitoriasSeguidas: 0 },
      placar: [1, 0], resultado, sairam: [], gols: [], cartoes: [], goleiros: { A: null, B: null }, ...extra,
    }) as unknown as Partida
    const estado = (historico: Partida[]) => ({ historico, fila: [], emCampo: null, machucados: [], gols: [], cartoes: [], config: { linha: 1 } }) as unknown as Estado

    it('soma jogos, gols e passes por conta; quem é só nome fica de fora', () => {
      const gol = { lado: 'A', autorId: 'z', autor: 'ZICO', goleiroSofreu: null, assistenciaId: 'a' }
      const resumos = resumoParaAsCartas(estado([partida(1, 'A', { gols: [gol] as Partida['gols'] }), partida(2, 'empate')]))
      expect(resumos.map((resumo) => resumo.conta).sort()).toEqual(['conta-adv', 'conta-zico'])
      expect(resumos.find((resumo) => resumo.conta === 'conta-zico')).toMatchObject({ jogos: 2, vitorias: 1, empates: 1, gols: 1, artilheiroDoDia: true, naSelecao: true })
      expect(resumos.find((resumo) => resumo.conta === 'conta-adv')).toMatchObject({ jogos: 2, vitorias: 0, assistencias: 1 })
    })

    it('maior sequência de vitórias: uma derrota zera', () => {
      const [resumo] = resumoParaAsCartas(estado([partida(1, 'A'), partida(2, 'A'), partida(3, 'B'), partida(4, 'A')])).filter((item) => item.conta === 'conta-zico')
      expect(resumo.vitoriasSeguidas).toBe(2)
    })

    it('gol contra e cartões; o vermelho dos 2 amarelos não conta de novo', () => {
      const cartoes = [
        { lado: 'A', jogadorId: 'z', nome: 'ZICO', cor: 'amarelo', tempoMs: 0 }, { lado: 'A', jogadorId: 'z', nome: 'ZICO', cor: 'amarelo', tempoMs: 1 },
        { lado: 'A', jogadorId: 'z', nome: 'ZICO', cor: 'vermelho', tempoMs: 1, porDoisAmarelos: true },
      ] as Partida['cartoes']
      const gols = [{ lado: 'B', autorId: 'z', autor: 'ZICO', goleiroSofreu: null, contra: true }] as Partida['gols']
      const [resumo] = resumoParaAsCartas(estado([partida(1, 'B', { cartoes, gols })])).filter((item) => item.conta === 'conta-zico')
      expect(resumo).toMatchObject({ amarelos: 2, vermelhos: 0, golsContra: 1, gols: 0 })
    })

    describe('goleiro fixo', () => {
      const comGoleiros = (historico: Partida[], contas: Record<string, string>) => ({ ...estado(historico), contasDosGoleiros: contas }) as Estado
      const goleiros = { A: 'TAFFAREL', B: 'DIDA' }

      it('joga por quem estiver na frente dele: jogos, vitórias e jogos sem levar gol (só para ele)', () => {
        const historico = [partida(1, 'A', { goleiros }), partida(2, 'B', { goleiros, placar: [0, 2] } as Partial<Partida>), partida(3, 'A', { goleiros })]
        const resumos = resumoParaAsCartas(comGoleiros(historico, { TAFFAREL: 'conta-taffarel' }))
        expect(resumos.find((resumo) => resumo.conta === 'conta-taffarel')).toMatchObject({ jogos: 3, vitorias: 2, jogosSemSofrer: 2, vitoriasSeguidas: 1 })
        // quem joga na linha não ganha "jogo sem levar gol"
        expect(resumos.find((resumo) => resumo.conta === 'conta-zico')?.jogosSemSofrer).toBe(0)
      })

      it('o que mais venceu vai para a seleção; o menos vazado ganha a luva de ouro', () => {
        const historico = [partida(1, 'A', { goleiros, placar: [3, 1] } as Partial<Partida>), partida(2, 'A', { goleiros, placar: [2, 1] } as Partial<Partida>),
          partida(3, 'B', { goleiros, placar: [0, 1] } as Partial<Partida>)]
        const golsSofridos = [{ goleiroSofreu: 'TAFFAREL' }, { goleiroSofreu: 'TAFFAREL' }, { goleiroSofreu: 'TAFFAREL' }, { goleiroSofreu: 'DIDA' }, { goleiroSofreu: 'DIDA' }]
        historico[0].gols = [golsSofridos[0], golsSofridos[3]] as Partida['gols']
        historico[1].gols = [golsSofridos[1]] as Partida['gols']
        historico[2].gols = [golsSofridos[2]] as Partida['gols']
        const resumos = resumoParaAsCartas(comGoleiros(historico, { TAFFAREL: 'conta-taffarel', DIDA: 'conta-dida' }))
        expect(resumos.find((resumo) => resumo.conta === 'conta-taffarel')).toMatchObject({ vitorias: 2, naSelecao: true, luvaDeOuro: false })
        expect(resumos.find((resumo) => resumo.conta === 'conta-dida')).toMatchObject({ vitorias: 1, naSelecao: false, luvaDeOuro: true })
      })

      it('gol do goleiro fixo vai para a carta dele', () => {
        const gol = { lado: 'A', autorId: 'goleiro:taffarel', autor: 'TAFFAREL', goleiroSofreu: null }
        const [resumo] = resumoParaAsCartas(comGoleiros([partida(1, 'A', { goleiros, gols: [gol] as Partida['gols'] })], { TAFFAREL: 'conta-taffarel' }))
          .filter((item) => item.conta === 'conta-taffarel')
        expect(resumo.gols).toBe(1)
      })

      it('goleiro sem conta (só o nome) não vai para carta nenhuma', () => {
        expect(resumoParaAsCartas(comGoleiros([partida(1, 'A', { goleiros })], {})).map((resumo) => resumo.conta).sort()).toEqual(['conta-adv', 'conta-zico'])
      })
    })
  })

  describe('temporadas', () => {
    const em = (ano: number, id: string) => pelada(id, 'terca', { data: new Date(ano, 5, 1).getTime(), gols: 10 })

    it('cada ano é uma temporada: a carta recomeça', () => {
      const lista = [em(2026, 'a'), em(2026, 'b'), em(2027, 'c')]
      expect(numerosDaCarta(peladasDaTemporada(lista, 2026)).gols).toBe(20)
      expect(numerosDaCarta(peladasDaTemporada(lista, 2027)).gols).toBe(10)
      expect(numerosDaCarta(peladasDaTemporada(lista, 2028)).gols).toBe(0)
    })

    it('lista a mais nova primeiro e sempre mostra a atual', () => {
      expect(temporadasDaCarta([em(2025, 'a'), em(2026, 'b'), em(2025, 'c')], 2027)).toEqual([2027, 2026, 2025])
      expect(temporadasDaCarta([], 2027)).toEqual([2027])
    })
  })

  describe('conquistas', () => {
    const conquista = (lista: PeladaDaCarta[], id: string) => conquistasDaCarta(lista).find((item) => item.id === id)!

    it('sem jogos, nenhuma insígnia e a primeira meta pela frente', () => {
      expect(conquista([], 'artilheiro')).toMatchObject({ nivel: null, valor: 0, proximaMeta: 10 })
    })

    it('exatamente na meta já ganha o nível', () => {
      expect(conquista([pelada('a', 'terca', { gols: 10 })], 'artilheiro')).toMatchObject({ nivel: 'bronze', proximaMeta: 30 })
      expect(conquista([pelada('a', 'terca', { gols: 30 })], 'artilheiro')).toMatchObject({ nivel: 'prata', proximaMeta: 80 })
    })

    it('no ouro não há próxima meta', () => {
      expect(conquista([pelada('a', 'terca', { gols: 200 })], 'artilheiro')).toMatchObject({ nivel: 'ouro', proximaMeta: null })
    })

    it('dia inspirado olha a melhor pelada, não a soma', () => {
      const lista = [pelada('a', 'terca', { gols: 2 }), pelada('b', 'terca', { gols: 2 }), pelada('c', 'terca', { gols: 2 })]
      expect(conquista(lista, 'dia-inspirado')).toMatchObject({ valor: 2, nivel: null })
      expect(conquista([pelada('a', 'terca', { gols: 5 })], 'dia-inspirado').nivel).toBe('prata')
    })

    it('a cor da carta sobe com as conquistas', () => {
      expect(nivelDaCarta(conquistasDaCarta([]))).toBe('bronze')
      // 1 + 1 + 1 + dia inspirado 3 + pé de anjo 2 = 8 pontos
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', { gols: 10, assistencias: 5, vitorias: 50 })]))).toBe('prata')
      // 2 + 2 + 2 + dia inspirado 3 + pé de anjo 3 = 12 pontos
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', { gols: 50, assistencias: 25, vitorias: 60 })]))).toBe('ouro')
      const diamante = [ // cinco no ouro e Rodado na prata: 15 + 2 pontos
        pelada('a', 'terca', { gols: 200, assistencias: 100, vitorias: 200 }), pelada('b', 'sabado', {}), pelada('c', 'domingo', {}),
        ...Array.from({ length: 100 }, (_, indice) => pelada(`p${indice}`, 'terca', {})),
      ]
      expect(nivelDaCarta(conquistasDaCarta(diamante))).toBe('diamante')
    })

    it('goleiro: muralha soma as peladas, paredão olha a melhor', () => {
      const lista = [pelada('a', 'terca', { jogosSemSofrer: 8 }), pelada('b', 'terca', { jogosSemSofrer: 2 })]
      expect(conquista(lista, 'muralha')).toMatchObject({ valor: 10, nivel: 'bronze' })
      expect(conquista(lista, 'paredao')).toMatchObject({ valor: 8, nivel: 'ouro' })
      expect(conquista([pelada('a', 'terca', { jogosSemSofrer: 1 }), pelada('b', 'terca', { jogosSemSofrer: 1 })], 'paredao').nivel).toBeNull() // olha uma pelada só
    })

    it('peladas antigas, sem os números de goleiro, valem zero', () => {
      expect(numerosDaCarta([pelada('a', 'terca', {})])).toMatchObject({ jogosSemSofrer: 0 })
    })

    it('aproveitamento só vale com 20 jogos ou mais', () => {
      expect(conquista([pelada('a', 'terca', { jogos: 19, vitorias: 19 })], 'aproveitamento')).toMatchObject({ valor: 0, nivel: null })
      expect(conquista([pelada('a', 'terca', { jogos: 20, vitorias: 20 })], 'aproveitamento')).toMatchObject({ valor: 100, nivel: 'ouro' })
    })

    it('a cor da carta soma só as 6 melhores: goleiro e linha têm as mesmas chances', () => {
      const goleiro = [
        pelada('a', 'terca', { jogos: 100, vitorias: 80, jogosSemSofrer: 100, gols: 0 }),
        ...Array.from({ length: 100 }, (_, indice) => pelada(`p${indice}`, 'terca', {})),
      ] // muralha, paredão, assíduo, aproveitamento e vencedor: 3 + 3 + 3 + 3 + 2 = 14 pontos
      expect(nivelDaCarta(conquistasDaCarta(goleiro))).toBe('ouro')
      const conquistasCheias = conquistasDaCarta([pelada('a', 'terca', { gols: 200, assistencias: 100, vitorias: 200, jogos: 200, jogosSemSofrer: 100 })])
      expect(conquistasCheias.filter((item) => item.nivel === 'ouro').length).toBeGreaterThan(6)
      expect(nivelDaCarta(conquistasCheias)).toBe('lendaria') // 8 no ouro: contam só 6 nos pontos (18), e os 8 liberam a lendária
    })

    it('conquistas novas: seleção, artilheiro do dia, sequência e assistências no dia', () => {
      const lista = [
        pelada('a', 'terca', { naSelecao: true, artilheiroDoDia: true, vitoriasSeguidas: 3, assistencias: 2 }),
        pelada('b', 'terca', { naSelecao: true, artilheiroDoDia: true, vitoriasSeguidas: 6, assistencias: 1 }),
      ]
      expect(conquista(lista, 'rei-do-camarote')).toMatchObject({ valor: 2, nivel: 'bronze' })
      expect(conquista(lista, 'artilheiro-do-dia')).toMatchObject({ valor: 2, nivel: 'bronze' })
      expect(conquista(lista, 'imortal')).toMatchObject({ valor: 6, nivel: 'prata' }) // a melhor pelada, não a soma
      expect(conquista(lista, 'pe-de-anjo')).toMatchObject({ valor: 2, nivel: 'bronze' })
    })

    it('Pé Trocado tira pontos e pode derrubar a carta', () => {
      const boa = { gols: 50, assistencias: 25, vitorias: 60 } // 2 + 2 + 2 + dia inspirado e pé de anjo no ouro: 12 pontos
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', boa)]))).toBe('ouro')
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', { ...boa, golsContra: 1 })]))).toBe('prata') // 11 pontos
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', { golsContra: 5 })]))).toBe('bronze') // nunca fica negativo
    })

    it('carta lendária: 18 pontos e 8 insígnias no ouro; um gol contra já tira', () => {
      const craque = { gols: 80, assistencias: 40, vitorias: 150, jogos: 200, jogosSemSofrer: 50 }
      // artilheiro, garçom, vencedor, dia inspirado, pé de anjo, aproveitamento, muralha e dia de paredão: 8 no ouro
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', craque)]))).toBe('lendaria')
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', { ...craque, golsContra: 1 })]))).toBe('diamante') // 17 pontos
      const seteNoOuro = { ...craque, jogosSemSofrer: 0 } // artilheiro, garçom, vencedor, dia inspirado, pé de anjo e aproveitamento
      expect(nivelDaCarta(conquistasDaCarta([pelada('a', 'terca', seteNoOuro)]))).toBe('diamante')
    })

    it('Lenda: vem da carta lendária e fica para sempre, mesmo em outra temporada', () => {
      const craque = { gols: 80, assistencias: 40, vitorias: 150, jogos: 200, jogosSemSofrer: 50 }
      expect(conquistaLendaria([pelada('a', 'terca', { gols: 80 })])).toMatchObject({ nivel: null, valor: 0, proximaMeta: 1 })
      const passada = pelada('a', 'terca', { ...craque, data: new Date(2026, 5, 1).getTime() })
      const nova = pelada('b', 'terca', { jogos: 1, data: new Date(2027, 1, 1).getTime() })
      expect(conquistaLendaria([passada, nova])).toMatchObject({ nivel: 'ouro', valor: 1, proximaMeta: null })
    })

    it('rodado conta turmas diferentes', () => {
      expect(conquista(peladas, 'rodado')).toMatchObject({ valor: 2, nivel: 'bronze' })
    })
  })
})
