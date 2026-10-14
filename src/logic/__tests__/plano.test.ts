import { describe, expect, it } from 'vitest'
import { comoCriarTorneio, situacaoDoPlano, textoDasPeladasGratis, type DadosDoPlano } from '../plano'

// Plano pago (PLANO.md, seção 14).

const AGORA = new Date(2026, 9, 8).getTime()
const DIA = 24 * 3600_000
const dados = (d: Partial<DadosDoPlano> = {}): DadosDoPlano => ({
  plano: { premiumAte: null, creditosTorneio: 0 }, contadores: { peladas: 0, torneios: 0 }, aparelho: 0, config: { ativa: true }, ...d,
})

describe('plano', () => {
  it('cobrança desligada (ou sem saber, sem internet): tudo liberado, sem contador na tela', () => {
    for (const config of [{ ativa: false }, null]) {
      const s = situacaoDoPlano(dados({ config, contadores: { peladas: 30, torneios: 5 } }), AGORA)
      expect(s.podeComecarPelada).toBe(true)
      expect(comoCriarTorneio(s)).toBe('liberado')
      expect(textoDasPeladasGratis(s)).toBeNull()
    }
  })

  it('10 peladas grátis: conta e celular, o que acabar primeiro', () => {
    expect(textoDasPeladasGratis(situacaoDoPlano(dados(), AGORA))).toBe('Pelada 1 de 10 grátis')
    expect(situacaoDoPlano(dados({ contadores: { peladas: 9, torneios: 0 } }), AGORA).podeComecarPelada).toBe(true)
    expect(situacaoDoPlano(dados({ contadores: { peladas: 10, torneios: 0 } }), AGORA).podeComecarPelada).toBe(false)
    // conta nova no mesmo celular: o celular já usou as 10
    const outraConta = situacaoDoPlano(dados({ aparelho: 10 }), AGORA)
    expect(outraConta.podeComecarPelada).toBe(false)
    expect(textoDasPeladasGratis(outraConta)).toBe('Peladas grátis usadas')
  })

  it('Premium válido libera; vencido volta a contar as grátis', () => {
    const premium = situacaoDoPlano(dados({ plano: { premiumAte: AGORA + DIA, creditosTorneio: 0 }, contadores: { peladas: 40, torneios: 0 } }), AGORA)
    expect(premium.podeComecarPelada).toBe(true)
    expect(textoDasPeladasGratis(premium)).toBeNull()
    const vencido = situacaoDoPlano(dados({ plano: { premiumAte: AGORA - DIA, creditosTorneio: 0 }, contadores: { peladas: 40, torneios: 0 } }), AGORA)
    expect(vencido.podeComecarPelada).toBe(false)
  })

  it('torneio: o 1º é grátis; depois, com crédito; sem crédito, bloqueado', () => {
    expect(comoCriarTorneio(situacaoDoPlano(dados(), AGORA))).toBe('gratis')
    expect(comoCriarTorneio(situacaoDoPlano(dados({ contadores: { peladas: 0, torneios: 1 }, plano: { premiumAte: null, creditosTorneio: 2 } }), AGORA))).toBe('credito')
    expect(comoCriarTorneio(situacaoDoPlano(dados({ contadores: { peladas: 0, torneios: 1 } }), AGORA))).toBe('bloqueado')
  })

  it('Premium avulso (12 meses no Pix): vence e não renova; conta os dias para avisar', () => {
    const avulso = situacaoDoPlano(dados({ plano: { premiumAte: AGORA + 20 * DIA, creditosTorneio: 0, assinatura: false } }), AGORA)
    expect(avulso.premium).toBe(true)
    expect(avulso.renovaSozinho).toBe(false)
    expect(avulso.diasParaVencer).toBe(20)
    const assinatura = situacaoDoPlano(dados({ plano: { premiumAte: AGORA + 20 * DIA, creditosTorneio: 0, assinatura: true } }), AGORA)
    expect(assinatura.renovaSozinho).toBe(true)
    expect(assinatura.diasParaVencer).toBeNull()
  })
})
