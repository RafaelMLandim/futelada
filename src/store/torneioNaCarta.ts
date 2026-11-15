// Torneio na carta (PLANO.md, seção 22.2): o celular do organizador manda o resumo de quem jogou com conta para o
// servidor gravar nas cartas, sempre que os números mudam (um jogo acabou, um resultado foi corrigido). Manda na hora:
// o último jogo leva para a tela do campeão, e o envio não pode esperar. Mandar de novo só refaz os números do torneio;
// sem internet, tenta de novo na próxima mudança ou ao abrir o torneio.

import { useEffect } from 'react'
import { resumoDoTorneioParaAsCartas, type ResumoDoTorneioNaCarta } from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { TorneioHook } from './torneio'

const CHAVE = (codigo: string) => `torneio:carta:${codigo}`

const lerMandada = (codigo: string) => { try { return localStorage.getItem(CHAVE(codigo)) } catch { return null } }
const guardarMandada = (codigo: string, assinatura: string) => { try { localStorage.setItem(CHAVE(codigo), assinatura) } catch { /* segue */ } }

// um envio por vez para cada torneio; chegando outro no meio, manda o mais novo quando o atual acabar
const emEnvio = new Map<string, { proximo: (() => Promise<void>) | null }>()

function mandar(codigo: string, nome: string, data: number, resumo: ResumoDoTorneioNaCarta[], assinatura: string) {
  const enviar = async () => {
    const nuvem = await obterNuvem()
    await nuvem?.registrarTorneioNaCarta(codigo, nome, data, resumo)
    guardarMandada(codigo, assinatura)
  }
  const atual = emEnvio.get(codigo)
  if (atual) { atual.proximo = enviar; return }
  const fila = { proximo: null as (() => Promise<void>) | null }
  emEnvio.set(codigo, fila)
  void (async () => {
    let tarefa: (() => Promise<void>) | null = enviar
    while (tarefa) {
      await tarefa().catch(() => null)
      tarefa = fila.proximo
      fila.proximo = null
    }
    emEnvio.delete(codigo)
  })()
}

export function useTorneioNaCarta(hook: TorneioHook) {
  const { torneio, souOrganizador } = hook
  const codigo = torneio?.nuvem?.codigo ?? null
  const resumo = torneio && codigo && souOrganizador ? resumoDoTorneioParaAsCartas(torneio) : null
  const assinatura = resumo ? JSON.stringify(resumo) : null
  // quando o torneio começou a valer (o primeiro jogo que acabou): define a temporada na carta
  const fins = torneio?.jogos.flatMap((jogo) => (jogo.resultado?.encerradoEm ? [jogo.resultado.encerradoEm] : [])) ?? []
  const data = fins.length ? Math.min(...fins) : 0
  const nome = torneio?.nome ?? ''

  useEffect(() => {
    if (!codigo || !assinatura || !data) return
    const mandada = lerMandada(codigo)
    if (mandada === assinatura) return
    const lido = JSON.parse(assinatura) as ResumoDoTorneioNaCarta[]
    // ninguém com conta e nada mandado antes: não precisa chamar o servidor
    if (lido.length === 0 && mandada === null) return
    mandar(codigo, nome, data, lido, assinatura)
  }, [codigo, assinatura, nome, data])
}
