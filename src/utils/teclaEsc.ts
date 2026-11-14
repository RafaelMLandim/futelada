// Tecla Esc fecha a janela (modal) que está por cima, do mesmo jeito que tocar fora dela.
// As janelas do app fecham com um toque no fundo escuro (o onClick do .modal); o Esc faz esse mesmo toque.
// Janela que não fecha tocando fora (pênaltis, empate, ajustar a foto) também não fecha com Esc; numa confirmação, Esc cancela.

import { useEffect } from 'react'

export function useFecharJanelaComEsc() {
  useEffect(() => {
    const aoApertar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape' || evento.isComposing || evento.defaultPrevented) return
      const janelas = document.querySelectorAll<HTMLElement>('.modal')
      const deCima = janelas[janelas.length - 1]
      if (!deCima) return
      evento.preventDefault()
      deCima.click() // o clique cai no próprio fundo da janela (não no painel), como o toque fora
    }
    document.addEventListener('keydown', aoApertar)
    return () => document.removeEventListener('keydown', aoApertar)
  }, [])
}
