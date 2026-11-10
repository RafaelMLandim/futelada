import { useId, type CSSProperties } from 'react'
import { FORMA_DA_CARTA as FORMA, FORMA_DE_DENTRO_DA_CARTA as FORMA_DE_DENTRO, METAIS_DA_CARTA as METAIS, type NivelDaCarta, type NumerosDaCarta } from '../logic/carta'
import { Logo } from './Logo'
import { fotoSemFundo } from '../utils/foto'

const ESCOVADO = `${import.meta.env.BASE_URL}arte/escovado.webp`

/** Tracinho no lugar de um texto (carta de exemplo, como na legenda). */
const Traco = ({ classe }: { classe: string }) => <i className={`traco ${classe}`} />

// A carta do jogador: a cor toda sobe de bronze a diamante com as conquistas, e sempre com a logo.
// exemplo: a carta só mostra o desenho, com tracinhos no lugar dos textos (pequena, na legenda).
/** Pessoa genérica na foto da carta de exemplo. */
const Silhueta = () => (
  <svg className="carta-silhueta" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="38" r="19" fill="currentColor" />
    <path d="M14 100c0-22 16-36 36-36s36 14 36 36Z" fill="currentColor" />
  </svg>
)

export function CartaDoJogador({ nome, foto, numeros, rotulo, nivel, exemplo = false }: {
  nome: string; foto: string | null; numeros: NumerosDaCarta; rotulo: string; nivel: NivelDaCarta; exemplo?: boolean
}) {
  const id = useId()
  const { metal: [claro, meio, brilho], borda: [bordaClara, bordaEscura], tinta } = METAIS[nivel]
  const colunas: [string, string | number][][] = [
    [['JOG', numeros.jogos], ['VIT', numeros.vitorias], ['GOL', numeros.gols]],
    [['ASS', numeros.assistencias], ['EMP', numeros.empates], ['PEL', numeros.peladas]],
  ]
  return (
    <article className={`carta ${nivel}${exemplo ? ' exemplo' : ''}`} style={{ '--tinta': tinta } as CSSProperties} aria-label={`Carta de ${nome}, nível ${nivel}`}>
      <svg className="carta-fundo" viewBox="0 0 740 1060" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}fundo`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={claro} /><stop offset=".5" stopColor={meio} /><stop offset="1" stopColor={brilho} />
          </linearGradient>
          <linearGradient id={`${id}borda`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={bordaClara} /><stop offset=".5" stopColor={bordaEscura} /><stop offset="1" stopColor={bordaClara} />
          </linearGradient>
          <clipPath id={`${id}forma`}><path d={FORMA} /></clipPath>
          <linearGradient id={`${id}holografico`} x1="0" y1="0" x2="1" y2=".7">
            {['#ff4fa3', '#ffe24a', '#4dff9a', '#4ad2ff', '#9a5cff', '#ff4fa3', '#ffe24a'].map((cor, indice) => <stop key={indice} offset={indice / 6} stopColor={cor} />)}
          </linearGradient>
        </defs>
        <path d={FORMA} fill={`url(#${id}fundo)`} />
        {/* material: diamante é holográfico, a lendária é preta e lisa; os outros níveis, metal escovado */}
        <g clipPath={`url(#${id}forma)`}>
          {nivel === 'diamante'
            ? <rect width="740" height="1060" fill={`url(#${id}holografico)`} opacity=".34" />
            // metal escovado: uma imagem pronta dos riscos (o filtro desenhado na hora deixava manchas em alguns Android)
            : nivel !== 'lendaria' && <image href={ESCOVADO} width="740" height="1060" preserveAspectRatio="none" opacity={nivel === 'bronze' ? '.32' : '.64'} />}
        </g>
        {/* marcações de um campo de futebol, a marca da carta do Dois ou Dez */}
        <g clipPath={`url(#${id}forma)`} fill="none" stroke={tinta} strokeOpacity=".16" strokeWidth="3">
          <circle cx="370" cy="300" r="170" /><path d="M0 300H740" /><circle cx="370" cy="300" r="7" fill={tinta} fillOpacity=".16" />
          <path d="M180 0V110H560V0" />
        </g>
        {/* diamante: facetas de pedra preciosa */}
        {nivel === 'diamante' && (
          <g clipPath={`url(#${id}forma)`} fill="#fff">
            <path d="M0 64L180 0 120 240Z" opacity=".4" /><path d="M740 64L560 0 620 240Z" opacity=".4" />
            <path d="M0 620L150 760 0 860Z" opacity=".32" /><path d="M740 620L590 760 740 860Z" opacity=".32" />
            <path d="M370 1060L230 900H510Z" opacity=".4" />
          </g>
        )}
        <path d={FORMA} fill="none" stroke={`url(#${id}borda)`} strokeWidth="14" />
        <path d={FORMA_DE_DENTRO} fill="none" stroke={tinta} strokeOpacity=".4" strokeWidth="2" />
      </svg>

      <div className="carta-lado">
        {exemplo ? <Traco classe="traco-nota" /> : <span className="num carta-nota">{numeros.aproveitamento}</span>}
        {exemplo ? <Traco classe="traco-sigla" /> : <span className="carta-sigla">% APROV.</span>}
        <Logo tamanho={46} fundo={false} />
      </div>

      <div className={'carta-moldura' + (fotoSemFundo(foto) ? ' sem-fundo' : '')}>
        <div className="carta-foto">
          {foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : exemplo ? <Silhueta /> : <span className="num">{nome.slice(0, 1).toUpperCase()}</span>}
        </div>
      </div>

      {exemplo ? <div className="carta-nome"><Traco classe="traco-nome" /></div> : <div className="carta-nome num">{nome}</div>}
      <div className="carta-numeros">
        {colunas.map((coluna, indice) => (
          <div key={indice}>
            {coluna.map(([sigla, valor]) => (exemplo
              ? <div key={sigla}><Traco classe="traco-valor" /><Traco classe="traco-rotulo" /></div>
              : <div key={sigla}><span className="num">{valor}</span><span className="num">{sigla}</span></div>))}
          </div>
        ))}
      </div>
      <div className="carta-rotulo">{rotulo}</div>
    </article>
  )
}
