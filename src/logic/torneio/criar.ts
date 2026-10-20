// Criação do torneio: regras, cadastro dos times e sorteio (grupos, chave e jogos).

import type { Jogador, Lado } from '../../types/pelada'
import type { JogadorDoTime, JogoTorneio, Origem, RegrasTorneio, TimeTorneio, Torneio } from '../../types/torneio'
import { LADOS } from '../lado'
import { chaveDosGrupos, montarChave } from './chave'
import { timesDoJogo } from './jogos'
import { embaralhar, type Aleatorio } from './sorteio'
import { ordenarSemRepetir, todosContraTodos } from './tabela'

export const regrasPadrao: RegrasTorneio = {
  formato: 'pontos',
  linha: 4,
  tempos: 1,
  tempoMin: 10,
  intervaloMin: 0,
  prorrogacao: false,
  temposProrrogacao: 2,
  minutosProrrogacao: 5,
  gols: null, // por padrão a partida do torneio termina só pelo tempo
  idaEVolta: false,
  grupos: 2,
  classificamPorGrupo: 2,
  terceiroLugar: false,
  mataIdaEVolta: false,
  finalUnica: true,
  cobrancasPenalti: 3,
  maxSubstituicoes: null,
  campos: 1,
  grupoPorCampo: true,
  chaveCopa: true,
  minutosAzul: 2,
  som: true,
  acrescimos: true,
}

let seq = 0
const novoId = (prefixo: string) => `${prefixo}${Date.now().toString(36)}${(seq++).toString(36)}`

export function novoTorneio(nome: string, regras: RegrasTorneio = regrasPadrao): Torneio {
  return { id: novoId('t'), nome: nome.trim(), regras, times: [], grupos: [], sorteio: [], jogos: [], sorteado: false, emAndamento: [] }
}

// ---------- Times ----------

export function novoTime(nome: string, cor: string): TimeTorneio {
  return { id: novoId('time'), nome: nome.trim(), cor, jogadores: [], fechado: false }
}

export function adicionarTime(torneio: Torneio, time: TimeTorneio): Torneio {
  return { ...torneio, times: [...torneio.times, time] }
}

export function editarTime(torneio: Torneio, id: string, mudar: (t: TimeTorneio) => TimeTorneio): Torneio {
  return { ...torneio, times: torneio.times.map((t) => (t.id === id ? mudar(t) : t)) }
}

export function removerTime(torneio: Torneio, id: string): Torneio {
  if (torneio.sorteado) throw new Error('Não dá para remover time depois do sorteio')
  return { ...torneio, times: torneio.times.filter((t) => t.id !== id) }
}

export const adicionarJogadorAoTime = (t: TimeTorneio, jogador: Jogador): TimeTorneio => ({ ...t, jogadores: [...t.jogadores, jogador] })
export const removerJogadorDoTime = (t: TimeTorneio, id: string): TimeTorneio => ({ ...t, jogadores: t.jogadores.filter((j) => j.id !== id) })

/** O goleiro do time (o jogador marcado com `goleiro`). */
export const goleiroDoTime = (time: TimeTorneio): JogadorDoTime | null => time.jogadores.find((jogador) => jogador.goleiro) ?? null

/** Os jogadores de linha do time (todos menos o goleiro), na ordem do cadastro. */
export const jogadoresDeLinha = (time: TimeTorneio): JogadorDoTime[] => time.jogadores.filter((jogador) => !jogador.goleiro)

/** Titulares (os primeiros `linha` jogadores de linha) e reservas do time. */
export function titularesEReservas(time: TimeTorneio, linha: number) {
  const deLinha = jogadoresDeLinha(time)
  return { titulares: deLinha.slice(0, linha), reservas: deLinha.slice(linha) }
}

