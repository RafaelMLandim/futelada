// Inscrição dos times pelo link, lado do organizador (PLANO.md, seção 22): o celular dele junta os times e os
// jogadores que entraram pelo link nos times do torneio (só ele grava o torneio). Fecha sozinho no sorteio.

import { useCallback, useEffect, useState } from 'react'
import { juntarInscricoes, novoCodigo } from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { InscricaoDoTorneio, TimeInscrito, TimeTorneio } from '../types/torneio'
import { enderecoDoSite } from '../utils/nativo'
import type { TorneioHook } from './torneio'

/** Link do torneio (os capitães inscrevem o time); com o time, o link do time (os jogadores entram nele). */
export const linkDaInscricao = (codigo: string, time?: string) => `${enderecoDoSite()}/?inscricao=${codigo}${time ? `&time=${time}` : ''}`

export function useInscricaoDoTorneio(hook: TorneioHook, limiteDeTimes: number | null) {
  const { torneio, souOrganizador, aplicar } = hook
  const codigo = torneio?.inscricao ?? null
  const compartilhado = !!torneio?.nuvem
  const sorteado = !!torneio?.sorteado
  const nome = torneio?.nome ?? ''
  const codigoDoTorneio = torneio?.nuvem?.codigo ?? null
  const [link, setLink] = useState<InscricaoDoTorneio | null>(null)
  const [times, setTimes] = useState<TimeInscrito[]>([])
  const ouvir = !!codigo && souOrganizador

  useEffect(() => {
    if (!ouvir || !codigo) return
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => {
      if (nuvem && vivo) parar = nuvem.ouvirInscricao(codigo, (dados, inscritos) => { setLink(dados); setTimes(inscritos) })
    })
    return () => { vivo = false; parar() }
  }, [ouvir, codigo])

  // junta no torneio o que chegou pelo link (antes do sorteio)
  useEffect(() => {
    if (!ouvir || !link || sorteado) return
    aplicar((atual) => juntarInscricoes(atual, times, limiteDeTimes))
  }, [ouvir, link, times, sorteado, limiteDeTimes, aplicar])

  // o link acompanha o torneio: fecha no sorteio (e reabre se o sorteio for desfeito), com o nome e o limite de agora
  useEffect(() => {
    if (!ouvir || !codigo || !link) return
    const aberta = !sorteado
    if (link.aberta === aberta && link.limiteDeTimes === limiteDeTimes && link.nomeDoTorneio === nome && (link.torneio ?? null) === codigoDoTorneio) return
    void obterNuvem().then((nuvem) => nuvem?.publicarInscricao(codigo, { nomeDoTorneio: nome, aberta, limiteDeTimes, torneio: codigoDoTorneio })).catch(() => null)
  }, [ouvir, codigo, link, sorteado, limiteDeTimes, nome, codigoDoTorneio])

  /** Cria o link (se ainda não tem) e devolve o endereço. null = sem internet ou torneio só no celular. */
  const criarLink = useCallback(async (): Promise<string | null> => {
    if (!compartilhado) return null
    const nuvem = await obterNuvem()
    if (!nuvem) return null
    let atual = codigo
    if (!atual) {
      atual = novoCodigo()
      await nuvem.publicarInscricao(atual, { nomeDoTorneio: nome, aberta: true, limiteDeTimes, torneio: codigoDoTorneio })
      const novo = atual
      aplicar((torneioAtual) => ({ ...torneioAtual, inscricao: novo }))
    }
    return linkDaInscricao(atual)
  }, [compartilhado, codigo, nome, limiteDeTimes, codigoDoTorneio, aplicar])

  /**
   * O organizador salvou um time que veio do link: o nome e a cor vão para a inscrição (senão voltariam os do
   * capitão) e quem ele tirou sai do link (senão voltaria).
   */
  const aoSalvarTime = useCallback((antes: TimeTorneio, depois: TimeTorneio) => {
    if (!codigo || !antes.inscricao) return
    const timeId = antes.inscricao
    const ficou = new Set(depois.jogadores.map((jogador) => jogador.inscrito).filter(Boolean))
    const saiu = antes.jogadores.filter((jogador) => jogador.inscrito && !ficou.has(jogador.inscrito))
    void obterNuvem().then(async (nuvem) => {
      if (!nuvem) return
      if (antes.nome !== depois.nome || antes.cor !== depois.cor) await nuvem.mudarTimeInscrito(codigo, timeId, { nome: depois.nome, cor: depois.cor })
      for (const jogador of saiu) await nuvem.sairDoTime(codigo, timeId, jogador.inscrito!)
    }).catch(() => null)
  }, [codigo])

  /** O organizador excluiu um time que veio do link: sai da inscrição também. */
  const aoExcluirTime = useCallback((time: TimeTorneio) => {
    if (!codigo || !time.inscricao) return
    const timeId = time.inscricao
    void obterNuvem().then((nuvem) => nuvem?.tirarTimeInscrito(codigo, timeId)).catch(() => null)
  }, [codigo])

  return { disponivel: compartilhado && souOrganizador, codigo, aberta: !!link?.aberta, inscritos: times.length, criarLink, aoSalvarTime, aoExcluirTime }
}

export type InscricaoHook = ReturnType<typeof useInscricaoDoTorneio>
