// Ícones de traço usados no app.

const PATHS = {
  lista: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  bola: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5l4 2.9-1.5 4.6h-5L8 10.4z" /><path d="M12 3v4.5M16 10.4l4.4-1.6M14.5 15l2.7 3.8M9.5 15l-2.7 3.8M8 10.4L3.6 8.8" /></>,
  tabela: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M3 14.5h18M9 9v11" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  ajustes: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  saiu: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5 1.6 0 3 .5 4.2 1.4" /><path d="M16 17h6" /></>,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  pausa: <path d="M9 5v14M15 5v14" />,
  play: <path d="M7 4l13 8-13 8z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h0" /></>,
  lixo: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  desfazer: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
}

export type NomeIcone = keyof typeof PATHS

export function Icone({ nome, tamanho = 22 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[nome]}
    </svg>
  )
}
