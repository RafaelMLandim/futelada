import type { Estado, Lado, Partida } from '../types/pelada'
import { artilharia, goleiroDaSelecao, goleirosMenosVazados, selecaoDaPelada } from './estatisticas'
import { jogadorGoleiro } from './goleiros'
import { contasDaPelada } from './jogadores'
import { LADOS } from './lado'

// Carta do jogador (PLANO.md, seção 17): os números de quem joga com a conta, somados pelas peladas dele.

/** O que o jogador fez em uma pelada. Só o servidor grava (o jogador não edita a própria carta). */
export type PeladaDaCarta = {
  id: string
  turma: string // id da turma (uma conta pode jogar em várias, de organizadores diferentes)
  nomeDaTurma: string
  data: number
  jogos: number
  vitorias: number
  empates: number
  gols: number
  assistencias: number
  amarelos: number
  vermelhos: number
  jogosSemSofrer?: number // jogos no gol sem levar gol
  golsContra?: number
  naSelecao?: boolean // entrou na seleção da pelada
  artilheiroDoDia?: boolean
  vitoriasSeguidas?: number // maior sequência de vitórias na pelada
  luvaDeOuro?: boolean // goleiro fixo menos vazado da pelada
}

export type NumerosDaCarta = {
  peladas: number
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  gols: number
  assistencias: number
  amarelos: number
  vermelhos: number
  aproveitamento: number // % dos pontos possíveis (vitória 3, empate 1)
  jogosSemSofrer: number
  golsContra: number
}

/** A temporada é o ano: a carta recomeça em janeiro, e as temporadas passadas ficam guardadas. */
export const temporadaDaPelada = (pelada: Pick<PeladaDaCarta, 'data'>) => new Date(pelada.data).getFullYear()

export const peladasDaTemporada = (peladas: PeladaDaCarta[], temporada: number) => peladas.filter((pelada) => temporadaDaPelada(pelada) === temporada)

/** Temporadas para escolher, da mais nova à mais antiga (a `atual` aparece mesmo sem nenhuma pelada). */
export function temporadasDaCarta(peladas: PeladaDaCarta[], atual: number): number[] {
  return [...new Set([atual, ...peladas.map(temporadaDaPelada)])].sort((x, y) => y - x)
}

/** Soma as peladas da carta (com `turma`: só as daquela turma). */
export function numerosDaCarta(peladas: PeladaDaCarta[], turma: string | null = null): NumerosDaCarta {
  const escolhidas = turma ? peladas.filter((pelada) => pelada.turma === turma) : peladas
  const somar = (campo: 'jogos' | 'vitorias' | 'empates' | 'gols' | 'assistencias' | 'amarelos' | 'vermelhos' | 'jogosSemSofrer' | 'golsContra') =>
    escolhidas.reduce((total, pelada) => total + (pelada[campo] ?? 0), 0)
  const jogos = somar('jogos')
  const vitorias = somar('vitorias')
  const empates = somar('empates')
  return {
    peladas: escolhidas.length, jogos, vitorias, empates, derrotas: jogos - vitorias - empates,
    gols: somar('gols'), assistencias: somar('assistencias'), amarelos: somar('amarelos'), vermelhos: somar('vermelhos'),
    aproveitamento: jogos ? Math.round(((vitorias * 3 + empates) / (jogos * 3)) * 100) : 0,
    jogosSemSofrer: somar('jogosSemSofrer'), golsContra: somar('golsContra'),
  }
}

/** Turmas em que o jogador tem pelada, da mais jogada à menos jogada (para o filtro). */
export function turmasDaCarta(peladas: PeladaDaCarta[]): { id: string; nome: string; peladas: number }[] {
  const mapa = new Map<string, { id: string; nome: string; peladas: number }>()
  for (const pelada of peladas) {
    const linha = mapa.get(pelada.turma) ?? { id: pelada.turma, nome: pelada.nomeDaTurma, peladas: 0 }
    linha.peladas++
    mapa.set(pelada.turma, linha)
  }
  return [...mapa.values()].sort((x, y) => y.peladas - x.peladas || x.nome.localeCompare(y.nome))
}

// ---- Conquistas (insígnias de bronze, prata e ouro no perfil) ----

