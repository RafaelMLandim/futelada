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
  gols: number | null // gols que terminam a partida (null = só o tempo)
  limiteVitorias: number | null // null = desligado
  goleiros: string[] // goleiros fixos cadastrados (podem ser vários)
  coletes: Record<Lado, Colete>
  minutosAzul: number // tempo fora do cartão azul
  som: boolean // apitos de início e fim de jogo
  acrescimos: boolean // ao acabar o tempo, pode dar acréscimos
  sortearInicio: boolean // no primeiro jogo, mistura os jogadores dos 2 primeiros times (contra panelinha)
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
  tempoMs?: number // momento da partida (cronômetro) em que saiu o gol
  contra?: boolean // gol contra: conta para `lado`, o autor é do outro time e não entra na artilharia
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
  coletes?: Record<Lado, Colete> // cor que cada lado vestiu nesta partida
}

/** Jogador que mudou de time na última movimentação (e de qual time veio). */
export type Subiu = { jogadorId: string; de: number; para: number }

export type Estado = {
  config: Config
  fila: Jogador[] // fila única de espera; times de fora = blocos de `linha`
  filaTimes: number[] // número de cada bloco da fila (o time mantém o número)
  emCampo: Record<Lado, Time> | null
  placar: Placar
  gols: Gol[] // gols da partida em andamento
  cartoes: Cartao[] // cartões da partida em andamento
  goleiros: Record<Lado, string | null> // goleiro fixo de cada gol (null = sem goleiro fixo)
  historico: Partida[]
  subiram: Subiu[] // quem mudou de time na última movimentação
  proximoNumero: number // número do próximo time novo (só nasce quando chega gente)
}
