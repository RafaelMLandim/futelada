import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** QR Code (ex.: do Pix copia e cola). */
export function QrCode({ texto, tamanho = 220 }: { texto: string; tamanho?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    QRCode.toDataURL(texto, { width: tamanho * 2, margin: 1, color: { dark: '#10223A', light: '#ffffff' } })
      .then((url) => { if (ativo) setSrc(url) })
      .catch(() => setSrc(null))
    return () => { ativo = false }
  }, [texto, tamanho])
  return src
    ? <img src={src} width={tamanho} height={tamanho} alt="QR Code do Pix" style={{ display: 'block', borderRadius: 8, border: '3px solid var(--borda)' }} />
    : <div style={{ width: tamanho, height: tamanho, background: '#eee', borderRadius: 8 }} />
}
