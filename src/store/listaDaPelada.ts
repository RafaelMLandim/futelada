// Link da pelada, lado do organizador (PLANO.md, seção 17.2): quem abre o link se coloca nos Confirmados, e o
// organizador toca em quem chegou para pôr na fila. O link nunca mexe na fila sozinho.

import { useCallback, useEffect, useState } from 'react'
import { adicionarJogador, chegouGoleiro, contaNaLista, ligarConta, nomeSemRepetir, novoJogador, removerJogador, todosOsJogadores } from '../logic'
import { novoCodigo } from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { ConfirmadoNaLista } from '../nuvem/tipos'
import type { Estado } from '../types/pelada'
import { dataHoje, maiusculas } from '../utils/formatar'
import { enderecoDoSite } from '../utils/nativo'
import type { Pelada } from './usePelada'

/** Endereço do link da pelada (abre a tela "Entrar na lista"). */
export const linkDaLista = (codigo: string) => `${enderecoDoSite()}/?lista=${codigo}`

export function useListaDaPelada(pelada: Pelada, ativa: boolean) {
  const { app, aplicar } = pelada
  const codigo = ativa ? (app.estado.listaDaPelada ?? null) : null
  const [confirmados, setConfirmados] = useState<ConfirmadoNaLista[]>([])

  useEffect(() => {
    if (!codigo) return
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => {
      if (nuvem && vivo) parar = nuvem.ouvirLista(codigo, (_lista, lista) => setConfirmados(lista.filter((item) => !item.naFila)))
    })
    return () => { vivo = false; parar() }
  }, [codigo])

  /** Cria o link (se ainda não tem) e devolve o endereço. */
  const criarLink = useCallback(async (): Promise<string | null> => {
    const nuvem = await obterNuvem()
    if (!nuvem) return null
    let atual = app.estado.listaDaPelada ?? null
    if (!atual) {
      atual = novoCodigo()
      const novo = atual
      await nuvem.abrirLista(novo, dataHoje())
      aplicar((estado) => ({ ...estado, listaDaPelada: novo }))
    }
    return linkDaLista(atual)
  }, [app.estado.listaDaPelada, aplicar])

  /** Sai dos confirmados do organizador; no link, a pessoa vê que já está na fila. */
  const marcarNaFila = useCallback((id: string) => {
    setConfirmados((lista) => lista.filter((item) => item.id !== id))
    if (codigo) void obterNuvem().then((nuvem) => nuvem?.marcarNaFila(codigo, id)).catch(() => null)
  }, [codigo])

  /** Chegou ao campo: entra no fim da fila (o goleiro, no gol) e sai dos confirmados. `comoAparece`: o nome com sobrenome. Com conta, fica ligado a ela. */
  const chegou = useCallback((confirmado: ConfirmadoNaLista, comoAparece?: string) => {
    // a conta já está na pelada (o organizador se incluiu e também confirmou pelo link): só marca, não cria outro
    const jaEsta = (estado: Estado) => confirmado.comConta && contaNaLista(estado, confirmado.id)
    if (confirmado.goleiro) {
      // goleiro fixo: entra no gol (o mesmo nome entre os goleiros é a mesma pessoa)
      aplicar((estado) => (jaEsta(estado) ? estado : chegouGoleiro(estado, maiusculas(comoAparece ?? confirmado.nome), confirmado.comConta ? confirmado.id : null)))
      return marcarNaFila(confirmado.id)
    }
    aplicar((estado) => {
      if (jaEsta(estado)) return estado
      const nome = nomeSemRepetir(maiusculas(comoAparece ?? confirmado.nome), todosOsJogadores(estado).map((jogador) => jogador.nome))
      const jogador = { ...novoJogador(nome), ...(confirmado.comConta && { conta: confirmado.id }) }
      // guarda de onde veio: se foi engano, volta para os Confirmados (antes da primeira partida)
      return { ...adicionarJogador(estado, jogador), vieramDoLink: { ...estado.vieramDoLink, [jogador.id]: confirmado.id } }
    })
    marcarNaFila(confirmado.id)
  }, [aplicar, marcarNaFila])

  /** Era a mesma pessoa que já estava na lista: não cria outra; com conta, o jogador passa a ser dela. */
  const mesmaPessoa = useCallback((confirmado: ConfirmadoNaLista, jogadorId: string) => {
    if (confirmado.comConta) aplicar((estado) => ligarConta(estado, jogadorId, confirmado.id))
    marcarNaFila(confirmado.id)
  }, [aplicar, marcarNaFila])

  /** Tocou em "Chegou" por engano: sai da fila e volta para os Confirmados (no link, a pessoa volta a "confirmado"). */
  const voltarParaConfirmados = useCallback((jogadorId: string) => {
    const confirmadoId = app.estado.vieramDoLink?.[jogadorId]
    if (!confirmadoId) return
    aplicar((estado) => {
      const { [jogadorId]: _saiu, ...resto } = estado.vieramDoLink ?? {}
      const semEle = removerJogador(estado, jogadorId)
      // não é "foi embora": não guarda para o "Voltou?"
      return { ...semEle, foramEmbora: (semEle.foramEmbora ?? []).filter((jogador) => jogador.id !== jogadorId), vieramDoLink: resto }
    })
    if (codigo) void obterNuvem().then((nuvem) => nuvem?.voltarParaConfirmados(codigo, confirmadoId)).catch(() => null)
  }, [aplicar, app.estado.vieramDoLink, codigo])

  return { codigo, confirmados, criarLink, chegou, mesmaPessoa, voltarParaConfirmados }
}
