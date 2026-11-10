// Ícones de traço usados no app.

const PATHS = {
  lista: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  bola: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5l4 2.9-1.5 4.6h-5L8 10.4z" /><path d="M12 3v4.5M16 10.4l4.4-1.6M14.5 15l2.7 3.8M9.5 15l-2.7 3.8M8 10.4L3.6 8.8" /></>,
  tabela: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M3 14.5h18M9 9v11" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  denunciar: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></>,
  menos: <path d="M5 12h14" />,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  saiu: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5 1.6 0 3 .5 4.2 1.4" /><path d="M16 17h6" /></>,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  pausa: <path d="M9 5v14M15 5v14" />,
  play: <path d="M7 4l13 8-13 8z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h0" /></>,
  lixo: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  times: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.8 3 2.6 3.5 5.2" /></>,
  trofeu: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></>,
  inicio: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  desfazer: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  editar: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  compartilhar: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5" /></>,
  carteira: <><path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1z" /><path d="M4 7l11-3v3" /><path d="M16 13h4" /></>,
  luva: <><path d="M7 18V10a1.5 1.5 0 0 1 3 0V6.5a1.5 1.5 0 0 1 3 0V6a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1 3 0v6c0 2.6-1.8 4.5-4.3 4.5z" /><path d="M7 14l-2-2a1.5 1.5 0 0 0-2.2 2.1L7 18.5" /><path d="M6.5 18h10.2v3H6.5z" /></>,
  opcoes: <><circle cx="12" cy="5" r=".8" /><circle cx="12" cy="12" r=".8" /><circle cx="12" cy="19" r=".8" /></>,
  certo: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  som: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mudo: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  sorteio: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.3" /><circle cx="16" cy="16" r="1.3" /><circle cx="12" cy="12" r="1.3" /></>,
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
