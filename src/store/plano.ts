// Plano pago da conta (PLANO.md, seção 14): o que a pessoa pode usar e o contador das peladas grátis.

import { useEffect, useState } from 'react'
import { situacaoDoPlano, type DadosDoPlano, type Situacao } from '../logic/plano'
import { obterNuvem } from '../nuvem'
import { codigoDoAparelho } from '../utils/nativo'

const SEM_DADOS: DadosDoPlano = { plano: null, contadores: null, aparelho: null, config: null }
const agora = () => Date.now()

/** Situação do plano (sem nuvem ou sem internet: tudo liberado). */
export function usePlano(): Situacao {
  const [dados, setDados] = useState<DadosDoPlano>(SEM_DADOS)
  useEffect(() => {
    let parar = () => {}
    let vivo = true
    void Promise.all([obterNuvem(), codigoDoAparelho()]).then(([n, aparelho]) => {
      if (n && vivo) parar = n.ouvirPlano(aparelho, setDados)
    })
    return () => { vivo = false; parar() }
  }, [])
  return situacaoDoPlano(dados, agora())
}

/** Torneio novo com crédito: o servidor desconta 1. false = sem crédito; erro = sem internet. */
export async function usarCreditoDeTorneio(): Promise<boolean> {
  const n = await obterNuvem()
  return n ? n.usarCreditoDeTorneio() : true
}

/** Soma 1 no uso (pelada começada ou torneio grátis criado). */
export async function contarUso(tipo: 'peladas' | 'torneios') {
  const [n, aparelho] = await Promise.all([obterNuvem(), codigoDoAparelho()])
  await n?.contarUso(tipo, aparelho)
}
