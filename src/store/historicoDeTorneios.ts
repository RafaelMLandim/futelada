// Histórico de torneios (PLANO.md, seção 24). Quando o torneio acaba, o celular do organizador manda o resumo (com o
// ranking final do bolão): compartilhado, o servidor grava na conta de cada participante; só deste celular, vai direto
// para a conta do organizador. Mandar de novo (resultado corrigido) regrava. Sem internet, tenta ao abrir de novo.

import { useEffect, useState } from 'react'
import { rankingDoBolao, torneioParaOHistorico, type LinhaDoRanking, type PalpiteDoJogo, type PalpiteDoTorneio, type ParticipanteDoBolao, type TorneioNoHistorico } from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { Nuvem } from '../nuvem/tipos'
import type { Torneio } from '../types/torneio'
import type { TorneioHook } from './torneio'

/** Os torneios encerrados de quem está logado (null = carregando). */
export function useTorneiosEncerrados(): TorneioNoHistorico[] | null {
  const [torneios, setTorneios] = useState<TorneioNoHistorico[] | null>(null)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((nuvem) => {
      if (!nuvem) return setTorneios([])
      if (ativo) parar = nuvem.ouvirTorneiosEncerrados(setTorneios, () => setTorneios([]))
    })
    return () => { ativo = false; parar() }
  }, [])
  return torneios
}

const CHAVE = (id: string) => `torneio:historico:${id}`
const lerMandado = (id: string) => { try { return localStorage.getItem(CHAVE(id)) } catch { return null } }
const guardarMandado = (id: string, assinatura: string) => { try { localStorage.setItem(CHAVE(id), assinatura) } catch { /* segue */ } }

/** A primeira resposta de um "ouvir" da nuvem (ou `vazio`, se der erro ou demorar). */
function primeiraResposta<T>(ouvir: (aoMudar: (valor: T) => void, aoErro: () => void) => () => void, vazio: T): Promise<T> {
  return new Promise((resolver) => {
    let parar: (() => void) | null = null
    let pronto = false
    const terminar = (valor: T) => {
      if (pronto) return
      pronto = true
      clearTimeout(espera)
      setTimeout(() => parar?.(), 0)
      resolver(valor)
    }
    const espera = setTimeout(() => terminar(vazio), 10_000)
    parar = ouvir(terminar, () => terminar(vazio))
  })
}

/** O ranking final do bolão: quem entrou e os palpites de todos (depois do fim, as regras deixam ler). */
async function rankingFinal(nuvem: Nuvem, codigo: string, torneio: Torneio): Promise<LinhaDoRanking[] | null> {
  const participantes = await primeiraResposta<ParticipanteDoBolao[]>((aoMudar) => nuvem.ouvirParticipantesDoBolao(codigo, aoMudar), [])
  if (participantes.length === 0) return null
  const palpitesDosJogos: Record<string, Record<string, PalpiteDoJogo>> = {}
  for (const jogo of torneio.jogos.filter((item) => item.resultado)) {
    palpitesDosJogos[jogo.id] = await primeiraResposta<Record<string, PalpiteDoJogo>>((aoMudar, aoErro) => nuvem.ouvirPalpitesDoJogo(codigo, jogo.id, aoMudar, aoErro), {})
  }
  const doTorneio = await primeiraResposta<Record<string, PalpiteDoTorneio>>((aoMudar, aoErro) => nuvem.ouvirPalpitesDoTorneio(codigo, aoMudar, aoErro), {})
  return rankingDoBolao(torneio, participantes, doTorneio, palpitesDosJogos)
}

const emEnvio = new Set<string>()

/** No celular do organizador: o torneio acabou (ou o resultado mudou depois), manda para o histórico. */
export function useTorneioNoHistorico(hook: TorneioHook) {
  const { torneio, souOrganizador } = hook
  const resumo = torneio && souOrganizador ? torneioParaOHistorico(torneio) : null
  const assinatura = resumo && resumo.data > 0 ? JSON.stringify(resumo) : null
  const codigo = torneio?.nuvem?.codigo ?? null
  const id = codigo ?? torneio?.id ?? null

  useEffect(() => {
    if (!assinatura || !id || !torneio || emEnvio.has(id) || lerMandado(id) === assinatura) return
    emEnvio.add(id)
    void (async () => {
      const nuvem = await obterNuvem()
      if (!nuvem) return
      if (codigo) {
        const ranking = await rankingFinal(nuvem, codigo, torneio)
        await nuvem.registrarTorneioNoHistorico(codigo, torneioParaOHistorico(torneio, ranking)!)
      } else {
        await nuvem.guardarTorneioEncerrado(id, JSON.parse(assinatura))
      }
      guardarMandado(id, assinatura)
    })().catch(() => null).finally(() => emEnvio.delete(id))
  }, [assinatura, id, codigo]) // eslint-disable-line react-hooks/exhaustive-deps
}
