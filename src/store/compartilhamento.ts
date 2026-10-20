// Pelada compartilhada (PLANO.md, seção 16). Quem está no controle publica a pelada na nuvem a cada mudança;
// quem acompanha pelo link vê ao vivo. O dono pode passar o controle (link com chave) e retomar depois.

import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { novoCodigo } from '../logic/torneio'
import { obterNuvem } from '../nuvem'
import type { PeladaCompartilhada } from '../nuvem/tipos'
import type { AppState } from '../types/app'
import { enderecoDoSite } from '../utils/nativo'
import { carregar } from './armazenamento'
import type { Pelada } from './usePelada'

/** Links do compartilhamento da pelada do dono (null = quem não é o dono, ou sem nuvem: o botão de compartilhar não aparece). */
export const Compartilhamento = createContext<{ criarLinks: () => Promise<LinksDaPelada | null> } | null>(null)

export type LinksDaPelada = { acompanhar: string; controle: string }

/** Endereço do link para acompanhar a pelada (abre sem login). */
export const linkParaAcompanhar = (codigo: string) => `${enderecoDoSite()}/?ver=${codigo}`
/** Endereço do link para assumir o controle da pelada (com a chave; pede login). */
export const linkDeControle = (codigo: string, chave: string) => `${enderecoDoSite()}/?controle=${codigo}&chave=${chave}`

/** Chave do link de controle: difícil de adivinhar (só quem recebeu o link assume o controle). */
function novaChave(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15))
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 20)
}

export type Publicada = { codigo: string; app: PeladaCompartilhada['app'] }

/** Publica a pelada na nuvem (só quem está no controle consegue). */
export const publicar = (publicada: Publicada, encerrada: boolean) => void obterNuvem().then((nuvem) => nuvem?.publicarPeladaCompartilhada(
  publicada.codigo, { app: publicada.app, encerrada, atualizadaEm: Date.now() },
)).catch(() => null)

/** Ouve a pelada na nuvem e quem é este celular (para saber se ele está no controle). */
export function usePeladaNaNuvem(codigo: string | null) {
  // guarda de qual código é a resposta (trocar de código não mostra a pelada anterior)
  const [ouvida, setOuvida] = useState<{ codigo: string; dados: PeladaCompartilhada | null } | null>(null)
  const [eu, setEu] = useState<{ uid: string; nome: string | null } | null>(null)
  // quem é este celular (o nome vai para a nuvem quando compartilha ou assume o controle)
  useEffect(() => {
    let parar = () => {}
    let vivo = true
    void obterNuvem().then(async (nuvem) => {
      if (!nuvem) return
      const uid = await nuvem.usuario()
      if (vivo) parar = nuvem.ouvirPerfil((perfil) => setEu({ uid, nome: perfil?.nome ?? perfil?.email ?? null }))
    })
    return () => { vivo = false; parar() }
  }, [])
  useEffect(() => {
    if (!codigo) return
    let parar = () => {}
    let vivo = true
    void obterNuvem().then((nuvem) => {
      if (nuvem && vivo) parar = nuvem.ouvirPeladaCompartilhada(codigo, (dados) => setOuvida({ codigo, dados }), () => setOuvida({ codigo, dados: null }))
    })
    return () => { vivo = false; parar() }
  }, [codigo])
  const naNuvem = codigo && ouvida?.codigo === codigo ? ouvida.dados : undefined
  const noControle = !!naNuvem && !!eu && naNuvem.controlador === eu.uid
  return { naNuvem, eu, noControle }
}

/** Publica a pelada a cada mudança enquanto este celular está no controle (com um pequeno atraso, para juntar mudanças). */
export function usePublicar(codigo: string | null, app: Pick<AppState, 'estado' | 'crono'>, noControle: boolean) {
  // a última versão publicada: quando a pelada acaba, ela vai de novo como "encerrada"
  const ultima = useRef<Publicada | null>(null)
  /** Tira a última versão publicada (para publicar o final uma vez só). */
  const tirarUltima = useCallback(() => {
    const anterior = ultima.current
    ultima.current = null
    return anterior
  }, [])
  useEffect(() => {
    if (!codigo || !noControle) { ultima.current = null; return }
    const publicada: Publicada = { codigo, app: { estado: app.estado, crono: app.crono } }
    ultima.current = publicada
    const espera = window.setTimeout(() => publicar(publicada, false), 400)
    return () => clearTimeout(espera)
  }, [codigo, app.estado, app.crono, noControle])
  return tirarUltima
}

/** Lado do dono: cria os links, publica enquanto está no controle, retoma o controle e recebe o encerramento. */
export function useCompartilhamento(pelada: Pelada) {
  const { app, compartilhar, substituir } = pelada
  const codigo = app.compartilhada ?? null
  const { naNuvem, eu, noControle } = usePeladaNaNuvem(codigo)
  // antes de a nuvem responder (ou sem internet), o dono segue no controle
  const controlando = !naNuvem || noControle
  const tirarUltima = usePublicar(codigo, app, controlando && naNuvem !== null)

  // a pelada acabou aqui (encerrar ou cancelar zeram o app; a tela pode até fechar em seguida): publica o final
  useEffect(() => {
    const terminou = () => {
      // a pelada continua compartilhada (só fechou a tela): nada a publicar
      if (carregar()?.compartilhada) return
      const anterior = tirarUltima()
      if (anterior) publicar(anterior, true)
    }
    if (!codigo) terminou()
    return terminou
  }, [codigo]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Cria a pelada na nuvem (na primeira vez) e devolve os dois links. */
  const criarLinks = useCallback(async (): Promise<LinksDaPelada | null> => {
    const nuvem = await obterNuvem()
    if (!nuvem) return null
    let atual = codigo
    let chave = app.chaveDeControle
    if (!atual || !chave) {
      atual = novoCodigo()
      chave = novaChave()
      await nuvem.criarPeladaCompartilhada(atual, { app: { estado: app.estado, crono: app.crono }, nomeDoDono: eu?.nome ?? null }, chave)
      compartilhar(atual, chave)
    }
    return { acompanhar: linkParaAcompanhar(atual), controle: linkDeControle(atual, chave) }
  }, [codigo, app, eu, compartilhar])

  /** O dono retoma o controle: pega a pelada como está na nuvem (o que o outro celular marcou). */
  const retomar = useCallback(async () => {
    const nuvem = await obterNuvem()
    if (!nuvem || !codigo || !naNuvem) return false
    const conseguiu = await nuvem.assumirControleDaPelada(codigo, null, eu?.nome ?? null)
    if (conseguiu) substituir(naNuvem.app)
    return conseguiu
  }, [codigo, naNuvem, eu, substituir])

  return { codigo, criarLinks, naNuvem, controlando, retomar }
}
