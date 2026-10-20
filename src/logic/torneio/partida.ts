// Jogos em andamento no torneio (podem ser vários ao mesmo tempo, um por campo):
// placar, gols, cartões, substituições e encerramento.

import type { CorCartao, Gol, Jogador, Lado, Placar } from '../../types/pelada'
import type { JogoTorneio, PartidaTorneio, Torneio } from '../../types/torneio'
import { alternarCrono, cronoZerado, darAcrescimos } from '../cronometro'
import { cartoesAoDar } from '../cartoes'
import { outro } from '../lado'
import { goleiroDoTime } from './criar'
import { iniciarEscalacao, substituir } from './escalacao'
import { jogoPorId, jogosDisponiveis, registrarResultado, timesDoJogo } from './jogos'
import { duracaoDoPeriodo, rotuloDoPeriodo } from './periodos'

export const partidaDoJogo = (t: Torneio, jogoId: string) => t.emAndamento.find((p) => p.jogoId === jogoId)

const comPartida = (t: Torneio, jogoId: string, mudar: (p: PartidaTorneio) => PartidaTorneio): Torneio => {
  if (!partidaDoJogo(t, jogoId)) throw new Error('Esse jogo não está em andamento')
  return { ...t, emAndamento: t.emAndamento.map((p) => (p.jogoId === jogoId ? mudar(p) : p)) }
}

const timeDoLado = (t: Torneio, jogoId: string, lado: Lado) =>
  t.times.find((x) => x.id === timesDoJogo(t, jogoPorId(t, jogoId)!)[lado])

/** Times que estão em campo agora (em qualquer jogo em andamento). */
export function timesJogando(t: Torneio): Set<string> {
  return new Set(t.emAndamento.flatMap((p) => Object.values(timesDoJogo(t, jogoPorId(t, p.jogoId)!)).filter((x): x is string => !!x)))
}

/** Campos livres agora (1, 2…). */
export function camposLivres(t: Torneio): number[] {
  const ocupados = new Set(t.emAndamento.map((p) => p.campo))
  return Array.from({ length: Math.max(1, t.regras.campos) }, (_, i) => i + 1).filter((c) => !ocupados.has(c))
}

/**
 * Campo fixo do jogo, quando cada grupo joga no seu campo (Grupo A no 1, B no 2…;
 * com mais grupos que campos, eles se revezam). Null = pode ir para qualquer campo.
 * O campo que terminar os seus grupos antes passa a ajudar os outros (`campoLiberadoDosGrupos`).
 */
export function campoDoJogo(t: Torneio, jogo: JogoTorneio): number | null {
  const { formato, grupoPorCampo, campos } = t.regras
  if (formato !== 'grupos' || !grupoPorCampo || campos < 2 || jogo.fase !== 'grupo' || jogo.grupo === null) return null
  return (jogo.grupo % campos) + 1
}

/**
 * O campo já jogou todos os jogos dos grupos dele? Aí ele ajuda os outros campos
 * (com mais grupos que campos, um campo acabaria parado enquanto o outro ainda tem jogos).
 */
export function campoLiberadoDosGrupos(t: Torneio, campo: number): boolean {
  return !t.jogos.some((j) => campoDoJogo(t, j) === campo && !j.resultado && !t.emAndamento.some((p) => p.jogoId === j.id))
}

/** O jogo pode ir para este campo? (sem campo fixo, o campo dele, ou um campo que já acabou os seus grupos) */
const serveNoCampo = (t: Torneio, jogo: JogoTorneio, campo: number) => {
  const fixo = campoDoJogo(t, jogo)
  return fixo === null || fixo === campo || campoLiberadoDosGrupos(t, campo)
}

/** Em que campo o jogo começaria agora (null = não tem campo livre para ele). */
export function campoParaJogo(t: Torneio, jogo: JogoTorneio): number | null {
  const livres = camposLivres(t)
  const fixo = campoDoJogo(t, jogo)
  if (fixo !== null && livres.includes(fixo)) return fixo
  return livres.find((c) => serveNoCampo(t, jogo, c)) ?? null
}

/** Jogos que dá para começar agora: disponíveis, com campo livre e sem time que já está jogando. */
export function jogosParaComecar(t: Torneio): JogoTorneio[] {
  const ocupados = timesJogando(t)
  return jogosDisponiveis(t)
    .filter((j) => !partidaDoJogo(t, j.id))
    .filter((j) => campoParaJogo(t, j) !== null)
    .filter((j) => !Object.values(timesDoJogo(t, j)).some((id) => id && ocupados.has(id)))
}

/** Dá para começar este jogo agora neste campo? (campo livre, do grupo certo, times livres) */
export function podeComecarNoCampo(t: Torneio, jogo: JogoTorneio, campo: number): boolean {
  if (!camposLivres(t).includes(campo)) return false
  return serveNoCampo(t, jogo, campo) && jogosParaComecar(t).some((j) => j.id === jogo.id)
}