export type NivelDaConquista = 'bronze' | 'prata' | 'ouro'
const NIVEIS: NivelDaConquista[] = ['bronze', 'prata', 'ouro']
/** O aproveitamento só vale a partir daqui (com poucos jogos, uma vitória já daria 100%). */
const JOGOS_PARA_APROVEITAMENTO = 20
/** Quantas conquistas contam para a cor da carta: as melhores. Assim goleiro e jogador de linha têm as mesmas chances. */
const CONQUISTAS_NA_CARTA = 6
/** A carta lendária pede os 18 pontos e tantas insígnias no ouro, na mesma temporada. */
const OUROS_PARA_LENDARIA = 8

export type Conquista = {
  id: string
  nome: string
  descricao: string
  valor: number // quanto o jogador já tem
  metas: [number, number, number] // bronze, prata e ouro
  negativa?: boolean // tira pontos da carta em vez de dar
  especial?: boolean // sem níveis e sem pontos: fica para sempre, em qualquer temporada
  nivel: NivelDaConquista | null // o maior nível alcançado
  proximaMeta: number | null // null = já é ouro
}

/** Conquistas de uma temporada: passe as peladas daquele ano, de todas as turmas (o filtro por turma não muda as conquistas). */
export function conquistasDaCarta(peladas: PeladaDaCarta[]): Conquista[] {
  const total = numerosDaCarta(peladas)
  const melhorDia = Math.max(0, ...peladas.map((pelada) => pelada.gols))
  const melhorDiaNoGol = Math.max(0, ...peladas.map((pelada) => pelada.jogosSemSofrer ?? 0))
  const melhorDiaDePasses = Math.max(0, ...peladas.map((pelada) => pelada.assistencias))
  const maiorSequencia = Math.max(0, ...peladas.map((pelada) => pelada.vitoriasSeguidas ?? 0))
  const lista: Omit<Conquista, 'nivel' | 'proximaMeta'>[] = [
    { id: 'artilheiro', nome: 'Artilheiro', descricao: 'Gols marcados', valor: total.gols, metas: [10, 30, 80] },
    { id: 'garcom', nome: 'Garçom', descricao: 'Assistências', valor: total.assistencias, metas: [5, 15, 40] },
    { id: 'vencedor', nome: 'Vencedor', descricao: 'Vitórias', valor: total.vitorias, metas: [15, 60, 150] },
    { id: 'assiduo', nome: 'Assíduo', descricao: 'Peladas jogadas', valor: total.peladas, metas: [5, 20, 40] },
    { id: 'dia-inspirado', nome: 'Dia inspirado', descricao: 'Gols em uma pelada', valor: melhorDia, metas: [3, 5, 8] },
    { id: 'rodado', nome: 'Rodado', descricao: 'Turmas diferentes', valor: turmasDaCarta(peladas).length, metas: [2, 3, 4] },
    { id: 'aproveitamento', nome: 'Aproveitamento', descricao: `% com ${JOGOS_PARA_APROVEITAMENTO}+ jogos`,
      valor: total.jogos >= JOGOS_PARA_APROVEITAMENTO ? total.aproveitamento : 0, metas: [50, 60, 75] },
    { id: 'muralha', nome: 'Muralha', descricao: 'Jogos sem levar gol', valor: total.jogosSemSofrer, metas: [5, 20, 50] },
    { id: 'luva-de-ouro', nome: 'Luva de ouro', descricao: 'Vezes goleiro menos vazado da pelada', valor: peladas.filter((pelada) => pelada.luvaDeOuro).length, metas: [2, 5, 12] },
    { id: 'rei-do-camarote', nome: 'Rei do Camarote', descricao: 'Vezes na seleção da pelada', valor: peladas.filter((pelada) => pelada.naSelecao).length, metas: [2, 5, 15] },
    { id: 'artilheiro-do-dia', nome: 'Artilheiro do dia', descricao: 'Vezes artilheiro da pelada', valor: peladas.filter((pelada) => pelada.artilheiroDoDia).length, metas: [2, 5, 12] },
    { id: 'imortal', nome: 'Imortal', descricao: 'Vitórias seguidas em uma pelada', valor: maiorSequencia, metas: [3, 6, 10] },
    { id: 'pe-de-anjo', nome: 'Pé de Anjo', descricao: 'Assistências em uma pelada', valor: melhorDiaDePasses, metas: [2, 4, 6] },
    { id: 'pe-trocado', nome: 'Pé Trocado', descricao: 'Gols contra (tira pontos)', valor: total.golsContra, metas: [1, 3, 5], negativa: true },
    { id: 'paredao', nome: 'Dia de paredão', descricao: 'Jogos sem levar gol em uma pelada', valor: melhorDiaNoGol, metas: [3, 5, 8] },
  ]
  return lista.map((conquista) => {
    const alcancadas = conquista.metas.filter((meta) => conquista.valor >= meta).length
    return {
      ...conquista,
      nivel: alcancadas ? NIVEIS[alcancadas - 1] : null,
      proximaMeta: conquista.metas[alcancadas] ?? null,
    }
  })
}

