// Quem está em campo e no banco durante um jogo do torneio, e as substituições.
// Suspensos não entram; expulso não pode ser substituído (o time fica com um a menos).

import type { Lado } from '../../types/pelada'
import type { Escalacao, JogoTorneio, Torneio } from '../../types/torneio'
import { LADOS } from '../lado'
import { goleiroDoTime, jogadoresDeLinha } from './criar'
import { timesDoJogo } from './jogos'
import { situacaoDisciplinar } from './suspensoes'

/**
 * Começa o jogo: o goleiro (se não estiver suspenso) e os titulares de linha (os primeiros que não estão
 * suspensos) em campo; os demais no banco. O goleiro é o primeiro de `emCampo`.
 */
export function iniciarEscalacao(torneio: Torneio, jogo: JogoTorneio): Escalacao {
  const { suspensos } = situacaoDisciplinar(torneio)
  const ids = timesDoJogo(torneio, jogo)
  const vazio = () => ({ A: [] as string[], B: [] as string[] })
  const esc: Escalacao = { jogoId: jogo.id, emCampo: vazio(), banco: vazio(), suspensos: vazio(), substituicoes: { A: 0, B: 0 }, jogaram: vazio() }
  for (const lado of LADOS) {
    const time = torneio.times.find((t) => t.id === ids[lado])
    if (!time) continue
    const goleiro = goleiroDoTime(time)
    const aptos = jogadoresDeLinha(time).filter((jogador) => !suspensos.has(jogador.id)).map((jogador) => jogador.id)
    esc.suspensos[lado] = time.jogadores.filter((jogador) => suspensos.has(jogador.id)).map((jogador) => jogador.id)
    const goleiroEmCampo = goleiro && !suspensos.has(goleiro.id) ? [goleiro.id] : []
    esc.emCampo[lado] = [...goleiroEmCampo, ...aptos.slice(0, torneio.regras.linha)]
    esc.banco[lado] = aptos.slice(torneio.regras.linha)
    esc.jogaram[lado] = [...esc.emCampo[lado]]
  }
  return esc
}

/** Por que a substituição não pode ser feita (null = pode). */
export function impedimentoDaSubstituicao(
  esc: Escalacao, lado: Lado, saiId: string, entraId: string, max: number | null, expulsos: Set<string>,
): string | null {
  if (!esc.emCampo[lado].includes(saiId)) return 'Quem sai precisa estar em campo'
  if (!esc.banco[lado].includes(entraId)) return 'Quem entra precisa estar no banco'
  if (expulsos.has(saiId)) return 'Expulso não pode ser substituído'
  if (max !== null && esc.substituicoes[lado] >= max) return `Limite de ${max} substituições atingido`
  return null
}

/** Substituição: quem sai vai para o banco (continua no time); quem entra vai para o lugar dele. */
export function substituir(
  esc: Escalacao, lado: Lado, saiId: string, entraId: string, max: number | null = null, expulsos = new Set<string>(),
): Escalacao {
  const erro = impedimentoDaSubstituicao(esc, lado, saiId, entraId, max, expulsos)
  if (erro) throw new Error(erro)
  return {
    ...esc,
    emCampo: { ...esc.emCampo, [lado]: esc.emCampo[lado].map((id) => (id === saiId ? entraId : id)) },
    banco: { ...esc.banco, [lado]: [...esc.banco[lado].filter((id) => id !== entraId), saiId] },
    substituicoes: { ...esc.substituicoes, [lado]: esc.substituicoes[lado] + 1 },
    jogaram: { ...esc.jogaram, [lado]: esc.jogaram[lado].includes(entraId) ? esc.jogaram[lado] : [...esc.jogaram[lado], entraId] },
  }
}
