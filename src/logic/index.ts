// Regras da pelada (ver PLANO.md, seção 3).
// Todas as funções são puras: recebem um estado e devolvem um novo.

export { configPadrao, novaSessao, alterarLinha, definirColete } from './sessao'
export { novoJogador, adicionarJogador, removerJogador, todosOsJogadores } from './jogadores'
export { blocosDaFila, timesDaFila, timesCompletosNaFila } from './fila'
export { podeComecar, sortearPrimeirosTimes, comecar, gol, removerGol, acabouPorGols, vitoria } from './partida'
export { empateSaemOsDois, empate } from './empate'
export { definirGoleiros, escolherGoleiro, trocarGoleiros } from './goleiros'
export { LADOS, outro } from './lado'
export { darCartao, cartoesAoDar, restanteAzulNaLista, cartoesDoJogador, expulso, restanteAzul, cartoesDoDia, type CartoesDoDia } from './cartoes'
export { atualizarSubiram, subiuDe } from './subiram'
export { pagantes, valorPorPessoa, marcarPagamento, resumoPagamentos, type ResumoPagamentos } from './pagamento'
export { saldoDoCaixa, lancamentosDaPelada, type MovimentoDoCaixa } from './caixa'
export { artilharia, criterioDoArtilheiro, goleirosMenosVazados, placarDosColetes, vitoriasPorJogador, selecaoDaPelada, fichaDoJogador, type FichaDoJogador, type Artilheiro, type CriterioDaArtilharia, type GoleiroStats, type PlacarDosColetes, type VitoriasDoJogador } from './estatisticas'
export { peladaParaGuardar, temporada, artilhariaDaTemporada, type PeladaGuardada, type Temporada, type LinhaDaTemporada, type GoleiroDaTemporada } from './historico'
