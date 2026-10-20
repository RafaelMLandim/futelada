import type { DadosNuvem, Operacao } from '../logic/torneio'
import type { PeladaGuardada } from '../logic/historico'
import type { DadosDoPlano } from '../logic/plano'
import type { JogadorDaTurma } from '../logic/turma'
import type { Cronometro } from '../types/app'
import type { Estado, StatusPagamento } from '../types/pelada'

/** Cobrança do campo pago na nuvem (o link que vai para o grupo). */
export type CobrancaNuvem = {
  organizador: string
  data: string // "TER, 06 DE OUT"
  valor: number // por pessoa
  pix: string // Pix copia e cola
  chave: string
  recebedor: string
  confirmarAuto: boolean // "Já paguei" já vale como pago
  jogadores: { id: string; nome: string }[]
}
/**
 * Pelada compartilhada (PLANO.md, seção 16): o que quem acompanha vê ao vivo. O cronômetro vai como
 * horários (cada celular calcula o tempo pelo próprio relógio).
 */
export type PeladaCompartilhada = {
  dono: string // uid de quem criou a pelada (o encerramento vai para o histórico dele)
  nomeDoDono: string | null
  controlador: string // uid de quem marca a pelada agora (só ele grava; um celular por vez)
  nomeDoControlador: string | null
  app: { estado: Estado; crono: Cronometro }
  encerrada: boolean // acabou (encerrada ou cancelada): o link mostra o resultado final
  atualizadaEm: number
}

/** Quem está usando o app: anônimo (sem login), com a conta Google ou com e-mail e senha. */
export type Perfil = { uid: string; nome: string | null; email: string | null; foto: string | null; anonimo: boolean; comSenha?: boolean }
/** Lançamento do caixa da pelada (fica no perfil de quem fez login). */
export type Lancamento = { id: string; tipo: 'entrada' | 'saida'; valor: number; descricao: string; data: number }
/** Turma ("Pelada de terça"): os jogadores de sempre de uma pelada. */
export type Turma = { id: string; nome: string; criadaEm: number }

/** Pelada encerrada no histórico (fica no perfil de quem fez login). */
export type PeladaNoHistorico = PeladaGuardada & { id: string }

/** Mesário que pegou um campo do torneio (o campo fica travado para os outros). */
export type MesarioNoCampo = { uid: string; nome: string; foto: string | null; em: number }

/** Aviso de pagamento de um jogador (um documento por jogador). */
export type AvisoPagamento = { status: StatusPagamento; nome: string; em: number }

/** Onde o torneio compartilhado fica guardado (Firebase ou a versão de teste). */
export interface Nuvem {
  nome: 'firebase' | 'teste'
  /** Identificação deste celular (login anônimo). */
  usuario(): Promise<string>
  /** Acompanha o torneio em tempo real. Devolve a função para parar de ouvir. */
  ouvir(codigo: string, aoMudar: (dados: DadosNuvem) => void, aoErro?: (erro: Error) => void): () => void
  /** Grava mudanças (funciona sem internet: sobe quando a conexão voltar). */
  gravar(codigo: string, ops: Operacao[]): Promise<void>
  existe(codigo: string): Promise<boolean>
  apagar(codigo: string): Promise<void>
  /** Quem está em cada campo (número do campo → mesário). */
  ouvirCampos(codigo: string, aoMudar: (campos: Record<number, MesarioNoCampo>) => void): () => void
  /** Pega o campo para este mesário. false = outro mesário já está nele. */
  pegarCampo(codigo: string, campo: number): Promise<boolean>
  /** Solta o campo (o próprio mesário ou o organizador). */
  soltarCampo(codigo: string, campo: number): Promise<void>

  // ---- campo pago (pelada) ----
  /** Organizador publica/atualiza a cobrança. */
  publicarCobranca(codigo: string, cobranca: Omit<CobrancaNuvem, 'organizador'>): Promise<void>
  /** Acompanha a cobrança e os avisos de pagamento (por id do jogador). */
  ouvirCobranca(codigo: string, aoMudar: (cobranca: CobrancaNuvem | null, avisos: Record<string, AvisoPagamento>) => void, aoErro?: (e: Error) => void): () => void
  /** Quem paga avisa (ou o organizador confirma/desfaz, com null). */
  avisarPagamento(codigo: string, jogadorId: string, aviso: AvisoPagamento | null): Promise<void>
  /** Pelada cancelada: o link de pagamento deixa de existir (só o organizador). */
  apagarCobranca(codigo: string): Promise<void>

