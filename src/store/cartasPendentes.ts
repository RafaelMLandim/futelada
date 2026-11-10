// O que falta mandar para as cartas (PLANO.md, seção 17). A pelada costuma acabar no campo, sem sinal: o pedido
// fica guardado no celular e sai sozinho quando a internet volta ou quando o app abre de novo.

import type { ResumoDaCarta } from '../logic/carta'
import { obterNuvem } from '../nuvem'
import { donoDoCelular } from './donoDoCelular'

const CHAVE = 'cartas:pendentes'

type Pendencia = { dono: string; data: number } & (
  | { tipo: 'registrar'; turma: string | null; jogadores: ResumoDaCarta[] }
  | { tipo: 'retirar'; contas: string[] }
)

function pendencias(): Pendencia[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as Pendencia[]
  } catch {
    return []
  }
}

function guardar(lista: Pendencia[]) {
  try {
    if (lista.length) localStorage.setItem(CHAVE, JSON.stringify(lista))
    else localStorage.removeItem(CHAVE)
  } catch {
    // sem armazenamento: o envio de agora ainda é tentado
  }
}

const mesmaPendencia = (uma: Pendencia, outra: Pendencia) => uma.tipo === outra.tipo && uma.data === outra.data && uma.dono === outra.dono

/** O servidor recusou o pedido: tentar de novo daria o mesmo resultado (sem sinal e erro do servidor continuam na fila). */
function recusado(erro: unknown) {
  const codigo = (erro as { code?: string } | null)?.code
  return codigo === 'functions/invalid-argument' || codigo === 'functions/unauthenticated' || codigo === 'functions/permission-denied'
}

let enviando = false

/** Manda o que está pendente, na ordem. Sem sinal, para e continua na próxima vez. */
export async function enviarPendencias() {
  const dono = donoDoCelular()
  if (enviando || !pendencias().some((pendencia) => pendencia.dono === dono)) return
  enviando = true
  try {
    const nuvem = await obterNuvem()
    if (!nuvem) return
    for (;;) {
      const proxima = pendencias().find((pendencia) => pendencia.dono === dono)
      if (!proxima) return
      try {
        if (proxima.tipo === 'registrar') await nuvem.registrarNaCarta(proxima.data, proxima.turma, proxima.jogadores)
        else await nuvem.retirarDaCarta(proxima.data, proxima.contas)
      } catch (erro) {
        if (!recusado(erro)) return
      }
      guardar(pendencias().filter((pendencia) => !mesmaPendencia(pendencia, proxima)))
    }
  } catch {
    // a nuvem não abriu: tenta na próxima vez
  } finally {
    enviando = false
  }
}

/** Pelada encerrada: os números vão para a carta de quem jogou com conta. Só quem entrou com a conta registra. */
export function registrarDepois(data: number, turma: string | null, jogadores: ResumoDaCarta[]) {
  const dono = donoDoCelular()
  if (!dono || !jogadores.length) return
  guardar([...pendencias(), { tipo: 'registrar', dono, data, turma, jogadores }])
  void enviarPendencias()
}

/** Pelada apagada: os números saem da carta. Um registro dela que ainda não saiu nem é mandado. */
export function retirarDepois(data: number, contas: string[]) {
  const dono = donoDoCelular()
  if (!dono || !contas.length) return
  const semORegistro = pendencias().filter((pendencia) => !(pendencia.tipo === 'registrar' && pendencia.data === data && pendencia.dono === dono))
  guardar([...semORegistro, { tipo: 'retirar', dono, data, contas }])
  void enviarPendencias()
}

/** Ao abrir o app e sempre que a internet voltar. */
export function acompanharPendencias() {
  void enviarPendencias()
  window.addEventListener('online', () => void enviarPendencias())
}
