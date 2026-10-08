import { describe, expect, it } from 'vitest'
import { artilharia, comecar, criterioDoArtilheiro, darCartao, removerJogador, configPadrao, empate, gol, goleirosMenosVazados, selecaoDaPelada, vitoria, vitoriasPorJogador } from '..'
import { LISTA, sessao } from './utils'

describe('artilharia', () => {
  it('conta os gols de cada jogador, inclusive da partida em andamento', () => {
    let s = comecar(sessao(LISTA))
    const [joao] = s.emCampo!.A.jogadores
    const [rafael] = s.emCampo!.B.jogadores
    s = gol(s, 'A', joao)
    s = gol(s, 'A', joao)
    s = vitoria(s, 'A')
    s = gol(s, 'A', joao)
    s = gol(s, 'B', rafael)
    s = gol(s, 'B') // sem autor: conta no placar, não na artilharia
    expect(s.placar).toEqual([1, 2])
    expect(artilharia(s).map((a) => [a.nome, a.gols])).toEqual([['João', 3], ['Rafael', 1]])
  })

  it('gol contra conta no placar do adversário e não mexe nos gols de quem fez', () => {
    let s = comecar(sessao(LISTA, { ...configPadrao, goleiros: ['Zé', 'Tião'] }))
    const [joao] = s.emCampo!.A.jogadores
    s = gol(s, 'A', joao) // João marca para o A
    s = gol(s, 'B', joao, undefined, true) // João faz contra: ponto para o B
    expect(s.placar).toEqual([1, 1])
    expect(s.gols[1]).toMatchObject({ lado: 'B', autor: 'João', contra: true, goleiroSofreu: 'Zé' })
    expect(artilharia(s).map((a) => [a.nome, a.gols])).toEqual([['João', 1]])
  })
})

describe('desempate da artilharia (sai um só artilheiro)', () => {
  // T1 João Carlos Bruno Marcos x T2 Rafael Daniel Junior Landim; fila Mano Lucas
  it('com os mesmos gols, vence quem jogou menos', () => {
    let s = comecar(sessao(LISTA))
    const [joao] = s.emCampo!.A.jogadores
    const [rafael] = s.emCampo!.B.jogadores
    s = gol(s, 'A', joao)
    s = gol(s, 'B', rafael)
    s = gol(s, 'B', rafael) // Rafael: 2 gols no 1º jogo
    s = vitoria(s, 'A')
    s = removerJogador(s, rafael.id) // foi embora: fica com 1 jogo
    s = gol(s, 'A', joao)
    s = vitoria(s, 'A') // João: 2 gols em 2 jogos
    const a = artilharia(s)
    expect(a.slice(0, 2).map((x) => [x.nome, x.gols, x.jogos])).toEqual([['Rafael', 2, 1], ['João', 2, 2]])
    expect(criterioDoArtilheiro(a)).toBe('menos jogos')
  })

  it('mesmos gols e jogos: mais vitórias; depois menos cartões; por fim quem chegou primeiro', () => {
    let s = comecar(sessao(LISTA))
    const [joao] = s.emCampo!.A.jogadores
    const [rafael] = s.emCampo!.B.jogadores
    s = gol(s, 'B', rafael)
    s = gol(s, 'A', joao)
    let a = artilharia(s) // 1 gol cada, nenhum jogo terminado, sem cartões: Rafael marcou antes
    expect(a.map((x) => x.nome)).toEqual(['Rafael', 'João'])
    expect(criterioDoArtilheiro(a)).toBe('chegou primeiro')
    s = darCartao(s, 'B', rafael, 'amarelo', 0)
    a = artilharia(s)
    expect(a[0].nome).toBe('João')
    expect(criterioDoArtilheiro(a)).toBe('menos cartões')
    s = vitoria(s, 'B') // Rafael venceu, João perdeu (1 jogo cada)
    a = artilharia(s)
    expect(a[0].nome).toBe('Rafael')
    expect(criterioDoArtilheiro(a)).toBe('mais vitórias')
  })

  it('sem empate em gols, não precisa de critério', () => {
    let s = comecar(sessao(LISTA))
    const [joao] = s.emCampo!.A.jogadores
    s = gol(s, 'A', joao)
    s = gol(s, 'A', joao)
    s = gol(s, 'B', s.emCampo!.B.jogadores[0])
    expect(criterioDoArtilheiro(artilharia(s))).toBeNull()
  })
})

describe('goleiro menos vazado', () => {
  it('cada gol conta contra o goleiro do outro gol; ordena pela média por jogo', () => {
    let s = comecar(sessao(LISTA, { ...configPadrao, goleiros: ['Zé', 'Tião'] }))
    s = gol(s, 'A') // Tião (gol B) sofre
    s = gol(s, 'A')
    s = vitoria(s, 'A') // Zé 0 em 1 jogo, Tião 2 em 1 jogo
    s = gol(s, 'B') // Zé sofre
    s = empate(s, 'A')
    const g = goleirosMenosVazados(s)
    expect(g.map((x) => [x.nome, x.jogos, x.sofridos])).toEqual([['Zé', 2, 1], ['Tião', 2, 2]])
  })

  it('sem goleiro fixo, ninguém aparece', () => {
    let s = comecar(sessao(LISTA))
    s = gol(s, 'A')
    s = vitoria(s, 'A')
    expect(goleirosMenosVazados(s)).toEqual([])
  })
})

describe('vitórias por jogador (seleção da pelada)', () => {
  it('conta a vitória de cada jogador em qualquer time; a seleção tem o tamanho da linha', () => {
    let s = comecar(sessao(LISTA)) // T1 João Carlos Bruno Marcos x T2 Rafael Daniel Junior Landim; fila Mano Lucas
    const [joao] = s.emCampo!.A.jogadores
    s = gol(s, 'A', joao)
    s = vitoria(s, 'A') // T1 vence: Rafael e Daniel completam o time de Mano e Lucas
    s = vitoria(s, 'B') // o time que entrou vence o T1
    const v = vitoriasPorJogador(s)
    const de = (nome: string) => v.find((x) => x.nome === nome)!
    expect([de('João').vitorias, de('João').jogos, de('João').gols]).toEqual([1, 2, 1])
    expect([de('Mano').vitorias, de('Rafael').vitorias, de('Junior').vitorias]).toEqual([1, 1, 0])
    expect(v[0].nome).toBe('João') // empatados em vitórias, quem fez gol vem antes
    const sel = selecaoDaPelada(s)
    expect(sel).toHaveLength(4)
    expect(sel.every((j) => j.vitorias > 0)).toBe(true)
  })
})
