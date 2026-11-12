// Ajustar a foto antes de tirar o fundo: a pessoa arrasta para enquadrar e dá zoom (pinça, roda do mouse ou a
// barra). Serve para foto de longe (zoom no rosto) e foto com mais gente (recorta só a pessoa). O que fica no
// quadrado vira a foto (PNG, para manter o fundo transparente de quem já mandou sem fundo).

import { useEffect, useRef, useState, type PointerEvent as EventoDoDedo, type WheelEvent } from 'react'
import { SOBRA_ACIMA_EM_PE } from '../utils/foto'

const ZOOM_MAXIMO = 4
const SAIDA_MAXIMA = 1024 // lado da foto ajustada (a carta usa 512)

type Posicao = { x: number; y: number }

export function AjustarFoto({ arquivo, aoUsar, aoCancelar }: { arquivo: Blob; aoUsar: (foto: Blob) => void; aoCancelar: () => void }) {
  const [endereco, setEndereco] = useState<string | null>(null)
  const [tamanho, setTamanho] = useState<{ largura: number; altura: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [deslocamento, setDeslocamento] = useState<Posicao>({ x: 0, y: 0 })
  const [erro, setErro] = useState(false)
  const [gerando, setGerando] = useState(false) // já tocou em "Usar foto": não deixa tocar de novo
  const moldura = useRef<HTMLDivElement>(null)
  const imagem = useRef<HTMLImageElement>(null)
  const dedos = useRef(new Map<number, Posicao>())
  const pinca = useRef<{ distancia: number; zoom: number } | null>(null)
  const [lado, setLado] = useState(280)

  useEffect(() => {
    // lida como data URL (sem endereço temporário para liberar depois)
    const leitor = new FileReader()
    leitor.onload = () => setEndereco(typeof leitor.result === 'string' ? leitor.result : null)
    leitor.onerror = () => setErro(true)
    leitor.readAsDataURL(arquivo)
    return () => leitor.abort()
  }, [arquivo])
  useEffect(() => {
    const medir = () => setLado(moldura.current?.clientWidth ?? 280)
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  // a foto sempre cobre o quadrado inteiro: zoom 1 = o lado menor encosta no quadrado
  const escala = tamanho ? (lado / Math.min(tamanho.largura, tamanho.altura)) * zoom : 1
  const largura = (tamanho?.largura ?? 0) * escala
  const altura = (tamanho?.altura ?? 0) * escala
  const limitar = (posicao: Posicao, novaLargura = largura, novaAltura = altura): Posicao => ({
    x: Math.min((novaLargura - lado) / 2, Math.max(-(novaLargura - lado) / 2, posicao.x)),
    y: Math.min((novaAltura - lado) / 2, Math.max(-(novaAltura - lado) / 2, posicao.y)),
  })
  const mudarZoom = (novo: number) => {
    if (!tamanho) return
    const valor = Math.min(ZOOM_MAXIMO, Math.max(1, novo))
    const novaEscala = (lado / Math.min(tamanho.largura, tamanho.altura)) * valor
    // mantém o ponto do meio do quadrado no lugar
    const proporcao = valor / zoom
    setZoom(valor)
    setDeslocamento((atual) => limitar({ x: atual.x * proporcao, y: atual.y * proporcao }, tamanho.largura * novaEscala, tamanho.altura * novaEscala))
  }

  const distanciaDosDedos = () => {
    const [primeiro, segundo] = [...dedos.current.values()]
    return Math.hypot(primeiro.x - segundo.x, primeiro.y - segundo.y)
  }
  const aoTocar = (evento: EventoDoDedo<HTMLDivElement>) => {
    evento.currentTarget.setPointerCapture(evento.pointerId)
    dedos.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY })
    if (dedos.current.size === 2) pinca.current = { distancia: distanciaDosDedos(), zoom }
  }
  const aoMover = (evento: EventoDoDedo<HTMLDivElement>) => {
    const anterior = dedos.current.get(evento.pointerId)
    if (!anterior) return
    dedos.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY })
    if (dedos.current.size >= 2 && pinca.current) {
      mudarZoom(pinca.current.zoom * (distanciaDosDedos() / pinca.current.distancia))
      return
    }
    // a tela pode estar com zoom (tablet, computador): o movimento do dedo vem em pixels da tela
    const zoomDaTela = Number(getComputedStyle(document.documentElement).zoom) || 1
    setDeslocamento((atual) => limitar({ x: atual.x + (evento.clientX - anterior.x) / zoomDaTela, y: atual.y + (evento.clientY - anterior.y) / zoomDaTela }))
  }
  const aoSoltar = (evento: EventoDoDedo<HTMLDivElement>) => {
    dedos.current.delete(evento.pointerId)
    if (dedos.current.size < 2) pinca.current = null
  }
  const aoRolar = (evento: WheelEvent<HTMLDivElement>) => mudarZoom(zoom * (evento.deltaY < 0 ? 1.1 : 1 / 1.1))

  const usar = () => {
    if (!tamanho || !imagem.current || gerando) return
    setGerando(true)
    // o pedaço da foto original que está no quadrado
    const esquerda = (lado - largura) / 2 + deslocamento.x
    const topo = (lado - altura) / 2 + deslocamento.y
    const pedaco = lado / escala
    const saida = Math.round(Math.max(512, Math.min(SAIDA_MAXIMA, pedaco)))
    const tela = document.createElement('canvas')
    tela.width = saida
    tela.height = saida
    const desenho = tela.getContext('2d')!
    desenho.imageSmoothingQuality = 'high'
    desenho.drawImage(imagem.current, -esquerda / escala, -topo / escala, pedaco, pedaco, 0, 0, saida, saida)
    tela.toBlob((foto) => { if (foto) aoUsar(foto); else { setErro(true); setGerando(false) } }, 'image/png')
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Ajustar a foto">
      <section className="panel" style={{ color: 'var(--navy)', width: '100%', maxWidth: 360 }}>
        <div className="ph">Ajustar a foto</div>
        <div className="pb" style={{ display: 'grid', gap: 12 }}>
          <span style={{ fontWeight: 600, lineHeight: 1.35 }}>Arraste para enquadrar e use dois dedos para aproximar. Deixe só você, do peito para cima.</span>
          <div ref={moldura} className="ajustar-foto" onPointerDown={aoTocar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} onWheel={aoRolar}>
            {endereco && <img ref={imagem} src={endereco} alt="Sua foto" draggable={false}
              onLoad={(evento) => {
                const { naturalWidth: larguraOriginal, naturalHeight: alturaOriginal } = evento.currentTarget
                setTamanho({ largura: larguraOriginal, altura: alturaOriginal })
                // foto em pé: começa mostrando a parte de cima (a cabeça), como o recorte automático
                const alturaNaTela = (alturaOriginal * lado) / Math.min(larguraOriginal, alturaOriginal)
                setDeslocamento({ x: 0, y: (alturaNaTela - lado) * (0.5 - SOBRA_ACIMA_EM_PE) })
              }}
              onError={() => setErro(true)}
              style={{ width: largura || undefined, height: altura || undefined, transform: `translate(${(lado - largura) / 2 + deslocamento.x}px, ${(lado - altura) / 2 + deslocamento.y}px)`, visibility: tamanho ? 'visible' : 'hidden' }} />}
            {/* grade em terços, como na câmera do celular */}
            <svg className="ajustar-foto-grade" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M33.3 0V100M66.6 0V100M0 33.3H100M0 66.6H100" />
            </svg>
          </div>
          <label className="row" style={{ gap: 10 }}>
            <span className="mut" style={{ fontWeight: 700 }}>Zoom</span>
            <input type="range" min={1} max={ZOOM_MAXIMO} step={0.05} value={zoom} style={{ flex: 1 }} aria-label="Zoom da foto"
              onChange={(evento) => mudarZoom(Number(evento.target.value))} />
          </label>
          {erro && <div style={{ color: 'var(--vermelho)', fontWeight: 600 }}>Não deu para abrir essa imagem. Escolha outra.</div>}
          <div className="opcoes-lado-a-lado">
            <button className="btn w sm" onClick={aoCancelar}>Cancelar</button>
            <button className="btn sm" disabled={!tamanho || erro || gerando} onClick={usar}>{gerando ? 'Preparando…' : 'Usar foto'}</button>
          </div>
        </div>
      </section>
    </div>
  )
}
