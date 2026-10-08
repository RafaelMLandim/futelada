import { useContext, useState } from 'react'
import type { Perfil } from '../nuvem/tipos'
import { useConta } from '../store/conta'
import { Icone } from './Icone'
import { VoltarAoInicio } from './navegacao'

/** A foto do Google (ou a inicial do nome, sem foto). */
function Foto({ perfil, tamanho }: { perfil: Perfil; tamanho: number }) {
  const nome = perfil.nome ?? perfil.email ?? ''
  const estilo = { width: tamanho, height: tamanho, borderRadius: '50%', border: '2px solid var(--amarelo)', flex: 'none', display: 'block' } as const
  if (perfil.foto) return <img src={perfil.foto} alt="" style={estilo} referrerPolicy="no-referrer" />
  return (
    <span className="num" style={{ ...estilo, display: 'grid', placeItems: 'center', background: 'var(--amarelo)', color: 'var(--navy)', fontSize: tamanho * 0.5 }}>
      {nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

// Foto de quem entrou com o Google, no topo. Tocar abre as opções: voltar ao início e sair da conta.
export function Avatar({ tamanho = 36 }: { tamanho?: number }) {
  const { perfil, logado, sair } = useConta()
  const [aberta, setAberta] = useState(false)
  const voltarAoInicio = useContext(VoltarAoInicio)
  if (!logado || !perfil) return null
  const nome = perfil.nome ?? perfil.email ?? ''
  return (
    <>
      <button aria-label={`Conta: ${nome}`} onClick={() => setAberta(true)}
        style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}>
        <Foto perfil={perfil} tamanho={tamanho} />
      </button>
      {aberta && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Opções" onClick={() => setAberta(false)}>
          <section className="panel" onClick={(ev) => ev.stopPropagation()} style={{ width: '100%', maxWidth: 360 }}>
            <div className="ph">Opções</div>
            <div className="pb" style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
              <Foto perfil={perfil} tamanho={72} />
              <div style={{ display: 'grid', gap: 2 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--navy)' }}>{perfil.nome ?? perfil.email}</div>
                {perfil.nome && perfil.email && <div className="mut">{perfil.email}</div>}
              </div>
              {voltarAoInicio && (
                <button className="btn" onClick={() => { setAberta(false); voltarAoInicio() }}><Icone nome="inicio" /> Voltar ao início</button>
              )}
              <button className="btn r sm" onClick={() => { setAberta(false); void sair() }}>Sair da conta</button>
              <button className="btn w sm" onClick={() => setAberta(false)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
