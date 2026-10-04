// Marca de quem subiu de time na última movimentação: "↑ T1" (veio do Time 1).
export function Subiu({ de }: { de: number | null }) {
  if (de === null) return null
  return (
    <span className="tag t-ok" style={{ height: 20, fontSize: 13, padding: '0 6px', flex: 'none' }}
      title={`Subiu do Time ${de}`} aria-label={`subiu do Time ${de}`}>
      ↑ T{de}
    </span>
  )
}
