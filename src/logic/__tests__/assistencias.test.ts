import { describe, expect, it } from 'vitest'
import { comecar, configPadrao, definirAutorDoGol, garcons, gol, passe, peladaParaGuardar, removerGol, vitoria } from '..'
import { relatorioDoAno } from '../relatorio'
import { descreverMudanca } from '../../store/desfazer'
import { LISTA, sessao } from './utils'

// Assistências (quem deu o passe para o gol) e o Troféu Garçom.
// T1 João Carlos Bruno Marcos x T2 Rafael Daniel Junior Landim; fila Mano Lucas

describe('assistências', () => {
  it('começam desligadas', () => {
    expect(configPadrao.assistencias).toBe(false)
  })

  it('o passe fica guardado no gol certo e pode ser tirado', () => {
    let s = comecar(sessao(LISTA))
    const [joao, carlos] = s.emCampo!.A.jogadores
    s = gol(s, 'A', joao)
    s = gol(s, 'A', carlos)
    s = passe(s, 1, joao) // passe do João para o 2º gol (do Carlos)
    expect(s.gols[0].assistencia).toBeUndefined()
    expect(s.gols[1]).toMatchObject({ autor: 'Carlos', assistencia: 'João', assistenciaId: joao.id })
    s = passe(s, 1, null)
    expect(s.gols[1].assistencia).toBeUndefined()
    expect(s.gols[1].assistenciaId).toBeUndefined()
    expect(passe(s, 9, joao)).toBe(s) // gol que não existe: nada muda
  })

  it('Troféu Garçom: mais passes, inclusive da partida em andamento; no empate, quem jogou menos', () => {
    let s = comecar(sessao(LISTA))
    const [joao, carlos] = s.emCampo!.A.jogadores
    const [rafael, daniel] = s.emCampo!.B.jogadores
    s = passe(gol(s, 'A', joao), 0, carlos)
    s = passe(gol(s, 'B', rafael), 1, daniel)
    s = vitoria(s, 'A') // o T2 sai; entra o próximo
    s = passe(gol(s, 'A', carlos), 0, joao)
    // todos com 1 passe em 1 jogo terminado: empate total, sai pela ordem do nome
    expect(garcons(s).map((g) => [g.nome, g.assistencias, g.jogos])).toEqual([['Carlos', 1, 1], ['Daniel', 1, 1], ['João', 1, 1]])
    s = passe(gol(s, 'A', joao), 1, carlos)
    expect(garcons(s)[0]).toMatchObject({ nome: 'Carlos', assistencias: 2 })
  })

  it('no empate de passes, o garçom é quem jogou menos', () => {
    let s = comecar(sessao([...LISTA, 'Pedro', 'Tiago', 'Igor', 'Vitor', 'Caio', 'Davi'])) // fila cheia: quem perde não volta logo
    const [joao, carlos] = s.emCampo!.A.jogadores
    const [rafael, daniel] = s.emCampo!.B.jogadores
    s = passe(gol(s, 'B', rafael), 0, daniel) // Daniel: 1 passe, mas o time dele perde e sai (1 jogo)
    s = vitoria(s, 'A')
    s = passe(gol(s, 'A', carlos), 0, joao)
    s = vitoria(s, 'A') // João: 1 passe em 2 jogos
    expect(garcons(s).map((g) => [g.nome, g.jogos])).toEqual([['Daniel', 1], ['João', 2]])
  })

  it('remover o gol tira o passe dele', () => {
    let s = comecar(sessao(LISTA))
    const [joao, carlos] = s.emCampo!.A.jogadores
    s = passe(gol(s, 'A', joao), 0, carlos)
    s = removerGol(s, 0)
    expect(garcons(s)).toEqual([])
  })

  it('corrigir o autor: o passe fica, menos se virou gol contra, sem autor ou o próprio garçom', () => {
    let s = comecar(sessao(LISTA))
    const [joao, carlos, bruno] = s.emCampo!.A.jogadores
    const [rafael] = s.emCampo!.B.jogadores
    s = passe(gol(s, 'A', joao), 0, carlos)
    expect(definirAutorDoGol(s, null, 0, bruno).gols[0]).toMatchObject({ autor: 'Bruno', assistencia: 'Carlos' })
    expect(definirAutorDoGol(s, null, 0, carlos).gols[0].assistencia).toBeUndefined()
    expect(definirAutorDoGol(s, null, 0, null).gols[0].assistencia).toBeUndefined()
    expect(definirAutorDoGol(s, null, 0, rafael, true).gols[0].assistencia).toBeUndefined()
  })

  it('garçom do ano: soma os passes de todas as peladas', () => {
    const umaPelada = (passes: number) => {
      let s = comecar(sessao(LISTA))
      const [joao, carlos] = s.emCampo!.A.jogadores
      for (let indice = 0; indice < passes; indice++) s = passe(gol(s, 'A', joao), indice, carlos)
      return vitoria(s, 'A')
    }
    const dia = (numero: number) => new Date(2026, 0, numero).getTime()
    const r = relatorioDoAno([peladaParaGuardar(umaPelada(2), dia(1), 'x'), peladaParaGuardar(umaPelada(1), dia(8), 'x')], [], 2026)
    expect(r.garcom).toMatchObject({ nome: 'Carlos', assistencias: 3 })
    const semPasse = relatorioDoAno([peladaParaGuardar(umaPelada(0), dia(1), 'x')], [], 2026)
    expect(semPasse.garcom).toBeNull()
  })

  it('o "Desfazer" do passe diz que é o passe (não quem fez o gol)', () => {
    const antes = gol(comecar(sessao(LISTA)), 'A', comecar(sessao(LISTA)).emCampo!.A.jogadores[0])
    const carlos = antes.emCampo!.A.jogadores[1]
    expect(descreverMudanca(antes, passe(antes, 0, carlos))).toBe('o passe para o gol (Carlos)')
  })
})
