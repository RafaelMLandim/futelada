// Camisa (colete) na cor indicada. No torneio, o time pode ter um uniforme de duas cores: um modelo (listras,
// faixa, meio a meio…) e a segunda cor, desenhados dentro da camisa.

import { useId } from 'react'
import type { Uniforme } from '../types/torneio'

const FORMA = 'M8 3L3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-.6 1.5-2.1 2.4-4 2.4S8.6 4.5 8 3z'

/** O desenho do modelo, na segunda cor (é recortado no formato da camisa). */
function detalhe(uniforme: Uniforme) {
  const cor = uniforme.segunda
  switch (uniforme.modelo) {
    case 'horizontais': return [4, 8, 12, 16, 20].map((y) => <rect key={y} x="0" y={y} width="24" height="2" fill={cor} />)
    // simétricas: uma no meio e o mesmo número de cada lado
    case 'verticais': return [-3, -2, -1, 0, 1, 2, 3].map((passo) => <rect key={passo} x={12 + passo * 3.2 - 0.8} y="0" width="1.6" height="24" fill={cor} />)
    case 'faixaHorizontal': return <rect x="0" y="11.6" width="24" height="3.2" fill={cor} />
    case 'diagonal': return <path d="M6 2 L9.5 2 L19 21 L15.5 21 Z" fill={cor} />
    case 'diagonalInvertida': return <path d="M18 2 L14.5 2 L5 21 L8.5 21 Z" fill={cor} />
    case 'meioAMeio': return <rect x="12" y="0" width="12" height="24" fill={cor} />
    case 'faixaVertical': return <rect x="10.4" y="0" width="3.2" height="24" fill={cor} />
    case 'mangas': return <path d="M0 0 H7.4 V24 H0 Z M16.6 0 H24 V24 H16.6 Z" fill={cor} />
    case 'faixaEmV': return <path d="M0 6 L12 10.4 L24 6 L24 8.6 L12 13 L0 8.6 Z" fill={cor} />
    case 'metadeEmCima': return <rect x="0" y="12" width="24" height="12" fill={cor} />
    case 'xadrez': return Array.from({ length: 64 }, (_, indice) => [Math.floor(indice / 8), indice % 8] as const)
      .filter(([linha, coluna]) => (linha + coluna) % 2).map(([linha, coluna]) => <rect key={`${linha}-${coluna}`} x={coluna * 3} y={linha * 3} width="3" height="3" fill={cor} />)
    case 'duasFaixas': return <><rect x="0" y="10" width="24" height="2" fill={cor} /><rect x="0" y="13.6" width="24" height="2" fill={cor} /></>
    case 'ombros': return <path d="M0 0 H24 V8.2 L12 5.6 L0 8.2 Z" fill={cor} />
    case 'duasFaixasVerticais': return <><rect x="7" y="0" width="2.2" height="24" fill={cor} /><rect x="14.8" y="0" width="2.2" height="24" fill={cor} /></>
    default: return null
  }
}

export function Camisa({ cor, tamanho = 22, contorno = '#0B1A2C', uniforme }: { cor: string; tamanho?: number; contorno?: string; uniforme?: Uniforme }) {
  // o id do recorte só com letras e números (o do React traz sinais que alguns navegadores não aceitam em url(#…))
  const recorte = `camisa${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const desenho = uniforme && uniforme.modelo !== 'lisa' ? detalhe(uniforme) : null
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      {desenho && <defs><clipPath id={recorte}><path d={FORMA} /></clipPath></defs>}
      <path d={FORMA} fill={cor} />
      {desenho && <g clipPath={`url(#${recorte})`}>{desenho}</g>}
      <path d={FORMA} fill="none" stroke={contorno} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/** Uma troca de modelo em andamento: o desenho que sai e para que lado (1 = o novo vem da direita). */
export type TrocaDeModelo = { anterior: Uniforme | undefined; direcao: 1 | -1; numero: number }

/**
 * Camisa grande do editor de uniforme. Ao trocar de modelo, o desenho antigo sai deslizando de dentro da camisa
 * e o novo entra no lugar (a camisa e o contorno ficam parados; só o desenho anda).
 */
export function CamisaQueTroca({ cor, uniforme, troca, tamanho }: { cor: string; uniforme: Uniforme | undefined; troca: TrocaDeModelo | null; tamanho: number }) {
  const recorte = `camisa${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const desenhoDe = (qual: Uniforme | undefined) => (qual && qual.modelo !== 'lisa' ? detalhe(qual) : null)
  const lado = troca?.direcao === -1 ? 'esquerda' : 'direita'
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none', overflow: 'visible' }}>
      <defs><clipPath id={recorte}><path d={FORMA} /></clipPath></defs>
      <path d={FORMA} fill={cor} style={{ transition: 'fill .25s' }} />
      <g clipPath={`url(#${recorte})`}>
        {troca && <g key={`sai${troca.numero}`} className={`desenho-sai-pela-${lado === 'direita' ? 'esquerda' : 'direita'}`}>{desenhoDe(troca.anterior)}</g>}
        <g key={`entra${troca?.numero ?? 0}`} className={troca ? `desenho-entra-pela-${lado}` : undefined}>{desenhoDe(uniforme)}</g>
      </g>
      <path d={FORMA} fill="none" stroke="#0B1A2C" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  )
}
