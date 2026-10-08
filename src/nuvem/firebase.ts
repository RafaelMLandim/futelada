// Nuvem no Firebase (Firestore + login anônimo), com cache no celular para funcionar
// sem internet. Estrutura em PLANO.md, seção 10.3.

import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider, getAuth, getRedirectResult, linkWithCredential, linkWithRedirect, onIdTokenChanged, signInAnonymously,
  signInWithCredential, signInWithRedirect, signOut, type User,
} from 'firebase/auth'
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, onSnapshot, orderBy, persistentLocalCache, query,
  persistentMultipleTabManager, setDoc, writeBatch,
} from 'firebase/firestore'
import type { DadosNuvem, Operacao } from '../logic/torneio'
import type { PartidaTorneio, ResultadoJogo } from '../types/torneio'
import { nativo } from '../utils/nativo'
import { baseDaNuvem, baseParaNuvem } from './formato'
import { entrarComUmToque, prepararUmToque } from './umToque'
import type { AvisoPagamento, CobrancaNuvem, Lancamento, MesarioNoCampo, Nuvem, PeladaNoHistorico, Perfil } from './tipos'

export const configFirebase = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // No site publicado, o login volta para o próprio domínio (/__/auth/ do Firebase Hosting):
  // assim o "voltar do Google" funciona no celular (Safari e Chrome bloqueiam o domínio de fora)
  authDomain: /\.(web\.app|firebaseapp\.com)$/.test(location.hostname) ? location.hostname : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Login do Google pela tela de contas do celular (app de loja). */
async function tokenDoCelular(): Promise<{ token: string } | 'fechou'> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
  try {
    const r = await FirebaseAuthentication.signInWithGoogle()
    return r.credential?.idToken ? { token: r.credential.idToken } : 'fechou'
  } catch (e) {
    // fechou a tela de contas sem escolher
    if (/cancel/i.test(String((e as Error).message))) return 'fechou'
    throw e
  }
}

