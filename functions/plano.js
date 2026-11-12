// O que cada aviso de compra do RevenueCat muda no plano da conta (planos/{uid}; PLANO.md, seção 14).
// Só regras, sem Firebase: testado em test/plano.test.js.

export const DIA = 24 * 3600_000
export const DOZE_MESES = 365 * DIA
export const PRODUTOS = { assinatura: 'pelada_premium', dozeMeses: 'premium_12_meses', torneio: 'torneio_avulso', ultimate: 'ultimate' }

const VAZIO = { assinaturaAte: null, renova: false, avulsoAte: null, creditosTorneio: 0, ultimateAte: null, ultimateRenova: false }
/** No Play, a assinatura vem como "pelada_premium:mensal" (produto:plano base); na App Store, "pelada_premium.mensal". */
const produtoDo = (id = '') => id.split(/[:.]/)[0]
const maior = (a, b) => (a == null ? b : b == null ? a : Math.max(a, b))

/**
 * Aplica um aviso (evento do webhook do RevenueCat) ao plano guardado. Devolve o plano novo, com
 * `premiumAte` e `assinatura` prontos para o app (o app lê esses dois, `ultimateAte` e `creditosTorneio`).
 */
export function aplicarEvento(guardado, evento, agora) {
  const p = { ...VAZIO, ...guardado }
  const produto = produtoDo(evento.product_id)
  const tipo = evento.type
  const reembolso = tipo === 'CANCELLATION' && evento.cancel_reason === 'CUSTOMER_SUPPORT'

  // trocou de assinatura (Pro ↔ Ultimate): a antiga deixa de renovar; a nova chega nos avisos dela
  const saiuDesta = tipo === 'PRODUCT_CHANGE' && evento.new_product_id != null && produtoDo(evento.new_product_id) !== produto

  if (produto === PRODUTOS.assinatura) {
    // a loja diz até quando vale (renovou, mudou de plano, cancelou, venceu, foi reembolsada)
    if (evento.expiration_at_ms != null) p.assinaturaAte = evento.expiration_at_ms
    if (['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED'].includes(tipo)) p.renova = !saiuDesta
    if (['CANCELLATION', 'EXPIRATION'].includes(tipo)) p.renova = false
  } else if (produto === PRODUTOS.ultimate) {
    // Ultimate: torneios ilimitados e tudo do Pro, enquanto a assinatura valer
    if (evento.expiration_at_ms != null) p.ultimateAte = evento.expiration_at_ms
    if (['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED'].includes(tipo)) p.ultimateRenova = !saiuDesta
    if (['CANCELLATION', 'EXPIRATION'].includes(tipo)) p.ultimateRenova = false
  } else if (produto === PRODUTOS.dozeMeses) {
    // 12 meses pagos de uma vez (Pix): soma no fim do que já tinha, se ainda estava valendo
    if (tipo === 'NON_RENEWING_PURCHASE') p.avulsoAte = Math.max(p.avulsoAte ?? 0, evento.purchased_at_ms ?? agora) + DOZE_MESES
    if (reembolso && p.avulsoAte != null) p.avulsoAte -= DOZE_MESES
  } else if (produto === PRODUTOS.torneio) {
    if (tipo === 'NON_RENEWING_PURCHASE') p.creditosTorneio += 1
    if (reembolso) p.creditosTorneio = Math.max(0, p.creditosTorneio - 1)
  }

  // o Ultimate inclui tudo do Pro: vale a data maior entre as três
  const premiumAte = maior(maior(p.assinaturaAte, p.avulsoAte), p.ultimateAte)
  const valendo = (ate) => ate != null && ate > agora && ate === premiumAte
  return {
    ...p,
    premiumAte,
    // "renova sozinho" só quando é uma assinatura (Pro ou Ultimate) que está valendo
    assinatura: (p.renova && valendo(p.assinaturaAte)) || (p.ultimateRenova && valendo(p.ultimateAte)),
  }
}
