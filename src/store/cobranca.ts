// Campo pago, lado do organizador: publica a cobrança na nuvem (o link que vai para o grupo),
// recebe os "Já paguei" de quem pagou e manda as confirmações de volta (PLANO.md, seção 12).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { marcarPagamento, pagantes, valorPorPessoa } from '../logic'
import { novoCodigo } from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { AvisoPagamento, CobrancaNuvem } from '../nuvem/tipos'
import type { Estado, Jogador, StatusPagamento } from '../types/pelada'
import { dataHoje } from '../utils/formatar'
import { enderecoDoSite } from '../utils/nativo'
import { pixCopiaECola } from '../utils/pix'
import type { Pelada } from './usePelada'

/** Endereço do link de pagamento (abre a página "Pagar a pelada"). */
export const linkDePagamento = (codigo: string) => `${enderecoDoSite()}/?pagar=${codigo}`

/** Dados da cobrança que vão para a nuvem. */
export function montarCobranca(estado: Estado): Omit<CobrancaNuvem, 'organizador'> {
  const { pagamento } = estado.config
  const valor = valorPorPessoa(estado)
  return {
    data: dataHoje(), valor,
    pix: pixCopiaECola({ chave: pagamento.chavePix, recebedor: pagamento.recebedor, valor, identificador: 'PELADA' }),
    chave: pagamento.chavePix, recebedor: pagamento.recebedor, confirmarAuto: pagamento.confirmarAuto,
    jogadores: pagantes(estado).map((j) => ({ id: j.id, nome: j.nome })),
  }
}

export function useCobranca(pelada: Pelada) {
  const { app, aplicar } = pelada
  const { estado } = app
  const { pagamento } = estado.config
  const codigo = pagamento.ativo ? estado.cobranca : null
  const [avisos, setAvisos] = useState<Record<string, AvisoPagamento>>({})

  // Publica (de novo) quando muda o valor, a lista ou o Pix
  const dados = useMemo(() => (codigo ? montarCobranca(estado) : null), [codigo, estado])
  const chave = JSON.stringify(dados)
  useEffect(() => {
    if (!codigo || !dados) return
    const id = window.setTimeout(() => void obterNuvem().then((n) => n?.publicarCobranca(codigo, dados)), 600)
    return () => clearTimeout(id)
  }, [codigo, chave]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ouve os avisos ("Já paguei")
  useEffect(() => {
    if (!codigo) return
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((n) => {
      if (n && ativo) parar = n.ouvirCobranca(codigo, (_c, a) => setAvisos(a))
    })
    return () => { ativo = false; parar() }
  }, [codigo])

  // Aviso novo da nuvem entra na pelada (avisou → amarelo; pago com confirmação automática → verde)
  useEffect(() => {
    for (const [id, aviso] of Object.entries(avisos)) {
      const atual = estado.pagamentos[id]?.status
      if (atual === aviso.status || atual === 'pago') continue
      aplicar((e) => marcarPagamento(e, { id, nome: aviso.nome }, aviso.status))
    }
  }, [avisos]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Organizador marca (pago), volta para pendente (null) ou deixa como avisou. */
  const marcar = useCallback((jogador: Jogador, status: StatusPagamento | null) => {
    aplicar((e) => marcarPagamento(e, jogador, status))
    if (codigo) void obterNuvem().then((n) => n?.avisarPagamento(codigo, jogador.id, status ? { status, nome: jogador.nome, em: Date.now() } : null))
  }, [aplicar, codigo])

  /** Cria o link (se ainda não tem) e devolve o endereço. */
  const criarLink = useCallback(async (): Promise<string | null> => {
    const nuvem = await obterNuvem()
    if (!nuvem) return null
    let c = estado.cobranca
    if (!c) {
      c = novoCodigo()
      const novo = c
      aplicar((e) => ({ ...e, cobranca: novo }))
    }
    await nuvem.publicarCobranca(c, montarCobranca(estado))
    return linkDePagamento(c)
  }, [aplicar, estado])

  return { marcar, criarLink, codigo }
}
