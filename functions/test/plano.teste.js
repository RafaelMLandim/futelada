import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aplicarEvento, DIA, DOZE_MESES } from '../plano.js'

const agora = Date.UTC(2026, 9, 9)
const ev = (type, product_id, extra = {}) => ({ id: 'e', type, product_id, ...extra })

test('assinatura: compra liga o Premium que renova; cancelar mantém até o fim, sem renovar', () => {
  const ate = agora + 30 * DIA
  let p = aplicarEvento(undefined, ev('INITIAL_PURCHASE', 'pelada_premium:mensal', { expiration_at_ms: ate }), agora)
  assert.equal(p.premiumAte, ate)
  assert.equal(p.assinatura, true)
  p = aplicarEvento(p, ev('CANCELLATION', 'pelada_premium:mensal', { expiration_at_ms: ate, cancel_reason: 'UNSUBSCRIBE' }), agora)
  assert.equal(p.premiumAte, ate)
  assert.equal(p.assinatura, false)
  p = aplicarEvento(p, ev('EXPIRATION', 'pelada_premium:mensal', { expiration_at_ms: ate }), ate + 1)
  assert.equal(p.assinatura, false)
  assert.ok(p.premiumAte <= ate)
})

test('renovação estende a data', () => {
  let p = aplicarEvento(undefined, ev('INITIAL_PURCHASE', 'pelada_premium:anual', { expiration_at_ms: agora + 365 * DIA }), agora)
  p = aplicarEvento(p, ev('RENEWAL', 'pelada_premium:anual', { expiration_at_ms: agora + 730 * DIA }), agora + 365 * DIA)
  assert.equal(p.premiumAte, agora + 730 * DIA)
})

test('12 meses no Pix: soma 12 meses e não renova; comprar de novo soma no fim; reembolso tira', () => {
  let p = aplicarEvento(undefined, ev('NON_RENEWING_PURCHASE', 'premium_12_meses', { purchased_at_ms: agora }), agora)
  assert.equal(p.premiumAte, agora + DOZE_MESES)
  assert.equal(p.assinatura, false)
  p = aplicarEvento(p, ev('NON_RENEWING_PURCHASE', 'premium_12_meses', { purchased_at_ms: agora + DIA }), agora + DIA)
  assert.equal(p.premiumAte, agora + 2 * DOZE_MESES)
  p = aplicarEvento(p, ev('CANCELLATION', 'premium_12_meses', { cancel_reason: 'CUSTOMER_SUPPORT' }), agora + 2 * DIA)
  assert.equal(p.premiumAte, agora + DOZE_MESES)
})

test('12 meses por cima da assinatura: vale a data maior e não mostra "renova sozinho"', () => {
  let p = aplicarEvento(undefined, ev('INITIAL_PURCHASE', 'pelada_premium:mensal', { expiration_at_ms: agora + 30 * DIA }), agora)
  p = aplicarEvento(p, ev('NON_RENEWING_PURCHASE', 'premium_12_meses', { purchased_at_ms: agora }), agora)
  assert.equal(p.premiumAte, agora + DOZE_MESES)
  assert.equal(p.assinatura, false)
})

test('torneio avulso: cada compra é 1 crédito; reembolso tira 1 (sem ficar negativo)', () => {
  let p = aplicarEvento(undefined, ev('NON_RENEWING_PURCHASE', 'torneio_avulso'), agora)
  p = aplicarEvento(p, ev('NON_RENEWING_PURCHASE', 'torneio_avulso'), agora)
  assert.equal(p.creditosTorneio, 2)
  p = aplicarEvento({ ...p, creditosTorneio: 0 }, ev('CANCELLATION', 'torneio_avulso', { cancel_reason: 'CUSTOMER_SUPPORT' }), agora)
  assert.equal(p.creditosTorneio, 0)
  assert.equal(p.premiumAte, null)
})
