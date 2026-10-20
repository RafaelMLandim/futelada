// Conta (login com Google) e caixa da pelada, guardado no perfil de quem entrou.

import { useCallback, useEffect, useState } from 'react'
import { saldoDoCaixa, type MovimentoDoCaixa, type PeladaGuardada } from '../logic'
import { nuvemDisponivel, obterNuvem } from '../nuvem'
import type { Lancamento, PeladaNoHistorico, Perfil } from '../nuvem/tipos'
import { trocarDeConta } from './donoDoCelular'

/** Quem está usando o app. `perfil` undefined = carregando; anônimo = sem login. */
export function useConta() {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(nuvemDisponivel() ? undefined : null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((n) => {
      if (!n) { setPerfil(null); return }
      // separa a pelada e o torneio do celular por conta antes de as telas abrirem (outra pessoa não cai neles)
      if (ativo) parar = n.ouvirPerfil((novo) => { trocarDeConta(novo); setPerfil(novo) })
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
  /** Entra com e-mail e senha (com `nome`: cria a conta). Devolve o erro para mostrar (null = entrou). */
  const comEmail = useCallback(async (email: string, senha: string, nome?: string): Promise<string | null> => {
    try {
      const n = await obterNuvem()
      await (nome !== undefined ? n?.criarContaComEmail(email.trim(), senha, nome.trim()) : n?.entrarComEmail(email.trim(), senha))
      return null
    } catch (e) {
      return mensagemDeLogin((e as { code?: string }).code)
    }
  }, [])
  const sair = useCallback(async () => { await (await obterNuvem())?.sair() }, [])
  /** Exclui a conta e tudo o que ela criou. Devolve o erro para mostrar (null = excluiu ou desistiu). */
  const excluirConta = useCallback(async (senha?: string): Promise<string | null> => {
    try {
      await (await obterNuvem())?.excluirConta(senha)
      return null
    } catch (e) {
      const codigo = (e as { code?: string }).code
      if ((e as Error).message === 'cancelou' || codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') return null
      if (codigo === 'auth/user-mismatch') return 'Escolha a mesma conta do Google que está no app.'
      if (codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password') return 'Senha errada.'
      return 'Não deu para excluir a conta. Confira a internet e tente de novo.'
    }
  }, [])

  const logado = !!perfil && !perfil.anonimo
  return { perfil, logado, entrar, comEmail, sair, excluirConta, erro }
}

/** Texto do erro do login com e-mail e senha. */
function mensagemDeLogin(codigo?: string): string {
  switch (codigo) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'Já existe uma conta com esse e-mail. Entre com ele (ou com o Google, se foi assim que criou).'
    case 'auth/invalid-email': return 'Esse e-mail não parece certo.'
    case 'auth/weak-password': return 'A senha precisa de pelo menos 6 letras ou números.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'E-mail ou senha errados.'
    case 'auth/too-many-requests': return 'Muitas tentativas. Espere um pouco e tente de novo.'
    case 'auth/network-request-failed': return 'Sem internet. Confira a conexão e tente de novo.'
    default: return 'Não deu para entrar. Tente de novo.'
  }
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
