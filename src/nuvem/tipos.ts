import type { DadosNuvem, Operacao } from '../logic/torneio'
import type { PeladaGuardada } from '../logic/historico'
import type { StatusPagamento } from '../types/pelada'

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
/** Quem está usando o app: anônimo (sem login) ou com a conta Google. */
export type Perfil = { uid: string; nome: string | null; email: string | null; foto: string | null; anonimo: boolean }
/** Lançamento do caixa da pelada (fica no perfil de quem fez login). */
export type Lancamento = { id: string; tipo: 'entrada' | 'saida'; valor: number; descricao: string; data: number }
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

  // ---- conta (login com Google) e caixa da pelada ----
  ouvirPerfil(aoMudar: (perfil: Perfil | null) => void): () => void
  /** Entra com o Google, mantendo o que já era deste celular (torneios, cobranças). */
  entrarComGoogle(): Promise<void>
  sair(): Promise<void>
  /** Lançamentos do caixa de quem está logado (vazio sem login), do mais novo ao mais antigo. */
  ouvirCaixa(aoMudar: (lancamentos: Lancamento[]) => void, aoErro?: (e: Error) => void): () => void
  lancarNoCaixa(lancamentos: Omit<Lancamento, 'id'>[]): Promise<void>
  apagarLancamento(id: string): Promise<void>
  /** Peladas encerradas de quem está logado (vazio sem login), da mais nova à mais antiga. */
  ouvirHistorico(aoMudar: (peladas: PeladaNoHistorico[]) => void, aoErro?: (e: Error) => void): () => void
  guardarPelada(pelada: PeladaGuardada): Promise<void>
  apagarPelada(id: string): Promise<void>
}
