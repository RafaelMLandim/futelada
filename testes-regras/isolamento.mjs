// Isolamento entre usuários no emulador do Firestore: ninguém vê, muda ou apaga o que é de outra pessoa
// (pelada compartilhada, torneio, campo pago e dados da conta). Rodar: npm run test:regras
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, test } from 'node:test'

let ambiente
before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: 'demo-dois-ou-dez', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
beforeEach(() => ambiente.clearFirestore())
after(() => ambiente.cleanup())

const comGoogle = (uid) => ambiente.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore()
// ana é a dona (organizadora), carla ajuda (tem o link de controle / é mesária), beto é um estranho
const ana = () => comGoogle('ana')
const beto = () => comGoogle('beto')
const carla = () => comGoogle('carla')
const anonimo = () => ambiente.authenticatedContext('anonimo', { firebase: { sign_in_provider: 'anonymous' } }).firestore()
const semLogin = () => ambiente.unauthenticatedContext().firestore()
const servidor = (fazer) => ambiente.withSecurityRulesDisabled((contexto) => fazer(contexto.firestore()))

describe('pelada compartilhada', () => {
  const PELADA = 'peladas/ABC234'
  const app = (placar) => ({ estado: { placar }, crono: { rodando: false } })
  const criarPeladaDaAna = async () => {
    await assertSucceeds(setDoc(doc(ana(), PELADA), {
      dono: 'ana', nomeDoDono: 'Ana', controlador: 'ana', nomeDoControlador: 'Ana', app: app(0), encerrada: false, atualizadaEm: 1,
    }))
    await assertSucceeds(setDoc(doc(ana(), `${PELADA}/privado/chave`), { valor: 'chave-certa' }))
  }
  const carlaAssume = async () => {
    await assertSucceeds(setDoc(doc(carla(), `${PELADA}/pedidos/carla`), { chave: 'chave-certa' }))
    await assertSucceeds(updateDoc(doc(carla(), PELADA), { controlador: 'carla', nomeDoControlador: 'Carla' }))
  }

  test('quem tem o código acompanha (até anônimo); sem login, não', async () => {
    await criarPeladaDaAna()
    await assertSucceeds(getDoc(doc(beto(), PELADA)))
    await assertSucceeds(getDoc(doc(anonimo(), PELADA)))
    await assertFails(getDoc(doc(semLogin(), PELADA)))
  })

  test('ninguém lista as peladas dos outros', async () => {
    await criarPeladaDaAna()
    await assertFails(getDocs(collection(beto(), 'peladas')))
    await assertFails(getDocs(collection(anonimo(), 'peladas')))
    await assertFails(getDocs(query(collection(beto(), 'peladas'), where('dono', '==', 'ana'))))
  })

  test('estranho não marca, não encerra, não apaga e não toma a pelada', async () => {
    await criarPeladaDaAna()
    await assertFails(updateDoc(doc(beto(), PELADA), { app: app(5) }))
    await assertFails(updateDoc(doc(beto(), PELADA), { encerrada: true }))
    await assertFails(deleteDoc(doc(beto(), PELADA)))
    await assertFails(setDoc(doc(beto(), PELADA), { dono: 'beto', controlador: 'beto', app: app(0), encerrada: false, atualizadaEm: 2 }))
    await assertFails(updateDoc(doc(beto(), PELADA), { controlador: 'beto', nomeDoControlador: 'Beto' })) // sem chave
  })

  test('estranho não cria pelada no nome de outra pessoa', async () => {
    await assertFails(setDoc(doc(beto(), 'peladas/XYZ789'), { dono: 'ana', controlador: 'ana', app: app(0), encerrada: false, atualizadaEm: 1 }))
    await assertFails(setDoc(doc(beto(), 'peladas/XYZ789'), { dono: 'beto', controlador: 'ana', app: app(0), encerrada: false, atualizadaEm: 1 }))
  })

  test('a chave de controle: ninguém lê; chave errada não assume; anônimo não assume nem com a certa', async () => {
    await criarPeladaDaAna()
    await assertFails(getDoc(doc(beto(), `${PELADA}/privado/chave`)))
    await assertFails(getDoc(doc(anonimo(), `${PELADA}/privado/chave`)))
    await assertFails(setDoc(doc(beto(), `${PELADA}/privado/chave`), { valor: 'minha' }))
    await assertSucceeds(setDoc(doc(beto(), `${PELADA}/pedidos/beto`), { chave: 'chute' }))
    await assertFails(updateDoc(doc(beto(), PELADA), { controlador: 'beto', nomeDoControlador: 'Beto' }))
    await assertSucceeds(setDoc(doc(anonimo(), `${PELADA}/pedidos/anonimo`), { chave: 'chave-certa' }))
    await assertFails(updateDoc(doc(anonimo(), PELADA), { controlador: 'anonimo', nomeDoControlador: null }))
  })

  test('ninguém lê nem escreve o pedido de outra pessoa', async () => {
    await criarPeladaDaAna()
    await carlaAssume()
    await assertFails(getDoc(doc(beto(), `${PELADA}/pedidos/carla`)))
    await assertFails(setDoc(doc(beto(), `${PELADA}/pedidos/carla`), { chave: 'outra' }))
    await assertFails(getDocs(collection(beto(), `${PELADA}/pedidos`)))
  })

  test('com a chave certa a ajudante assume e marca; a dona para de gravar até retomar', async () => {
    await criarPeladaDaAna()
    await carlaAssume()
    await assertSucceeds(updateDoc(doc(carla(), PELADA), { app: app(1), encerrada: false, atualizadaEm: 3 }))
    await assertFails(updateDoc(doc(ana(), PELADA), { app: app(9), encerrada: false, atualizadaEm: 4 })) // não está no controle
    await assertSucceeds(updateDoc(doc(ana(), PELADA), { controlador: 'ana', nomeDoControlador: 'Ana' })) // retoma
    await assertFails(updateDoc(doc(carla(), PELADA), { app: app(7), encerrada: false, atualizadaEm: 5 })) // perdeu o controle
    await assertSucceeds(updateDoc(doc(ana(), PELADA), { app: app(2), encerrada: false, atualizadaEm: 6 }))
  })

  test('a ajudante não troca a dona, o nome da dona, nem passa o controle para outra pessoa', async () => {
    await criarPeladaDaAna()
    await carlaAssume()
    await assertFails(updateDoc(doc(carla(), PELADA), { dono: 'carla' }))
    await assertFails(updateDoc(doc(carla(), PELADA), { nomeDoDono: 'Carla' }))
    await assertFails(updateDoc(doc(carla(), PELADA), { controlador: 'beto', nomeDoControlador: 'Beto' }))
    await assertFails(updateDoc(doc(carla(), PELADA), { app: app(3), controlador: 'carla', dono: 'carla' }))
  })

  test('só a dona apaga a pelada (nem quem está no controle)', async () => {
    await criarPeladaDaAna()
    await carlaAssume()
    await assertFails(deleteDoc(doc(carla(), PELADA)))
    await assertSucceeds(deleteDoc(doc(ana(), PELADA)))
  })
})

