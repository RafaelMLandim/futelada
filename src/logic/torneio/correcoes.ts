// Correções no torneio: tirar um cartão dado por engano, desfazer a última substituição e corrigir o
// resultado de um jogo já encerrado (só o organizador, e só enquanto nenhum jogo que depende dele começou).

import type { Cartao, Gol, Lado, Placar } from '../../types/pelada'
import type { JogoTorneio, PartidaTorneio, ResultadoJogo, Torneio } from '../../types/torneio'
import { jogoPorId, precisaDePenaltis } from './jogos'

const comPartida = (torneio: Torneio, jogoId: string, mudar: (partida: PartidaTorneio) => PartidaTorneio): Torneio => {
  if (!torneio.emAndamento.some((partida) => partida.jogoId === jogoId)) throw new Error('Esse jogo não está em andamento')
  return { ...torneio, emAndamento: torneio.emAndamento.map((partida) => (partida.jogoId === jogoId ? mudar(partida) : partida)) }
}

/**
 * Tira o cartão de número `indice` da lista. O 2º amarelo e o vermelho que ele gerou andam juntos: tirar um
 * tira o outro (o jogador volta a ter só o 1º amarelo). Tirar um vermelho devolve o jogador ao jogo.
 */
export function cartoesAoRemover(cartoes: Cartao[], indice: number): Cartao[] {
  const cartao = cartoes[indice]
  if (!cartao) return cartoes
  const removidos = new Set([indice])
  const seguinte = cartoes[indice + 1]
  const anterior = cartoes[indice - 1]
  if (cartao.cor === 'amarelo' && seguinte?.porDoisAmarelos && seguinte.jogadorId === cartao.jogadorId) removidos.add(indice + 1)
  if (cartao.porDoisAmarelos && anterior?.cor === 'amarelo' && anterior.jogadorId === cartao.jogadorId) removidos.add(indice - 1)
  // tirou o 1º de dois amarelos: sem os dois, o vermelho que eles geraram também sai (fica só o outro amarelo)
  if (cartao.cor === 'amarelo') {
    cartoes.forEach((outro, posicao) => { if (outro.porDoisAmarelos && outro.jogadorId === cartao.jogadorId) removidos.add(posicao) })
  }
  return cartoes.filter((_, posicao) => !removidos.has(posicao))
}

/** Tira um cartão do jogo em andamento (o `indice` é a posição em `partida.cartoes`). */
export const removerCartaoDaPartida = (torneio: Torneio, jogoId: string, indice: number): Torneio =>
  comPartida(torneio, jogoId, (partida) => ({ ...partida, cartoes: cartoesAoRemover(partida.cartoes, indice) }))

/** A última substituição do `lado`, se ainda dá para desfazer (quem entrou continua em campo e quem saiu, no banco). */
export function substituicaoParaDesfazer(partida: PartidaTorneio, lado: Lado) {
  const ultima = [...(partida.substituicoesFeitas ?? [])].reverse().find((troca) => troca.lado === lado)
  if (!ultima) return null
  const { emCampo, banco } = partida.escalacao
  return emCampo[lado].includes(ultima.entraId) && banco[lado].includes(ultima.saiId) ? ultima : null
}

/**
 * Desfaz a última substituição do `lado`: quem saiu volta para o mesmo lugar, quem entrou volta para o banco,
 * e a substituição deixa de contar no limite. Se quem entrou ainda não tinha jogado, ele deixa de contar como "jogou".
 */
export function desfazerSubstituicao(torneio: Torneio, jogoId: string, lado: Lado): Torneio {
  return comPartida(torneio, jogoId, (partida) => {
    const troca = substituicaoParaDesfazer(partida, lado)
    if (!troca) throw new Error('Não há substituição para desfazer')
    const { escalacao } = partida
    const feitas = partida.substituicoesFeitas ?? []
    const posicao = feitas.lastIndexOf(troca)
    const goleiros = partida.goleiros && partida.goleiros[lado] === troca.entraId
      ? { ...partida.goleiros, [lado]: troca.goleiroAntes ?? null }
      : partida.goleiros
    return {
      ...partida,
      goleiros,
      substituicoesFeitas: feitas.filter((_, indice) => indice !== posicao),
      escalacao: {
        ...escalacao,
        emCampo: { ...escalacao.emCampo, [lado]: escalacao.emCampo[lado].map((id) => (id === troca.entraId ? troca.saiId : id)) },
        banco: { ...escalacao.banco, [lado]: [...escalacao.banco[lado].filter((id) => id !== troca.saiId), troca.entraId] },
        substituicoes: { ...escalacao.substituicoes, [lado]: Math.max(0, escalacao.substituicoes[lado] - 1) },
        jogaram: troca.primeiraVez
          ? { ...escalacao.jogaram, [lado]: escalacao.jogaram[lado].filter((id) => id !== troca.entraId) }
          : escalacao.jogaram,
      },
    }
  })
}

