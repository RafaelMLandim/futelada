import { useId, useState } from 'react'
import { numerosDaCarta, type Conquista, type NivelDaCarta, type NivelDaConquista } from '../logic/carta'
import { CartaDoJogador } from './CartaDoJogador'
import { ICONES_DAS_CONQUISTAS } from './iconesDasConquistas'

const NOME_DO_NIVEL = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' }
const NIVEIS_DA_INSIGNIA: NivelDaConquista[] = ['bronze', 'prata', 'ouro']
// a carta em cada nível, com os pontos que ela pede
const NIVEIS_DA_CARTA: [NivelDaCarta, string, string][] = [
  ['bronze', 'Bronze', '0 a 5'], ['prata', 'Prata', '6 a 11'], ['ouro', 'Ouro', '12 a 15'], ['diamante', 'Diamante', '16 a 18'],
  ['lendaria', 'Lendária', '18 e 8 no ouro'],
]
// números só para a miniatura da legenda
const NUMEROS_DE_EXEMPLO = { ...numerosDaCarta([]), jogos: 21, vitorias: 12, gols: 16, assistencias: 9, empates: 3, peladas: 3, aproveitamento: 62 }
// metal da haste e do contorno: claro, meio e escuro
const METAIS: Record<NivelDaConquista, [string, string, string]> = {
  bronze: ['#f3cfa9', '#b8743c', '#6e3f1c'],
  prata: ['#ffffff', '#b7c3cf', '#66747f'],
  ouro: ['#fff4b0', '#f0bd28', '#94690a'],
}
// cada conquista tem a sua flâmula: cor do pano e cor do ícone
const CORES: Record<string, [string, string]> = {
  artilheiro: ['#1a5e2a', '#ffffff'], garcom: ['#1e5fbf', '#ffffff'], vencedor: ['#10223a', '#ffd23f'], assiduo: ['#6a3fb5', '#ffffff'],
  'dia-inspirado': ['#c8352b', '#ffd23f'], rodado: ['#0f7c8a', '#ffffff'], aproveitamento: ['#3d4a57', '#7ee08f'], muralha: ['#10223a', '#c9d4e3'],
  paredao: ['#d9730d', '#ffffff'], 'rei-do-camarote': ['#7a1f3d', '#ffd23f'], 'artilheiro-do-dia': ['#0b6b4f', '#ffd23f'], imortal: ['#2b2f77', '#ffd23f'],
  'luva-de-ouro': ['#5b3a0e', '#ffd23f'], 'pe-de-anjo': ['#2f8fd1', '#ffffff'], 'pe-trocado': ['#5a1a14', '#ff9d8f'], lenda: ['#0c1016', '#f5d77a'],
}

