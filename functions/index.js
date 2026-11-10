// Funções do servidor (PLANO.md, seção 14.5, passo 3): o aviso de compra do RevenueCat grava o plano da
// conta, e o crédito de torneio é descontado aqui (o app não consegue mexer em planos/{uid}).

import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { idDaPeladaNaCarta, jogadoresValidos } from './carta.js'
import { denunciaValida, deveRemover, idDaDenuncia } from './denuncia.js'
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

/** Pelada encerrada: grava na carta de quem jogou com conta. Só o servidor grava, e o id impede de somar duas vezes. */
export const registrarPeladaNaCarta = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid || req.auth.token.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'Entre com a sua conta.')
  const { data, turma } = req.data ?? {}
  const jogadores = jogadoresValidos(req.data?.jogadores)
  if (!Number.isInteger(data) || data <= 0 || !jogadores) throw new HttpsError('invalid-argument', 'Resumo da pelada inválido.')
  const idDaTurma = typeof turma === 'string' && turma && !turma.includes('/') ? turma : null
  const nomeDaTurma = idDaTurma ? ((await db.doc(`usuarios/${uid}/turmas/${idDaTurma}`).get()).data()?.nome ?? 'Pelada') : 'Pelada'
  const lote = db.batch()
  for (const { conta, ...numeros } of jogadores) {
    lote.set(db.doc(`cartas/${conta}/peladas/${idDaPeladaNaCarta(uid, data)}`), {
      ...numeros, data, organizador: uid, turma: idDaTurma ?? `sem-turma-${uid}`, nomeDaTurma,
    })
  }
  await lote.commit()
  return { ok: true, jogadores: jogadores.length }
})

/** Pelada apagada do histórico: os números saem da carta (só o organizador apaga o que ele mesmo registrou). */
export const retirarPeladaDaCarta = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid || req.auth.token.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'Entre com a sua conta.')
  const { data, contas } = req.data ?? {}
  const validas = Array.isArray(contas) && contas.length <= 100 && contas.every((conta) => typeof conta === 'string' && conta && !conta.includes('/'))
  if (!Number.isInteger(data) || !validas) throw new HttpsError('invalid-argument', 'Pedido inválido.')
  const lote = db.batch()
  for (const conta of contas) lote.delete(db.doc(`cartas/${conta}/peladas/${idDaPeladaNaCarta(uid, data)}`))
  await lote.commit()
  return { ok: true }
})

/**
 * Denúncia de foto ou apelido. Cada pessoa conta uma vez por conta; na terceira pessoa diferente, a foto e o apelido
 * saem do perfil (o dono vê o aviso e pode escolher outra) e as denúncias zeram para a foto nova.
 */
export const denunciarFoto = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid || req.auth.token.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'Entre com a sua conta.')
  const denuncia = denunciaValida(req.data, uid)
  if (!denuncia) throw new HttpsError('invalid-argument', 'Denúncia inválida.')
  const { conta, motivo } = denuncia
  return db.runTransaction(async (transacao) => {
    const registro = db.doc(`denuncias/${idDaDenuncia(conta, uid)}`)
    const daConta = db.collection('denuncias').where('denunciado', '==', conta)
    const perfil = db.doc(`perfis/${conta}`)
    const [jaDenunciou, anteriores, existe] = await Promise.all([transacao.get(registro), transacao.get(daConta), transacao.get(perfil)])
    if (jaDenunciou.exists) return { ok: true, removida: false }
    if (!deveRemover(anteriores.size + 1)) {
      transacao.set(registro, { denunciado: conta, denunciante: uid, motivo, em: Date.now() })
      return { ok: true, removida: false }
    }
    // conta excluída: não recria o perfil, só limpa as denúncias
    if (existe.exists) transacao.set(perfil, { foto: FieldValue.delete(), apelido: FieldValue.delete(), fotoRemovida: true, atualizadaEm: Date.now() }, { merge: true })
    anteriores.docs.forEach((documento) => transacao.delete(documento.ref))
    logger.info('foto removida por denúncias', { conta, denuncias: anteriores.size + 1 })
    return { ok: true, removida: true }
  })
})