/** Jogos que usam o resultado deste: o vencedor/perdedor dele, a volta da ida e, nos grupos, o mata-mata. */
function jogosQueDependem(torneio: Torneio, jogo: JogoTorneio): JogoTorneio[] {
  return torneio.jogos.filter((outro) => {
    if (outro.id === jogo.id) return false
    if (jogo.perna === 'ida' && outro.id === jogo.outraPerna) return true
    const usa = [outro.casa, outro.fora].some((origem) => (origem.tipo === 'vencedor' || origem.tipo === 'perdedor') && origem.jogo === jogo.id)
    const usaOsGrupos = jogo.fase === 'grupo' && outro.fase === 'mata'
    return usa || usaOsGrupos
  })
}

/**
 * O resultado deste jogo já decidiu um jogo que começou (o seguinte da chave, a volta, o mata-mata depois dos grupos)?
 * Aí o placar (e os pênaltis) não podem mais mudar; quem fez os gols e os cartões ainda podem ser corrigidos.
 */
export function placarTravado(torneio: Torneio, jogoId: string): boolean {
  const jogo = jogoPorId(torneio, jogoId)
  if (!jogo) return false
  return jogosQueDependem(torneio, jogo).some((outro) => outro.resultado || torneio.emAndamento.some((partida) => partida.jogoId === outro.id))
}

/** Por que não dá para corrigir o resultado deste jogo (null = dá). */
export function impedimentoParaCorrigir(torneio: Torneio, jogoId: string): string | null {
  return jogoPorId(torneio, jogoId)?.resultado ? null : 'Esse jogo ainda não foi encerrado'
}

/** Placar a partir dos gols (cada gol conta para o `lado` dele; gol contra já vem com o lado de quem ganhou o gol). */
export const placarDosGols = (gols: Gol[]): Placar => [gols.filter((gol) => gol.lado === 'A').length, gols.filter((gol) => gol.lado === 'B').length]

const mesmoPlacar = (primeiro: Placar | null, segundo: Placar | null) => JSON.stringify(primeiro) === JSON.stringify(segundo)

/**
 * Corrige o resultado de um jogo encerrado: os gols (o placar sai deles), os cartões e os pênaltis (só quando
 * o mata-mata fica empatado). A ordem em que o jogo foi jogado não muda. Tabela, artilharia, suspensões e a
 * chave são recalculadas a partir dos resultados. Com o placar travado (`placarTravado`), o placar e os pênaltis
 * têm que continuar os mesmos.
 */
export function corrigirResultado(torneio: Torneio, jogoId: string, correcao: { gols: Gol[]; cartoes: Cartao[]; penaltis: Placar | null }): Torneio {
  const impedimento = impedimentoParaCorrigir(torneio, jogoId)
  if (impedimento) throw new Error(impedimento)
  const jogo = jogoPorId(torneio, jogoId)!
  const anterior = jogo.resultado!
  const placar = placarDosGols(correcao.gols)
  const comPenaltis = precisaDePenaltis(torneio, jogo, placar)
  if (comPenaltis && (!correcao.penaltis || correcao.penaltis[0] === correcao.penaltis[1])) throw new Error('Empate no mata-mata: precisa dos pênaltis')
  const penaltis = comPenaltis ? correcao.penaltis : null
  if (placarTravado(torneio, jogoId) && (!mesmoPlacar(placar, anterior.placar) || !mesmoPlacar(penaltis, anterior.penaltis))) {
    throw new Error('O placar não pode mudar: este resultado já decidiu um jogo que começou')
  }
  const resultado: ResultadoJogo = { ...anterior, placar, gols: correcao.gols, cartoes: correcao.cartoes, penaltis }
  return { ...torneio, jogos: torneio.jogos.map((outro) => (outro.id === jogoId ? { ...outro, resultado } : outro)) }
}
