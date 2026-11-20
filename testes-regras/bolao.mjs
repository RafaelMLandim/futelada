// Regras do bolão (PLANO.md, seção 23) no emulador: só quem tem conta palpita, só o próprio palpite, fecha quando o jogo
// começa, e os palpites dos outros só aparecem depois. Rodar: npm run test:regras
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, test } from 'node:test'

let ambiente
before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: 'demo-dois-ou-dez', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
beforeEach(() => ambiente.clearFirestore())
after(() => ambiente.cleanup())

const comGoogle = (uid) => ambiente.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore()
// ana organiza o torneio; beto e carla palpitam
const ana = () => comGoogle('ana')
const beto = () => comGoogle('beto')
const carla = () => comGoogle('carla')
const anonimo = () => ambiente.authenticatedContext('anonimo', { firebase: { sign_in_provider: 'anonymous' } }).firestore()
const servidor = (fazer) => ambiente.withSecurityRulesDisabled((contexto) => fazer(contexto.firestore()))

const T = 'torneios/COPA22'
const palpite = (placar = [2, 1]) => ({ placar, gols: [{ lado: 'A', jogador: 'daniel' }], cartoes: [], em: 1 })
const doTorneio = { campeao: 'vila', vice: 'real', artilheiro: 'daniel', garcom: null, maisCartoes: null, em: 1 }