/**
 * Torneios de versões antigas guardavam o goleiro só pelo nome (`goleiro: "NOME"`), fora da lista.
 * Ele vira um jogador do time marcado como goleiro, com um id que todo celular calcula igual
 * (o torneio compartilhado é convertido em cada celular). Jogo em andamento: o goleiro entra em campo, no gol.
 */
export function converterGoleirosAntigos(torneio: Torneio): Torneio {
  const times = torneio.times.map((time) => {
    const { goleiro: nomeAntigo, ...resto } = time as TimeTorneio & { goleiro?: string | null }
    if (!nomeAntigo?.trim() || goleiroDoTime(resto)) return resto
    return { ...resto, jogadores: [{ id: `${time.id}-goleiro`, nome: nomeAntigo.trim(), goleiro: true }, ...resto.jogadores] }
  })
  const emAndamento = torneio.emAndamento.map((partida) => {
    if (partida.goleiros) return partida
    const jogo = torneio.jogos.find((candidato) => candidato.id === partida.jogoId)
    if (!jogo) return partida
    const ids = timesDoJogo({ ...torneio, times }, jogo)
    let { escalacao } = partida
    const goleiros: Record<Lado, string | null> = { A: null, B: null }
    for (const lado of LADOS) {
      const time = times.find((candidato) => candidato.id === ids[lado])
      const goleiro = time ? goleiroDoTime(time) : null
      if (!goleiro) continue
      const jaEsta = [...escalacao.emCampo[lado], ...escalacao.banco[lado], ...escalacao.suspensos[lado]].includes(goleiro.id)
      if (jaEsta && !escalacao.emCampo[lado].includes(goleiro.id)) continue
      if (!jaEsta) {
        escalacao = {
          ...escalacao,
          emCampo: { ...escalacao.emCampo, [lado]: [goleiro.id, ...escalacao.emCampo[lado]] },
          jogaram: { ...escalacao.jogaram, [lado]: [goleiro.id, ...escalacao.jogaram[lado]] },
        }
      }
      goleiros[lado] = goleiro.id
    }
    return { ...partida, escalacao, goleiros }
  })
  return { ...torneio, times, emAndamento }
}

// ---------- Sorteio ----------

/** O que impede o sorteio (lista vazia = pode sortear). */
export function problemasParaSortear(torneio: Torneio): string[] {
  const { times, regras } = torneio
  const problemas: string[] = []
  if (times.length < 2) problemas.push('Cadastre pelo menos 2 times')
  for (const t of times) {
    if (!t.fechado) problemas.push(`Feche o time ${t.nome}`)
    if (!goleiroDoTime(t)) problemas.push(`${t.nome} precisa de um goleiro`)
    if (jogadoresDeLinha(t).length < regras.linha) problemas.push(`${t.nome} precisa de pelo menos ${regras.linha} jogadores de linha`)
  }
  if (regras.formato === 'grupos') {
    if (regras.grupos < 2) problemas.push('Use pelo menos 2 grupos')
    if (times.length < regras.grupos * 2) problemas.push(`Com ${regras.grupos} grupos, precisa de pelo menos ${regras.grupos * 2} times`)
    if (regras.classificamPorGrupo < 1 || regras.classificamPorGrupo * regras.grupos < 2) problemas.push('Precisa classificar pelo menos 2 times no total')
    const menorGrupo = Math.floor(times.length / Math.max(1, regras.grupos))
    if (regras.classificamPorGrupo > menorGrupo) problemas.push(`Não dá para classificar ${regras.classificamPorGrupo} de grupos com ${menorGrupo} times`)
  }
  return problemas
}

const LETRAS = 'ABCDEFGHIJKLMNOP'
export const nomeDoGrupo = (indice: number) => `Grupo ${LETRAS[indice] ?? indice + 1}`

