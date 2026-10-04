// Utilitários dos testes do torneio.

import type { Cartao, Lado } from '../../../types/pelada'
import type { Formato, ResultadoJogo, RegrasTorneio, Torneio } from '../../../types/torneio'
import { novoJogador } from '../../jogadores'
import { adicionarTime, novoTime, novoTorneio, regrasPadrao, sortear } from '..'

/** Aleatório previsível (mesma sequência sempre). */
export function aleatorioFixo(semente = 1) {
  let x = semente
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

/** Torneio com `n` times ("Time 1"…), cada um com `jogadores` jogadores ("T1J1"…). */
export function torneioCom(n: number, formato: Formato, regras: Partial<RegrasTorneio> = {}, jogadores = 6): Torneio {
  let t = novoTorneio('Copa', { ...regrasPadrao, formato, ...regras })
  for (let i = 1; i <= n; i++) {
    const time = novoTime(`Time ${i}`, '#000')
    time.jogadores = Array.from({ length: jogadores }, (_, k) => ({ ...novoJogador(`T${i}J${k + 1}`) }))
    time.fechado = true
    t = adicionarTime(t, time)
  }
  return t
}

export const sorteado = (t: Torneio) => sortear(t, aleatorioFixo())

export const nomeDoTime = (t: Torneio, id: string | null) => t.times.find((x) => x.id === id)?.nome ?? null

export function resultado(golsA: number, golsB: number, extra: Partial<ResultadoJogo> = {}): ResultadoJogo {
  return {
    placar: [golsA, golsB], penaltis: null, gols: [], cartoes: [],
    goleiros: { A: null, B: null }, jogaram: { A: [], B: [] }, sequencia: 0, ...extra,
  }
}

export const cartao = (lado: Lado, jogadorId: string, cor: Cartao['cor'], porDoisAmarelos = false): Cartao =>
  ({ lado, jogadorId, nome: jogadorId, cor, tempoMs: 0, porDoisAmarelos })
