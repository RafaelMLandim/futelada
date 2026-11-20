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
  reentrada?: boolean // quem saiu pode voltar ao jogo (como na pelada); false = quem saiu não entra mais (sem o campo: pode)
  campos: number // quantos jogos podem acontecer ao mesmo tempo
  grupoPorCampo: boolean // grupos: cada grupo joga sempre no mesmo campo
  chaveCopa: boolean // grupos: chave em dois lados como na Copa (1º e 2º do mesmo grupo só se encontram na final)
  minutosAzul: number
  som: boolean
  acrescimos: boolean // ao acabar o tempo, pode dar acréscimos
  assistencias: boolean // depois de quem fez o gol, pergunta quem deu o passe (líder de assistências: Troféu Garçom)
}

/**
 * Jogador do time do torneio. `goleiro`: joga no gol (o time pode ter vários; o primeiro da lista começa no gol). É só
 * a posição de costume: no jogo, qualquer um vai para o gol ou para a linha.
 */
/** `camisa`: número da camisa (opcional; sem ele o jogador aparece só pelo nome). */
/** `inscrito`: entrou pelo link do time (o id do registro dele na inscrição: a conta ou o celular). */
export type JogadorDoTime = Jogador & { goleiro?: boolean; camisa?: number; inscrito?: string }

/**
 * Time do torneio: o goleiro (marcado com `goleiro`) e os jogadores de linha. Dos jogadores de linha,
 * os primeiros `linha` são os titulares; os demais, reservas.
 */
/** Modelos de uniforme do torneio (duas cores: a do time e a segunda, das listras e faixas). */
export const MODELOS_DE_UNIFORME = ['lisa', 'horizontais', 'verticais', 'faixaHorizontal', 'diagonal', 'diagonalInvertida', 'meioAMeio', 'faixaVertical',
  'mangas', 'faixaEmV', 'metadeEmCima', 'xadrez', 'duasFaixas', 'ombros', 'duasFaixasVerticais'] as const
export type ModeloDeUniforme = (typeof MODELOS_DE_UNIFORME)[number]
export type Uniforme = { modelo: ModeloDeUniforme; segunda: string }

export type TimeTorneio = {
  id: string
  nome: string
  sigla?: string // 3 letras, como no Brasileirão ("FLA"); sem: sai do nome (siglaDoTime)
  cor: string
  uniforme?: Uniforme // sem: camisa lisa, só com a cor
  jogadores: JogadorDoTime[]
  fechado: boolean // "Fechar time": acabaram os jogadores dele
  inscricao?: string // veio pelo link de inscrição: o id do time inscrito (o nome e a cor seguem os do capitão)
  capitao?: string // quem inscreveu o time pelo link (o `inscrito` do jogador): leva a braçadeira
}

/** Inscrição pelo link (PLANO.md, seção 22): o capitão inscreve o time e os jogadores entram pelo link do time. */
/** `torneio`: o código do torneio na nuvem (quem joga com a conta abre ele para acompanhar). */
export type InscricaoDoTorneio = { organizador: string; nomeDoTorneio: string; aberta: boolean; limiteDeTimes: number | null; torneio?: string | null }
/** Quem entrou no time pelo link (`id` = a conta, ou o celular de quem usou só o nome). */
export type JogadorInscrito = { id: string; nome: string; comConta: boolean; em: number; goleiro?: boolean; camisa?: number }
export type TimeInscrito = { id: string; capitao: string; nomeDoCapitao: string; nome: string; cor: string; em: number; jogadores: JogadorInscrito[] }

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
  titulares?: Record<Lado, string[]> // quem começou o jogo (sugere a escalação do próximo jogo do time)
  noGol?: Record<Lado, string | null> // quem começou no gol (sugere o goleiro do próximo jogo do time)
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
  titulares?: Record<Lado, string[]> // quem estava em campo no apito inicial (antes dele, acompanha `emCampo`)
  noGol?: Record<Lado, string | null> // quem estava no gol no apito inicial (antes dele, acompanha o gol da partida)
}

/** Um jogo que está sendo jogado agora (fica salvo: sobrevive a fechar o app). */
/** Uma cobrança da disputa de pênaltis. */
export type Cobranca = { lado: Lado; jogadorId: string | null; nome: string | null; gol: boolean }

/** Disputa de pênaltis: cobranças alternadas; depois das normais, alternadas até alguém errar. */
export type Penaltis = {
  comeca: Lado // quem bate primeiro (pode ser sorteado na moeda)
  quantidade: number // cobranças normais de cada lado
  cobrancas: Cobranca[]
}

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
  // quem está no gol de cada lado: o id de um jogador em campo (null = gol vazio: goleiro suspenso ou expulso)
  goleiros?: Record<Lado, string | null>
  // substituições feitas no jogo, na ordem (para desfazer a última). primeiraVez: quem entrou ainda não tinha jogado;
  // goleiroAntes: quem estava no gol antes (quem saiu era o goleiro e quem entrou virou o goleiro)
  substituicoesFeitas?: SubstituicaoFeita[]
  // disputa de pênaltis em andamento: fica no jogo (e na nuvem) para o telão acompanhar e para não se perder
  // se o celular do mesário fechar no meio; some quando o resultado é confirmado
  penaltis?: Penaltis | null
}

export type SubstituicaoFeita = { lado: Lado; saiId: string; entraId: string; primeiraVez: boolean; goleiroAntes: string | null }

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
  inscricao?: string // código do link de inscrição dos times (PLANO.md, seção 22)
  melhorJogador?: string // id do jogador eleito o melhor do torneio pelo organizador (vai para a carta)
  limiteDeTimes?: number // torneio grátis: até 8 times (PLANO.md, seção 14.1)
  codigoDoBolao?: string // código escolhido pelo organizador para o link do bolão ("COPAVILA"; PLANO.md, seção 23)
}
