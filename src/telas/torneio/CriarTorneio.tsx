import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Icone } from '../../components/Icone'
import { novoTorneio, regrasPadrao } from '../../logic/torneio'
import type { RegrasTorneio, Torneio } from '../../types/torneio'
import { dataHoje, maiusculas } from '../../utils/formatar'
import { RegrasForm } from './RegrasForm'

// Primeira tela do torneio: nome e regras.
export function CriarTorneio({ onCriar, onEntrar }: {
  onCriar: (t: Torneio) => void; onEntrar?: (codigo: string) => Promise<boolean>
}) {
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const entrar = async () => {
    setEntrando(true)
    const ok = await onEntrar!(codigo).catch(() => false)
    setEntrando(false)
    if (!ok) setErro('Código não encontrado. Confira com o organizador (e a internet).')
  }
  const [regras, setRegras] = useState<RegrasTorneio>(regrasPadrao)

  return (
    <div className="scr" style={{ height: '100dvh' }}>
      <Barra titulo="Novo torneio" sub={dataHoje()} />
      <div className="conteudo">
        {onEntrar && (
          <section className="panel">
            <div className="ph">Vai marcar jogos de um torneio?</div>
            <div className="pb" style={{ display: 'grid', gap: 8 }}>
              <div className="mut" style={{ color: 'var(--navy)' }}>Entre com o código que o organizador passou.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ display: 'flex', flex: 1, minWidth: 0 }}>
                  <span className="vh">Código do torneio</span>
                  <input className="inp num" placeholder="CÓDIGO" value={codigo} maxLength={6} autoCapitalize="characters"
                    style={{ letterSpacing: 4, fontSize: 22, width: '100%', minWidth: 0 }} onChange={(ev) => { setCodigo(ev.target.value.toUpperCase()); setErro(null) }} />
                </label>
                <button className="btn sm" style={{ width: 'auto', flex: 'none' }} disabled={codigo.trim().length < 6 || entrando} onClick={entrar}>
                  {entrando ? '…' : 'Entrar'}
                </button>
              </div>
              {erro && <div className="mut" style={{ color: 'var(--vermelho)', fontWeight: 600 }}>{erro}</div>}
            </div>
          </section>
        )}
        <section className="panel">
          <div className="ph">{onEntrar ? 'Ou crie um torneio' : 'Nome do torneio'}</div>
          <div className="pb" style={{ display: 'flex' }}>
            <label style={{ display: 'flex', flex: 1 }}>
              <span className="vh">Nome do torneio</span>
              <input className="inp" placeholder="Ex.: Copa da Firma" value={nome} autoCapitalize="characters"
                onChange={(ev) => setNome(maiusculas(ev.target.value))} />
            </label>
          </div>
        </section>
        <RegrasForm regras={regras} mudar={(p) => setRegras((r) => ({ ...r, ...p }))} />
        {/* no fim das regras (não flutua por cima); o início fica no menu da foto */}
        <button className="btn" style={{ flex: 'none' }} disabled={!nome.trim()} onClick={() => onCriar(novoTorneio(nome, regras))}>
          Cadastrar times <Icone nome="seta" />
        </button>
      </div>
    </div>
  )
}
