// Nuvem no Firebase (Firestore + login anônimo), com cache no celular para funcionar
// sem internet. Estrutura em PLANO.md, seção 10.3.

import { initializeApp } from 'firebase/app'
import {
  EmailAuthProvider, GoogleAuthProvider, OAuthProvider, connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth, getRedirectResult, linkWithCredential, linkWithRedirect, onIdTokenChanged,
  reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail, signInAnonymously, updateProfile, signInWithCredential, signInWithEmailAndPassword, signInWithRedirect, signOut, type User,
} from 'firebase/auth'
import {
  addDoc, collection, connectFirestoreEmulator, deleteDoc, deleteField, doc, getDoc, getDocs, increment, initializeFirestore, memoryLocalCache, onSnapshot, orderBy, persistentLocalCache, query,
  persistentMultipleTabManager, setDoc, updateDoc, where, writeBatch, type DocumentReference,
} from 'firebase/firestore'
import type { DadosNuvem, Operacao } from '../logic/torneio'
import type { PartidaTorneio, ResultadoJogo } from '../types/torneio'
import { nativo } from '../utils/nativo'
import { baseDaNuvem, baseParaNuvem } from './formato'
import { entrarComUmToque, prepararUmToque } from './umToque'
import { CONTADORES_ZERADOS, PLANO_VAZIO, type Contadores, type DadosDoPlano, type Plano } from '../logic/plano'
import type { PeladaDaCarta } from '../logic/carta'
import type { JogadorDaTurma } from '../logic/turma'
import type { AvisoPagamento, CobrancaNuvem, ConfirmadoNaLista, Lancamento, ListaDaPelada, MesarioNoCampo, Nuvem, PeladaCompartilhada, PeladaNoHistorico, Perfil, Turma } from './tipos'
import type { Caixinha } from '../logic/caixinha'

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

/** Resposta do "Entrar com a Apple" (só no iPhone). O nome só vem no primeiro login com a Apple. */
type RespostaDaApple = { token: string; nonce: string; nome: string | null; codigoDeAutorizacao: string | null }

/**
 * Login com a Apple pela tela do próprio iPhone. Com `tambemNoCelular`, entra também no Firebase do celular:
 * só assim dá para cancelar a autorização na Apple ao excluir a conta (a Apple exige).
 */
async function tokenDaApple(tambemNoCelular = false): Promise<RespostaDaApple | 'fechou'> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
  try {
    const resposta = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: !tambemNoCelular })
    const credencial = resposta.credential
    if (!credencial?.idToken || !credencial.nonce) return 'fechou'
    return { token: credencial.idToken, nonce: credencial.nonce, nome: resposta.user?.displayName ?? null, codigoDeAutorizacao: credencial.authorizationCode ?? null }
  } catch (erro) {
    // fechou a tela da Apple sem entrar (erro 1001 da Apple)
    if (/cancel|1001/i.test(String((erro as Error).message))) return 'fechou'
    throw erro
  }
}

/** Credencial do Firebase a partir da resposta da Apple. */
const credencialDaApple = (resposta: RespostaDaApple) => new OAuthProvider('apple.com').credential({ idToken: resposta.token, rawNonce: resposta.nonce })

/**
 * Só no desenvolvimento: abrir o app com ?emulador liga os emuladores do Firebase neste navegador
 * (login e banco de mentira, com as regras de verdade; ?emulador=0 desliga). Rodar: npm run emuladores
 */
function usarEmulador(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    const pedido = new URLSearchParams(location.search).get('emulador')
    if (pedido === '0') localStorage.removeItem('nuvem:emulador')
    else if (pedido !== null) localStorage.setItem('nuvem:emulador', '1')
    return localStorage.getItem('nuvem:emulador') === '1'
  } catch {
    return false
  }
}

