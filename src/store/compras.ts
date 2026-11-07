// Compras pela loja (Google Play), com o RevenueCat no meio (PLANO.md, seção 14.2).
// O app só compra: quem grava o plano é o servidor, quando o RevenueCat avisa (functions/index.js, avisoDeCompra).
// No site não dá para comprar (a Play não aceita cobrança por fora); lá o app manda baixar o app da loja.

import type { PurchasesPackage } from '@revenuecat/purchases-capacitor'
import { obterNuvem } from '../nuvem'
import { nativo } from '../utils/nativo'

/** Chave pública do SDK do RevenueCat para Android (vem do painel do RevenueCat; não é segredo). */
const CHAVE_DO_REVENUECAT = import.meta.env.VITE_REVENUECAT_ANDROID as string | undefined
export const ENDERECO_NA_LOJA = 'https://play.google.com/store/apps/details?id=app.doisoudez'

/**
 * O que dá para comprar, com o código na loja (assinatura = produto:plano base).
 * Pro: mensal, anual ou 12 meses no Pix (avulso, não renova). Ultimate: mensal. Torneio: avulso.
 */
export const PRODUTOS = {
  proMensal: 'pelada_premium:mensal',
  proAnual: 'pelada_premium:anual',
  pro12MesesPix: 'premium_12_meses',
  ultimate: 'ultimate:mensal',
  torneio: 'torneio_avulso',
} as const
export type Produto = keyof typeof PRODUTOS

export interface Oferta {
  /** preço como a loja mostra ("R$ 14,90") */
  preco: string
  pacote: PurchasesPackage
}

/** Dá para comprar aqui? Só no app de loja e com o RevenueCat configurado. */
export const podeComprarAqui = () => nativo() && Boolean(CHAVE_DO_REVENUECAT)

let configuradoPara: string | null = null
async function revenueCat() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  const nuvem = await obterNuvem()
  if (!nuvem) throw new Error('Sem conta para comprar.')
  // o usuário no RevenueCat é o uid do Firebase: é por ele que o servidor sabe de quem é a compra
  const uid = await nuvem.idDaConta()
  if (configuradoPara !== uid) {
    if (configuradoPara === null) await Purchases.configure({ apiKey: CHAVE_DO_REVENUECAT!, appUserID: uid })
    else await Purchases.logIn({ appUserID: uid })
    configuradoPara = uid
  }
  return Purchases
}

/** Preço de cada produto, como a loja informa (some o que a loja ainda não tem). */
export async function ofertas(): Promise<Partial<Record<Produto, Oferta>>> {
  const resposta = await (await revenueCat()).getOfferings()
  const pacotes = resposta.current?.availablePackages ?? []
  const resultado: Partial<Record<Produto, Oferta>> = {}
  for (const produto of Object.keys(PRODUTOS) as Produto[]) {
    const pacote = pacotes.find((item) => item.product.identifier === PRODUTOS[produto])
    if (pacote) resultado[produto] = { preco: pacote.product.priceString, pacote }
  }
  return resultado
}

/**
 * Compra. 'desistiu' quando a pessoa fecha a tela da loja.
 * Trocar entre Pro e Ultimate substitui a assinatura antiga na própria loja.
 */
export async function comprar(oferta: Oferta, assinaturaAtualNaLoja: string | null = null): Promise<'comprou' | 'desistiu'> {
  const purchases = await revenueCat()
  try {
    await purchases.purchasePackage({
      aPackage: oferta.pacote,
      googleProductChangeInfo: assinaturaAtualNaLoja ? { oldProductIdentifier: assinaturaAtualNaLoja } : undefined,
    })
    return 'comprou'
  } catch (falha) {
    if ((falha as { userCancelled?: boolean }).userCancelled) return 'desistiu'
    throw falha
  }
}

/** Celular novo ou app reinstalado: pede para a loja mandar de novo as compras desta conta. */
export async function restaurarCompras(): Promise<void> {
  await (await revenueCat()).restorePurchases()
}

/** Assinatura que está renovando na loja agora (para trocar de plano), ou null. */
export async function assinaturaAtiva(): Promise<string | null> {
  const { customerInfo } = await (await revenueCat()).getCustomerInfo()
  const ativas = customerInfo.activeSubscriptions ?? []
  const atual = ativas.find((id) => id.startsWith('ultimate')) ?? ativas.find((id) => id.startsWith('pelada_premium'))
  // a troca na loja usa só o código da assinatura, sem o plano base (":mensal")
  return atual ? atual.split(':')[0] : null
}
