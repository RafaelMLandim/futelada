// Bolão (PLANO.md, seção 23): "Meus bolões", o torneio ao vivo, os palpites e o ranking. Tudo vem da nuvem: o torneio
// compartilhado (o mesmo que o organizador marca) e os palpites de cada um, que as regras fecham quando o jogo começa.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  juntar, palpiteDoJogoFechado, palpiteDoTorneioFechado, rankingDoBolao, respostasDoTorneio,
  type PalpiteDoJogo, type PalpiteDoTorneio, type ParticipanteDoBolao,
} from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { BolaoDoUsuario } from '../nuvem/tipos'
import type { Torneio } from '../types/torneio'
import { enderecoDoSite } from '../utils/nativo'

/** Link do bolão para o grupo: abre o app (ou o site) direto nos palpites daquele torneio. */
export const linkDoBolao = (codigo: string) => `${enderecoDoSite()}/?bolao=${codigo}`

/** Tira o código de um link colado ("…/?bolao=ABC123") ou do próprio código digitado. */
export function codigoDoBolao(texto: string): string | null {
  const limpo = texto.trim()
  const doLink = /[?&](?:bolao|entrar|ver)=([A-Za-z0-9]+)/.exec(limpo)?.[1]
  const codigo = limparCodigoDoBolao(doLink ?? limpo)
  return codigo.length >= 4 ? codigo : null
}

/** Os bolões de quem está logado (null = carregando). */
export function useMeusBoloes(): BolaoDoUsuario[] | null {
  const [boloes, setBoloes] = useState<BolaoDoUsuario[] | null>(null)
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    const conferidos = new Set<string>()
    void obterNuvem().then((nuvem) => {
      if (!nuvem) return setBoloes([])
      if (!ativo) return
      parar = nuvem.ouvirMeusBoloes((lista) => {
        setBoloes(lista)
        // torneio apagado pelo organizador: o bolão que não terminou sai da lista (só se a nuvem responder que não
        // existe; sem internet, fica). O encerrado fica: guarda a colocação final (o resumo está no histórico de torneios).
        for (const bolao of lista) {
          if (conferidos.has(bolao.id) || bolao.encerrado) continue
          conferidos.add(bolao.id)
          void nuvem.existe(bolao.id).then((existe) => { if (!existe) return nuvem.esquecerBolao(bolao.id) }).catch(() => null)
        }
      })
    })
    return () => { ativo = false; parar() }
  }, [])
  return boloes
}

/** Entra no bolão: confere que o torneio existe e guarda. Devolve o nome do torneio (null = não existe). */
export async function entrarNoBolao(digitado: string, nome: string): Promise<{ codigo: string; nome: string } | null> {
  const nuvem = await obterNuvem()
  if (!nuvem) throw new Error('sem nuvem')
  // o código escolhido pelo organizador ("COPAVILA") leva ao código do torneio
  const codigo = await nuvem.torneioDoCodigo(digitado)
  const torneio = await new Promise<Torneio | null>((resolver) => {
    let parar = () => {}
    parar = nuvem.ouvir(codigo, (dados) => { parar(); resolver(juntar(dados)) }, () => resolver(null))
  })
  if (!torneio) return null
  await nuvem.entrarNoBolao(codigo, torneio.nome, nome)
  return { codigo, nome: torneio.nome }
}

/** Código do bolão: de 4 a 12 letras e números, sem acento nem espaço ("Copa Vila" → "COPAVILA"). */
export const limparCodigoDoBolao = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)

/** O organizador escolhe o código do bolão. 'em-uso' = outro torneio já tem. */
export async function trocarCodigoDoBolao(torneio: string, novo: string | null, antigo: string | null): Promise<'ok' | 'em-uso' | 'falhou'> {
  const nuvem = await obterNuvem()
  if (!nuvem) return 'falhou'
  try {
    return (await nuvem.trocarCodigoDoBolao(torneio, novo, antigo)) ? 'ok' : 'em-uso'
  } catch {
    return 'falhou'
  }
}

export type EstadoDoTorneio = Torneio | 'carregando' | 'nao-encontrado'

/** O torneio ao vivo (o mesmo que o organizador e os mesários marcam). */
function useTorneioDaNuvem(codigo: string): EstadoDoTorneio {
  const [torneio, setTorneio] = useState<EstadoDoTorneio>('carregando')
  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((nuvem) => {
      if (!nuvem || !ativo) return setTorneio('nao-encontrado')
      parar = nuvem.ouvir(codigo, (dados) => setTorneio(juntar(dados) ?? 'nao-encontrado'), () => setTorneio('nao-encontrado'))
    })
    return () => { ativo = false; parar() }
  }, [codigo])
  return torneio
}

/**
 * O bolão de um torneio: o torneio, quem entrou, os meus palpites (os de jogos que não começaram só eu vejo) e os de
 * todos nos jogos que já começaram (para o ranking e as porcentagens).
 */
