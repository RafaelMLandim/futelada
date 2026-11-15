import type { DadosNuvem, Operacao } from '../logic/torneio'
import type { PeladaGuardada } from '../logic/historico'
import type { PeladaDaCarta, ResumoDaCarta, TorneioDaCarta } from '../logic/carta'
import type { ResumoDoTorneioNaCarta } from '../logic/torneio/carta'
import type { DadosDoPlano } from '../logic/plano'
import type { JogadorDaTurma } from '../logic/turma'
import type { Caixinha } from '../logic/caixinha'
import type { Cronometro } from '../types/app'
import type { Estado, StatusPagamento } from '../types/pelada'
import type { InscricaoDoTorneio, JogadorInscrito, TimeInscrito } from '../types/torneio'

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
  titulo?: string // caixinha: o nome ("Bola nova"); sem título = o campo da pelada
  descricao?: string // caixinha: o motivo
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

/** O que o jogador escolhe no perfil. */
/** fotoRemovida: o servidor tirou a foto e o apelido por denúncias (o dono vê o aviso até escolher outra foto). */
export type DadosDoJogador = { foto: string | null; apelido: string | null; fotoRemovida?: boolean }
export type MotivoDaDenuncia = 'impropria' | 'nao-e-a-pessoa' | 'outro'
/** Link da pelada (PLANO.md, seção 17.2): o que quem abre o link vê. */
export type ListaDaPelada = { organizador: string; data: string }
/** Quem se colocou na lista pelo link (`id` = a conta, ou o celular de quem usou só o nome). */
/** naFila: o organizador já pôs a pessoa na fila (ela continua na lista para ver isso no link). */
/** goleiro: vai como goleiro fixo (os números do gol vão para a carta dele). */
export type ConfirmadoNaLista = { id: string; nome: string; comConta: boolean; em: number; naFila?: boolean; goleiro?: boolean }

/**
 * Participação em um torneio (PLANO.md, seção 22.3): quem entrou num time pelo link com a conta. Fica no perfil dele e
 * aparece na pré-tela "Torneios" (Jogando), para acompanhar. `id` = o código do link de inscrição.
 */
/**
 * "Esse sou eu" (PLANO.md, seção 22.4): quem tem conta diz que é um jogador digitado pelo organizador; o organizador
 * confirma e o jogador passa a ser da conta (os números vão para a carta). `id` = a conta de quem pediu.
 */
export type PedidoEsseSouEu = { id: string; jogador: string; nomeDoJogador: string; nomeDaConta: string; em: number }

export type ParticipacaoNoTorneio = { id: string; torneio: string | null; nomeDoTorneio: string; time: string; nomeDoTime: string; cor: string; data: number }

/** Quem está usando o app: anônimo (sem login), com a conta Google ou com e-mail e senha. */
export type Perfil = { uid: string; nome: string | null; email: string | null; foto: string | null; anonimo: boolean; comSenha?: boolean; comApple?: boolean }
/** Lançamento do caixa da pelada (fica no perfil de quem fez login). */
export type Lancamento = { id: string; tipo: 'entrada' | 'saida'; valor: number; descricao: string; data: number; turma?: string | null; caixinha?: string; jogador?: string }
/** Turma ("Pelada de terça"): os jogadores de sempre de uma pelada. */
export type Turma = { id: string; nome: string; criadaEm: number }

/** Pelada encerrada no histórico (fica no perfil de quem fez login). */
export type PeladaNoHistorico = PeladaGuardada & { id: string }

/** Mesário que pegou um campo do torneio (o campo fica travado para os outros). */
export type MesarioNoCampo = { uid: string; nome: string; foto: string | null; em: number }

/** Aviso de pagamento de um jogador (um documento por jogador). */
export type AvisoPagamento = { status: StatusPagamento; nome: string; em: number }

/**
 * Tela de telão (TV, projetor, tablet): mostra um código até a organizadora parear; depois, qual torneio e
 * qual campo ela mostra (PLANO.md, seção 20).
 */