  // ---- pelada compartilhada (PLANO.md, seção 16) ----
  /** Dono compartilha a pelada: cria na nuvem (ele no controle) e guarda a chave do link de controle. */
  criarPeladaCompartilhada(codigo: string, dados: Pick<PeladaCompartilhada, 'app' | 'nomeDoDono'>, chave: string): Promise<void>
  /** Quem está no controle publica a pelada (a cada mudança) para quem acompanha. */
  publicarPeladaCompartilhada(codigo: string, dados: Pick<PeladaCompartilhada, 'app' | 'encerrada' | 'atualizadaEm'>): Promise<void>
  /**
   * Assume o controle da pelada: com a chave do link de controle (quem vai ajudar) ou sem chave (o dono retomando).
   * false = a chave não confere (ou não é o dono).
   */
  assumirControleDaPelada(codigo: string, chave: string | null, nome: string | null): Promise<boolean>
  /** Acompanha a pelada ao vivo (null = o código não existe). Não precisa de login (conta anônima). */
  ouvirPeladaCompartilhada(codigo: string, aoMudar: (dados: PeladaCompartilhada | null) => void, aoErro?: (erro: Error) => void): () => void

  // ---- conta (login com Google) e caixa da pelada ----
  ouvirPerfil(aoMudar: (perfil: Perfil | null) => void): () => void
  /** Entra com o Google, mantendo o que já era deste celular (torneios, cobranças). */
  entrarComGoogle(): Promise<void>
  /** Entra com e-mail e senha (conta criada no app). */
  entrarComEmail(email: string, senha: string): Promise<void>
  /** Cria a conta com nome, e-mail e senha (erro auth/email-already-in-use se o e-mail já tem conta). */
  criarContaComEmail(email: string, senha: string, nome: string): Promise<void>
  sair(): Promise<void>
  /** Lançamentos do caixa de quem está logado (vazio sem login), do mais novo ao mais antigo. */
  ouvirCaixa(aoMudar: (lancamentos: Lancamento[]) => void, aoErro?: (e: Error) => void): () => void
  lancarNoCaixa(lancamentos: Omit<Lancamento, 'id'>[]): Promise<void>
  apagarLancamento(id: string): Promise<void>
  /** Peladas encerradas de quem está logado (vazio sem login), da mais nova à mais antiga. */
  ouvirHistorico(aoMudar: (peladas: PeladaNoHistorico[]) => void, aoErro?: (e: Error) => void): () => void
  guardarPelada(pelada: PeladaGuardada): Promise<void>
  apagarPelada(id: string): Promise<void>

  // ---- turmas (jogadores de sempre; PLANO.md, seção 15) ----
  ouvirTurmas(aoMudar: (turmas: Turma[]) => void): () => void
  criarTurma(nome: string): Promise<string>
  ouvirJogadoresDaTurma(turma: string, aoMudar: (jogadores: JogadorDaTurma[]) => void): () => void
  /** Pelada encerrada: quem jogou ganha +1 de presença (e entra na turma, se for novo). */
  registrarPeladaNaTurma(turma: string, jogadores: { id: string; nome: string }[], data: number): Promise<void>
  /** Primeira vez: cria a turma com os jogadores das peladas antigas e liga essas peladas a ela. */
  importarTurma(turma: string, jogadores: JogadorDaTurma[], peladas: string[]): Promise<void>
  // ---- plano pago (PLANO.md, seção 14) ----
  /** Plano (só o servidor grava), o que a conta e este celular já usaram e se a cobrança está ligada. */
  ouvirPlano(aparelho: string, aoMudar: (dados: DadosDoPlano) => void): () => void
  /** Soma 1 no uso da conta (e, na pelada, no do celular). As regras só deixam somar 1. */
  contarUso(tipo: 'peladas' | 'torneios', aparelho: string): Promise<void>
  /** Torneio novo com crédito: o servidor desconta 1. false = não tinha crédito. */
  usarCreditoDeTorneio(): Promise<boolean>

  /** Remove a turma, os jogadores dela e as peladas dela no histórico. */
  removerTurma(turma: string, peladas: string[]): Promise<void>
  /**
   * Exclui a conta Google do app e tudo o que ela criou (histórico, turmas, caixa, torneios, cobranças).
   * Pode pedir a conta do Google de novo (o Google exige login recente). Erro "cancelou" = desistiu.
   */
  excluirConta(senha?: string): Promise<void>
}
