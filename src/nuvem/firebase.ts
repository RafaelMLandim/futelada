// Nuvem no Firebase (Firestore + login anônimo), com cache no celular para funcionar
// sem internet. Estrutura em PLANO.md, seção 10.3.

import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, writeBatch,
} from 'firebase/firestore'
import type { BaseTorneio, DadosNuvem, Operacao } from '../logic/torneio'
import type { PartidaTorneio, ResultadoJogo } from '../types/torneio'
import type { Nuvem } from './tipos'

export const configFirebase = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** O Firestore não aceita `undefined`: converte para JSON puro. */
const puro = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function criarNuvemFirebase(): Nuvem {
  const app = initializeApp(configFirebase)
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  const auth = getAuth(app)
  const logado = new Promise<string>((resolve, reject) => {
    const parar = onAuthStateChanged(auth, (u) => {
      if (u) { parar(); resolve(u.uid) }
    })
    signInAnonymously(auth).catch(reject)
  })

  const torneio = (codigo: string) => doc(db, 'torneios', codigo)
  const partidas = (codigo: string) => collection(db, 'torneios', codigo, 'partidas')
  const resultados = (codigo: string) => collection(db, 'torneios', codigo, 'resultados')

  return {
    nome: 'firebase',
    usuario: () => logado,
    ouvir(codigo, aoMudar, aoErro) {
      const dados: DadosNuvem = { base: null, partidas: [], resultados: {} }
      const prontos = new Set<string>()
      const emitir = (parte: string) => {
        prontos.add(parte)
        if (prontos.size === 3) aoMudar({ ...dados })
      }
      const erro = (e: Error) => aoErro?.(e)
      const paradas: (() => void)[] = []
      logado.then(() => {
        paradas.push(onSnapshot(torneio(codigo), (s) => {
          dados.base = s.exists() ? (s.data() as BaseTorneio) : null
          emitir('base')
        }, erro))
        paradas.push(onSnapshot(partidas(codigo), (s) => {
          dados.partidas = s.docs.map((d) => d.data() as PartidaTorneio)
          emitir('partidas')
        }, erro))
        paradas.push(onSnapshot(resultados(codigo), (s) => {
          dados.resultados = Object.fromEntries(s.docs.map((d) => [d.id, d.data() as ResultadoJogo]))
          emitir('resultados')
        }, erro))
      }, erro)
      return () => paradas.forEach((p) => p())
    },
    async gravar(codigo, ops: Operacao[]) {
      await logado
      const lote = writeBatch(db)
      for (const op of ops) {
        if (op.tipo === 'base') lote.set(torneio(codigo), puro(op.base))
        else if (op.tipo === 'partida') lote.set(doc(partidas(codigo), op.partida.jogoId), puro(op.partida))
        else if (op.tipo === 'apagarPartida') lote.delete(doc(partidas(codigo), op.jogoId))
        else if (op.tipo === 'resultado') lote.set(doc(resultados(codigo), op.jogoId), puro(op.resultado))
        else lote.delete(doc(resultados(codigo), op.jogoId))
      }
      // sem internet a promessa só termina quando sincronizar; a mudança já vale no celular
      void lote.commit()
    },
    async existe(codigo) {
      await logado
      return (await getDoc(torneio(codigo))).exists()
    },
    async apagar(codigo) {
      await logado
      for (const sub of [partidas(codigo), resultados(codigo)]) {
        for (const d of (await getDocs(sub)).docs) await deleteDoc(d.ref)
      }
      await deleteDoc(torneio(codigo))
    },
  }
}
