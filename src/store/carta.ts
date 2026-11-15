// Carta e foto de quem entrou (PLANO.md, seção 17).

import { useCallback, useEffect, useState } from 'react'
import { contasDaPelada, type JogadorNoAno } from '../logic'
import type { PeladaDaCarta, TorneioDaCarta } from '../logic/carta'
import { obterNuvem } from '../nuvem'
import type { DadosDoJogador } from '../nuvem/tipos'
import type { Estado } from '../types/pelada'
import { semAsDenunciadas } from './denuncias'
import { donoDoCelular } from './donoDoCelular'

/**
 * A última carta que chegou, guardada no celular (de quem está logado): o perfil abre já com os números e a cor certos,
 * sem começar zerado e mudar de bronze para ouro quando a nuvem responde.
 */
function cartaGuardada<T>(chave: string): T[] | null {
  try {
    const guardada = JSON.parse(localStorage.getItem(chave) ?? 'null') as { dono: string; itens: T[] } | null
    return guardada && guardada.dono === donoDoCelular() ? guardada.itens : null
  } catch {
    return null
  }
}

function guardarCarta<T>(chave: string, itens: T[]) {
  const dono = donoDoCelular()
  try {
    if (dono) localStorage.setItem(chave, JSON.stringify({ dono, itens }))
  } catch {
    // sem espaço: só abre carregando até a nuvem responder
  }
}

/** Ouve uma parte da carta (peladas ou torneios), começando pela guardada no celular. null = carregando (nada guardado). */
function useParteDaCarta<T>(chave: string, ouvir: (nuvem: NonNullable<Awaited<ReturnType<typeof obterNuvem>>>, aoMudar: (itens: T[]) => void) => () => void) {
  const [itens, setItens] = useState<T[] | null>(() => cartaGuardada<T>(chave))
  useEffect(() => {
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => {
      if (!nuvem) { setItens([]); return }
      if (vivo) parar = ouvir(nuvem, (novos) => { guardarCarta(chave, novos); setItens(novos) })
    })
    return () => { vivo = false; parar() }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ouve uma vez (a chave e o jeito de ouvir não mudam)
  }, [])
  return itens
}

/** Peladas da carta de quem está logado. null = carregando. */
export const useCarta = () => useParteDaCarta<PeladaDaCarta>('carta:peladas', (nuvem, aoMudar) => nuvem.ouvirCarta(aoMudar))


/** Torneios da carta de quem está logado. null = carregando. */
export const useCartaDosTorneios = () => useParteDaCarta<TorneioDaCarta>('carta:torneios', (nuvem, aoMudar) => nuvem.ouvirCartaDosTorneios(aoMudar))

/** Fotos para a imagem da seleção: id do jogador → foto, de quem jogou com conta e escolheu foto. */
export async function fotosDaPelada(estado: Estado): Promise<Record<string, string>> {
  const contas = contasDaPelada(estado)
  const lidas = await (await obterNuvem())?.fotosDasContas([...new Set(Object.values(contas))]).catch(() => null)
  if (!lidas) return {}
  const fotos = semAsDenunciadas(lidas, (conta) => conta) // quem denunciou não vê mais
  return Object.fromEntries(Object.entries(contas).flatMap(([jogador, conta]) => (fotos[conta] ? [[jogador, fotos[conta]] as const] : [])))
}

/** Fotos para a imagem do Time do ano: id do jogador → foto. Quem não tem conta ou foto fica com a silhueta. */
export async function fotosDoTimeDoAno(jogadores: JogadorNoAno[]): Promise<Record<string, string>> {
  const comConta = jogadores.flatMap((jogador) => (jogador.conta ? [[jogador.id, jogador.conta] as const] : []))
  const lidas = await (await obterNuvem())?.fotosDasContas([...new Set(comConta.map(([, conta]) => conta))]).catch(() => null)
  if (!lidas) return {}
  const fotos = semAsDenunciadas(lidas, (conta) => conta)
  return Object.fromEntries(comConta.flatMap(([jogador, conta]) => (fotos[conta] ? [[jogador, fotos[conta]] as const] : [])))
}

/** Primeiro nome da conta (o apelido sugerido quando a pessoa ainda não escolheu um). */
export const primeiroNome = (nome: string | null | undefined) => (nome ?? '').trim().split(/\s+/)[0] ?? ''

const CHAVE_DOS_DADOS = 'carta:dados'

/** A foto e o apelido guardados no celular (de quem está logado): a carta abre já com eles, sem piscar a foto antiga. */
function dadosGuardados(): DadosDoJogador | null {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE_DOS_DADOS) ?? 'null') as (DadosDoJogador & { dono: string }) | null
    return guardado && guardado.dono === donoDoCelular() ? { foto: guardado.foto, apelido: guardado.apelido } : null
  } catch {
    return null
  }
}

function guardarDados(dados: DadosDoJogador) {
  const dono = donoDoCelular()
  try {
    if (dono) localStorage.setItem(CHAVE_DOS_DADOS, JSON.stringify({ ...dados, dono }))
  } catch {
    // sem espaço: só abre sem a foto até a nuvem responder
  }
}

/**
 * A foto e o apelido que o jogador escolheu (null = usa os da conta) e como trocar.
 * carregado: já sabe a foto escolhida (antes disso, não mostrar a da conta, que pisca e some).
 */
export function useDadosDoJogador() {
  const [guardados] = useState(dadosGuardados)
  const [dados, setDados] = useState<DadosDoJogador & { carregado: boolean }>(() => ({ foto: null, apelido: null, ...guardados, carregado: !!guardados }))
  useEffect(() => {
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => {
      if (nuvem && vivo) parar = nuvem.ouvirDadosDoJogador((novos) => { guardarDados(novos); setDados({ ...novos, carregado: true }) })
    })
    return () => { vivo = false; parar() }
  }, [])
  const salvar = useCallback(async (novos: Partial<DadosDoJogador>) => { await (await obterNuvem())?.salvarDadosDoJogador(novos) }, [])
  return { ...dados, salvar }
}
