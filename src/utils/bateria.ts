// Bateria do celular (para avisar que vai descarregar e sugerir passar o controle da pelada).
// No app de loja vem do Capacitor (Android e iPhone); no navegador, só o Chrome informa (o Safari não).

import { useEffect, useState } from 'react'
import { nativo } from './nativo'

/** Abaixo disso (e fora da tomada), a bateria está fraca. */
export const BATERIA_FRACA = 0.15

type EstadoDaBateria = { nivel: number; carregando: boolean }

type BateriaDoNavegador = EventTarget & { level: number; charging: boolean }

/** true quando a bateria está em 15% ou menos e o celular não está carregando (sem como saber: false). */
export function useBateriaFraca(): boolean {
  const [estado, setEstado] = useState<EstadoDaBateria | null>(null)
  useEffect(() => {
    let vivo = true
    let parar = () => {}
    if (nativo()) {
      const ler = () => void import('@capacitor/device')
        .then(({ Device }) => Device.getBatteryInfo())
        .then((info) => { if (vivo && info.batteryLevel !== undefined) setEstado({ nivel: info.batteryLevel, carregando: info.isCharging ?? false }) })
        .catch(() => null)
      ler()
      const intervalo = window.setInterval(ler, 60_000)
      document.addEventListener('visibilitychange', ler)
      parar = () => { window.clearInterval(intervalo); document.removeEventListener('visibilitychange', ler) }
    } else {
      const pedir = (navigator as Navigator & { getBattery?: () => Promise<BateriaDoNavegador> }).getBattery
      if (pedir) {
        void pedir.call(navigator).then((bateria) => {
          if (!vivo) return
          const atualizar = () => setEstado({ nivel: bateria.level, carregando: bateria.charging })
          atualizar()
          bateria.addEventListener('levelchange', atualizar)
          bateria.addEventListener('chargingchange', atualizar)
          parar = () => { bateria.removeEventListener('levelchange', atualizar); bateria.removeEventListener('chargingchange', atualizar) }
        }).catch(() => null)
      }
    }
    return () => { vivo = false; parar() }
  }, [])
  return estado !== null && !estado.carregando && estado.nivel <= BATERIA_FRACA
}