export function useBolao(codigo: string, eu: string | null) {
  const torneio = useTorneioDaNuvem(codigo)
  const carregado = typeof torneio === 'object' ? torneio : null
  const [participantes, setParticipantes] = useState<ParticipanteDoBolao[]>([])
  const [meus, setMeus] = useState<Record<string, PalpiteDoJogo> | null>(null)
  const [meuDoTorneio, setMeuDoTorneio] = useState<PalpiteDoTorneio | null>(null)
  const [deTodos, setDeTodos] = useState<Record<string, Record<string, PalpiteDoJogo>>>({})
  const [doTorneioDeTodos, setDoTorneioDeTodos] = useState<Record<string, PalpiteDoTorneio>>({})

  useEffect(() => {
    let parar = () => {}
    let ativo = true
    void obterNuvem().then((nuvem) => { if (nuvem && ativo) parar = nuvem.ouvirParticipantesDoBolao(codigo, setParticipantes) })
    return () => { ativo = false; parar() }
  }, [codigo])

  // os meus palpites: lidos uma vez (só eu mudo, e a tela já guarda o que eu salvei)
  const idsDosJogos = carregado?.jogos.map((jogo) => jogo.id).join(',') ?? ''
  useEffect(() => {
    if (!idsDosJogos || !eu) return
    let ativo = true
    void obterNuvem().then((nuvem) => nuvem?.meusPalpites(codigo, idsDosJogos.split(','))).then((lidos) => {
      if (!ativo || !lidos) return
      setMeus(lidos.jogos)
      setMeuDoTorneio(lidos.torneio)
    }).catch(() => { if (ativo) setMeus({}) })
    return () => { ativo = false }
  }, [codigo, idsDosJogos, eu])

  // os de todos, jogo a jogo, assim que cada um começa (antes as regras não deixam ler)
  const comecados = carregado ? carregado.jogos.filter((jogo) => palpiteDoJogoFechado(carregado, jogo.id)).map((jogo) => jogo.id).join(',') : ''
  useEffect(() => {
    if (!comecados) return
    const paradas: (() => void)[] = []
    let ativo = true
    void obterNuvem().then((nuvem) => {
      if (!nuvem || !ativo) return
      for (const jogo of comecados.split(',')) {
        // o jogo acabou de começar: a regra pode ainda não ter visto (tenta de novo em instantes)
        const ouvir = (tentativa: number) => {
          paradas.push(nuvem.ouvirPalpitesDoJogo(codigo, jogo, (palpites) => setDeTodos((antes) => ({ ...antes, [jogo]: palpites })),
            () => { if (ativo && tentativa < 5) setTimeout(() => ouvir(tentativa + 1), 3000) }))
        }
        ouvir(0)
      }
    })
    return () => { ativo = false; paradas.forEach((parar) => parar()) }
  }, [codigo, comecados])

  // os palpites do torneio de todos, depois que o 1º jogo começa (o servidor fecha em instantes)
  const torneioFechado = carregado ? palpiteDoTorneioFechado(carregado) : false
  useEffect(() => {
    if (!torneioFechado) return
    let parar = () => {}
    let ativo = true
    let espera: ReturnType<typeof setTimeout> | undefined
    void obterNuvem().then((nuvem) => {
      const ouvir = (tentativa: number) => {
        if (!nuvem || !ativo) return
        parar = nuvem.ouvirPalpitesDoTorneio(codigo, setDoTorneioDeTodos, () => { if (ativo && tentativa < 10) espera = setTimeout(() => ouvir(tentativa + 1), 3000) })
      }
      ouvir(0)
    })
    return () => { ativo = false; clearTimeout(espera); parar() }
  }, [codigo, torneioFechado])

  const salvarPalpite = useCallback(async (jogo: string, palpite: PalpiteDoJogo | null) => {
    const nuvem = await obterNuvem()
    if (!nuvem) throw new Error('sem nuvem')
    await nuvem.salvarPalpite(codigo, jogo, palpite)
    setMeus((antes) => {
      const novos = { ...(antes ?? {}) }
      if (palpite) novos[jogo] = palpite
      else delete novos[jogo]
      return novos
    })
  }, [codigo])

  const salvarPalpiteDoTorneio = useCallback(async (palpite: PalpiteDoTorneio) => {
    const nuvem = await obterNuvem()
    if (!nuvem) throw new Error('sem nuvem')
    await nuvem.salvarPalpiteDoTorneio(codigo, palpite)
    setMeuDoTorneio(palpite)
  }, [codigo])

  // os meus contam no ranking mesmo antes de a lista de todos chegar
  const palpitesDosJogos = useMemo(() => {
    const juntos: Record<string, Record<string, PalpiteDoJogo>> = { ...deTodos }
    if (eu && meus) for (const [jogo, palpite] of Object.entries(meus)) if (carregado && palpiteDoJogoFechado(carregado, jogo)) juntos[jogo] = { ...juntos[jogo], [eu]: palpite }
    return juntos
  }, [deTodos, meus, eu, carregado])
  const palpitesDoTorneio = useMemo(() => (eu && meuDoTorneio ? { ...doTorneioDeTodos, [eu]: meuDoTorneio } : doTorneioDeTodos), [doTorneioDeTodos, eu, meuDoTorneio])
  const ranking = useMemo(() => (carregado ? rankingDoBolao(carregado, participantes, palpitesDoTorneio, palpitesDosJogos) : []), [carregado, participantes, palpitesDoTorneio, palpitesDosJogos])

  // a lista "Meus bolões" mostra a colocação da última vez que abriu
  const minha = ranking.find((linha) => linha.uid === eu)
  const encerrado = carregado ? respostasDoTorneio(carregado) !== null : false
  useEffect(() => {
    if (!minha || !carregado) return
    void obterNuvem().then((nuvem) => nuvem?.lembrarBolao(codigo, {
      posicao: minha.posicao, pontos: minha.pontos, participantes: ranking.length, encerrado, nomeDoTorneio: carregado.nome,
    })).catch(() => null)
  }, [codigo, minha?.posicao, minha?.pontos, ranking.length, encerrado, carregado?.nome]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    torneio, participantes, meus, meuDoTorneio, palpitesDosJogos, palpitesDoTorneio, ranking, minha, encerrado,
    salvarPalpite, salvarPalpiteDoTorneio,
  }
}

export type BolaoHook = ReturnType<typeof useBolao>
