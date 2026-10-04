// Torneio compartilhado: o torneio é dividido em partes que celulares diferentes gravam
// sem atrapalhar um ao outro (ver PLANO.md, seção 10.3):
// - base: regras, times, grupos e jogos (só o organizador grava);
// - partidas: um documento por jogo em andamento (cada mesário grava o do seu campo);
// - resultados: um documento por jogo encerrado.

import type { JogoTorneio, PartidaTorneio, ResultadoJogo, Torneio } from '../../types/torneio'

export type BaseTorneio = Omit<Torneio, 'emAndamento' | 'jogos'> & { jogos: Omit<JogoTorneio, 'resultado'>[] }

export type DadosNuvem = {
  base: BaseTorneio | null
  partidas: PartidaTorneio[]
  resultados: Record<string, ResultadoJogo>
}

export type Operacao =
  | { tipo: 'base'; base: BaseTorneio }
  | { tipo: 'partida'; partida: PartidaTorneio }
  | { tipo: 'apagarPartida'; jogoId: string }
  | { tipo: 'resultado'; jogoId: string; resultado: ResultadoJogo }
  | { tipo: 'apagarResultado'; jogoId: string }

/** Divide o torneio nas partes que vão para a nuvem. */
export function separar(t: Torneio): DadosNuvem {
  const { emAndamento, jogos, ...resto } = t
  const resultados: Record<string, ResultadoJogo> = {}
  for (const j of jogos) if (j.resultado) resultados[j.id] = j.resultado
  return {
    base: { ...resto, jogos: jogos.map(({ resultado: _r, ...j }) => j) },
    partidas: emAndamento,
    resultados,
  }
}

/**
 * Junta as partes num torneio. A ordem dos jogos encerrados (que conta para as
 * suspensões) vem da hora em que cada um acabou, não importa de que celular.
 */
export function juntar(dados: DadosNuvem): Torneio | null {
  if (!dados.base) return null
  const ordem = Object.entries(dados.resultados)
    .sort(([, a], [, b]) => (a.encerradoEm ?? 0) - (b.encerradoEm ?? 0) || a.sequencia - b.sequencia)
    .map(([id]) => id)
  const jogos: JogoTorneio[] = dados.base.jogos.map((j) => {
    const r = dados.resultados[j.id]
    return { ...j, resultado: r ? { ...r, sequencia: ordem.indexOf(j.id) + 1 } : null }
  })
  // jogo com resultado não está mais em andamento (mesmo que o outro celular ainda não tenha apagado)
  const emAndamento = dados.partidas.filter((p) => !dados.resultados[p.jogoId])
  return { ...dados.base, jogos, emAndamento }
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** O que precisa ser gravado na nuvem para ir de `antes` para `depois`. */
export function diferencas(antes: Torneio, depois: Torneio): Operacao[] {
  const a = separar(antes)
  const d = separar(depois)
  const ops: Operacao[] = []
  if (!igual(a.base, d.base)) ops.push({ tipo: 'base', base: d.base! })

  const resultados = new Set([...Object.keys(a.resultados), ...Object.keys(d.resultados)])
  for (const id of resultados) {
    if (!d.resultados[id]) ops.push({ tipo: 'apagarResultado', jogoId: id })
    else if (!igual(a.resultados[id], d.resultados[id])) ops.push({ tipo: 'resultado', jogoId: id, resultado: d.resultados[id] })
  }

  const partidasAntes = new Map(a.partidas.map((p) => [p.jogoId, p]))
  const partidasDepois = new Map(d.partidas.map((p) => [p.jogoId, p]))
  for (const [id, p] of partidasDepois) if (!igual(partidasAntes.get(id), p)) ops.push({ tipo: 'partida', partida: p })
  for (const id of partidasAntes.keys()) if (!partidasDepois.has(id)) ops.push({ tipo: 'apagarPartida', jogoId: id })
  return ops
}

/** Aplica operações sobre os dados (usado pela nuvem de teste e nos testes). */
export function aplicarOperacoes(dados: DadosNuvem, ops: Operacao[]): DadosNuvem {
  let { base, partidas, resultados } = dados
  for (const op of ops) {
    if (op.tipo === 'base') base = op.base
    else if (op.tipo === 'partida') partidas = [...partidas.filter((p) => p.jogoId !== op.partida.jogoId), op.partida]
    else if (op.tipo === 'apagarPartida') partidas = partidas.filter((p) => p.jogoId !== op.jogoId)
    else if (op.tipo === 'resultado') resultados = { ...resultados, [op.jogoId]: op.resultado }
    else {
      const { [op.jogoId]: _x, ...resto } = resultados
      resultados = resto
    }
  }
  return { base, partidas, resultados }
}

/** Código do torneio para compartilhar: 6 letras/números fáceis de ditar (sem 0/O, 1/I). */
export function novoCodigo(aleatorio: () => number = Math.random): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => letras[Math.floor(aleatorio() * letras.length)]).join('')
}
