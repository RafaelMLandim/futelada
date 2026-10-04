// Regras do torneio (ver PLANO.md, seção 9). Funções puras, como as da pelada.

export { regrasPadrao, novoTorneio, novoTime, adicionarTime, editarTime, removerTime, adicionarJogadorAoTime,
  removerJogadorDoTime, titularesEReservas, problemasParaSortear, sortear, nomeDoGrupo } from './criar'
export { embaralhar, type Aleatorio } from './sorteio'
export { todosContraTodos, ordenarSemRepetir } from './tabela'
export { montarChave, ordemDasSementes, nomeDaRodada } from './chave'
export { classificar, classificacao, type LinhaDaTabela } from './classificacao'
export { jogoPorId, vencedor, resolverOrigem, timesDoJogo, jogosDisponiveis, registrarResultado, campeao,
  gruposTerminados } from './jogos'
export { novaDisputa, quemBate, placarDosPenaltis, vencedorDosPenaltis, cobrar, voltarCobranca,
  type Penaltis, type Cobranca } from './penaltis'
export { situacaoDisciplinar, type SituacaoDisciplinar } from './suspensoes'
export { iniciarEscalacao, substituir, impedimentoDaSubstituicao } from './escalacao'
export { iniciarPartida, cancelarPartida, cronoDaPartida, acrescimosNaPartida, golNaPartida, removerGolDaPartida, cartaoNaPartida,
  expulsosNaPartida, substituirNaPartida, encerrarPartida, partidaDoJogo, timesJogando, camposLivres,
  jogosParaComecar, campoDoJogo, campoParaJogo, proximosPorCampo, podeComecarNoCampo } from './partida'
export { artilhariaDoTorneio, goleirosDoTorneio, cartoesDoTorneio, type ArtilheiroTorneio, type GoleiroTorneio,
  type CartoesTorneio } from './estatisticas'
export { separar, juntar, diferencas, aplicarOperacoes, novoCodigo, type BaseTorneio, type DadosNuvem, type Operacao } from './sincronia'