/** A flâmula: o prata ganha listra e 2 franjas; o ouro, listra dupla e 4 franjas. Sem nível, fica apagada. */
function Flamula({ id, nivel }: { id: string; nivel: NivelDaConquista | null }) {
  const unico = useId()
  const [claro, meio, escuro] = nivel ? METAIS[nivel] : ['#eef0e8', '#cdd2c4', '#a8aea0']
  const [pano, tinta] = nivel ? CORES[id] : ['#d9ddd2', '#a8aea0']
  return (
    <svg className="flamula" viewBox="0 0 120 124" aria-hidden="true">
      <defs>
        <linearGradient id={`${unico}haste`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={claro} /><stop offset=".5" stopColor={meio} /><stop offset="1" stopColor={claro} />
        </linearGradient>
      </defs>
      {(nivel === 'ouro' ? [[36, 88], [48, 100], [72, 100], [84, 88]] : nivel === 'prata' ? [[48, 100], [72, 100]] : []).map(([x, y]) => (
        <path key={x} d={`M${x} ${y}l-3 12h6z`} fill={meio} stroke={escuro} strokeWidth="1" />
      ))}
      <path d="M26 18H94V78L60 116 26 78Z" fill={pano} stroke={escuro} strokeWidth="3" />
      {nivel && nivel !== 'bronze' && <path d="M27.5 24H92.5V33H27.5Z" fill={meio} />}
      {nivel === 'ouro' && <path d="M27.5 36H92.5V40H27.5Z" fill={meio} />}
      {/* a Lenda tem mais listras que todas */}
      {nivel && id === 'lenda' && <path d="M27.5 43H92.5V46H27.5Z" fill={meio} />}
      <path transform={`translate(${id === 'lenda' ? '42 48) scale(.14' : `38 ${nivel === 'ouro' ? 44 : 38}) scale(.172`})`} d={ICONES_DAS_CONQUISTAS[id]} fill={tinta} />
      <rect x="16" y="10" width="88" height="8" rx="4" fill={`url(#${unico}haste)`} stroke={escuro} strokeWidth="2" />
      <circle cx="16" cy="14" r="6" fill={meio} stroke={escuro} strokeWidth="2" />
      <circle cx="104" cy="14" r="6" fill={meio} stroke={escuro} strokeWidth="2" />
    </svg>
  )
}

// Insígnias do perfil: cada conquista tem a sua flâmula, com bronze, prata e ouro; sem nível, fica apagada mostrando a primeira meta.
export function Insignias({ conquistas }: { conquistas: Conquista[] }) {
  const positivas = conquistas.filter((conquista) => !conquista.negativa && !conquista.especial)
  const ganhas = positivas.filter((conquista) => conquista.nivel).length
  const [legenda, setLegenda] = useState(false)
  const [aberta, setAberta] = useState<Conquista | null>(null)
  return (
    <section className="panel">
      <div className="ph">
        <span>Conquistas <span className="sub">{ganhas} de {positivas.length}</span></span>
        <button className="tag t-y" style={{ height: 26, fontSize: 14, border: 0, cursor: 'pointer' }} onClick={() => setLegenda(true)}>Legenda</button>
      </div>
      <div className="insignias">
        {conquistas.map((conquista) => (
          <button key={conquista.id} type="button" onClick={() => setAberta(conquista)} className={`insignia${conquista.nivel ? '' : ' bloqueada'}${conquista.especial ? ' lenda' : ''}`} title={conquista.descricao}
            aria-label={`${conquista.nome}: ${conquista.nivel ? NOME_DO_NIVEL[conquista.nivel] : 'ainda não conquistada'}. ${conquista.descricao}: ${conquista.valor}`}>
            <Flamula id={conquista.id} nivel={conquista.nivel} />
            <span className="insignia-nome">{conquista.nome}</span>
            <span className="insignia-progresso">
              {conquista.especial
                ? (conquista.nivel ? 'Conquistada' : 'Carta lendária')
                : <>
                  {conquista.nivel && NOME_DO_NIVEL[conquista.nivel]}
                  {conquista.nivel && conquista.proximaMeta !== null && ' · '}
                  {conquista.proximaMeta !== null && `${conquista.valor}/${conquista.proximaMeta}`}
                </>}
            </span>
          </button>
        ))}
      </div>
      {legenda && <Legenda conquistas={conquistas} onFechar={() => setLegenda(false)} />}
      {aberta && <NiveisDaConquista conquista={aberta} onFechar={() => setAberta(null)} />}
    </section>
  )
}

// conquistas que olham a melhor pelada (não somam): o número é o recorde de um dia
const NUMA_PELADA = new Set(['dia-inspirado', 'pe-de-anjo', 'imortal', 'paredao'])

/** Uma conquista aberta: as 3 versões (bronze, prata e ouro), a meta de cada uma e quais já ganhou. */
function NiveisDaConquista({ conquista, onFechar }: { conquista: Conquista; onFechar: () => void }) {
  const unidade = conquista.id === 'aproveitamento' ? '%' : ''
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={conquista.nome} onClick={onFechar}>
      <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 380 }} onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">{conquista.nome}</div>
        <div className="pb" style={{ display: 'grid', gap: 12 }}>
          <span className="mut" style={{ textAlign: 'center', lineHeight: 1.35 }}>
            {conquista.descricao}
            {!conquista.especial && <><br />{NUMA_PELADA.has(conquista.id) ? 'Seu recorde numa pelada' : 'Você tem'}: <b style={{ color: 'var(--navy)' }}>{conquista.valor}{unidade}</b></>}
          </span>
          {conquista.negativa && <span style={{ color: 'var(--vermelho)', fontWeight: 700, textAlign: 'center' }}>Esta tira pontos da carta: quanto menos, melhor.</span>}
          <div className="niveis-da-conquista">
            {(conquista.especial ? (['ouro'] as NivelDaConquista[]) : NIVEIS_DA_INSIGNIA).map((nivel, indice) => {
              const meta = conquista.metas[indice]
              const ganhou = conquista.especial ? !!conquista.nivel : conquista.valor >= meta
              return (
                <div key={nivel} className={ganhou ? 'ganhou' : ''}>
                  <Flamula id={conquista.id} nivel={ganhou ? nivel : null} />
                  <b>{conquista.especial ? 'Lenda' : NOME_DO_NIVEL[nivel]}</b>
                  {!conquista.especial && <span className={`meta ${nivel}`}>{meta}{unidade}</span>}
                  <span className="mut">
                    {conquista.especial
                      ? (ganhou ? 'Conquistada' : 'Consiga a carta lendária')
                      : ganhou ? (conquista.negativa ? 'Aconteceu' : 'Conquistada') : (conquista.negativa ? 'Livre' : 'Ainda não')}
                  </span>
                </div>
              )
            })}
          </div>
          <button className="btn w sm" onClick={onFechar}>Fechar</button>
        </div>
      </section>
    </div>
  )
}

