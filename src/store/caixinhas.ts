// Caixinhas do caixa (PLANO.md, seção 19): criar, acompanhar quem pagou pelo link e lançar no caixa sozinho
// o que o organizador confirma (e tirar o que ele desfaz). O link e o QR são os mesmos do campo pago.

import { useCallback, useEffect, useRef, useState } from 'react'
import { entradasDesfeitas, entradasQueFaltam, valorPorPessoaDaCaixinha, type Caixinha, type JogadorDaCaixinha } from '../logic'
import { novoCodigo } from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { CobrancaNuvem, Lancamento } from '../nuvem/tipos'
import type { StatusPagamento } from '../types/pelada'
import { dataHoje } from '../utils/formatar'
import { pixCopiaECola } from '../utils/pix'

/** Caixinhas de quem está logado (null = carregando). */
export function useCaixinhas(): Caixinha[] | null {
  const [caixinhas, setCaixinhas] = useState<Caixinha[] | null>(null)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((nuvem) => {
      if (!nuvem) return setCaixinhas([])
      if (ativo) parar = nuvem.ouvirCaixinhas(setCaixinhas, () => setCaixinhas([]))
    })
    return () => { ativo = false; parar() }
  }, [])
  return caixinhas
}

/** O que vai para o link do grupo (a mesma página do campo pago, com o nome e o motivo da caixinha). */
function cobrancaDaCaixinha(caixinha: Caixinha): Omit<CobrancaNuvem, 'organizador'> {
  return {
    data: dataHoje(), valor: caixinha.valorPorPessoa,
    pix: pixCopiaECola({ chave: caixinha.chavePix, recebedor: caixinha.recebedor, valor: caixinha.valorPorPessoa, identificador: caixinha.nome }),
    chave: caixinha.chavePix, recebedor: caixinha.recebedor, confirmarAuto: false,
    jogadores: caixinha.jogadores, titulo: caixinha.nome, descricao: caixinha.descricao,
  }
}

export type NovaCaixinha = { nome: string; descricao: string; meta: number; turma: string | null; jogadores: JogadorDaCaixinha[]; chavePix: string; recebedor: string }

/** Cria a caixinha e publica o link de pagamento. */
export async function criarCaixinha(dados: NovaCaixinha): Promise<Caixinha> {
  const nuvem = await obterNuvem()
  if (!nuvem) throw new Error('sem nuvem')
  const caixinha: Caixinha = {
    ...dados, id: `c${Date.now().toString(36)}`, cobranca: novoCodigo(), data: Date.now(),
    valorPorPessoa: valorPorPessoaDaCaixinha(dados.meta, dados.jogadores.length),
  }
  await nuvem.publicarCobranca(caixinha.cobranca, cobrancaDaCaixinha(caixinha))
  await nuvem.salvarCaixinha(caixinha)
  return caixinha
}

export async function encerrarCaixinha(caixinha: Caixinha): Promise<void> {
  await (await obterNuvem())?.salvarCaixinha({ ...caixinha, encerrada: true })
}

/** Quem pagou cada caixinha (por id do jogador), pelo link: avisou (amarelo) ou pago (confirmado). */
export function useStatusDaCaixinha(caixinha: Caixinha): Record<string, StatusPagamento> {
  const [status, setStatus] = useState<Record<string, StatusPagamento>>({})
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((nuvem) => {
      if (nuvem && ativo) parar = nuvem.ouvirCobranca(caixinha.cobranca, (_cobranca, avisos) =>
        setStatus(Object.fromEntries(Object.entries(avisos).map(([id, aviso]) => [id, aviso.status]))))
    })
    return () => { ativo = false; parar() }
  }, [caixinha.cobranca])
  return status
}

/** O organizador confirma (pago) ou volta para pendente (null). */
export async function marcarNaCaixinha(caixinha: Caixinha, jogador: JogadorDaCaixinha, status: StatusPagamento | null): Promise<void> {
  await (await obterNuvem())?.avisarPagamento(caixinha.cobranca, jogador.id, status ? { status, nome: jogador.nome, em: Date.now() } : null)
}

/** Lança no caixa o que foi confirmado e ainda não entrou, e tira o que foi desfeito (uma vez cada). */
export function useLancarCaixinha(caixinha: Caixinha, status: Record<string, StatusPagamento>, lancamentos: Lancamento[] | null,
  lancar: (movimentos: Omit<Lancamento, 'id'>[]) => Promise<void>, apagar: (id: string) => Promise<void>) {
  const pedidos = useRef(new Set<string>()) // já pedido para a nuvem (o retorno demora)
  const chave = JSON.stringify(status)
  const sincronizar = useCallback(() => {
    if (!lancamentos) return
    const faltam = entradasQueFaltam(caixinha, status, lancamentos, Date.now()).filter((entrada) => !pedidos.current.has(`+${entrada.jogador}`))
    const desfeitas = entradasDesfeitas(caixinha, status, lancamentos).filter((entrada) => !pedidos.current.has(`-${entrada.id}`))
    faltam.forEach((entrada) => pedidos.current.add(`+${entrada.jogador}`))
    desfeitas.forEach((entrada) => pedidos.current.add(`-${entrada.id}`))
    if (faltam.length) void lancar(faltam)
    desfeitas.forEach((entrada) => void apagar(entrada.id))
    // quem voltou a pendente pode pagar de novo depois
    for (const pedido of [...pedidos.current]) if (pedido.startsWith('+') && status[pedido.slice(1)] !== 'pago') pedidos.current.delete(pedido)
  }, [caixinha, status, lancamentos, lancar, apagar]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(sincronizar, [chave, lancamentos, sincronizar])
}
