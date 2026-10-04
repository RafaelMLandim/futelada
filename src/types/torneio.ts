// Tipos do torneio (regras em PLANO.md, seção 9).

import type { Cronometro } from './app'
import type { Cartao, Gol, Jogador, Lado, Placar } from './pelada'

export type Formato = 'pontos' | 'mata-mata' | 'grupos'

export type RegrasTorneio = {
  formato: Formato
  linha: number // jogadores na linha (goleiro não conta)
  tempoMin: number
  gols: number | null // gols que terminam a partida (null = só o tempo)
  idaEVolta: boolean // pontos corridos / grupos: turno e returno
  grupos: number // grupos + mata-mata: quantos grupos
  classificamPorGrupo: number // grupos + mata-mata: quantos passam de cada grupo
  terceiroLugar: boolean // mata-mata: disputa de 3º lugar
  cobrancasPenalti: number // cobranças normais antes das alternadas
  maxSubstituicoes: number | null // por time, por jogo (null = ilimitadas)
  campos: number // quantos jogos podem acontecer ao mesmo tempo
  grupoPorCampo: boolean // grupos: cada grupo joga sempre no mesmo campo
  minutosAzul: number
  som: boolean
  acrescimos: boolean // ao acabar o tempo, pode dar acréscimos
}

/** Time do torneio. Os primeiros `linha` jogadores são os titulares; os demais, reservas. */
export type TimeTorneio = {
  id: string
  nome: string
  cor: string
  goleiro: string | null
  jogadores: Jogador[]
  fechado: boolean // "Fechar time": acabaram os jogadores dele
}

/** De onde vem o time de um lado do jogo (no mata-mata ele só é conhecido depois). */
export type Origem =
  | { tipo: 'time'; time: string }
  | { tipo: 'vencedor'; jogo: string }
  | { tipo: 'perdedor'; jogo: string }
  | { tipo: 'grupo'; grupo: number; posicao: number } // posicao: 1 = primeiro

export type ResultadoJogo = {
  placar: Placar
  penaltis: Placar | null // só no mata-mata, quando empata
  gols: Gol[]
  cartoes: Cartao[]
  goleiros: Record<Lado, string | null>
  jogaram: Record<Lado, string[]> // ids de quem entrou em campo
  sequencia: number // ordem em que os jogos foram de fato jogados (1, 2, 3…)
  encerradoEm?: number // hora em que acabou (na nuvem define a ordem entre celulares)
}

export type JogoTorneio = {
  id: string
  fase: 'liga' | 'grupo' | 'mata'
  grupo: number | null // índice do grupo (0 = Grupo A)
  rodada: string // "Rodada 1", "Semifinal", "Final"…
  ordem: number // ordem sugerida para jogar
  casa: Origem // lado A
  fora: Origem // lado B
  resultado: ResultadoJogo | null
}

/** Quem está em campo e no banco durante um jogo do torneio. */
export type Escalacao = {
  jogoId: string
  emCampo: Record<Lado, string[]>
  banco: Record<Lado, string[]>
  suspensos: Record<Lado, string[]>
  substituicoes: Record<Lado, number>
  jogaram: Record<Lado, string[]> // todo mundo que entrou em campo no jogo
}

/** Um jogo que está sendo jogado agora (fica salvo: sobrevive a fechar o app). */
export type PartidaTorneio = {
  jogoId: string
  campo: number // 1, 2… (onde está sendo jogado)
  escalacao: Escalacao
  placar: Placar
  gols: Gol[]
  cartoes: Cartao[]
  crono: Cronometro
}

export type Torneio = {
  id: string
  nome: string
  regras: RegrasTorneio
  times: TimeTorneio[]
  grupos: string[][] // ids dos times de cada grupo (formato "grupos")
  sorteio: string[] // ordem sorteada dos times (último critério de desempate)
  jogos: JogoTorneio[]
  sorteado: boolean // grupos/chave/jogos já sorteados
  emAndamento: PartidaTorneio[] // jogos acontecendo agora (um por campo)
  nuvem?: { codigo: string; organizador: string } // torneio compartilhado
}