/** O que é cada insígnia, as metas de cada nível e como a cor da carta sobe. */
function Legenda({ conquistas, onFechar }: { conquistas: Conquista[]; onFechar: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Legenda das conquistas" onClick={onFechar}>
      <section className="panel legenda" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">
          <span>Legenda</span>
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Fechar" onClick={onFechar}><span style={{ fontSize: 20, lineHeight: 1 }}>×</span></button>
        </div>
        <div className="legenda-lista">
          <div className="legenda-texto">
            <b>Como a carta sobe</b>
            Cada insígnia vale pontos: bronze 1, prata 2 e ouro 3. Somamos as suas 6 melhores da temporada.
            <div className="legenda-cartas">
              {NIVEIS_DA_CARTA.map(([nivel, nome, pontos]) => (
                <div key={nivel}>
                  <CartaDoJogador nome="Jogador" foto={null} numeros={NUMEROS_DE_EXEMPLO} rotulo="" nivel={nivel} exemplo />
                  <b>{nome}</b>
                  <span>{pontos}</span>
                </div>
              ))}
            </div>
            A temporada é o ano: em janeiro tudo recomeça, e as cartas passadas ficam guardadas.
          </div>
          {conquistas.map((conquista) => (
            <div key={conquista.id} className="legenda-item">
              <div className="legenda-detalhe">
                <b>{conquista.nome}</b>
                <span className="mut">{conquista.descricao}</span>
                {conquista.negativa && <span className="mut" style={{ color: 'var(--vermelho)', fontWeight: 700 }}>Tira 1, 2 ou 3 pontos da carta</span>}
              </div>
              <div className="legenda-niveis-insignia">
                {(conquista.especial ? (['ouro'] as NivelDaConquista[]) : NIVEIS_DA_INSIGNIA).map((nivel, indice) => (
                  <div key={nivel}>
                    <Flamula id={conquista.id} nivel={nivel} />
                    {!conquista.especial && <span className={nivel}>{conquista.metas[indice]}{conquista.id === 'aproveitamento' ? '%' : ''}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