/** O Firestore não aceita `undefined`: converte para JSON puro. */
const puro = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function criarNuvemFirebase(): Nuvem {
  const app = initializeApp(configFirebase)
  // Quem só abriu um link do grupo (lista, pagar, acompanhar) não precisa guardar nada no aparelho: sem o cache no
  // armazenamento do navegador, que é o que falha no iPhone (aba privada, navegador de dentro do WhatsApp/Instagram)
  const paginaDoLink = !nativo() && /[?&](lista|pagar|ver|controle)=/.test(location.search)
  const db = initializeFirestore(app, { localCache: paginaDoLink ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  const auth = getAuth(app)
  if (usarEmulador()) {
    connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, location.hostname, 8080)
  }
  /** Função do servidor (carregada só quando precisa). */
  async function funcaoDoServidor<Pedido = unknown, Resposta = unknown>(nome: string) {
    const { connectFunctionsEmulator, getFunctions, httpsCallable } = await import('firebase/functions')
    const funcoes = getFunctions(app, 'southamerica-east1')
    if (usarEmulador()) connectFunctionsEmulator(funcoes, location.hostname, 5001)
    return httpsCallable<Pedido, Resposta>(funcoes, nome)
  }
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
    const apple = u.providerData.find((p) => p.providerId === 'apple.com')
    return {
      uid: u.uid, nome: u.displayName ?? google?.displayName ?? apple?.displayName ?? null, email: u.email ?? google?.email ?? apple?.email ?? null,
      foto: u.photoURL ?? google?.photoURL ?? null, anonimo: u.isAnonymous,
      comSenha: !google && !apple && u.providerData.some((p) => p.providerId === 'password'),
      comApple: !google && !!apple,
    }
  }
  const caixa = (dono: string) => collection(db, 'usuarios', dono, 'caixa')
  const caixinhas = (dono: string) => collection(db, 'usuarios', dono, 'caixinhas')
  const historico = (dono: string) => collection(db, 'usuarios', dono, 'peladas')
  const turmas = (dono: string) => collection(db, 'usuarios', dono, 'turmas')
  const peladasDaCarta = (dono: string) => collection(db, 'cartas', dono, 'peladas')
  const listaDaPelada = (codigo: string) => doc(db, 'listas', codigo)
  const confirmados = (codigo: string) => collection(db, 'listas', codigo, 'confirmados')
  const jogadoresDaTurma = (dono: string, turma: string) => collection(db, 'usuarios', dono, 'turmas', turma, 'jogadores')
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

  /** Entra com a conta do Google ou da Apple, mantendo o que já era deste celular. */
  async function entrarComCredencial(credencial: ReturnType<typeof GoogleAuthProvider.credential>) {
    const atual = auth.currentUser
    if (!atual?.isAnonymous) { await signInWithCredential(auth, credencial); return }
    try {
      await linkWithCredential(atual, credencial) // o anônimo vira a conta: mesmo uid, nada se perde
    } catch (e) {
      // essa conta já existe (entrou em outro celular): troca para ela
      if ((e as { code?: string }).code === 'auth/credential-already-in-use') await signInWithCredential(auth, credencial)
      else throw e
    }
  }

  /** Apaga em lotes (um lote do Firestore aceita até 500). */
  async function apagarTudo(refs: DocumentReference[]) {
    for (let i = 0; i < refs.length; i += 400) {
      const lote = writeBatch(db)
      refs.slice(i, i + 400).forEach((r) => lote.delete(r))
      await lote.commit()
    }
  }

  const torneio = (codigo: string) => doc(db, 'torneios', codigo)
  const partidas = (codigo: string) => collection(db, 'torneios', codigo, 'partidas')
  const resultados = (codigo: string) => collection(db, 'torneios', codigo, 'resultados')
  const campos = (codigo: string) => collection(db, 'torneios', codigo, 'campos')
  const cobranca = (codigo: string) => doc(db, 'cobrancas', codigo)
  const avisos = (codigo: string) => collection(db, 'cobrancas', codigo, 'avisos')
  const peladaCompartilhada = (codigo: string) => doc(db, 'peladas', codigo)

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
    // ---- pelada compartilhada (as regras do Firebase conferem quem está no controle e a chave) ----
    async criarPeladaCompartilhada(codigo, dados, chave) {
      const dono = await uid()
      const inicio = { ...dados, dono, controlador: dono, nomeDoControlador: dados.nomeDoDono, encerrada: false, atualizadaEm: Date.now() }
      // primeiro a pelada, depois a chave (a regra da chave confere o dono na pelada); sem internet, os dois sobem em ordem
      await Promise.race([setDoc(peladaCompartilhada(codigo), puro(inicio)), new Promise((resolver) => setTimeout(resolver, 4000))])
      setDoc(doc(db, 'peladas', codigo, 'privado', 'chave'), { valor: chave }).catch((erro) => console.error('Não deu para guardar a chave da pelada', erro))
    },
    async publicarPeladaCompartilhada(codigo, dados) {
      await logado
      // updateDoc troca o campo `app` inteiro (setDoc com merge misturaria o estado antigo com o novo)
      updateDoc(peladaCompartilhada(codigo), puro(dados)).catch((erro) => console.error('Não deu para publicar a pelada', erro))
    },
    async assumirControleDaPelada(codigo, chave, nome) {
      const eu = await uid()
      try {
        if (chave) await setDoc(doc(db, 'peladas', codigo, 'pedidos', eu), { chave })
        await updateDoc(peladaCompartilhada(codigo), { controlador: eu, nomeDoControlador: nome })
        return true
      } catch (erro) {
        if ((erro as { code?: string }).code === 'permission-denied') return false
        throw erro
      }
    },
    ouvirPeladaCompartilhada(codigo, aoMudar, aoErro) {
      let parar = () => {}
      let vivo = true
      logado.then(() => {
        if (!vivo) return
        parar = onSnapshot(peladaCompartilhada(codigo), (s) => aoMudar(s.exists() ? (s.data() as PeladaCompartilhada) : null), (erro) => aoErro?.(erro))
      }, (erro) => aoErro?.(erro))
      return () => { vivo = false; parar() }
    },
    async avisarPagamento(codigo, jogadorId, aviso) {
      await logado
      const ref = doc(avisos(codigo), jogadorId)
      await (aviso ? setDoc(ref, puro(aviso)) : deleteDoc(ref))
    },

    // ---- link da pelada ----
    async abrirLista(codigo, data) {
      const organizador = await uid()
      await setDoc(listaDaPelada(codigo), { organizador, data })
    },
    ouvirLista(codigo, aoMudar, aoErro) {
      let dados: ListaDaPelada | null = null
      let lista: ConfirmadoNaLista[] = []
      const prontos = new Set<string>()
      const emitir = (parte: string) => {
        prontos.add(parte)
        if (prontos.size === 2) aoMudar(dados, lista)
      }
      const paradas: (() => void)[] = []
      let parou = false
      void logado.then(() => {
        if (parou) return
        paradas.push(onSnapshot(listaDaPelada(codigo), (documento) => { dados = (documento.data() as ListaDaPelada | undefined) ?? null; emitir('lista') }, (erro) => aoErro?.(erro)))
        paradas.push(onSnapshot(query(confirmados(codigo), orderBy('em')), (consulta) => {
          lista = consulta.docs.map((documento) => ({ ...(documento.data() as Omit<ConfirmadoNaLista, 'id'>), id: documento.id }))
          emitir('confirmados')
        }, (erro) => aoErro?.(erro)))
      })
      return () => { parou = true; paradas.forEach((parar) => parar()) }
    },
    async confirmarNaLista(codigo, nome, comConta, goleiro) {
      const id = await uid()
      await setDoc(doc(confirmados(codigo), id), { nome, comConta, em: Date.now(), ...(goleiro && { goleiro: true }) })
    },
    async tirarDaLista(codigo, id) {
      await logado
      await deleteDoc(doc(confirmados(codigo), id))
    },
    async marcarNaFila(codigo, id) {
      await logado
      await updateDoc(doc(confirmados(codigo), id), { naFila: true })
    },
    async voltarParaConfirmados(codigo, id) {
      await logado
      await updateDoc(doc(confirmados(codigo), id), { naFila: false })
    },
    async apagarLista(codigo) {
      await logado
      for (const documento of (await getDocs(confirmados(codigo))).docs) await deleteDoc(documento.ref)
      await deleteDoc(listaDaPelada(codigo))
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
      await entrarComCredencial(GoogleAuthProvider.credential(r.token))
    },
    async entrarComApple() {
      await logado
      const resposta = await tokenDaApple()
      if (resposta === 'fechou') return
      await entrarComCredencial(credencialDaApple(resposta))
      // a Apple só manda o nome no primeiro login: guarda na conta (sem ele, o app pergunta como a pessoa quer aparecer)
      const usuario = auth.currentUser
      if (usuario && !usuario.displayName && resposta.nome) {
        await updateProfile(usuario, { displayName: resposta.nome })
        await usuario.getIdToken(true) // avisa a tela do nome novo
      }
    },
    async entrarComEmail(email, senha) {
      await logado
      await signInWithEmailAndPassword(auth, email, senha)
    },
    async redefinirSenha(email) {
      auth.languageCode = 'pt-BR' // o e-mail do Firebase sai em português
      await sendPasswordResetEmail(auth, email)
    },
    async criarContaComEmail(email, senha, nome) {
      await logado
      const atual = auth.currentUser
      // o anônimo vira a conta nova (mesmo uid: o que já era deste celular continua); se não der, cria do zero
      const { user } = atual?.isAnonymous
        ? await linkWithCredential(atual, EmailAuthProvider.credential(email, senha))
        : await createUserWithEmailAndPassword(auth, email, senha)
      // o nome aparece no app e para os mesários (sem ele, apareceria o e-mail)
      await updateProfile(user, { displayName: nome })
      await user.getIdToken(true) // avisa a tela do nome novo
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
    ouvirCarta(aoMudar) {
      return ouvirDoPerfil<PeladaDaCarta>(peladasDaCarta, aoMudar)
    },
    ouvirDadosDoJogador(aoMudar) {
      const vazio = { foto: null, apelido: null }
      let parar = () => {}
      const pararDeOuvirLogin = auth.onAuthStateChanged((usuario) => {
        parar()
        parar = () => {}
        if (!usuario || usuario.isAnonymous) { aoMudar(vazio); return }
        parar = onSnapshot(doc(db, 'perfis', usuario.uid), (documento) => {
          const dados = documento.data()
          aoMudar({ foto: (dados?.foto as string | undefined) ?? null, apelido: (dados?.apelido as string | undefined) ?? null, fotoRemovida: dados?.fotoRemovida === true })
        }, () => aoMudar(vazio))
      })
      return () => { parar(); pararDeOuvirLogin() }
    },
    async fotosDasContas(contas) {
      await logado
      const lidas = await Promise.all(contas.map(async (conta) => [conta, (await getDoc(doc(db, 'perfis', conta)).catch(() => null))?.data()?.foto as string | undefined] as const))
      return Object.fromEntries(lidas.flatMap(([conta, foto]) => (foto ? [[conta, foto] as const] : [])))
    },
    async salvarDadosDoJogador(dados) {
      const dono = auth.currentUser?.uid
      if (!dono) return
      const { fotoRemovida: _ignorado, ...escolhidos } = dados
      const campos = Object.fromEntries(Object.entries(escolhidos).map(([campo, valor]) => [campo, valor ?? deleteField()]))
      if ('foto' in escolhidos) campos.fotoRemovida = deleteField() // foto nova: some o aviso da removida
      await setDoc(doc(db, 'perfis', dono), { ...campos, atualizadaEm: Date.now() }, { merge: true })
    },
    async lancarNoCaixa(lancamentos) {
      const dono = await uid()
      for (const l of lancamentos) void addDoc(caixa(dono), puro(l))
    },
    async apagarLancamento(id) {
      const dono = await uid()
      await deleteDoc(doc(caixa(dono), id))
    },
    ouvirCaixinhas(aoMudar, aoErro) {
      return ouvirDoPerfil<Caixinha>(caixinhas, aoMudar, aoErro)
    },
    async salvarCaixinha(caixinha) {
      const dono = await uid()
      const { id, ...dados } = caixinha
      await setDoc(doc(caixinhas(dono), id), puro(dados))
    },
    ouvirHistorico(aoMudar, aoErro) {
      return ouvirDoPerfil<PeladaNoHistorico>(historico, aoMudar, aoErro)
    },
    async guardarPelada(pelada) {
      const dono = await uid()
      void addDoc(historico(dono), puro(pelada)) // sem internet, sobe quando a conexão voltar
    },

    // ---- turmas ----
    ouvirTurmas(aoMudar) {
      let parar = () => {}
      let dono: string | null | undefined
      const pararAuth = onIdTokenChanged(auth, (u) => {
        const agora = u && !u.isAnonymous ? u.uid : null
        if (agora === dono) return
        dono = agora
        parar()
        parar = () => {}
        if (!agora) { aoMudar([]); return }
        parar = onSnapshot(query(turmas(agora), orderBy('criadaEm')),
          (s) => aoMudar(s.docs.map((d) => ({ ...(d.data() as Omit<Turma, 'id'>), id: d.id }))))
      })
      return () => { pararAuth(); parar() }
    },
    async criarTurma(nome) {
      const dono = await uid()
      const ref = doc(turmas(dono))
      void setDoc(ref, { nome, criadaEm: Date.now() }) // sem internet, sobe quando voltar
      return ref.id
    },
    ouvirJogadoresDaTurma(turma, aoMudar) {
      let parar = () => {}
      let vivo = true
      void uid().then((dono) => {
        if (!vivo) return
        parar = onSnapshot(jogadoresDaTurma(dono, turma),
          (s) => aoMudar(s.docs.map((d) => ({ ...(d.data() as Omit<JogadorDaTurma, 'id'>), id: d.id }))))
      })
      return () => { vivo = false; parar() }
    },
    async registrarPeladaNaTurma(turma, jogadores, data) {
      const dono = await uid()
      const lote = writeBatch(db)
      for (const j of jogadores) {
        lote.set(doc(jogadoresDaTurma(dono, turma), j.id), { nome: j.nome, peladas: increment(1), ultimaPelada: data, ...(j.conta && { conta: j.conta }) }, { merge: true })
      }
      void lote.commit().catch((e) => console.error('Não deu para atualizar a turma', e))
    },
    async importarTurma(turma, jogadores, peladas) {
      const dono = await uid()
      const lote = writeBatch(db)
      for (const { id, ...j } of jogadores) lote.set(doc(jogadoresDaTurma(dono, turma), id), puro(j))
      for (const p of peladas) lote.set(doc(historico(dono), p), { turma }, { merge: true })
      await lote.commit()
    },
    // ---- plano pago: o plano só o servidor grava; os contadores só sobem de 1 em 1 (regras) ----
    ouvirPlano(aparelho, aoMudar) {
      const dados: DadosDoPlano = { plano: null, contadores: null, aparelho: null, config: null }
      const avisar = () => aoMudar({ ...dados })
      let parar: (() => void)[] = []
      let vivo = true
      void uid().then((dono) => {
        if (!vivo) return
        // sem permissão ou sem internet: fica null (o app não trava ninguém sem saber)
        const ouvirDoc = <T,>(ref: ReturnType<typeof doc>, guardar: (v: T | undefined) => void) =>
          onSnapshot(ref, (s) => { guardar(s.data() as T | undefined); avisar() }, () => {})
        parar = [
          ouvirDoc<Plano>(doc(db, 'planos', dono), (v) => { dados.plano = { ...PLANO_VAZIO, ...v } }),
          ouvirDoc<Contadores>(doc(db, 'contadores', dono), (v) => { dados.contadores = { ...CONTADORES_ZERADOS, ...v } }),
          ouvirDoc<{ peladas: number }>(doc(db, 'aparelhos', aparelho), (v) => { dados.aparelho = v?.peladas ?? 0 }),
          ouvirDoc<{ ativa: boolean }>(doc(db, 'config', 'cobranca'), (v) => { dados.config = { ativa: v?.ativa === true } }),
        ]
      })
      return () => { vivo = false; parar.forEach((f) => f()) }
    },
    async contarUso(tipo, aparelho) {
      const dono = await uid()
      // sem internet, sobe quando a conexão voltar
      void setDoc(doc(db, 'contadores', dono), { [tipo]: increment(1) }, { merge: true }).catch((e) => console.error('Não deu para contar', e))
      if (tipo === 'peladas') void setDoc(doc(db, 'aparelhos', aparelho), { peladas: increment(1) }, { merge: true }).catch(() => {})
    },

    idDaConta: () => uid(),

    async usarCreditoDeTorneio() {
      await logado
      const usar = await funcaoDoServidor<void, { ok: boolean }>('usarCreditoDeTorneio')
      return (await usar()).data.ok
    },
    async registrarNaCarta(data, turma, jogadores) {
      await logado
      if (!jogadores.length) return
      await (await funcaoDoServidor('registrarPeladaNaCarta'))({ data, turma, jogadores })
    },
    async denunciarFoto(conta, motivo) {
      await logado
      await (await funcaoDoServidor('denunciarFoto'))({ conta, motivo })
    },
    async retirarDaCarta(data, contas) {
      await logado
      if (!contas.length) return
      await (await funcaoDoServidor('retirarPeladaDaCarta'))({ data, contas })
    },

    async removerTurma(turma, peladas) {
      const dono = await uid()
      await apagarTudo([
        ...(await getDocs(jogadoresDaTurma(dono, turma))).docs.map((d) => d.ref),
        ...peladas.map((p) => doc(historico(dono), p)),
        doc(turmas(dono), turma),
      ])
    },

    async excluirConta(senha) {
      await logado
      const u = auth.currentUser
      if (!u || u.isAnonymous) return
      // o Google só deixa apagar a conta com login recente: confirma a conta antes de apagar qualquer dado
      let codigoDaApple: string | null = null
      if (senha !== undefined) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email ?? '', senha))
      else if (perfil(u).comApple) {
        // a Apple sempre confirma a conta: o código que ela devolve serve para cancelar a autorização no fim
        const resposta = await tokenDaApple(true)
        if (resposta === 'fechou') throw new Error('cancelou')
        await reauthenticateWithCredential(u, credencialDaApple(resposta))
        codigoDaApple = resposta.codigoDeAutorizacao
      } else if (Date.now() - Date.parse(u.metadata.lastSignInTime ?? '') > 4 * 60_000) {
        const r = nativo() ? await tokenDoCelular() : await entrarComUmToque()
        if (r === 'fechou') throw new Error('cancelou')
        if (r === 'indisponivel') await reauthenticateWithPopup(u, new GoogleAuthProvider())
        else await reauthenticateWithCredential(u, GoogleAuthProvider.credential(r.token))
      }
      const dono = u.uid
      const docs = async (q: Parameters<typeof getDocs>[0]) => (await getDocs(q)).docs.map((d) => d.ref as DocumentReference)
      const refs: DocumentReference[] = [...await docs(caixa(dono)), ...await docs(caixinhas(dono)), ...await docs(historico(dono)), doc(db, 'perfis', dono)]
      for (const t of await docs(turmas(dono))) refs.push(...await docs(jogadoresDaTurma(dono, t.id)), t)
      for (const t of await docs(query(collection(db, 'torneios'), where('nuvem.organizador', '==', dono)))) {
        for (const sub of [partidas(t.id), resultados(t.id), campos(t.id)]) refs.push(...await docs(sub))
        refs.push(t)
      }
      for (const c of await docs(query(collection(db, 'cobrancas'), where('organizador', '==', dono)))) refs.push(...await docs(avisos(c.id)), c)
      for (const lista of await docs(query(collection(db, 'listas'), where('organizador', '==', dono)))) refs.push(...await docs(confirmados(lista.id)), lista)
      await apagarTudo(refs)
      // os contadores de uso (sem nome nem e-mail) e o plano comprado ficam (PLANO.md, seção 14)
      if (codigoDaApple) {
        // tira o Dois ou Dez da lista de apps que usam a conta da Apple (a Apple exige); se falhar, a exclusão continua
        await import('@capacitor-firebase/authentication').then(({ FirebaseAuthentication }) => FirebaseAuthentication.revokeAccessToken({ token: codigoDaApple })).catch(() => null)
      }
      await deleteUser(u)
      if (nativo()) await import('@capacitor-firebase/authentication').then(({ FirebaseAuthentication }) => FirebaseAuthentication.signOut()).catch(() => null)
      await signInAnonymously(auth)
    },
  }
}
