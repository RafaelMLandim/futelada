import { useState } from 'react'
import { Barra } from '../../components/Barra'
import { Icone } from '../../components/Icone'
import { abrirTorneio, guardarTorneioAberto, listaDeTorneios } from '../../store/torneio'

// Pré-tela "Torneios": todos os torneios deste celular (o aberto por último em cima) e o botão de criar outro.
// Escolher um abre ele; "Novo torneio" guarda o aberto na lista e vai para a criação (ou para entrar com um código).
export function EscolherTorneio({ onAbrir, onVoltar }: { onAbrir: () => void; onVoltar: () => void }) {
  const [torneios] = useState(listaDeTorneios)
  const abrir = (id: string) => { abrirTorneio(id); onAbrir() }
  const novo = () => { guardarTorneioAberto(); onAbrir() }
  return (
    <div className="scr" style={{ height: 'var(--altura-tela)' }}>
      <Barra titulo="Torneios" sub={torneios.length === 1 ? '1 torneio neste celular' : `${torneios.length} torneios neste celular`} />
      <div className="conteudo">
        <section className="panel">
          <div className="ph">Escolha o torneio</div>
          {torneios.map((torneio) => (
            <button key={torneio.id} className="tr" onClick={() => abrir(torneio.id)}
              style={{ width: '100%', border: 0, minHeight: 60, padding: '8px 12px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'var(--navy)' }}>
              <Icone nome="trofeu" tamanho={24} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="num" style={{ display: 'block', fontSize: 20, lineHeight: 1.1, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{torneio.nome}</span>
                <span className="mut" style={{ display: 'block', fontSize: 13 }}>
                  {torneio.campeao ? `🏆 ${torneio.campeao}` : 'Em andamento'}{torneio.codigo ? ` · compartilhado · ${torneio.codigo}` : ''}
                </span>
              </span>
              <span className={'tag' + (torneio.aberto ? ' t-y' : '')} style={{ height: 30, fontSize: 16, flex: 'none', border: torneio.aberto ? undefined : '2px solid var(--borda)' }}>
                {torneio.aberto ? 'Continuar' : 'Abrir'} →
              </span>
            </button>
          ))}
        </section>
        <button className="btn" onClick={novo}><Icone nome="mais" /> Novo torneio</button>
        <div className="mut" style={{ color: '#fff', textAlign: 'center' }}>
          Os outros continuam guardados. Torneio compartilhado segue na nuvem com os mesários.
        </div>
        <button className="btn w sm" onClick={onVoltar}>Voltar ao início</button>
      </div>
    </div>
  )
}
