// O que cada aviso de compra do RevenueCat muda no plano da conta (planos/{uid}; PLANO.md, seção 14).
// Só regras, sem Firebase: testado em test/plano.test.js.

export const DIA = 24 * 3600_000
export const DOZE_MESES = 365 * DIA
export const PRODUTOS = { assinatura: 'pelada_premium', dozeMeses: 'premium_12_meses', torneio: 'torneio_avulso' }

const VAZIO = { assinaturaAte: null, renova: false, avulsoAte: null, creditosTorneio: 0 }
/** No Play, a assinatura vem como "pelada_premium:mensal" (produto:plano base). */
const produtoDo = (id = '') => id.split(':')[0]
const maior = (a, b) => (a == null ? b : b == null ? a : Math.max(a, b))

/**
 * Aplica um aviso (evento do webhook do RevenueCat) ao plano guardado. Devolve o plano novo, com
 * `premiumAte` e `assinatura` prontos para o app (o app só lê esses dois e `creditosTorneio`).
 */
export function aplicarEvento(guardado, evento, agora) {
  const p = { ...VAZIO, ...guardado }
  const produto = produtoDo(evento.product_id)
  const tipo = evento.type
  const reembolso = tipo === 'CANCELLATION' && evento.cancel_reason === 'CUSTOMER_SUPPORT'

  if (produto === PRODUTOS.assinatura) {
    // a loja diz até quando vale (renovou, mudou de plano, cancelou, venceu, foi reembolsada)
    if (evento.expiration_at_ms != null) p.assinaturaAte = evento.expiration_at_ms
    if (['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED'].includes(tipo)) p.renova = true
    if (['CANCELLATION', 'EXPIRATION'].includes(tipo)) p.renova = false
  } else if (produto === PRODUTOS.dozeMeses) {
    // 12 meses pagos de uma vez (Pix): soma no fim do que já tinha, se ainda estava valendo
    if (tipo === 'NON_RENEWING_PURCHASE') p.avulsoAte = Math.max(p.avulsoAte ?? 0, evento.purchased_at_ms ?? agora) + DOZE_MESES
    if (reembolso && p.avulsoAte != null) p.avulsoAte -= DOZE_MESES
  } else if (produto === PRODUTOS.torneio) {
    if (tipo === 'NON_RENEWING_PURCHASE') p.creditosTorneio += 1
    if (reembolso) p.creditosTorneio = Math.max(0, p.creditosTorneio - 1)
  }

  const premiumAte = maior(p.assinaturaAte, p.avulsoAte)
  return {
    ...p,
    premiumAte,
    // "renova sozinho" só quando é a assinatura que está valendo
    assinatura: p.renova && p.assinaturaAte != null && p.assinaturaAte > agora && p.assinaturaAte === premiumAte,
  }
}