describe('torneio compartilhado', () => {
  const TORNEIO = 'torneios/TOR234'
  const criarTorneioDaAna = () => servidor((db) => setDoc(doc(db, TORNEIO), { nome: 'Copa', nuvem: { codigo: 'TOR234', organizador: 'ana' } }))
  const carlaPegaOCampo1 = () => assertSucceeds(setDoc(doc(carla(), `${TORNEIO}/campos/1`), { uid: 'carla', nome: 'Carla', foto: null, em: 1 }))
  const partida = (campo) => ({ jogoId: 'j1', campo, placar: { A: 0, B: 0 } })

  test('anônimo e sem login não leem; quem entrou com o Google e tem o código lê', async () => {
    await criarTorneioDaAna()
    await assertFails(getDoc(doc(anonimo(), TORNEIO)))
    await assertFails(getDoc(doc(semLogin(), TORNEIO)))
    await assertSucceeds(getDoc(doc(beto(), TORNEIO)))
  })

  test('ninguém lista os torneios dos outros; a organizadora acha os dela (para excluir a conta)', async () => {
    await criarTorneioDaAna()
    await assertFails(getDocs(collection(beto(), 'torneios')))
    await assertFails(getDocs(query(collection(beto(), 'torneios'), where('nuvem.organizador', '==', 'ana'))))
    await assertSucceeds(getDocs(query(collection(ana(), 'torneios'), where('nuvem.organizador', '==', 'ana'))))
  })

  test('estranho não muda, não apaga e não cria torneio no nome de outra pessoa', async () => {
    await criarTorneioDaAna()
    await assertFails(updateDoc(doc(beto(), TORNEIO), { nome: 'Copa do Beto' }))
    await assertFails(setDoc(doc(beto(), TORNEIO), { nome: 'Minha', nuvem: { codigo: 'TOR234', organizador: 'beto' } }))
    await assertFails(deleteDoc(doc(beto(), TORNEIO)))
    await assertFails(setDoc(doc(beto(), 'torneios/NOV567'), { nome: 'Falso', nuvem: { codigo: 'NOV567', organizador: 'ana' } }))
  })

  test('campo do mesário: quem pega trava; outro não toma nem solta; a organizadora solta', async () => {
    await criarTorneioDaAna()
    await carlaPegaOCampo1()
    await assertFails(setDoc(doc(beto(), `${TORNEIO}/campos/1`), { uid: 'beto', nome: 'Beto', foto: null, em: 2 }))
    await assertFails(deleteDoc(doc(beto(), `${TORNEIO}/campos/1`)))
    await assertFails(setDoc(doc(beto(), `${TORNEIO}/campos/2`), { uid: 'carla', nome: 'Carla', foto: null, em: 2 })) // no nome de outra
    await assertSucceeds(deleteDoc(doc(ana(), `${TORNEIO}/campos/1`)))
  })

  test('quem não é mesária nem organizadora não marca jogo nem resultado', async () => {
    await criarTorneioDaAna()
    await assertFails(setDoc(doc(beto(), `${TORNEIO}/partidas/j1`), partida(1)))
    await assertFails(setDoc(doc(beto(), `${TORNEIO}/resultados/j1`), { placar: { A: 9, B: 0 } }))
    await servidor((db) => setDoc(doc(db, `${TORNEIO}/resultados/j1`), { placar: { A: 1, B: 0 } }))
    await assertFails(updateDoc(doc(beto(), `${TORNEIO}/resultados/j1`), { placar: { A: 0, B: 5 } }))
    await assertFails(deleteDoc(doc(beto(), `${TORNEIO}/resultados/j1`)))
  })

  test('a mesária marca só os jogos do campo dela', async () => {
    await criarTorneioDaAna()
    await carlaPegaOCampo1()
    await assertSucceeds(setDoc(doc(carla(), `${TORNEIO}/partidas/j1`), partida(1)))
    await assertFails(setDoc(doc(carla(), `${TORNEIO}/partidas/j2`), { ...partida(2), jogoId: 'j2' }))
    await servidor((db) => setDoc(doc(db, `${TORNEIO}/partidas/j2`), { ...partida(2), jogoId: 'j2' }))
    await assertFails(updateDoc(doc(carla(), `${TORNEIO}/partidas/j2`), { placar: { A: 3, B: 0 } }))
    await assertFails(deleteDoc(doc(carla(), `${TORNEIO}/partidas/j2`)))
  })

  test('a mesária encerra o jogo do campo dela (resultado + tira o jogo em andamento) e reabre', async () => {
    await criarTorneioDaAna()
    await carlaPegaOCampo1()
    const mesaria = carla()
    await assertSucceeds(setDoc(doc(mesaria, `${TORNEIO}/partidas/j1`), partida(1)))
    const encerrar = writeBatch(mesaria)
    encerrar.set(doc(mesaria, `${TORNEIO}/resultados/j1`), { placar: { A: 2, B: 1 } })
    encerrar.delete(doc(mesaria, `${TORNEIO}/partidas/j1`))
    await assertSucceeds(encerrar.commit())
    const reabrir = writeBatch(mesaria)
    reabrir.delete(doc(mesaria, `${TORNEIO}/resultados/j1`))
    reabrir.set(doc(mesaria, `${TORNEIO}/partidas/j1`), partida(1))
    await assertSucceeds(reabrir.commit())
  })

  test('mesária que soltou o campo não marca mais', async () => {
    await criarTorneioDaAna()
    await carlaPegaOCampo1()
    await assertSucceeds(deleteDoc(doc(carla(), `${TORNEIO}/campos/1`)))
    await assertFails(setDoc(doc(carla(), `${TORNEIO}/partidas/j1`), partida(1)))
  })

  test('a organizadora marca e corrige qualquer jogo', async () => {
    await criarTorneioDaAna()
    await assertSucceeds(setDoc(doc(ana(), `${TORNEIO}/partidas/j1`), partida(2)))
    await assertSucceeds(setDoc(doc(ana(), `${TORNEIO}/resultados/j1`), { placar: { A: 1, B: 1 } }))
    await assertSucceeds(deleteDoc(doc(ana(), `${TORNEIO}/resultados/j1`)))
    await assertSucceeds(deleteDoc(doc(ana(), `${TORNEIO}/partidas/j1`)))
  })

  test('nada fora de campos, partidas e resultados', async () => {
    await criarTorneioDaAna()
    await assertFails(setDoc(doc(ana(), `${TORNEIO}/outra/x`), { a: 1 }))
    await assertFails(setDoc(doc(beto(), `${TORNEIO}/outra/x`), { a: 1 }))
  })
})

