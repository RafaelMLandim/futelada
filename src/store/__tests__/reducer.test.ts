import { describe, expect, it } from 'vitest'
import { adicionarJogador, comecar, configPadrao, gol, inverterColetes, novoJogador, vitoria } from '../../logic'
import { LIMITE_DESFAZER } from '../desfazer'
import { estadoInicial, reducer } from '../reducer'

describe('encerrar a pelada', () => {
  it('apaga os goleiros do dia e mantém as outras configurações', () => {
    const app = estadoInicial({ ...configPadrao, tempoMin: 12, goleiros: ['ZÉ', 'TIÃO'] })
    const novo = reducer(app, { tipo: 'encerrar' })
    expect(novo.estado.config.goleiros).toEqual([])
    expect(novo.estado.config.tempoMin).toBe(12)
  })
})

describe('cancelar a pelada', () => {
  it('apaga tudo do dia (lista, jogos, pagamentos, link) e não guarda nada', () => {
    let app = reducer(estadoInicial({ ...configPadrao, goleiros: ['ZÉ'] }), { tipo: 'iniciar' })
    app = reducer(app, { tipo: 'aplicar', fn: (e) => ({ ...e, fila: [{ id: 'j1', nome: 'JOÃO' }], cobranca: 'ABC123', pagamentos: { j1: { nome: 'JOÃO', status: 'pago' } } }) })
    const novo = reducer(app, { tipo: 'cancelar' })
    expect(novo.iniciada).toBe(false)
    expect(novo.estado).toMatchObject({ fila: [], historico: [], pagamentos: {}, cobranca: null, caixaLancado: false })
    expect(novo.estado.config.goleiros).toEqual([])
  })

  it('volta os ajustes de antes da pelada (ex.: o campo pago de teste some), na criação ou depois', () => {
    const antes = { ...configPadrao, tempoMin: 12 }
    let app = estadoInicial(antes)
    const pago = { ...antes.pagamento, ativo: true, valorFixo: 15, modo: 'fixo' as const }
    app = reducer(app, { tipo: 'aplicar', fn: (e) => ({ ...e, config: { ...e.config, pagamento: pago, tempoMin: 7 } }) })
    app = reducer(app, { tipo: 'iniciar' })
    const novo = reducer(app, { tipo: 'cancelar' })
    expect(novo.estado.config.pagamento.ativo).toBe(false)
    expect(novo.estado.config.tempoMin).toBe(12)
  })
})

describe('desfazer a última ação', () => {
  const comJogo = () => {
    let app = reducer(estadoInicial(), { tipo: 'iniciar' })
    for (const n of 'ABCDEFGHIJKL') app = reducer(app, { tipo: 'aplicar', fn: (e) => adicionarJogador(e, novoJogador(n)) })
    return reducer(app, { tipo: 'aplicar', fn: comecar, novaPartida: true })
  }

  it('desfaz o fim de partida dado para o time errado: a lista, o placar e o relógio voltam', () => {
    let app = comJogo()
    app = reducer(app, { tipo: 'aplicar', fn: (e) => gol(e, 'A') })
    app = { ...app, crono: { rodando: false, inicio: 0, acumulado: 300_000 } }
    const antes = app.estado
    app = reducer(app, { tipo: 'aplicar', fn: (e) => vitoria(e, 'B'), novaPartida: true })
    expect(app.desfazer?.at(-1)?.descricao).toBe('o fim da partida 1 (vitória do Time 2)')
    expect(app.crono.acumulado).toBe(0)
    app = reducer(app, { tipo: 'desfazer' })
    expect(app.estado).toEqual(antes)
    expect(app.crono.acumulado).toBe(300_000)
    expect(app.desfazer?.at(-1)?.descricao).toBe('o gol do Time 1')
  })

  it('desfazer um gol não mexe no relógio; pagamentos e ajustes não voltam junto', () => {
    let app = comJogo()
    app = reducer(app, { tipo: 'aplicar', fn: (e) => gol(e, 'A') })
    app = { ...app, crono: { rodando: true, inicio: 1000, acumulado: 0 } }
    app = reducer(app, { tipo: 'aplicar', fn: (e) => ({ ...e, pagamentos: { x: { nome: 'A', status: 'pago' } }, config: { ...e.config, tempoMin: 7 } }) })
    expect(app.desfazer?.at(-1)?.descricao).toBe('o gol do Time 1') // pagamento e ajuste não entram
    app = reducer(app, { tipo: 'desfazer' })
    expect(app.estado.placar).toEqual([0, 0])
    expect(app.estado.pagamentos).toEqual({ x: { nome: 'A', status: 'pago' } })
    expect(app.estado.config.tempoMin).toBe(7)
    expect(app.crono).toEqual({ rodando: true, inicio: 1000, acumulado: 0 })
  })

  it('guarda só as últimas ações e some ao encerrar a pelada', () => {
    let app = comJogo()
    for (let i = 0; i < 15; i++) app = reducer(app, { tipo: 'aplicar', fn: (e) => gol(e, 'A') })
    expect(app.desfazer).toHaveLength(LIMITE_DESFAZER)
    expect(reducer(app, { tipo: 'encerrar' }).desfazer).toBeUndefined()
    expect(reducer(estadoInicial(), { tipo: 'desfazer' })).toEqual(estadoInicial())
  })

  it('coletes invertidos e entrada na lista também desfazem', () => {
    let app = comJogo()
    app = reducer(app, { tipo: 'aplicar', fn: inverterColetes })
    expect(app.desfazer?.at(-1)?.descricao).toBe('a troca dos coletes')
    app = reducer(app, { tipo: 'aplicar', fn: (e) => adicionarJogador(e, novoJogador('ZECA')) })
    expect(app.desfazer?.at(-1)?.descricao).toBe('a entrada de ZECA na lista')
    const coletes = comJogo().estado.config.coletes
    app = reducer(reducer(app, { tipo: 'desfazer' }), { tipo: 'desfazer' })
    expect(app.estado.config.coletes).toEqual(coletes)
  })
})
