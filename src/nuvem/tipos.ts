import type { DadosNuvem, Operacao } from '../logic/torneio'

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
}
