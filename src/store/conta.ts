// Conta (login com Google) e caixa da pelada, guardado no perfil de quem entrou.

import { useCallback, useEffect, useState } from 'react'
import { saldoDoCaixa, type MovimentoDoCaixa, type PeladaGuardada } from '../logic'
import { nuvemDisponivel, obterNuvem } from '../nuvem'
import type { Lancamento, PeladaNoHistorico, Perfil } from '../nuvem/tipos'

/** Quem está usando o app. `perfil` undefined = carregando; anônimo = sem login. */
export function useConta() {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(nuvemDisponivel() ? undefined : null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((n) => {
      if (!n) { setPerfil(null); return }
      if (ativo) parar = n.ouvirPerfil(setPerfil)
    })
    return () => { ativo = false; parar() }
  }, [])

  const entrar = useCallback(async () => {
    setErro(null)
    try {
      await (await obterNuvem())?.entrarComGoogle()
    } catch (e) {
      const codigo = (e as { code?: string }).code
      if (codigo !== 'auth/popup-closed-by-user' && codigo !== 'auth/cancelled-popup-request') setErro('Não deu para entrar com o Google. Tente de novo.')
    }
  }, [])
  const sair = useCallback(async () => { await (await obterNuvem())?.sair() }, [])

  const logado = !!perfil && !perfil.anonimo
  return { perfil, logado, entrar, sair, erro }
}

/** Lançamentos e saldo do caixa (vazio sem login). */
export function useCaixa() {
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((n) => {
      if (!n) { setLancamentos([]); return }
      if (ativo) parar = n.ouvirCaixa(setLancamentos, () => setLancamentos([]))
    })
    return () => { ativo = false; parar() }
  }, [])
  const lancar = useCallback(async (movimentos: MovimentoDoCaixa[]) => { await (await obterNuvem())?.lancarNoCaixa(movimentos) }, [])
  const apagar = useCallback(async (id: string) => { await (await obterNuvem())?.apagarLancamento(id) }, [])
  return { lancamentos, saldo: saldoDoCaixa(lancamentos ?? []), lancar, apagar }
}

/** Peladas encerradas, da mais nova à mais antiga (vazio sem login). */
export function useHistorico() {
  const [peladas, setPeladas] = useState<PeladaNoHistorico[] | null>(null)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((n) => {
      if (!n) { setPeladas([]); return }
      if (ativo) parar = n.ouvirHistorico(setPeladas, () => setPeladas([]))
    })
    return () => { ativo = false; parar() }
  }, [])
  const apagar = useCallback(async (id: string) => { await (await obterNuvem())?.apagarPelada(id) }, [])
  return { peladas, apagar }
}

/** Guarda a pelada encerrada no histórico de quem está logado. */
export async function guardarNoHistorico(pelada: PeladaGuardada) {
  await (await obterNuvem())?.guardarPelada(pelada)
}
