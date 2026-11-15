// Quem está em campo e no banco durante um jogo do torneio, e as substituições.
// Suspensos não entram; expulso não pode ser substituído (o time fica com um a menos).

import type { Lado } from '../../types/pelada'
import type { Escalacao, JogoTorneio, Torneio } from '../../types/torneio'
import { LADOS } from '../lado'
import { goleiroDoTime, jogadoresDeLinha } from './criar'
import { timesDoJogo } from './jogos'
import { situacaoDisciplinar } from './suspensoes'

/**
 * Jogadores de linha que podem jogar (sem os suspensos), em ordem de preferência para começar: quem foi titular
 * no último jogo do time vem primeiro (na ordem da lista do time); depois os outros, na ordem da lista.
 * No primeiro jogo do time, é só a ordem da lista.
 */
function aptosEmOrdem(torneio: Torneio, timeId: string, suspensos: Set<string>): string[] {
  const time = torneio.times.find((candidato) => candidato.id === timeId)
  if (!time) return []
  const aptos = jogadoresDeLinha(time).filter((jogador) => !suspensos.has(jogador.id)).map((jogador) => jogador.id)
  const titularesAntes = titularesDoUltimoJogo(torneio, timeId)
  if (!titularesAntes) return aptos
  return [...aptos.filter((id) => titularesAntes.includes(id)), ...aptos.filter((id) => !titularesAntes.includes(id))]
}

/** Quem começou o último jogo já jogado do time (null: ainda não jogou, ou o jogo é de antes de guardar os titulares). */
function titularesDoUltimoJogo(torneio: Torneio, timeId: string): string[] | null {
  const jogados = torneio.jogos
    .filter((jogo) => jogo.resultado?.titulares)
    .sort((primeiro, segundo) => (segundo.resultado!.sequencia ?? 0) - (primeiro.resultado!.sequencia ?? 0))
  for (const jogo of jogados) {
    const ids = timesDoJogo(torneio, jogo)
    const lado = LADOS.find((candidato) => ids[candidato] === timeId)
    if (lado) return jogo.resultado!.titulares![lado]
  }
  return null
}

/** Quantos reservas cada time tem no jogo (jogadores de linha aptos além dos que cabem em campo). */
export function reservasDoJogo(torneio: Torneio, jogo: JogoTorneio): Record<Lado, number> {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const reservas = (lado: Lado) => Math.max(0, aptosEmOrdem(torneio, ids[lado] ?? '', suspensos).length - torneio.regras.linha)
  return { A: reservas('A'), B: reservas('B') }
}

/** Banco sugerido para o jogo: quem não começou o último jogo do time (no primeiro jogo, os últimos da lista). */
export function bancoSugerido(torneio: Torneio, jogo: JogoTorneio): Record<Lado, string[]> {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const banco = (lado: Lado) => aptosEmOrdem(torneio, ids[lado] ?? '', suspensos).slice(torneio.regras.linha)
  return { A: banco('A'), B: banco('B') }
}

/**
 * Começa o jogo: o goleiro (se não estiver suspenso) e os titulares de linha em campo; os demais no banco.
 * `bancoEscolhido`: quem o organizador mandou para o banco (sem ele, o `bancoSugerido`). O goleiro é o primeiro
 * de `emCampo`.
 */
export function iniciarEscalacao(torneio: Torneio, jogo: JogoTorneio, bancoEscolhido?: Record<Lado, string[]>): Escalacao {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const vazio = () => ({ A: [] as string[], B: [] as string[] })
  const esc: Escalacao = { jogoId: jogo.id, emCampo: vazio(), banco: vazio(), suspensos: vazio(), substituicoes: { A: 0, B: 0 }, jogaram: vazio(), titulares: vazio() }
  for (const lado of LADOS) {
    const time = torneio.times.find((t) => t.id === ids[lado])
    if (!time) continue
    const goleiro = goleiroDoTime(time)
    const emOrdem = aptosEmOrdem(torneio, time.id, suspensos)
    // com o banco escolhido: quem não está nele começa (na ordem da lista); se sobrar gente, o excesso vai para o banco
    const aptos = bancoEscolhido
      ? [...emOrdem.filter((id) => !bancoEscolhido[lado].includes(id)), ...emOrdem.filter((id) => bancoEscolhido[lado].includes(id))]
      : emOrdem
    const linha = aptos.slice(0, torneio.regras.linha)
    esc.suspensos[lado] = time.jogadores.filter((jogador) => suspensos.has(jogador.id)).map((jogador) => jogador.id)
    const goleiroEmCampo = goleiro && !suspensos.has(goleiro.id) ? [goleiro.id] : []
    // em campo fica na ordem da lista do time (fica igual de um jogo para o outro)
    const naOrdemDaLista = jogadoresDeLinha(time).map((jogador) => jogador.id).filter((id) => emOrdem.includes(id))
    esc.emCampo[lado] = [...goleiroEmCampo, ...naOrdemDaLista.filter((id) => linha.includes(id))]
    esc.banco[lado] = naOrdemDaLista.filter((id) => !linha.includes(id))
    esc.jogaram[lado] = [...esc.emCampo[lado]]
    esc.titulares![lado] = [...esc.emCampo[lado]]
  }
  return esc
}

/** Quem já jogou e saiu (está no banco depois de ter entrado em campo). Sem reentrada, não volta mais. */
export const saiuDoJogo = (esc: Escalacao, lado: Lado, id: string) => esc.banco[lado].includes(id) && esc.jogaram[lado].includes(id)

/** Por que a substituição não pode ser feita (null = pode). `reentrada` false: quem saiu não volta. */
export function impedimentoDaSubstituicao(
  esc: Escalacao, lado: Lado, saiId: string, entraId: string, max: number | null, expulsos: Set<string>, reentrada = true,
): string | null {
  if (!esc.emCampo[lado].includes(saiId)) return 'Quem sai precisa estar em campo'
  if (!esc.banco[lado].includes(entraId)) return 'Quem entra precisa estar no banco'
  if (!reentrada && saiuDoJogo(esc, lado, entraId)) return 'Quem saiu não pode voltar ao jogo'
  if (expulsos.has(saiId)) return 'Expulso não pode ser substituído'
  if (max !== null && esc.substituicoes[lado] >= max) return `Limite de ${max} substituições atingido`
  return null
}

/** Substituição: quem sai vai para o banco (continua no time); quem entra vai para o lugar dele. */
export function substituir(
  esc: Escalacao, lado: Lado, saiId: string, entraId: string, max: number | null = null, expulsos = new Set<string>(), reentrada = true,
): Escalacao {
  const erro = impedimentoDaSubstituicao(esc, lado, saiId, entraId, max, expulsos, reentrada)
  if (erro) throw new Error(erro)
  return {
    ...esc,
    emCampo: { ...esc.emCampo, [lado]: esc.emCampo[lado].map((id) => (id === saiId ? entraId : id)) },
    banco: { ...esc.banco, [lado]: [...esc.banco[lado].filter((id) => id !== entraId), saiId] },
    substituicoes: { ...esc.substituicoes, [lado]: esc.substituicoes[lado] + 1 },
    jogaram: { ...esc.jogaram, [lado]: esc.jogaram[lado].includes(entraId) ? esc.jogaram[lado] : [...esc.jogaram[lado], entraId] },
  }
}