export type NivelDaCarta = NivelDaConquista | 'diamante' | 'lendaria'

const pontosDaConquista = (conquista: Conquista) => (conquista.nivel ? NIVEIS.indexOf(conquista.nivel) + 1 : 0)

/**
 * Cor da carta: soma as 6 melhores conquistas (bronze vale 1 ponto, prata 2 e ouro 3; o máximo é 18) e desconta as negativas,
 * como o Pé Trocado (a carta pode cair). Toda carta começa no bronze.
 */
export function nivelDaCarta(conquistas: Conquista[]): NivelDaCarta {
  const ganhos = conquistas.filter((conquista) => !conquista.negativa).map(pontosDaConquista)
    .sort((x, y) => y - x).slice(0, CONQUISTAS_NA_CARTA).reduce((total, valor) => total + valor, 0)
  const perdas = conquistas.filter((conquista) => conquista.negativa).reduce((total, conquista) => total + pontosDaConquista(conquista), 0)
  const pontos = Math.max(0, ganhos - perdas)
  const ouros = conquistas.filter((conquista) => !conquista.negativa && conquista.nivel === 'ouro').length
  if (pontos >= 18 && ouros >= OUROS_PARA_LENDARIA) return 'lendaria'
  return pontos >= 16 ? 'diamante' : pontos >= 12 ? 'ouro' : pontos >= 6 ? 'prata' : 'bronze'
}

/** A conquista máxima: ter a carta lendária em alguma temporada. Não recomeça em janeiro. */
export function conquistaLendaria(peladas: PeladaDaCarta[]): Conquista {
  const temporadas = [...new Set(peladas.map(temporadaDaPelada))]
  const lendarias = temporadas.filter((temporada) => nivelDaCarta(conquistasDaCarta(peladasDaTemporada(peladas, temporada))) === 'lendaria').length
  return {
    id: 'lenda', nome: 'Lenda', descricao: 'Consiga a carta lendária', valor: lendarias, metas: [1, 1, 1], especial: true,
    nivel: lendarias > 0 ? 'ouro' : null, proximaMeta: lendarias > 0 ? null : 1,
  }
}

// ---- Pelada encerrada: o que vai para a carta de quem jogou com conta ----

export type ResumoDaCarta = {
  conta: string; jogos: number; vitorias: number; empates: number; gols: number; assistencias: number
  amarelos: number; vermelhos: number; golsContra: number; jogosSemSofrer: number; vitoriasSeguidas: number
  naSelecao: boolean; artilheiroDoDia: boolean; luvaDeOuro: boolean
}

