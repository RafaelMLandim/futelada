// "Esse sou eu" (PLANO.md, seção 22.4): quem tem conta e foi digitado pelo organizador (só o nome) se encontra na lista
// e pede para ser aquele jogador; o organizador confirma, e os números passam a ir para a carta dele.

import { useEffect, useState } from 'react'
import { Icone } from '../../components/Icone'
import { ligarContaAoJogador } from '../../logic/torneio'
import { obterNuvem } from '../../nuvem'
import type { PedidoEsseSouEu } from '../../nuvem/tipos'
import { primeiroNome, useDadosDoJogador } from '../../store/carta'
import { useConta } from '../../store/conta'
import type { TorneioHook } from '../../store/torneio'
import type { Torneio } from '../../types/torneio'
import { useConfirmar } from '../../utils/confirmacao'
import { maiusculas } from '../../utils/formatar'

/**
 * Quem joga (não é o organizador): pode tocar no próprio nome (um jogador sem conta) e confirmar "sou eu". `podeTocar`:
 * está logado, ainda não é nenhum jogador do torneio e não tem pedido. `pedir` abre a confirmação.
 */
export function useEsseSouEu(torneio: Torneio, codigo: string | null) {
  const conta = useConta()
  const { apelido } = useDadosDoJogador()
  const confirmar = useConfirmar()
  const [pedido, setPedido] = useState<PedidoEsseSouEu | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const uid = conta.perfil?.uid ?? null
  const eu = torneio.times.flatMap((time) => time.jogadores.map((jogador) => ({ jogador, time }))).find(({ jogador }) => jogador.conta && jogador.conta === uid)

  useEffect(() => {
    if (!conta.logado || !codigo) return
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => { if (nuvem && vivo) parar = nuvem.ouvirMeuPedido(codigo, setPedido) })
    return () => { vivo = false; parar() }
  }, [codigo, conta.logado])

  // ligado à conta: o torneio fica no "Jogando" da pré-tela (e a carta recebe os números)
  const timeDoEu = eu?.time
  useEffect(() => {
    if (!timeDoEu || !codigo) return
    void obterNuvem().then((nuvem) => nuvem?.guardarParticipacao(`torneio-${codigo}`, {
      torneio: codigo, nomeDoTorneio: torneio.nome, time: timeDoEu.id, nomeDoTime: timeDoEu.nome, cor: timeDoEu.cor, data: Date.now(),
    })).catch(() => null)
  }, [codigo, torneio.nome, timeDoEu])

  // os nomes já escolhidos (com conta) não são tocáveis: no torneio não tem dois jogadores com o mesmo nome
  const temSemConta = torneio.times.some((time) => time.jogadores.some((jogador) => !jogador.conta))
  const podeTocar = !!codigo && conta.logado && !eu && pedido === null && temSemConta
  const pedir = (jogadorId: string, nomeDoJogador: string, nomeDoTime: string) => confirmar({
    titulo: `Você é o ${nomeDoJogador}?`, mensagem: `Do ${nomeDoTime}. Os números dele passam a ir para a sua carta.`, botao: 'Sou eu',
    aoConfirmar: () => {
      const nomeDaConta = (apelido ?? maiusculas(primeiroNome(conta.perfil?.nome)) ?? '').slice(0, 40) || 'JOGADOR'
      if (codigo) void obterNuvem().then((nuvem) => nuvem?.pedirEsseSouEu(codigo, { jogador: jogadorId, nomeDoJogador, nomeDaConta }))
        .catch(() => setErro('Não deu para mandar o pedido. Confira a internet.'))
    },
  })
  const cancelar = () => { if (codigo) void obterNuvem().then((nuvem) => nuvem?.pedirEsseSouEu(codigo, null)).catch(() => null) }
  return { podeTocar, pedido: pedido ?? null, pedir, cancelar, erro }
}

/**
 * O aviso para quem joga: "toque no seu nome na lista" (na aba Times) ou "Ver os times" (na aba Jogos, com
 * `onVerTimes`); com o pedido enviado, o aviso de espera.
 */
export function EncontrarMeuNome({ torneio, codigo, onVerTimes }: { torneio: Torneio; codigo: string; onVerTimes?: () => void }) {
  const { podeTocar, pedido, cancelar, erro } = useEsseSouEu(torneio, codigo)
  if (pedido) {
    return (
      <section className="panel pb" style={{ display: 'grid', gap: 8, color: 'var(--navy)' }}>
        <b>Ligando você ao {pedido.nomeDoJogador}…</b>
        <span className="mut">Leva um instante (o celular do organizador faz a ligação). Depois, os números dele vão para a sua carta.</span>
        <button className="btn w sm" onClick={cancelar}>Cancelar</button>
      </section>
    )
  }
  if (!podeTocar) return null
  return (
    <section className="panel pb" style={{ display: 'grid', gap: 8, color: 'var(--navy)' }}>
      <b>Você joga neste torneio?</b>
      <span className="mut">{onVerTimes ? 'Se o organizador colocou você pelo nome, toque no seu nome na lista dos times.' : 'Se o organizador colocou você pelo nome, toque no seu nome na lista abaixo.'}</span>
      {onVerTimes && <button className="btn sm" onClick={onVerTimes}><Icone nome="times" tamanho={20} /> Ver os times</button>}
      {erro && <span role="status" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</span>}
    </section>
  )
}

/**
 * O celular do organizador liga sozinho quem disse "esse sou eu" (em qualquer aba, com o torneio aberto): o campeonato
 * confere documento na hora; o app só faz a gestão. Fica para o organizador só o caso do jogador que já tem outra conta.
 */
export function useEsseSouEuAutomatico(hook: TorneioHook): void {
  const codigo = hook.souOrganizador ? hook.torneio?.nuvem?.codigo ?? null : null
  const [pedidos, setPedidos] = useState<PedidoEsseSouEu[]>([])
  useEffect(() => {
    if (!codigo) { setPedidos([]); return }
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => { if (nuvem && vivo) parar = nuvem.ouvirPedidos(codigo, setPedidos) })
    return () => { vivo = false; parar() }
  }, [codigo])
  const torneio = hook.torneio
  const { aplicar } = hook
  useEffect(() => {
    if (!codigo || !torneio) return
    const jogadores = torneio.times.flatMap((time) => time.jogadores)
    for (const pedido of pedidos) {
      const alvo = jogadores.find((jogador) => jogador.id === pedido.jogador)
      const contaJaLigada = jogadores.some((jogador) => jogador.conta === pedido.id)
      // já ligado (a esse ou a outro jogador): o pedido não serve mais
      if (contaJaLigada) { void obterNuvem().then((nuvem) => nuvem?.tirarPedido(codigo, pedido.id)).catch(() => null); continue }
      // saiu do torneio ou outro escolheu antes: o pedido não vale (a pessoa escolhe de novo)
      if (!alvo || alvo.conta) { void obterNuvem().then((nuvem) => nuvem?.tirarPedido(codigo, pedido.id)).catch(() => null); continue }
      aplicar((atual) => ligarContaAoJogador(atual, pedido.jogador, pedido.id))
    }
  }, [codigo, pedidos, torneio, aplicar])
}
