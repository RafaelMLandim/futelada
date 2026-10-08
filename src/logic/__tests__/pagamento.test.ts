import { describe, expect, it } from 'vitest'
import { configPadrao, marcarPagamento, pagantes, removerJogador, resumoPagamentos, valorPorPessoa } from '..'
import type { Config } from '../../types/pelada'
import { LISTA, sessao } from './utils'

const pago = (c: Partial<Config['pagamento']> = {}): Config => ({ ...configPadrao, pagamento: { ...configPadrao.pagamento, ativo: true, valorCampo: 120, ...c } })

describe('campo pago', () => {
  it('proporcional: campo ÷ jogadores (12 pessoas, R$ 120 → R$ 10)', () => {
    const s = sessao([...LISTA, 'Zeca', 'Tião'], pago())
    expect(valorPorPessoa(s)).toBe(10)
  })

  it('arredonda para cima no centavo (R$ 120 ÷ 7 = R$ 17,15)', () => {
    expect(valorPorPessoa(sessao(LISTA.slice(0, 7), pago()))).toBe(17.15)
  })

  it('valor fixo (para fazer caixa): o que passa do campo é a sobra', () => {
    let s = sessao([...LISTA, 'Zeca', 'Tião'], pago({ modo: 'fixo', valorFixo: 15 }))
    for (const j of pagantes(s)) s = marcarPagamento(s, j, 'pago')
    expect(resumoPagamentos(s)).toMatchObject({ pessoas: 12, pagos: 12, valor: 15, arrecadado: 180, sobra: 60 })
  })

  it('quem avisou e quem pagou; quem foi embora depois de pagar continua na conta', () => {
    let s = sessao(LISTA, pago())
    const [joao, carlos] = pagantes(s).filter((j) => ['João', 'Carlos'].includes(j.nome))
    s = marcarPagamento(s, joao, 'avisou')
    s = marcarPagamento(s, carlos, 'pago')
    expect(resumoPagamentos(s)).toMatchObject({ pessoas: 10, pagos: 1, avisaram: 1, valor: 12 })
    s = removerJogador(s, carlos.id) // foi embora, mas pagou
    expect(pagantes(s).map((j) => j.nome)).toContain('Carlos')
    expect(valorPorPessoa(s)).toBe(12)
    s = marcarPagamento(s, joao, null) // desmarcou
    expect(s.pagamentos[joao.id]).toBeUndefined()
  })
})
