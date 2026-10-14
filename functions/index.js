// Funções do servidor (PLANO.md, seção 14.5, passo 3): o aviso de compra do RevenueCat grava o plano da
// conta, e o crédito de torneio é descontado aqui (o app não consegue mexer em planos/{uid}).

import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { aplicarEvento } from './plano.js'

initializeApp()
const db = getFirestore()
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 })

/** Senha que o RevenueCat manda no cabeçalho Authorization (configurada nos dois lados). */
const SENHA_DO_AVISO = defineSecret('REVENUECAT_WEBHOOK')

/** Webhook do RevenueCat: cada compra, renovação, cancelamento ou reembolso. */
// público na internet (o RevenueCat chama de fora); quem protege é a senha no cabeçalho
export const avisoDeCompra = onRequest({ secrets: [SENHA_DO_AVISO], invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST' || req.get('Authorization') !== `Bearer ${SENHA_DO_AVISO.value().trim()}`) {
    res.status(401).send('não autorizado')
    return
  }
  const evento = req.body?.event
  if (!evento?.id || !evento.type) {
    res.status(400).send('sem evento')
    return
  }
  const uid = evento.app_user_id
  // TEST: botão de teste do RevenueCat; sem uid do Firebase (comprou sem login): nada a gravar
  if (evento.type === 'TEST' || !uid || uid.startsWith('$RCAnonymousID')) {
    logger.info('aviso ignorado', { tipo: evento.type, uid })
    res.send('ok')
    return
  }
  await db.runTransaction(async (t) => {
    // o RevenueCat pode mandar o mesmo aviso de novo: cada um só conta uma vez
    const recebido = db.doc(`avisosDeCompra/${evento.id}`)
    const plano = db.doc(`planos/${uid}`)
    const [jaVeio, atual] = await Promise.all([t.get(recebido), t.get(plano)])
    if (jaVeio.exists) return
    t.set(plano, aplicarEvento(atual.data(), evento, Date.now()))
    t.set(recebido, { uid, tipo: evento.type, produto: evento.product_id ?? null, em: Date.now() })
  })
  res.send('ok')
})

/** Torneio novo com crédito: desconta 1. { ok: false } = não tinha crédito. */
export const usarCreditoDeTorneio = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid || req.auth.token.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'Entre com o Google.')
  return db.runTransaction(async (t) => {
    const ref = db.doc(`planos/${uid}`)
    const creditos = (await t.get(ref)).data()?.creditosTorneio ?? 0
    if (creditos <= 0) return { ok: false }
    t.update(ref, { creditosTorneio: creditos - 1 })
    t.set(db.doc(`contadores/${uid}`), { torneios: FieldValue.increment(1) }, { merge: true })
    return { ok: true, restantes: creditos - 1 }
  })
})