/** Os números de cada conta na pelada. Só valem as partidas terminadas (quem jogou só com o nome fica de fora). */
export function resumoParaAsCartas(estado: Estado): ResumoDaCarta[] {
  const contas = contasDaPelada(estado)
  const selecao = new Set(selecaoDaPelada(estado).map((jogador) => jogador.id))
  const artilheiro = artilharia(estado)[0]?.id
  const goleiroNaSelecao = goleiroDaSelecao(estado)?.nome
  const luvaDeOuro = goleirosMenosVazados(estado)[0]?.nome
  const resumos = new Map<string, ResumoDaCarta & { sequencia: number }>()
  const doJogador = (id: string | null | undefined) => {
    const conta = id ? contas[id] : undefined
    if (!conta) return null
    const atual = resumos.get(conta) ?? {
      conta, jogos: 0, vitorias: 0, empates: 0, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0, golsContra: 0,
      jogosSemSofrer: 0, vitoriasSeguidas: 0, naSelecao: false, artilheiroDoDia: false, luvaDeOuro: false, sequencia: 0,
    }
    resumos.set(conta, atual)
    return atual
  }
  const jogou = (resumo: ResumoDaCarta & { sequencia: number }, partida: Partida, lado: Lado) => {
    resumo.jogos++
    if (partida.resultado === 'empate') resumo.empates++
    if (partida.resultado === lado) {
      resumo.vitorias++
      resumo.sequencia++
      resumo.vitoriasSeguidas = Math.max(resumo.vitoriasSeguidas, resumo.sequencia)
    } else resumo.sequencia = 0
  }
  for (const partida of estado.historico) {
    for (const lado of LADOS) {
      const time = lado === 'A' ? partida.timeA : partida.timeB
      for (const jogador of time.jogadores) {
        const resumo = doJogador(jogador.id)
        if (!resumo) continue
        jogou(resumo, partida, lado)
        if (selecao.has(jogador.id)) resumo.naSelecao = true
        if (artilheiro === jogador.id) resumo.artilheiroDoDia = true
      }
      // goleiro fixo: joga pelo time que estiver na frente dele; jogo sem levar gol só conta para ele
      const goleiro = partida.goleiros[lado]
      const resumoDoGoleiro = goleiro ? doJogador(jogadorGoleiro(goleiro).id) : null
      if (goleiro && resumoDoGoleiro) {
        jogou(resumoDoGoleiro, partida, lado)
        if (partida.placar[lado === 'A' ? 1 : 0] === 0) resumoDoGoleiro.jogosSemSofrer++
        if (goleiro === goleiroNaSelecao) resumoDoGoleiro.naSelecao = true
        if (goleiro === luvaDeOuro) resumoDoGoleiro.luvaDeOuro = true
      }
    }
    for (const gol of partida.gols) {
      const autor = doJogador(gol.autorId)
      if (autor) { if (gol.contra) autor.golsContra++; else autor.gols++ }
      const passe = doJogador(gol.assistenciaId)
      if (passe) passe.assistencias++
    }
    for (const cartao of partida.cartoes) {
      const resumo = doJogador(cartao.jogadorId)
      if (resumo && cartao.cor === 'amarelo') resumo.amarelos++
      if (resumo && cartao.cor === 'vermelho' && !cartao.porDoisAmarelos) resumo.vermelhos++
    }
  }
  return [...resumos.values()].map(({ sequencia: _sequencia, ...resumo }) => resumo)
}

// ---- Desenho da carta (a tela e a imagem de compartilhar usam os mesmos) ----

/** Forma da carta (um escudo vertical), em uma tela de 740 x 1060. */
export const FORMA_DA_CARTA = 'M104 0H636Q666 53 740 64V848Q740 912 666 954L370 1060 74 954Q0 912 0 848V64Q74 53 104 0Z'
export const FORMA_DE_DENTRO_DA_CARTA = 'M116 26H624Q652 74 714 86V842Q714 896 652 932L370 1032 88 932Q26 896 26 842V86Q88 74 116 26Z'

/** Cada nível: o metal da carta (claro, meio, brilho), a borda e a cor da tinta (texto e linhas). */
export const METAIS_DA_CARTA: Record<NivelDaCarta, { metal: [string, string, string]; borda: [string, string]; tinta: string }> = {
  bronze: { metal: ['#ecbd92', '#bb7c44', '#dca675'], borda: ['#f7d9bb', '#7d4a25'], tinta: '#2c1505' },
  prata: { metal: ['#fbfdff', '#b4c0cc', '#e4eaf0'], borda: ['#ffffff', '#6f7d8b'], tinta: '#10223a' },
  ouro: { metal: ['#fff3b0', '#eebd2a', '#ffe07a'], borda: ['#fffbe0', '#a87c0c'], tinta: '#2b1f02' },
  diamante: { metal: ['#effdff', '#74d3ee', '#c6f4ff'], borda: ['#ffffff', '#2a9cc4'], tinta: '#06303f' },
  lendaria: { metal: ['#1b222c', '#0c1016', '#1d242e'], borda: ['#fbe6a2', '#c9a227'], tinta: '#f5d77a' },
}
