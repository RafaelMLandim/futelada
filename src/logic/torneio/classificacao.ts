// Classificação de pontos corridos (liga ou grupo).
// Vitória 3, empate 1. Desempate (como o Brasileirão, sem gols pró e confronto direto):
// pontos → vitórias → saldo → menos vermelhos → menos azuis → menos amarelos → sorteio.

import type { JogoTorneio, Torneio } from '../../types/torneio'

export type LinhaDaTabela = {
  time: string
  pontos: number
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  golsPro: number
  golsContra: number
  saldo: number
  vermelhos: number
  azuis: number
  amarelos: number
}

const timeFixo = (o: JogoTorneio['casa']) => (o.tipo === 'time' ? o.time : null)

/** Classifica os `times` considerando os jogos de liga/grupo já jogados entre eles. */
export function classificar(times: readonly string[], jogos: readonly JogoTorneio[], sorteio: readonly string[]): LinhaDaTabela[] {
  const linhas = new Map<string, LinhaDaTabela>(times.map((t) => [t, {
    time: t, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0,
    vermelhos: 0, azuis: 0, amarelos: 0,
  }]))
  const validos = jogos.filter((j) => j.resultado && j.fase !== 'mata')
  for (const j of validos) {
    const casa = linhas.get(timeFixo(j.casa) ?? '')
    const fora = linhas.get(timeFixo(j.fora) ?? '')
    if (!casa || !fora) continue
    const [gc, gf] = j.resultado!.placar
    for (const [linha, pro, contra] of [[casa, gc, gf], [fora, gf, gc]] as const) {
      linha.jogos++
      linha.golsPro += pro
      linha.golsContra += contra
      linha.saldo = linha.golsPro - linha.golsContra
      if (pro > contra) { linha.vitorias++; linha.pontos += 3 }
      else if (pro === contra) { linha.empates++; linha.pontos += 1 }
      else linha.derrotas++
    }
    // Cartões (contam para o desempate disciplinar)
    for (const c of j.resultado!.cartoes) {
      const linha = c.lado === 'A' ? casa : fora
      if (c.cor === 'vermelho') linha.vermelhos++
      else if (c.cor === 'azul') linha.azuis++
      else linha.amarelos++
    }
  }
  return [...linhas.values()].sort((x, y) =>
    y.pontos - x.pontos ||
    y.vitorias - x.vitorias ||
    y.saldo - x.saldo ||
    x.vermelhos - y.vermelhos ||
    x.azuis - y.azuis ||
    x.amarelos - y.amarelos ||
    sorteio.indexOf(x.time) - sorteio.indexOf(y.time),
  )
}

/** Classificação da liga (pontos corridos) ou de um grupo. */
export function classificacao(torneio: Torneio, grupo: number | null = null): LinhaDaTabela[] {
  const times = grupo === null ? torneio.times.map((t) => t.id) : torneio.grupos[grupo]
  const jogos = torneio.jogos.filter((j) => (grupo === null ? j.fase === 'liga' : j.fase === 'grupo' && j.grupo === grupo))
  return classificar(times, jogos, torneio.sorteio)
}