/** O próximo jogo de cada campo livre (para mostrar "Próximo no Campo 1", "no Campo 2"…). */
export function proximosPorCampo(t: Torneio): { campo: number; jogo: JogoTorneio }[] {
  const lista: { campo: number; jogo: JogoTorneio }[] = []
  const usados = new Set<string>()
  for (const campo of camposLivres(t)) {
    const jogo = jogosParaComecar(t).find((j) => {
      if (usados.has(j.id)) return false
      if (!serveNoCampo(t, j, campo)) return false
      // não oferece dois jogos com o mesmo time em campos diferentes
      const times = Object.values(timesDoJogo(t, j))
      return !lista.some((x) => Object.values(timesDoJogo(t, x.jogo)).some((id) => times.includes(id)))
    })
    if (jogo) {
      lista.push({ campo, jogo })
      usados.add(jogo.id)
    }
  }
  return lista
}

/** Começa um jogo: no campo do grupo dele, ou no primeiro campo livre. */
export function iniciarPartida(t: Torneio, jogoId: string, campo?: number): Torneio {
  if (camposLivres(t).length === 0) throw new Error('Todos os campos estão em uso')
  const jogo = jogosParaComecar(t).find((j) => j.id === jogoId)
  if (!jogo) throw new Error('Esse jogo não pode começar agora')
  const escolhido = campo ?? campoParaJogo(t, jogo)!
  if (!camposLivres(t).includes(escolhido) || !serveNoCampo(t, jogo, escolhido)) throw new Error('Esse campo não está livre para esse jogo')
  const escalacao = iniciarEscalacao(t, jogo)
  // o goleiro do time começa no gol (é o primeiro em campo); suspenso, o gol começa vazio
  const goleiroInicial = (lado: Lado) => {
    const time = timeDoLado(t, jogoId, lado)
    const goleiro = time ? goleiroDoTime(time) : null
    return goleiro && escalacao.emCampo[lado].includes(goleiro.id) ? goleiro.id : null
  }
  const partida: PartidaTorneio = {
    jogoId, campo: escolhido, escalacao, placar: [0, 0], gols: [], cartoes: [], crono: cronoZerado,
    goleiros: { A: goleiroInicial('A'), B: goleiroInicial('B') },
  }
  return { ...t, emAndamento: [...t.emAndamento, partida] }
}

/** Larga o jogo sem resultado (volta para a lista de jogos). */
export const cancelarPartida = (t: Torneio, jogoId: string): Torneio =>
  ({ ...t, emAndamento: t.emAndamento.filter((p) => p.jogoId !== jogoId) })

/** Dá os acréscimos na partida e solta o relógio. */
export const acrescimosNaPartida = (t: Torneio, jogoId: string, min: number): Torneio =>
  comPartida(t, jogoId, (p) => ({ ...p, crono: darAcrescimos(p.crono, min) }))

export const cronoDaPartida = (t: Torneio, jogoId: string, rodando: boolean): Torneio =>
  comPartida(t, jogoId, (p) => ({ ...p, crono: alternarCrono(p.crono, rodando) }))

/** Quem está no gol do `lado` agora (um jogador em campo; null = gol vazio ou o goleiro foi expulso). */
export function goleiroNaPartida(t: Torneio, partida: PartidaTorneio, lado: Lado): Jogador | null {
  const id = partida.goleiros?.[lado] ?? null
  if (!id || !partida.escalacao.emCampo[lado].includes(id) || expulsosNaPartida(partida).has(id)) return null
  return timeDoLado(t, partida.jogoId, lado)?.jogadores.find((jogador) => jogador.id === id) ?? null
}

/**
 * O gol está vazio porque o goleiro foi expulso? Aí o time joga com um a menos: só alguém
 * da linha pode ir para o gol (ninguém entra do banco no lugar de expulso).
 */
export function golVazioPorExpulsao(partida: PartidaTorneio, lado: Lado): boolean {
  const id = partida.goleiros?.[lado] ?? null
  return id !== null && expulsosNaPartida(partida).has(id)
}

/**
 * Alguém vai para o gol do `lado` e vira o goleiro. Da linha: troca de posição (quem estava no gol
 * fica na linha). Do banco: só com o gol vazio (goleiro suspenso), e não conta como substituição;
 * com goleiro no gol, quem vem do banco entra pela substituição normal.
 */
