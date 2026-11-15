// Quem está em campo e no banco durante um jogo do torneio, e as substituições.
// Suspensos não entram; expulso não pode ser substituído (o time fica com um a menos).

import type { Lado } from '../../types/pelada'
import type { Escalacao, JogoTorneio, Torneio } from '../../types/torneio'
import { LADOS } from '../lado'
import { timesDoJogo } from './jogos'
import { situacaoDisciplinar } from './suspensoes'

/** O que o último jogo já jogado do time guardou (null: ainda não jogou, ou o jogo é de antes de guardar os titulares). */
function ultimoJogoDoTime(torneio: Torneio, timeId: string): { titulares: string[]; noGol: string | null | undefined } | null {
  const jogados = torneio.jogos
    .filter((jogo) => jogo.resultado?.titulares)
    .sort((primeiro, segundo) => (segundo.resultado!.sequencia ?? 0) - (primeiro.resultado!.sequencia ?? 0))
  for (const jogo of jogados) {
    const ids = timesDoJogo(torneio, jogo)
    const lado = LADOS.find((candidato) => ids[candidato] === timeId)
    if (lado) return { titulares: jogo.resultado!.titulares![lado], noGol: jogo.resultado!.noGol?.[lado] }
  }
  return null
}

/**
 * Quem começa no gol e a ordem de preferência dos outros (sem os suspensos). No gol: o escolhido; senão quem começou
 * no gol no último jogo; senão o primeiro goleiro da lista (o titular suspenso dá lugar ao próximo goleiro). Sem
 * goleiro que possa jogar, o gol começa vazio. Os outros: quem foi titular na linha no último jogo; depois os de linha;
 * os goleiros reservas por último (vão para o banco). Dentro de cada parte, a ordem da lista do time.
 */
function preferencia(torneio: Torneio, timeId: string, suspensos: Set<string>, golEscolhido?: string | null) {
  const time = torneio.times.find((candidato) => candidato.id === timeId)
  if (!time) return { noGol: null, ordem: [] as string[] }
  const aptos = time.jogadores.filter((jogador) => !suspensos.has(jogador.id))
  const ultimo = ultimoJogoDoTime(torneio, timeId)
  const ehApto = (id: string | null | undefined): id is string => !!id && aptos.some((jogador) => jogador.id === id)
  const goleiroDoUltimo = ultimo ? (ultimo.noGol !== undefined ? ultimo.noGol : ultimo.titulares[0]) : null
  const noGol = golEscolhido !== undefined
    ? (ehApto(golEscolhido) ? golEscolhido : null)
    : ehApto(goleiroDoUltimo) && aptos.find((jogador) => jogador.id === goleiroDoUltimo)!.goleiro ? goleiroDoUltimo
      : aptos.find((jogador) => jogador.goleiro)?.id ?? null
  const outros = aptos.filter((jogador) => jogador.id !== noGol)
  const titularesNaLinha = new Set((ultimo?.titulares ?? []).filter((id) => id !== goleiroDoUltimo))
  const ordem = [
    ...outros.filter((jogador) => titularesNaLinha.has(jogador.id)),
    ...outros.filter((jogador) => !titularesNaLinha.has(jogador.id) && !jogador.goleiro),
    ...outros.filter((jogador) => !titularesNaLinha.has(jogador.id) && jogador.goleiro),
  ].map((jogador) => jogador.id)
  return { noGol, ordem }
}

/** Quantos reservas cada time tem no jogo (quem pode jogar além do goleiro e dos que cabem na linha; o goleiro reserva conta). */
export function reservasDoJogo(torneio: Torneio, jogo: JogoTorneio): Record<Lado, number> {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const reservas = (lado: Lado) => Math.max(0, preferencia(torneio, ids[lado] ?? '', suspensos).ordem.length - torneio.regras.linha)
  return { A: reservas('A'), B: reservas('B') }
}

/** Goleiros que podem jogar (sem os suspensos) em cada time: com mais de um, dá para escolher quem começa. */
export function goleirosDoJogo(torneio: Torneio, jogo: JogoTorneio): Record<Lado, number> {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const contar = (lado: Lado) => torneio.times.find((time) => time.id === ids[lado])?.jogadores.filter((jogador) => jogador.goleiro && !suspensos.has(jogador.id)).length ?? 0
  return { A: contar('A'), B: contar('B') }
}

/** Banco sugerido para o jogo: quem não começou o último jogo do time (no primeiro jogo, os últimos da lista e os goleiros reservas). */
export function bancoSugerido(torneio: Torneio, jogo: JogoTorneio): Record<Lado, string[]> {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const banco = (lado: Lado) => preferencia(torneio, ids[lado] ?? '', suspensos).ordem.slice(torneio.regras.linha)
  return { A: banco('A'), B: banco('B') }
}

/** Quem começa no gol, sugerido: quem começou no último jogo do time; senão o primeiro goleiro (null = gol vazio). */
export function golSugerido(torneio: Torneio, jogo: JogoTorneio): Record<Lado, string | null> {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  return { A: preferencia(torneio, ids.A ?? '', suspensos).noGol, B: preferencia(torneio, ids.B ?? '', suspensos).noGol }
}

/**
 * Começa o jogo: quem vai no gol e os titulares da linha em campo; os demais no banco. `bancoEscolhido`: quem o
 * organizador mandou para o banco (sem ele, o `bancoSugerido`). `golEscolhido`: quem começa no gol (qualquer
 * jogador, goleiro ou não; sem ele, o `golSugerido`). Quem vai no gol é o primeiro de `emCampo`.
 */
export function iniciarEscalacao(torneio: Torneio, jogo: JogoTorneio, bancoEscolhido?: Record<Lado, string[]>, golEscolhido?: Record<Lado, string | null>): Escalacao {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const vazio = () => ({ A: [] as string[], B: [] as string[] })
  const esc: Escalacao = {
    jogoId: jogo.id, emCampo: vazio(), banco: vazio(), suspensos: vazio(), substituicoes: { A: 0, B: 0 }, jogaram: vazio(), titulares: vazio(),
    noGol: { A: null, B: null },
  }
  for (const lado of LADOS) {
    const time = torneio.times.find((t) => t.id === ids[lado])
    if (!time) continue
    const { noGol, ordem } = preferencia(torneio, time.id, suspensos, golEscolhido?.[lado])
    // com o banco escolhido: quem não está nele começa (na ordem de preferência); se sobrar gente, o excesso vai para o banco
    const aptos = bancoEscolhido
      ? [...ordem.filter((id) => !bancoEscolhido[lado].includes(id)), ...ordem.filter((id) => bancoEscolhido[lado].includes(id))]
      : ordem
    const linha = aptos.slice(0, torneio.regras.linha)
    esc.suspensos[lado] = time.jogadores.filter((jogador) => suspensos.has(jogador.id)).map((jogador) => jogador.id)
    // em campo fica na ordem da lista do time (fica igual de um jogo para o outro)
    const naOrdemDaLista = time.jogadores.map((jogador) => jogador.id).filter((id) => ordem.includes(id))
    esc.emCampo[lado] = [...(noGol ? [noGol] : []), ...naOrdemDaLista.filter((id) => linha.includes(id))]
    esc.banco[lado] = naOrdemDaLista.filter((id) => !linha.includes(id))
    esc.jogaram[lado] = [...esc.emCampo[lado]]
    esc.titulares![lado] = [...esc.emCampo[lado]]
    esc.noGol![lado] = noGol
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