/** Jogos de pontos corridos de um conjunto de times (liga ou um grupo). */
function jogosDePontos(times: string[], idaEVolta: boolean, fase: 'liga' | 'grupo', grupo: number | null, prefixo: string): JogoTorneio[] {
  return todosContraTodos(times, idaEVolta).flatMap((rodada, r) =>
    rodada.map(([a, b], i): JogoTorneio => ({
      id: `${prefixo}r${r + 1}j${i + 1}`,
      fase,
      grupo,
      rodada: `Rodada ${r + 1}`,
      ordem: 0,
      casa: { tipo: 'time', time: a },
      fora: { tipo: 'time', time: b },
      resultado: null,
    })),
  )
}

/** Sorteia grupos / chave e gera todos os jogos. Pode ser refeito até o primeiro jogo. */
/** Mata-mata em ida e volta? (e se a final também é ida e volta) */
const idaEVoltaDoMata = (r: RegrasTorneio) => (r.mataIdaEVolta ? { finalUnica: r.finalUnica } : null)

export function sortear(torneio: Torneio, aleatorio: Aleatorio = Math.random): Torneio {
  const problemas = problemasParaSortear(torneio)
  if (problemas.length) throw new Error(problemas[0])
  if (torneio.jogos.some((j) => j.resultado)) throw new Error('O torneio já começou')

  const { regras } = torneio
  const sorteio = embaralhar(torneio.times.map((t) => t.id), aleatorio)
  const timesDe = (j: JogoTorneio) => [j.casa, j.fora].flatMap((o) => (o.tipo === 'time' ? [o.time] : []))
  const numerar = (jogos: JogoTorneio[], inicio = 0) => jogos.map((j, i) => ({ ...j, ordem: inicio + i }))

  if (regras.formato === 'pontos') {
    const jogos = numerar(ordenarSemRepetir(jogosDePontos(sorteio, regras.idaEVolta, 'liga', null, 'l'), timesDe))
    return { ...torneio, sorteio, grupos: [], jogos, sorteado: true }
  }

  if (regras.formato === 'mata-mata') {
    const sementes: Origem[] = sorteio.map((time) => ({ tipo: 'time', time }))
    return { ...torneio, sorteio, grupos: [], jogos: montarChave(sementes, regras.terceiroLugar, 'm', 0, idaEVoltaDoMata(regras)), sorteado: true }
  }

  // Grupos + mata-mata: distribui o sorteio nos grupos (A, B, C, A, B, C…)
  const grupos: string[][] = Array.from({ length: regras.grupos }, () => [])
  sorteio.forEach((time, i) => grupos[i % regras.grupos].push(time))
  const porGrupo = grupos.map((g, gi) => jogosDePontos(g, regras.idaEVolta, 'grupo', gi, `g${gi + 1}`))
  // Intercala os grupos (rodada 1 do A, do B…, rodada 2…) e evita time jogando seguido
  const intercalados: JogoTorneio[] = []
  const maior = Math.max(...porGrupo.map((g) => g.length))
  for (let i = 0; i < maior; i++) for (const g of porGrupo) if (g[i]) intercalados.push(g[i])
  const jogosDeGrupo = numerar(ordenarSemRepetir(intercalados, timesDe))

  // Mata-mata (cruzamento simples): sementes 1ºA, 1ºB…, 2ºA, 2ºB… (1º de um grupo pega 2º de outro)
  const sementes: Origem[] = []
  for (let posicao = 1; posicao <= regras.classificamPorGrupo; posicao++) {
    for (let grupo = 0; grupo < regras.grupos; grupo++) sementes.push({ tipo: 'grupo', grupo, posicao })
  }
  // Chave da Copa (dois lados; W.O. por melhor campanha) ou o cruzamento simples
  const copa = regras.chaveCopa ? chaveDosGrupos(regras.grupos, regras.classificamPorGrupo) : null
  const mata = montarChave(sementes, regras.terceiroLugar, 'm', jogosDeGrupo.length, idaEVoltaDoMata(regras), copa)
  return { ...torneio, sorteio, grupos, jogos: [...jogosDeGrupo, ...mata], sorteado: true }
}
