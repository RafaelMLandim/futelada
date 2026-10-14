// Regras do plano pago no emulador do Firestore (PLANO.md, seção 14).
// Rodar: npx firebase-tools emulators:exec --only firestore --project demo-dois-ou-dez "node --test testes-regras/"
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, increment, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, test } from 'node:test'

let env
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-dois-ou-dez', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
beforeEach(() => env.clearFirestore())
after(() => env.cleanup())

const ana = () => env.authenticatedContext('ana', { firebase: { sign_in_provider: 'google.com' } }).firestore()
const beto = () => env.authenticatedContext('beto', { firebase: { sign_in_provider: 'google.com' } }).firestore()
const servidor = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))

test('plano: o dono lê, ninguém (nem o dono) grava', async () => {
  await servidor((db) => setDoc(doc(db, 'planos/ana'), { premiumAte: 9e12, creditosTorneio: 0 }))
  await assertSucceeds(getDoc(doc(ana(), 'planos/ana')))
  await assertFails(getDoc(doc(beto(), 'planos/ana')))
  await assertFails(setDoc(doc(ana(), 'planos/ana'), { premiumAte: 9e12, creditosTorneio: 99 }))
  await assertFails(setDoc(doc(ana(), 'planos/nova'), { premiumAte: 9e12 }))
})

test('config da cobrança: todos leem, ninguém grava', async () => {
  await assertSucceeds(getDoc(doc(ana(), 'config/cobranca')))
  await assertFails(setDoc(doc(ana(), 'config/cobranca'), { ativa: false }))
})

test('contadores: só somam 1; não zeram, não apagam, não pulam', async () => {
  const db = ana()
  const ref = doc(db, 'contadores/ana')
  await assertSucceeds(setDoc(ref, { peladas: increment(1) }, { merge: true }))
  await assertSucceeds(setDoc(ref, { peladas: increment(1) }, { merge: true }))
  await assertSucceeds(setDoc(ref, { torneios: increment(1) }, { merge: true }))
  const d = (await getDoc(ref)).data()
  if (d.peladas !== 2 || d.torneios !== 1) throw new Error('contador errado: ' + JSON.stringify(d))
  await assertFails(setDoc(ref, { peladas: 0, torneios: 0 })) // zerar
  await assertFails(updateDoc(ref, { peladas: 1 })) // diminuir
  await assertFails(updateDoc(ref, { peladas: increment(2) })) // pular
  await assertFails(updateDoc(ref, { peladas: increment(1), torneios: increment(1) })) // dois de uma vez
  await assertFails(updateDoc(ref, { premium: true })) // outro campo
  await assertFails(deleteDoc(ref))
  await assertFails(setDoc(doc(db, 'contadores/beto'), { peladas: 1 })) // de outra pessoa
  await assertFails(getDoc(doc(beto(), 'contadores/ana')))
  // começar já com várias usadas não pode
  await assertFails(setDoc(doc(beto(), 'contadores/beto'), { peladas: -5, torneios: 6 }))
})

test('aparelhos: só somam 1; ninguém lista os celulares', async () => {
  const ref = doc(ana(), 'aparelhos/android-abc')
  await assertSucceeds(setDoc(ref, { peladas: increment(1) }, { merge: true }))
  await assertSucceeds(setDoc(doc(beto(), 'aparelhos/android-abc'), { peladas: increment(1) }, { merge: true })) // outra conta no mesmo celular
  await assertSucceeds(getDoc(ref))
  await assertFails(setDoc(ref, { peladas: 0 }))
  await assertFails(deleteDoc(ref))
  await assertFails(getDocs(collection(ana(), 'aparelhos')))
  await assertFails(setDoc(doc(ana(), 'aparelhos/novo'), { peladas: 3 }))
})

test('o resto continua igual: dados da própria conta', async () => {
  await assertSucceeds(setDoc(doc(ana(), 'usuarios/ana/turmas/t1'), { nome: 'X' }))
  await assertFails(setDoc(doc(beto(), 'usuarios/ana/turmas/t1'), { nome: 'X' }))
})
