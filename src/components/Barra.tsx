import { useContext, useState, type ReactNode } from 'react'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { StatusDaBarra } from './navegacao'
import { useSomenteLeitura } from '../utils/somenteLeitura'
import { useBotaoDaMusica } from '../utils/musica'
import { Icone } from './Icone'

// Barra de título no topo de cada tela: a logo à esquerda do título e, à direita, a foto de quem entrou
// (tocar na foto abre "Voltar ao início" e "Sair da conta"). Quem só acompanha a pelada não tem a foto.
export function Barra({ titulo, sub, direita }: { titulo: ReactNode; sub?: ReactNode; direita?: ReactNode }) {
  const somenteLeitura = useSomenteLeitura()
  const status = useContext(StatusDaBarra)
  return (
    <header className="bar">
      <Logo fundo={false} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="h1">{titulo}</h1>
        {sub && <p className="bsub">{sub}</p>}
      </div>
      <div className="row" style={{ gap: 10, flex: 'none' }}>
        {status && <div className="bstatus" role="status">{status}</div>}
        {direita}
        <BotaoDaMusica />
        {!somenteLeitura && <Avatar />}
      </div>
    </header>
  )
}

/** A música de fundo (só aparece nas telas que têm música): abre o volume e o silenciar. */
export function BotaoDaMusica() {
  const musica = useBotaoDaMusica()
  const [aberto, setAberto] = useState(false)
  if (!musica.visivel) return null
  return (
    <>
      <button className="ib" style={{ width: 38, height: 38 }} aria-label="Música de fundo" onClick={() => setAberto(true)}>
        <Icone nome={musica.mudo ? 'mudo' : 'som'} tamanho={20} />
      </button>
      {aberto && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Música de fundo" onClick={() => setAberto(false)}>
          <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }} onClick={(ev) => ev.stopPropagation()}>
            <div className="ph">Música de fundo</div>
            <div className="pb" style={{ display: 'grid', gap: 12 }}>
              <label className="row" style={{ gap: 10 }}>
                <Icone nome="mudo" tamanho={20} />
                <input type="range" min={0} max={100} step={5} value={musica.mudo ? 0 : musica.volume} aria-label="Volume da música"
                  style={{ flex: 1, accentColor: 'var(--navy)' }} onChange={(ev) => musica.mudarVolume(Number(ev.target.value))} />
                <Icone nome="som" tamanho={20} />
              </label>
              <span className="mut" style={{ textAlign: 'center' }}>{musica.mudo ? 'Sem música' : `Volume ${musica.volume}%`}</span>
              <div className="opcoes-lado-a-lado">
                <button className={'btn sm' + (musica.mudo ? '' : ' w')} onClick={musica.alternar}>{musica.mudo ? 'Ligar' : 'Silenciar'}</button>
                <button className="btn w sm" onClick={() => setAberto(false)}>Fechar</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
