// Cronômetro na notificação e apito do fim com o app minimizado ou a tela bloqueada (só no app de loja; o
// navegador não deixa). Quando o app sai da tela, aparece a notificação com o tempo descendo (quem conta é o
// Android) e o apito fica agendado para a hora do fim. Ao voltar para o app, some tudo: lá dentro ele já
// mostra o relógio e apita. Parte nativa: android/app/src/main/java/app/doisoudez/CronometroPlugin.java.

import { App } from '@capacitor/app'
import { registerPlugin } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { nativo } from './nativo'

type PluginDoCronometro = {
  mostrar(dados: { titulo: string; texto: string; fimEm: number | null; apitar: boolean; tituloDoFim: string }): Promise<void>
  esconder(): Promise<void>
  pedirPermissao(): Promise<{ notificacoes: boolean; alarmeExato: boolean }>
}
const Cronometro = registerPlugin<PluginDoCronometro>('Cronometro')

/** O que a notificação mostra. `fimEm`: hora (ms) em que o tempo acaba, com o relógio rodando; null = pausado. */
export type PartidaNaNotificacao = {
  titulo: string // "Partida 3 · faltam" / "Intervalo"
  texto: string // "VERMELHO 1 x 0 AZUL"
  fimEm: number | null
  apitar: boolean // som ligado nos ajustes
  tituloDoFim: string // "Acabou o tempo!" / "Fim do intervalo"
}

let pediuPermissao = false

/**
 * Liga a notificação da partida enquanto `partida` não for null (null = sem partida, acabou ou só acompanhando).
 * Usado no Jogo da pelada e no Jogo do torneio.
 */
export function useCronometroNoCelular(partida: PartidaNaNotificacao | null) {
  const atual = useRef(partida)
  useEffect(() => { atual.current = partida })
  const ativa = partida !== null
  const rodando = partida?.fimEm != null

  // Pede para mostrar notificações no primeiro apito (Android 13+); quem negar segue sem.
  useEffect(() => {
    if (!nativo() || !rodando || pediuPermissao) return
    pediuPermissao = true
    void Cronometro.pedirPermissao().catch(() => null)
  }, [rodando])

  useEffect(() => {
    if (!nativo() || !ativa) return
    const aoMudar = ({ isActive }: { isActive: boolean }) => {
      const dados = atual.current
      if (isActive || !dados) return void Cronometro.esconder().catch(() => null)
      // o tempo já acabou (aviso na tela): não agenda apito no passado
      const fimEm = dados.fimEm !== null && dados.fimEm > Date.now() ? dados.fimEm : null
      void Cronometro.mostrar({ ...dados, fimEm, apitar: dados.apitar && fimEm !== null }).catch(() => null)
    }
    const ouvinte = App.addListener('appStateChange', aoMudar)
    return () => {
      void ouvinte.then((parar) => parar.remove())
      void Cronometro.esconder().catch(() => null)
    }
  }, [ativa])
}