export type TelaDoTelao = { codigo: string; torneio?: string; campo?: number; nomeDoTorneio?: string }

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
  /** Telão: cria a tela deste aparelho (com um código) e avisa quando ela for pareada ou trocar de campo. */
  ouvirTela(aoMudar: (tela: TelaDoTelao) => void, aoErro?: (erro: Error) => void): () => void
  /** Telão: troca o código desta tela (desfaz o pareamento). */
  novoCodigoDaTela(): Promise<void>
  /** Organizadora: liga a tela do código a um campo do torneio. false = nenhuma tela com esse código. */
  parearTela(codigoDaTela: string, torneio: string, campo: number, nomeDoTorneio: string): Promise<boolean>
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
  /** Entra com a conta da Apple (só no app do iPhone), mantendo o que já era deste celular. */
  entrarComApple(): Promise<void>
  /** Entra com e-mail e senha (conta criada no app). */
  entrarComEmail(email: string, senha: string): Promise<void>
  /** Cria a conta com nome, e-mail e senha (erro auth/email-already-in-use se o e-mail já tem conta). */
  criarContaComEmail(email: string, senha: string, nome: string): Promise<void>
  /** Manda o e-mail do Firebase com o link para criar uma senha nova. */
  redefinirSenha(email: string): Promise<void>
  sair(): Promise<void>
  /** Lançamentos do caixa de quem está logado (vazio sem login), do mais novo ao mais antigo. */
  ouvirCaixa(aoMudar: (lancamentos: Lancamento[]) => void, aoErro?: (e: Error) => void): () => void
  lancarNoCaixa(lancamentos: Omit<Lancamento, 'id'>[]): Promise<void>
  apagarLancamento(id: string): Promise<void>
  /** Caixinhas do caixa ("Bola nova"), da mais nova à mais antiga; vazio sem login. */
  ouvirCaixinhas(aoMudar: (caixinhas: Caixinha[]) => void, aoErro?: (e: Error) => void): () => void
  salvarCaixinha(caixinha: Caixinha): Promise<void>
  /** Peladas encerradas de quem está logado (vazio sem login), da mais nova à mais antiga. */
  ouvirHistorico(aoMudar: (peladas: PeladaNoHistorico[]) => void, aoErro?: (e: Error) => void): () => void
  guardarPelada(pelada: PeladaGuardada): Promise<void>

  // ---- link da pelada (PLANO.md, seção 17.2) ----
  abrirLista(codigo: string, data: string): Promise<void>
  /** Acompanha o link: os dados (null = não existe) e quem confirmou, na ordem em que confirmou. */
  ouvirLista(codigo: string, aoMudar: (lista: ListaDaPelada | null, confirmados: ConfirmadoNaLista[]) => void, aoErro?: (erro: Error) => void): () => void
  confirmarNaLista(codigo: string, nome: string, comConta: boolean, goleiro: boolean): Promise<void>
  /** O organizador tirou da fila por engano: a pessoa volta para os Confirmados. */
  voltarParaConfirmados(codigo: string, id: string): Promise<void>
  /** A pessoa sai da lista. */
  tirarDaLista(codigo: string, id: string): Promise<void>
  /** O organizador pôs a pessoa na fila. */
  marcarNaFila(codigo: string, id: string): Promise<void>
  /** Pelada encerrada ou cancelada: o link deixa de existir (só o organizador). */
  apagarLista(codigo: string): Promise<void>

  // ---- inscrição dos times pelo link (PLANO.md, seção 22) ----
  /** O organizador cria o link (ou muda: aberta, limite, nome). */
  publicarInscricao(codigo: string, dados: Omit<InscricaoDoTorneio, 'organizador'>): Promise<void>
  /** Acompanha o link: os dados (null = não existe) e os times inscritos, cada um com os jogadores. */
  ouvirInscricao(codigo: string, aoMudar: (inscricao: InscricaoDoTorneio | null, times: TimeInscrito[]) => void, aoErro?: (erro: Error) => void): () => void
  /** O capitão (com conta) inscreve o time. */
  inscreverTime(codigo: string, time: { id: string; nome: string; cor: string; nomeDoCapitao: string }): Promise<void>
  /** Muda o nome ou a cor do time inscrito (o capitão ou o organizador). */
  mudarTimeInscrito(codigo: string, timeId: string, dados: { nome?: string; cor?: string }): Promise<void>
  /** Tira o time da inscrição, com os jogadores (o capitão ou o organizador). */
  tirarTimeInscrito(codigo: string, timeId: string): Promise<void>
  /** Quem abriu o link do time entra nele (sempre no próprio registro). */
  entrarNoTime(codigo: string, timeId: string, jogador: Omit<JogadorInscrito, 'id' | 'em'>): Promise<void>
  /** Sai do time: a própria pessoa, o capitão ou o organizador. */
  sairDoTime(codigo: string, timeId: string, jogadorId: string): Promise<void>
  /** "Esse sou eu": pede (ou cancela, com null) para ser o jogador digitado. Sempre no próprio pedido. */
  pedirEsseSouEu(torneio: string, pedido: Omit<PedidoEsseSouEu, 'id' | 'em'> | null): Promise<void>
  /** O próprio pedido no torneio (null = nenhum). */
  ouvirMeuPedido(torneio: string, aoMudar: (pedido: PedidoEsseSouEu | null) => void): () => void
  /** O organizador: os pedidos do torneio. */
  ouvirPedidos(torneio: string, aoMudar: (pedidos: PedidoEsseSouEu[]) => void): () => void
  /** O organizador tira o pedido (confirmado ou recusado). */
  tirarPedido(torneio: string, conta: string): Promise<void>
  /** Os torneios em que quem está logado joga (vazio sem login), do mais novo ao mais antigo. */
  ouvirParticipacoes(aoMudar: (participacoes: ParticipacaoNoTorneio[]) => void): () => void
  /** Guarda (ou tira, com null) a participação no perfil de quem está logado. */
  guardarParticipacao(id: string, participacao: Omit<ParticipacaoNoTorneio, 'id'> | null): Promise<void>

  // ---- carta e foto do jogador (PLANO.md, seção 17) ----
  /** Peladas da carta de quem está logado (só o servidor grava; vazio sem login). */
  ouvirCarta(aoMudar: (peladas: PeladaDaCarta[]) => void): () => void
  /** Foto e apelido que quem está logado escolheu (null = nenhum: usa os da conta). */
  ouvirDadosDoJogador(aoMudar: (dados: DadosDoJogador) => void): () => void
  salvarDadosDoJogador(dados: Partial<DadosDoJogador>): Promise<void>
  /** Pelada encerrada: o servidor grava os números na carta de cada conta (só ele grava). */
  registrarNaCarta(data: number, turma: string | null, jogadores: ResumoDaCarta[]): Promise<void>
  /** Torneios da carta de quem está logado (só o servidor grava; vazio sem login). */
  ouvirCartaDosTorneios(aoMudar: (torneios: TorneioDaCarta[]) => void): () => void
  /** O organizador manda o resumo do torneio: o servidor grava na carta de quem jogou com conta (refaz, não soma). */
  registrarTorneioNaCarta(codigo: string, nome: string, data: number, jogadores: ResumoDoTorneioNaCarta[]): Promise<void>
  /** Pelada apagada do histórico: os números saem da carta de quem jogou. */
  retirarDaCarta(data: number, contas: string[]): Promise<void>
  /** Denuncia a foto ou o apelido de outra conta (com 3 pessoas diferentes, o servidor tira). */
  denunciarFoto(conta: string, motivo: MotivoDaDenuncia): Promise<void>
  /** Fotos de quem jogou com conta (conta → foto; quem não escolheu foto não vem). */
  fotosDasContas(contas: string[]): Promise<Record<string, string>>

  // ---- turmas (jogadores de sempre; PLANO.md, seção 15) ----
  ouvirTurmas(aoMudar: (turmas: Turma[]) => void): () => void
  criarTurma(nome: string): Promise<string>
  ouvirJogadoresDaTurma(turma: string, aoMudar: (jogadores: JogadorDaTurma[]) => void): () => void
  /** Pelada encerrada: quem jogou ganha +1 de presença (e entra na turma, se for novo). */
  registrarPeladaNaTurma(turma: string, jogadores: { id: string; nome: string; conta?: string }[], data: number): Promise<void>
  /** Primeira vez: cria a turma com os jogadores das peladas antigas e liga essas peladas a ela. */
  importarTurma(turma: string, jogadores: JogadorDaTurma[], peladas: string[]): Promise<void>
  // ---- plano pago (PLANO.md, seção 14) ----
  /** Plano (só o servidor grava), o que a conta e este celular já usaram e se a cobrança está ligada. */
  ouvirPlano(aparelho: string, aoMudar: (dados: DadosDoPlano) => void): () => void
  /** Soma 1 no uso da conta (e, na pelada, no do celular). As regras só deixam somar 1. */
  contarUso(tipo: 'peladas' | 'torneios', aparelho: string): Promise<void>
  /** Torneio novo com crédito: o servidor desconta 1. false = não tinha crédito. */
  usarCreditoDeTorneio(): Promise<boolean>
  /** Código da conta (uid): é ele que vai para a loja, para o servidor saber de quem é a compra. */
  idDaConta(): Promise<string>

  /** Remove a turma, os jogadores dela e as peladas dela no histórico. */
  removerTurma(turma: string, peladas: string[]): Promise<void>
  /**
   * Exclui a conta Google do app e tudo o que ela criou (histórico, turmas, caixa, torneios, cobranças).
   * Pode pedir a conta do Google de novo (o Google exige login recente). Erro "cancelou" = desistiu.
   */
  excluirConta(senha?: string): Promise<void>
}
