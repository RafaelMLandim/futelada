// Botão "voltar" do celular: sem isso o app (PWA) fecha, porque troca de tela sem criar histórico.
// Cada passo que dá para desfazer (tela, aba, janela aberta) entra numa pilha e ganha uma entrada
// no histórico do navegador; o "voltar" desfaz o último. No início, sem nada na pilha, o app fecha.

import { useEffect, useRef } from 'react'

type Passo = { voltar: () => void; desfeito: boolean }
const pilha: Passo[] = []
let ignorarVoltas = 0 // "voltas" que o próprio app pediu (não são do botão)
let pendentes = 0 // entradas do histórico a remover (passos fechados pela tela, não pelo botão)

function removerEntradas() {
  pendentes++
  if (pendentes > 1) return
  setTimeout(() => {
    const n = pendentes
    pendentes = 0
    if (n > 0) { ignorarVoltas++; history.go(-n) }
  }, 0)
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorarVoltas > 0) { ignorarVoltas--; return }
    const passo = pilha.pop()
    if (!passo) return
    passo.desfeito = true
    passo.voltar()
  })
}

/** Registra um passo que o "voltar" desfaz. Devolve a função para tirar (quando a tela fecha o passo sozinha). */
export function registrarVoltar(voltar: () => void): () => void {
  const passo: Passo = { voltar, desfeito: false }
  pilha.push(passo)
  // se uma entrada ia ser removida agora (fechou uma janela e abriu outra), aproveita ela
  if (pendentes > 0) pendentes--
  else history.pushState({ doisOuDez: pilha.length }, '')
  return () => {
    if (passo.desfeito) return
    passo.desfeito = true
    const i = pilha.indexOf(passo)
    if (i >= 0) pilha.splice(i, 1)
    removerEntradas()
  }
}

/** Enquanto `ativo`, o "voltar" do celular chama `aoVoltar` (em vez de fechar o app). */
export function useVoltar(ativo: boolean, aoVoltar: () => void) {
  const ref = useRef(aoVoltar)
  useEffect(() => { ref.current = aoVoltar })
  useEffect(() => {
    if (!ativo) return
    return registrarVoltar(() => ref.current())
  }, [ativo])
}

/**
 * Janelas (.modal) também fecham com o "voltar": quando uma aparece, entra na pilha; o "voltar"
 * toca no fundo escuro (que fecha a janela). Se ela não fechar assim, continua na pilha.
 */
export function voltarFechaJanelas() {
  const abertas = new Map<Element, () => void>()
  const registrar = (el: Element) => {
    abertas.set(el, registrarVoltar(() => {
      ;(el as HTMLElement).click()
      setTimeout(() => { if (el.isConnected) registrar(el) }, 50)
    }))
  }
  const conferir = () => {
    const agora = new Set(document.querySelectorAll('.modal'))
    for (const [el, tirar] of abertas) if (!agora.has(el)) { abertas.delete(el); tirar() }
    for (const el of agora) if (!abertas.has(el)) registrar(el)
  }
  new MutationObserver(conferir).observe(document.body, { childList: true, subtree: true })
}