describe('bolão', () => {
  beforeEach(() => servidor((db) => setDoc(doc(db, T), { nome: 'Copa', nuvem: { codigo: 'COPA22', organizador: 'ana' }, jogos: [{ id: 'j1' }, { id: 'j2' }] })))

  test('quem tem conta entra (só com o próprio nome); anônimo não', async () => {
    await assertSucceeds(setDoc(doc(beto(), `${T}/bolao/beto`), { nome: 'Beto', em: 1 }))
    await assertFails(setDoc(doc(beto(), `${T}/bolao/carla`), { nome: 'Carla', em: 1 }))
    await assertFails(setDoc(doc(beto(), `${T}/bolao/beto`), { nome: 'Beto', em: 1, pontos: 999 }))
    await assertFails(setDoc(doc(anonimo(), `${T}/bolao/anonimo`), { nome: 'X', em: 1 }))
    await assertSucceeds(getDocs(collection(carla(), `${T}/bolao`)))
  })

  test('antes do jogo: cada um grava e vê só o próprio palpite; ninguém lista', async () => {
    await assertSucceeds(setDoc(doc(beto(), `${T}/palpites/j1/de/beto`), palpite()))
    await assertFails(setDoc(doc(beto(), `${T}/palpites/j1/de/carla`), palpite()))
    await assertSucceeds(getDoc(doc(beto(), `${T}/palpites/j1/de/beto`)))
    await assertFails(getDoc(doc(carla(), `${T}/palpites/j1/de/beto`)))
    await assertFails(getDocs(collection(carla(), `${T}/palpites/j1/de`)))
    await assertFails(getDocs(collection(ana(), `${T}/palpites/j1/de`))) // nem a organizadora
    // mais de 2 cartões, ou campos a mais, não passa
    await assertFails(setDoc(doc(beto(), `${T}/palpites/j1/de/beto`), { ...palpite(), cartoes: [1, 2, 3] }))
    await assertFails(setDoc(doc(beto(), `${T}/palpites/j1/de/beto`), { ...palpite(), pontos: 50 }))
  })

  test('o jogo começou: ninguém muda o palpite; os dos outros aparecem; apagar o próprio pode', async () => {
    await assertSucceeds(setDoc(doc(beto(), `${T}/palpites/j1/de/beto`), palpite()))
    await assertSucceeds(setDoc(doc(ana(), `${T}/partidas/j1`), { jogoId: 'j1', campo: 1 }))
    await assertFails(setDoc(doc(beto(), `${T}/palpites/j1/de/beto`), palpite([5, 0])))
    await assertFails(setDoc(doc(carla(), `${T}/palpites/j1/de/carla`), palpite()))
    await assertSucceeds(getDocs(collection(carla(), `${T}/palpites/j1/de`)))
    await assertSucceeds(getDoc(doc(carla(), `${T}/palpites/j1/de/beto`)))
    // o outro jogo continua aberto
    await assertSucceeds(setDoc(doc(carla(), `${T}/palpites/j2/de/carla`), palpite()))
    await assertFails(getDocs(collection(beto(), `${T}/palpites/j2/de`)))
    // jogo encerrado (só o resultado): também fechado
    await servidor((db) => deleteDoc(doc(db, `${T}/partidas/j1`)))
    await servidor((db) => setDoc(doc(db, `${T}/resultados/j1`), { placar: [1, 0] }))
    await assertFails(setDoc(doc(beto(), `${T}/palpites/j1/de/beto`), palpite([1, 0])))
    await assertSucceeds(deleteDoc(doc(beto(), `${T}/palpites/j1/de/beto`)))
  })

  test('palpites do torneio: abertos até o servidor fechar; depois todos veem e ninguém muda', async () => {
    await assertSucceeds(setDoc(doc(beto(), `${T}/palpitesDoTorneio/beto`), doTorneio))
    await assertFails(getDocs(collection(carla(), `${T}/palpitesDoTorneio`)))
    await assertFails(setDoc(doc(beto(), `${T}/palpitesDoTorneio/beto`), { ...doTorneio, pontos: 9 }))
    // só o servidor fecha
    await assertFails(setDoc(doc(ana(), `${T}/sistema/bolao`), { fechadoEm: 1 }))
    await servidor((db) => setDoc(doc(db, `${T}/sistema/bolao`), { fechadoEm: 1 }))
    await assertFails(setDoc(doc(beto(), `${T}/palpitesDoTorneio/beto`), { ...doTorneio, campeao: 'real' }))
    await assertSucceeds(getDocs(collection(carla(), `${T}/palpitesDoTorneio`)))
  })

  test('a organizadora apaga o bolão junto com o torneio; um estranho não apaga o palpite dos outros', async () => {
    await assertSucceeds(setDoc(doc(beto(), `${T}/bolao/beto`), { nome: 'Beto', em: 1 }))
    await assertSucceeds(setDoc(doc(beto(), `${T}/palpites/j2/de/beto`), palpite()))
    await assertFails(deleteDoc(doc(carla(), `${T}/palpites/j2/de/beto`)))
    await assertFails(deleteDoc(doc(carla(), `${T}/bolao/beto`)))
    await assertSucceeds(deleteDoc(doc(ana(), `${T}/palpites/j2/de/beto`)))
    await assertSucceeds(deleteDoc(doc(ana(), `${T}/bolao/beto`)))
  })

  test('código do bolão: só a organizadora cria, é único, não vira código de outro torneio', async () => {
    await servidor((db) => setDoc(doc(db, 'torneios/OUTRO1'), { nome: 'Outro', nuvem: { codigo: 'OUTRO1', organizador: 'carla' } }))
    const codigo = { torneio: 'COPA22', organizador: 'ana', em: 1 }
    await assertSucceeds(setDoc(doc(ana(), 'codigosDoBolao/COPAVILA'), codigo))
    // único: ninguém sobrescreve (nem a própria dona muda; troca = apaga e cria)
    await assertFails(setDoc(doc(carla(), 'codigosDoBolao/COPAVILA'), { torneio: 'OUTRO1', organizador: 'carla', em: 2 }))
    await assertFails(setDoc(doc(ana(), 'codigosDoBolao/COPAVILA'), { ...codigo, em: 2 }))
    // só para o próprio torneio; nada de minúscula, espaço ou o código de outro torneio
    await assertFails(setDoc(doc(beto(), 'codigosDoBolao/BETOBOLAO'), { torneio: 'COPA22', organizador: 'beto', em: 1 }))
    await assertFails(setDoc(doc(ana(), 'codigosDoBolao/copa'), codigo))
    await assertFails(setDoc(doc(ana(), 'codigosDoBolao/OUTRO1'), codigo))
    await assertSucceeds(getDoc(doc(beto(), 'codigosDoBolao/COPAVILA')))
    await assertFails(deleteDoc(doc(beto(), 'codigosDoBolao/COPAVILA')))
    await assertSucceeds(deleteDoc(doc(ana(), 'codigosDoBolao/COPAVILA')))
  })
})
