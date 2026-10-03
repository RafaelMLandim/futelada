// Regras da pelada (ver PLANO.md, seção 3).
// Todas as funções são puras: recebem um estado e devolvem um novo.

export { configPadrao, novaSessao, alterarLinha, definirColete } from './sessao'
export { novoJogador, adicionarJogador, removerJogador, todosOsJogadores } from './jogadores'
export { blocosDaFila, timesCompletosNaFila } from './fila'
export { podeComecar, comecar, gol, acabouPorGols, vitoria } from './partida'
export { empateSaemOsDois, empate } from './empate'
export { definirGoleiros, escolherGoleiro, trocarGoleiros } from './goleiros'
export { LADOS, outro } from './lado'
export { darCartao, cartoesDoJogador, expulso, restanteAzul, cartoesDoDia, type CartoesDoDia } from './cartoes'
export { artilharia, goleirosMenosVazados, type Artilheiro, type GoleiroStats } from './estatisticas'
