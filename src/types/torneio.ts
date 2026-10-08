// Tipos do torneio (regras em PLANO.md, seção 9).

import type { Cronometro } from './app'
import type { Cartao, Gol, Jogador, Lado, Placar } from './pelada'

export type Formato = 'pontos' | 'mata-mata' | 'grupos'

export type RegrasTorneio = {
  formato: Formato
  linha: number // jogadores na linha (goleiro não conta)
  tempos: number // tempos regulamentares (1, 2, 3…)
  tempoMin: number // duração de cada tempo regulamentar
  intervaloMin: number // intervalo entre os tempos (0 = sem intervalo)
  prorrogacao: boolean // mata-mata: empate (ou agregado empatado) vai para a prorrogação antes dos pênaltis
  temposProrrogacao: number
  minutosProrrogacao: number // duração de cada tempo da prorrogação
  gols: number | null // gols que terminam a partida (null = só o tempo)
  idaEVolta: boolean // pontos corridos / grupos: turno e returno
  grupos: number // grupos + mata-mata: quantos grupos
  classificamPorGrupo: number // grupos + mata-mata: quantos passam de cada grupo
  terceiroLugar: boolean // mata-mata: disputa de 3º lugar
  mataIdaEVolta: boolean // mata-mata em ida e volta (placar agregado; pênaltis só no fim da volta)
  finalUnica: boolean // com ida e volta: a final é em jogo único (como na Libertadores)
  cobrancasPenalti: number // cobranças normais antes das alternadas
  maxSubstituicoes: number | null // por time, por jogo (null = ilimitadas)
  campos: number // quantos jogos podem acontecer ao mesmo tempo
  grupoPorCampo: boolean // grupos: cada grupo joga sempre no mesmo campo
  chaveCopa: boolean // grupos: chave em dois lados como na Copa (1º e 2º do mesmo grupo só se encontram na final)
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
  // o `ordem`º melhor entre quem terminou em `posicao` nos `grupos` (melhor campanha; W.O. da chave)
  | { tipo: 'melhor'; posicao: number; grupos: number[]; ordem: number }

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
  // mata-mata em ida e volta: qual jogo do confronto é este e o id do outro
  perna?: 'ida' | 'volta'
  outraPerna?: string
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
  crono: Cronometro // relógio do jogo todo (o intervalo não conta)
  periodo?: number // tempo atual (1º, 2º…), dentro do regulamentar ou da prorrogação
  prorrogacao?: boolean // está na prorrogação
  inicioDoPeriodo?: number // ms do relógio quando o tempo atual começou
  intervaloAte?: number | null // no intervalo: hora em que acaba
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