/** O Firestore não aceita `undefined`: converte para JSON puro. */
const puro = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function criarNuvemFirebase(): Nuvem {
  const app = initializeApp(configFirebase)
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  const auth = getAuth(app)
  // Quem já entrou com o Google continua logado; senão, entra anônimo (como sempre foi)
  const logado = (async () => {
    await auth.authStateReady()
    await getRedirectResult(auth).catch(async (e) => {
      // voltou do Google com uma conta que já existe (entrou em outro celular): troca para ela
      const credencial = GoogleAuthProvider.credentialFromError(e)
      if ((e as { code?: string }).code === 'auth/credential-already-in-use' && credencial) await signInWithCredential(auth, credencial)
    })
    if (!auth.currentUser) await signInAnonymously(auth)
    return auth.currentUser!.uid
  })()
  /** uid de agora (muda ao entrar/sair da conta Google). */
  const uid = async () => { await logado; return auth.currentUser!.uid }
  const perfil = (u: User): Perfil => {
    // quem era anônimo e virou conta Google tem o nome e a foto só nos dados do Google
    const google = u.providerData.find((p) => p.providerId === 'google.com')
    return {
      uid: u.uid, nome: u.displayName ?? google?.displayName ?? null, email: u.email ?? google?.email ?? null,
      foto: u.photoURL ?? google?.photoURL ?? null, anonimo: u.isAnonymous,
    }
  }
  const caixa = (dono: string) => collection(db, 'usuarios', dono, 'caixa')
  const historico = (dono: string) => collection(db, 'usuarios', dono, 'peladas')
  /** Acompanha uma coleção do perfil de quem está logado (refaz ao entrar/sair; vazio sem login). */
  function ouvirDoPerfil<T>(colecao: (dono: string) => ReturnType<typeof collection>, aoMudar: (itens: T[]) => void, aoErro?: (e: Error) => void) {
    let parar = () => {}
    let dono: string | null | undefined
    // onIdTokenChanged também avisa quando o anônimo vira conta Google (mesmo uid)
    const pararAuth = onIdTokenChanged(auth, (u) => {
      const agora = u && !u.isAnonymous ? u.uid : null
      if (agora === dono) return
      dono = agora
      parar()
      parar = () => {}
      if (!u || u.isAnonymous) { aoMudar([]); return }
      parar = onSnapshot(query(colecao(u.uid), orderBy('data', 'desc')),
        (s) => aoMudar(s.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T)), (e) => aoErro?.(e))
    })
    return () => { pararAuth(); parar() }
  }

  const torneio = (codigo: string) => doc(db, 'torneios', codigo)
  const partidas = (codigo: string) => collection(db, 'torneios', codigo, 'partidas')
  const resultados = (codigo: string) => collection(db, 'torneios', codigo, 'resultados')
  const campos = (codigo: string) => collection(db, 'torneios', codigo, 'campos')
  const cobranca = (codigo: string) => doc(db, 'cobrancas', codigo)
  const avisos = (codigo: string) => collection(db, 'cobrancas', codigo, 'avisos')

  return {
    nome: 'firebase',
    usuario: uid,
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
          dados.base = s.exists() ? baseDaNuvem(s.data()) : null
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
        if (op.tipo === 'base') lote.set(torneio(codigo), puro(baseParaNuvem(op.base)))
        else if (op.tipo === 'partida') lote.set(doc(partidas(codigo), op.partida.jogoId), puro(op.partida))
        else if (op.tipo === 'apagarPartida') lote.delete(doc(partidas(codigo), op.jogoId))
        else if (op.tipo === 'resultado') lote.set(doc(resultados(codigo), op.jogoId), puro(op.resultado))
        else lote.delete(doc(resultados(codigo), op.jogoId))
      }
      // sem internet a promessa só termina quando sincronizar; a mudança já vale no celular
      lote.commit().catch((e) => console.error('Não deu para gravar o torneio na nuvem', e))
    },
    async existe(codigo) {
      await logado
      return (await getDoc(torneio(codigo))).exists()
    },
    async apagar(codigo) {
      await logado
      for (const sub of [partidas(codigo), resultados(codigo), campos(codigo)]) {
        for (const d of (await getDocs(sub)).docs) await deleteDoc(d.ref)
      }
      await deleteDoc(torneio(codigo))
    },

    // ---- campos do torneio: cada mesário trava o seu (as regras do Firebase garantem) ----
    ouvirCampos(codigo, aoMudar) {
      let parar = () => {}
      let vivo = true
      void logado.then(() => {
        if (!vivo) return
        parar = onSnapshot(campos(codigo), (s) => aoMudar(Object.fromEntries(s.docs.map((d) => [Number(d.id), d.data() as MesarioNoCampo]))))
      })
      return () => { vivo = false; parar() }
    },
    async pegarCampo(codigo, campo) {
      await logado
      const p = perfil(auth.currentUser!)
      const gravar = setDoc(doc(campos(codigo), String(campo)), { uid: p.uid, nome: p.nome ?? p.email ?? 'Mesário', foto: p.foto, em: Date.now() })
        .then(() => true, (e) => { if ((e as { code?: string }).code === 'permission-denied') return false; throw e })
      // sem internet a gravação só confirma quando voltar: segue com o campo e o Firebase confere depois
      return Promise.race([gravar, new Promise<boolean>((r) => setTimeout(() => r(true), 5000))])
    },
    async soltarCampo(codigo, campo) {
      await logado
      await deleteDoc(doc(campos(codigo), String(campo))).catch(() => null)
    },

    // ---- campo pago ----
    async publicarCobranca(codigo, dados) {
      const organizador = await uid()
      void setDoc(cobranca(codigo), puro({ ...dados, organizador }))
    },
    ouvirCobranca(codigo, aoMudar, aoErro) {
      let dados: CobrancaNuvem | null = null
      let lista: Record<string, AvisoPagamento> = {}
      const prontos = new Set<string>()
      const emitir = (parte: string) => {
        prontos.add(parte)
        if (prontos.size === 2) aoMudar(dados, lista)
      }
      const erro = (e: Error) => aoErro?.(e)
      const paradas: (() => void)[] = []
      logado.then(() => {
        paradas.push(onSnapshot(cobranca(codigo), (s) => {
          dados = s.exists() ? (s.data() as CobrancaNuvem) : null
          emitir('cobranca')
        }, erro))
        paradas.push(onSnapshot(avisos(codigo), (s) => {
          lista = Object.fromEntries(s.docs.map((d) => [d.id, d.data() as AvisoPagamento]))
          emitir('avisos')
        }, erro))
      }, erro)
      return () => paradas.forEach((p) => p())
    },
    async apagarCobranca(codigo) {
      await logado
      for (const d of (await getDocs(avisos(codigo))).docs) await deleteDoc(d.ref)
      await deleteDoc(cobranca(codigo))
    },
    async avisarPagamento(codigo, jogadorId, aviso) {
      await logado
      const ref = doc(avisos(codigo), jogadorId)
      await (aviso ? setDoc(ref, puro(aviso)) : deleteDoc(ref))
    },

    // ---- conta e caixa ----
    ouvirPerfil(aoMudar) {
      if (!nativo()) prepararUmToque()
      return onIdTokenChanged(auth, (u) => aoMudar(u ? perfil(u) : null))
    },
    async entrarComGoogle() {
      await logado
      const atual = auth.currentUser
      // no app de loja: tela de contas do próprio celular (o Google não deixa entrar pelo navegador interno)
      const r = nativo() ? await tokenDoCelular() : await entrarComUmToque()
      if (r === 'fechou') return
      if (r === 'indisponivel') {
        // sem a folha do Google: vai para a página do Google na mesma tela e volta para o app
        const google = new GoogleAuthProvider()
        await (atual?.isAnonymous ? linkWithRedirect(atual, google) : signInWithRedirect(auth, google))
        return
      }
      const credencial = GoogleAuthProvider.credential(r.token)
      if (!atual?.isAnonymous) { await signInWithCredential(auth, credencial); return }
      try {
        await linkWithCredential(atual, credencial) // o anônimo vira a conta Google: mesmo uid, nada se perde
      } catch (e) {
        // essa conta Google já existe (entrou em outro celular): troca para ela
        if ((e as { code?: string }).code === 'auth/credential-already-in-use') await signInWithCredential(auth, credencial)
        else throw e
      }
    },
    async sair() {
      // no app, sai também da conta do celular (na próxima vez dá para escolher outra)
      if (nativo()) await import('@capacitor-firebase/authentication').then(({ FirebaseAuthentication }) => FirebaseAuthentication.signOut()).catch(() => null)
      await signOut(auth)
      await signInAnonymously(auth)
    },
    ouvirCaixa(aoMudar, aoErro) {
      return ouvirDoPerfil<Lancamento>(caixa, aoMudar, aoErro)
    },
    async lancarNoCaixa(lancamentos) {
      const dono = await uid()
      for (const l of lancamentos) void addDoc(caixa(dono), puro(l))
    },
    async apagarLancamento(id) {
      const dono = await uid()
      await deleteDoc(doc(caixa(dono), id))
    },
    ouvirHistorico(aoMudar, aoErro) {
      return ouvirDoPerfil<PeladaNoHistorico>(historico, aoMudar, aoErro)
    },
    async guardarPelada(pelada) {
      const dono = await uid()
      void addDoc(historico(dono), puro(pelada)) // sem internet, sobe quando a conexão voltar
    },
    async apagarPelada(id) {
      const dono = await uid()
      await deleteDoc(doc(historico(dono), id))
    },
  }
}
