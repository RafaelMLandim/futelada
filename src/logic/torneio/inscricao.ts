// Inscrição pelo link (PLANO.md, seção 22): o capitão inscreve o time pelo link do torneio e os jogadores entram
// pelo link do time. O celular do organizador junta as inscrições nos times do torneio (só ele grava o torneio).

import type { JogadorDoTime, JogadorInscrito, TimeInscrito, TimeTorneio, Torneio } from '../../types/torneio'

const jogadorDaInscricao = (jogador: JogadorInscrito, goleiro: boolean): JogadorDoTime => ({
  id: `i${jogador.id}`,
  nome: jogador.nome,
  inscrito: jogador.id,
  ...(jogador.comConta && { conta: jogador.id }),
  ...(goleiro && { goleiro: true }),
  ...(jogador.camisa !== undefined && { camisa: jogador.camisa }),
})

/** Os jogadores do time depois da inscrição: quem saiu do link sai do time; quem entrou vai para o fim (os goleiros, junto dos goleiros). */
function jogadoresJuntos(atuais: JogadorDoTime[], inscritos: JogadorInscrito[]): JogadorDoTime[] {
  const noLink = new Set(inscritos.map((jogador) => jogador.id))
  const ficam = atuais.filter((jogador) => !jogador.inscrito || noLink.has(jogador.inscrito))
  const jaEstao = new Set(ficam.map((jogador) => jogador.inscrito).filter(Boolean))
  const novos = [...inscritos].sort((a, b) => a.em - b.em).filter((jogador) => !jaEstao.has(jogador.id)).map((jogador) => jogadorDaInscricao(jogador, !!jogador.goleiro))
  const todos = [...ficam, ...novos]
  // os goleiros ficam no começo da lista (o primeiro é o titular)
  return [...todos.filter((jogador) => jogador.goleiro), ...todos.filter((jogador) => !jogador.goleiro)]
}

/**
 * Junta as inscrições do link nos times do torneio (antes do sorteio). O nome e a cor seguem os do capitão; os
 * jogadores que o organizador pôs à mão continuam. Time que saiu do link sai do torneio. Com o limite de times
 * cheio, os que se inscreveram por último ficam de fora. Sem mudança, devolve o mesmo torneio.
 */
export function juntarInscricoes(torneio: Torneio, inscritos: TimeInscrito[], limiteDeTimes: number | null): Torneio {
  if (torneio.sorteado) return torneio
  const noLink = new Map(inscritos.map((time) => [time.id, time]))
  let times: TimeTorneio[] = torneio.times.filter((time) => !time.inscricao || noLink.has(time.inscricao))
  for (const inscrito of [...inscritos].sort((a, b) => a.em - b.em)) {
    const atual = times.find((time) => time.inscricao === inscrito.id)
    if (atual) {
      times = times.map((time) => (time === atual
        ? { ...time, nome: inscrito.nome, cor: inscrito.cor, capitao: inscrito.capitao, jogadores: jogadoresJuntos(time.jogadores, inscrito.jogadores) }
        : time))
    } else if (limiteDeTimes === null || times.length < limiteDeTimes) {
      times = [...times, { id: `time${inscrito.id}`, nome: inscrito.nome, cor: inscrito.cor, jogadores: jogadoresJuntos([], inscrito.jogadores), fechado: false, inscricao: inscrito.id, capitao: inscrito.capitao }]
    }
  }
  return JSON.stringify(times) === JSON.stringify(torneio.times) ? torneio : { ...torneio, times }
}

/** O jogador é o capitão do time (inscreveu o time pelo link)? */
export const ehCapitao = (time: TimeTorneio, jogador: JogadorDoTime) => !!time.capitao && jogador.inscrito === time.capitao

/** Vagas: quantos times ainda cabem (null = sem limite). */
export const vagasDaInscricao = (inscritos: number, limiteDeTimes: number | null) => (limiteDeTimes === null ? null : Math.max(0, limiteDeTimes - inscritos))

/**
 * "Esse sou eu" (PLANO.md, seção 22.4): quem tocou no nome e confirmou passa a ser aquele jogador digitado (os números
 * dele vão para a carta; o celular do organizador grava sozinho). Não troca quem já tem conta, e a conta não fica em dois jogadores do torneio.
 */
export function ligarContaAoJogador(torneio: Torneio, jogadorId: string, conta: string): Torneio {
  const jaLigada = torneio.times.some((time) => time.jogadores.some((jogador) => jogador.conta === conta))
  const alvo = torneio.times.flatMap((time) => time.jogadores).find((jogador) => jogador.id === jogadorId)
  if (jaLigada || !alvo || alvo.conta) return torneio
  return {
    ...torneio,
    times: torneio.times.map((time) => ({ ...time, jogadores: time.jogadores.map((jogador) => (jogador.id === jogadorId ? { ...jogador, conta } : jogador)) })),
  }
}