export function irParaOGol(t: Torneio, jogoId: string, lado: Lado, jogadorId: string): Torneio {
  return comPartida(t, jogoId, (p) => {
    if (expulsosNaPartida(p).has(jogadorId)) throw new Error('Expulso não pode ir para o gol')
    const goleiros = { A: p.goleiros?.A ?? null, B: p.goleiros?.B ?? null, [lado]: jogadorId }
    if (p.escalacao.emCampo[lado].includes(jogadorId)) return { ...p, goleiros }
    if (!p.escalacao.banco[lado].includes(jogadorId)) throw new Error('Quem vai para o gol precisa estar em campo ou no banco')
    if (goleiroNaPartida(t, p, lado) || golVazioPorExpulsao(p, lado)) throw new Error('Do banco, só entra no gol vazio (com goleiro, é substituição)')
    const { escalacao } = p
    return {
      ...p,
      goleiros,
      escalacao: {
        ...escalacao,
        emCampo: { ...escalacao.emCampo, [lado]: [jogadorId, ...escalacao.emCampo[lado]] },
        banco: { ...escalacao.banco, [lado]: escalacao.banco[lado].filter((id) => id !== jogadorId) },
        jogaram: { ...escalacao.jogaram, [lado]: escalacao.jogaram[lado].includes(jogadorId) ? escalacao.jogaram[lado] : [...escalacao.jogaram[lado], jogadorId] },
      },
    }
  })
}

/**
 * Gol para `lado`; o goleiro do outro time "sofre". Gol contra: `autor` é do outro time (não conta
 * na artilharia dele). `tempoMs` é dentro do tempo atual (com vários tempos, o gol guarda qual foi).
 */
export function golNaPartida(t: Torneio, jogoId: string, lado: Lado, autor: Jogador | null, tempoMs?: number, contra = false): Torneio {
  return comPartida(t, jogoId, (p) => {
    const goleiro = goleiroNaPartida(t, p, outro(lado))?.nome ?? null
    const placar: Placar = [...p.placar]
    placar[lado === 'A' ? 0 : 1]++
    const periodo = rotuloDoPeriodo(t.regras, p)
    const gol: Gol = {
      lado, autorId: autor?.id ?? null, autor: autor?.nome ?? null, goleiroSofreu: goleiro, tempoMs, ...(contra && { contra: true }),
      ...(periodo && { periodo, duracaoMin: duracaoDoPeriodo(t.regras, p) }),
    }
    return { ...p, placar, gols: [...p.gols, gol] }
  })
}

export function removerGolDaPartida(t: Torneio, jogoId: string, indice: number): Torneio {
  return comPartida(t, jogoId, (p) => {
    const gol = p.gols[indice]
    if (!gol) return p
    const placar: Placar = [...p.placar]
    const i = gol.lado === 'A' ? 0 : 1
    placar[i] = Math.max(0, placar[i] - 1)
    return { ...p, placar, gols: p.gols.filter((_, k) => k !== indice) }
  })
}

export function cartaoNaPartida(t: Torneio, jogoId: string, lado: Lado, jogador: Jogador, cor: CorCartao, tempoMs: number): Torneio {
  return comPartida(t, jogoId, (p) => ({ ...p, cartoes: cartoesAoDar(p.cartoes, lado, jogador, cor, tempoMs) }))
}

/** Expulsos (vermelho) no jogo: não podem ser substituídos. */
export function expulsosNaPartida(p: PartidaTorneio): Set<string> {
  return new Set(p.cartoes.filter((c) => c.cor === 'vermelho').map((c) => c.jogadorId))
}

export function substituirNaPartida(t: Torneio, jogoId: string, lado: Lado, saiId: string, entraId: string): Torneio {
  return comPartida(t, jogoId, (p) => {
    const escalacao = substituir(p.escalacao, lado, saiId, entraId, t.regras.maxSubstituicoes, expulsosNaPartida(p))
    // saiu quem estava no gol: quem entra vira o goleiro
    if (p.goleiros?.[lado] !== saiId) return { ...p, escalacao }
    return { ...p, escalacao, goleiros: { A: p.goleiros.A, B: p.goleiros.B, [lado]: entraId } }
  })
}

/** Encerra o jogo e guarda o resultado. No mata-mata empatado, passe o placar dos pênaltis. */
export function encerrarPartida(t: Torneio, jogoId: string, penaltis: Placar | null = null, agora = Date.now()): Torneio {
  const p = partidaDoJogo(t, jogoId)
  if (!p) throw new Error('Esse jogo não está em andamento')
  const goleiros = { A: goleiroNaPartida(t, p, 'A')?.nome ?? null, B: goleiroNaPartida(t, p, 'B')?.nome ?? null }
  const salvo = registrarResultado(t, jogoId, {
    placar: p.placar, penaltis, gols: p.gols, cartoes: p.cartoes, goleiros, jogaram: p.escalacao.jogaram, sequencia: 0,
    encerradoEm: agora,
  })
  return { ...salvo, emAndamento: salvo.emAndamento.filter((x) => x.jogoId !== jogoId) }
}