describe('campo pago (cobrança)', () => {
  const COBRANCA = 'cobrancas/COB234'
  const criarCobrancaDaAna = () => assertSucceeds(setDoc(doc(ana(), COBRANCA), { organizador: 'ana', chavePix: 'ana@pix', valor: 150, confirmarAuto: false }))

  test('quem tem o link lê; ninguém lista as cobranças (com a chave Pix) dos outros', async () => {
    await criarCobrancaDaAna()
    await assertSucceeds(getDoc(doc(beto(), COBRANCA)))
    await assertFails(getDocs(collection(beto(), 'cobrancas')))
    await assertFails(getDocs(collection(anonimo(), 'cobrancas')))
    await assertFails(getDocs(query(collection(beto(), 'cobrancas'), where('organizador', '==', 'ana'))))
    await assertSucceeds(getDocs(query(collection(ana(), 'cobrancas'), where('organizador', '==', 'ana'))))
  })

  test('estranho não muda a chave Pix nem o valor, não apaga e não cria cobrança no nome de outra pessoa', async () => {
    await criarCobrancaDaAna()
    await assertFails(updateDoc(doc(beto(), COBRANCA), { chavePix: 'beto@pix' }))
    await assertFails(updateDoc(doc(beto(), COBRANCA), { valor: 1 }))
    await assertFails(setDoc(doc(beto(), COBRANCA), { organizador: 'beto', chavePix: 'beto@pix', valor: 150 }))
    await assertFails(deleteDoc(doc(beto(), COBRANCA)))
    await assertFails(setDoc(doc(beto(), 'cobrancas/NOV567'), { organizador: 'ana', chavePix: 'beto@pix', valor: 10 }))
  })

  test('jogador avisa que pagou; só a organizadora marca pago; ninguém desfaz um pago', async () => {
    await criarCobrancaDaAna()
    const aviso = (db) => doc(db, `${COBRANCA}/avisos/jogador1`)
    await assertSucceeds(setDoc(aviso(beto()), { status: 'avisou' }))
    await assertFails(setDoc(aviso(beto()), { status: 'pago' }))
    await assertSucceeds(setDoc(aviso(ana()), { status: 'pago' }))
    await assertFails(setDoc(aviso(beto()), { status: 'avisou' }))
    await assertFails(deleteDoc(aviso(beto())))
  })

  test('com a confirmação automática o jogador marca o próprio pago, mas não desfaz', async () => {
    await assertSucceeds(setDoc(doc(ana(), COBRANCA), { organizador: 'ana', chavePix: 'ana@pix', valor: 150, confirmarAuto: true }))
    const aviso = doc(beto(), `${COBRANCA}/avisos/jogador1`)
    await assertSucceeds(setDoc(aviso, { status: 'pago' }))
    await assertFails(setDoc(aviso, { status: 'avisou' }))
  })
})

