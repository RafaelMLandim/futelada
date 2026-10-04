// Criação do torneio: regras, cadastro dos times e sorteio (grupos, chave e jogos).

import type { Jogador } from '../../types/pelada'
import type { JogoTorneio, Origem, RegrasTorneio, TimeTorneio, Torneio } from '../../types/torneio'
import { montarChave } from './chave'
import { embaralhar, type Aleatorio } from './sorteio'
import { ordenarSemRepetir, todosContraTodos } from './tabela'

export const regrasPadrao: RegrasTorneio = {
  formato: 'pontos',
  linha: 4,
  tempoMin: 10,
  gols: null, // por padrão a partida do torneio termina só pelo tempo
  idaEVolta: false,
  grupos: 2,
  classificamPorGrupo: 2,
  terceiroLugar: false,
  cobrancasPenalti: 3,
  maxSubstituicoes: null,
  campos: 1,
  grupoPorCampo: true,
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
  return { id: novoId('time'), nome: nome.trim(), cor, goleiro: null, jogadores: [], fechado: false }
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

/** Titulares (os primeiros `linha`) e reservas do time. */
export function titularesEReservas(time: TimeTorneio, linha: number) {
  return { titulares: time.jogadores.slice(0, linha), reservas: time.jogadores.slice(linha) }
}

// ---------- Sorteio ----------

/** O que impede o sorteio (lista vazia = pode sortear). */
export function problemasParaSortear(torneio: Torneio): string[] {
  const { times, regras } = torneio
  const problemas: string[] = []
  if (times.length < 2) problemas.push('Cadastre pelo menos 2 times')
  for (const t of times) {
    if (!t.fechado) problemas.push(`Feche o time ${t.nome}`)
    if (t.jogadores.length < regras.linha) problemas.push(`${t.nome} precisa de pelo menos ${regras.linha} jogadores`)
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
    return { ...torneio, sorteio, grupos: [], jogos: montarChave(sementes, regras.terceiroLugar), sorteado: true }
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

  // Mata-mata: sementes 1ºA, 1ºB…, 2ºA, 2ºB… (1º de um grupo pega 2º de outro)
  const sementes: Origem[] = []
  for (let posicao = 1; posicao <= regras.classificamPorGrupo; posicao++) {
    for (let grupo = 0; grupo < regras.grupos; grupo++) sementes.push({ tipo: 'grupo', grupo, posicao })
  }
  const mata = montarChave(sementes, regras.terceiroLugar, 'm', jogosDeGrupo.length)
  return { ...torneio, sorteio, grupos, jogos: [...jogosDeGrupo, ...mata], sorteado: true }
}
