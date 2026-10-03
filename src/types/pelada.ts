// Tipos do domínio da pelada (regras em PLANO.md, seção 3).

export type Jogador = { id: string; nome: string }

export type Time = {
  numero: number
  jogadores: Jogador[]
  vitoriasSeguidas: number
}

/** Cor do colete de cada lado do campo. Quem entra veste o colete de quem saiu. */
export type Colete = { nome: string; cor: string }

export type Config = {
  linha: number // jogadores na linha (goleiro não conta)
  tempoMin: number
  gols: number
  limiteVitorias: number | null // null = desligado
  goleiros: string[] // goleiros fixos cadastrados (podem ser vários)
  coletes: Record<Lado, Colete>
  minutosAzul: number // tempo fora do cartão azul
}

/** Os dois lados do campo. */
export type Lado = 'A' | 'B'

export type Placar = [number, number]

/** Um gol: quem fez (null = não informado) e o goleiro fixo que sofreu. */
export type Gol = {
  lado: Lado
  autorId: string | null
  autor: string | null
  goleiroSofreu: string | null
}

export type CorCartao = 'amarelo' | 'vermelho' | 'azul'

export type Cartao = {
  lado: Lado
  jogadorId: string
  nome: string
  cor: CorCartao
  tempoMs: number // momento da partida (cronômetro) em que foi dado
  porDoisAmarelos?: boolean
}

export type Partida = {
  numero: number
  timeA: Time
  timeB: Time
  placar: Placar
  resultado: Lado | 'empate'
  sairam: number[] // números dos times que saíram
  gols: Gol[]
  cartoes: Cartao[]
  goleiros: Record<Lado, string | null> // goleiros fixos que jogaram a partida
}

export type Estado = {
  config: Config
  fila: Jogador[] // fila única de espera; times de fora = blocos de `linha`
  emCampo: Record<Lado, Time> | null
  placar: Placar
  gols: Gol[] // gols da partida em andamento
  cartoes: Cartao[] // cartões da partida em andamento
  goleiros: Record<Lado, string | null> // goleiro fixo de cada gol (null = sem goleiro fixo)
  historico: Partida[]
  proximoNumero: number
}
