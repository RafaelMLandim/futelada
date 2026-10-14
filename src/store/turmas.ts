// Turmas e os jogadores de cada uma (PLANO.md, seção 15), no perfil de quem entrou com o Google.

import { useCallback, useEffect, useRef, useState } from 'react'
import { jogaramNaPelada, turmaDoHistorico, type JogadorDaTurma } from '../logic'
import { obterNuvem } from '../nuvem'
import type { PeladaNoHistorico, Turma } from '../nuvem/tipos'
import type { Estado } from '../types/pelada'

let seq = 0
const novoId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`

/** As turmas da conta (null = carregando). */
export function useTurmas() {
  const [turmas, setTurmas] = useState<Turma[] | null>(null)
  useEffect(() => {
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((n) => {
      if (!n) { setTurmas([]); return }
      if (vivo) parar = n.ouvirTurmas(setTurmas)
    })
    return () => { vivo = false; parar() }
  }, [])
  const criar = useCallback(async (nome: string) => (await obterNuvem())!.criarTurma(nome.trim()), [])
  const remover = useCallback(async (turma: string, peladas: string[]) => (await obterNuvem())?.removerTurma(turma, peladas), [])
  return { turmas, criar, remover }
}

/** Jogadores de uma turma (vazio sem turma). */
export function useJogadoresDaTurma(turma: string | null): JogadorDaTurma[] {
  const [jogadores, setJogadores] = useState<{ de: string | null; lista: JogadorDaTurma[] }>({ de: null, lista: [] })
  useEffect(() => {
    if (!turma) return
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((n) => {
      if (n && vivo) parar = n.ouvirJogadoresDaTurma(turma, (lista) => setJogadores({ de: turma, lista }))
    })
    return () => { vivo = false; parar() }
  }, [turma])
  return turma && jogadores.de === turma ? jogadores.lista : []
}

/** Pelada encerrada: quem jogou ganha +1 de presença na turma (os novos entram nela). */
export async function registrarNaTurma(estado: Estado, data: number) {
  const turma = estado.config.turma
  if (!turma) return
  const jogadores = jogaramNaPelada(estado).map(({ id, nome }) => ({ id, nome }))
  if (jogadores.length) await (await obterNuvem())?.registrarPeladaNaTurma(turma, jogadores, data)
}

/**
 * Primeira vez (há peladas no histórico e nenhuma turma): cria "Minha pelada" com os jogadores dessas
 * peladas e liga as peladas a ela. Roda uma vez só.
 */
export function useImportarTurmaAntiga(turmas: Turma[] | null, peladas: PeladaNoHistorico[] | null) {
  const feito = useRef(false)
  useEffect(() => {
    if (feito.current || !turmas || !peladas || turmas.length > 0 || peladas.length === 0) return
    feito.current = true
    void (async () => {
      const n = await obterNuvem()
      if (!n) return
      const id = await n.criarTurma('Minha pelada')
      await n.importarTurma(id, turmaDoHistorico(peladas, novoId), peladas.map((p) => p.id))
    })().catch((e) => console.error('Não deu para montar a turma com as peladas antigas', e))
  }, [turmas, peladas])
}