describe('dados da conta', () => {
  test('caixa, histórico e turmas: só a dona lê e escreve', async () => {
    for (const caminho of ['usuarios/ana/caixa/l1', 'usuarios/ana/peladas/p1', 'usuarios/ana/turmas/t1', 'usuarios/ana/turmas/t1/jogadores/j1']) {
      await assertSucceeds(setDoc(doc(ana(), caminho), { valor: 1 }))
      await assertFails(getDoc(doc(beto(), caminho)))
      await assertFails(getDoc(doc(anonimo(), caminho)))
      await assertFails(setDoc(doc(beto(), caminho), { valor: 2 }))
      await assertFails(deleteDoc(doc(beto(), caminho)))
    }
    await assertFails(getDocs(collection(beto(), 'usuarios/ana/peladas')))
    await assertFails(getDocs(collection(beto(), 'usuarios')))
  })

  test('plano e contadores de outra conta: ninguém lê', async () => {
    await servidor(async (db) => {
      await setDoc(doc(db, 'planos/ana'), { premiumAte: 9e12 })
      await setDoc(doc(db, 'contadores/ana'), { peladas: 3 })
    })
    await assertFails(getDoc(doc(beto(), 'planos/ana')))
    await assertFails(getDoc(doc(beto(), 'contadores/ana')))
    await assertFails(getDocs(collection(beto(), 'planos')))
    await assertFails(getDocs(collection(beto(), 'contadores')))
  })

  test('coleções que não existem nas regras: ninguém grava', async () => {
    await assertFails(setDoc(doc(ana(), 'qualquer/coisa'), { a: 1 }))
  })
})
