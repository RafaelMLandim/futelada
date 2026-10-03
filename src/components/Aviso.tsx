import type { ReactNode } from 'react'

// Pop-up de aviso com um botão para fechar.
export function Aviso({ titulo, children, onFechar }: { titulo: string; children: ReactNode; onFechar: () => void }) {
  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">{titulo}</div>
        <div className="pb" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>{children}</div>
        <div className="pb" style={{ paddingTop: 0 }}>
          <button className="btn" autoFocus onClick={onFechar}>Entendi</button>
        </div>
      </section>
    </div>
  )
}
