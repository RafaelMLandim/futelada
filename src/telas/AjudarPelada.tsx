import { useMemo, useState } from 'react'
import { obterNuvem } from '../nuvem'
import type { PeladaCompartilhada } from '../nuvem/tipos'
import { publicar, usePeladaNaNuvem, usePublicar } from '../store/compartilhamento'
import { completarEstado } from '../store/migracao'
import { usePelada } from '../store/usePelada'
import { useConfirmar } from '../utils/confirmacao'
import { Ajudando } from '../utils/somenteLeitura'
import { AbasDaPelada, Faixa, PeladaAoVivo, SemPelada } from './PeladaAoVivo'
import { PeladaEncerrada } from './PeladaEncerrada'

/**
 * Link de controle da pelada (?controle=CÓDIGO&chave=…, PLANO.md, seção 16): quem recebeu assume o controle
 * e passa a marcar a pelada de outra pessoa. Um celular por vez: os outros só acompanham.
 */
export function AjudarPelada({ codigo, chave }: { codigo: string; chave: string }) {
  const { naNuvem, eu, noControle } = usePeladaNaNuvem(codigo)
  const confirmar = useConfirmar()
  const [erro, setErro] = useState<string | null>(null)
  if (!naNuvem || !eu) return <SemPelada carregando={naNuvem === undefined || !eu} />

  const dono = naNuvem.nomeDoDono ?? 'quem criou a pelada'
  if (naNuvem.encerrada) return <PeladaEncerrada dados={naNuvem} aviso={`foi para o histórico de ${dono}`} />
  if (noControle) return <PeladaControlada key={naNuvem.dono} dados={naNuvem} codigo={codigo} />

  const assumir = () => confirmar({
    titulo: 'Assumir o controle?',
    mensagem: `Você passa a marcar a pelada de ${dono}. ${naNuvem.nomeDoControlador ?? 'O celular que estava marcando'} passa a só acompanhar.`,
    botao: 'Assumir',
    aoConfirmar: async () => {
      const nuvem = await obterNuvem()
      const conseguiu = await nuvem?.assumirControleDaPelada(codigo, chave, eu.nome).catch(() => false)
      setErro(conseguiu ? null : 'Esse link de controle não vale. Peça um novo para quem criou a pelada.')
    },
  })
  return (
    <PeladaAoVivo dados={naNuvem}
      faixa={<Faixa cor="var(--navy)">Pelada de {dono} · quem marca agora: {naNuvem.nomeDoControlador ?? dono}</Faixa>}
      extra={(
        <div className="pb" style={{ display: 'grid', gap: 6, background: '#fff' }}>
          <button className="btn" onClick={assumir}>Assumir o controle</button>
          {erro && <div className="mut" style={{ color: 'var(--vermelho)', fontWeight: 700, textAlign: 'center' }}>{erro}</div>}
        </div>
      )} />
  )
}

/** A pelada de outra pessoa, com este celular no controle: marca tudo e publica a cada mudança. */
function PeladaControlada({ dados, codigo }: { dados: PeladaCompartilhada; codigo: string }) {
  // começa como está na nuvem (só na memória: a pelada salva neste celular não muda)
  const pelada = usePelada({ estado: completarEstado(dados.app.estado), iniciada: true, crono: dados.app.crono })
  const [encerrou, setEncerrou] = useState(false)
  usePublicar(codigo, pelada.app, !encerrou)
  // encerrar: publica o final (vai para o histórico do dono, que guarda quando abrir o app); cancelar não existe aqui
  const doAjudante = useMemo(() => ({
    ...pelada,
    encerrar: () => {
      setEncerrou(true)
      publicar({ codigo, app: { estado: pelada.app.estado, crono: pelada.app.crono } }, true)
    },
    cancelar: () => {},
  }), [pelada, codigo])
  const dono = dados.nomeDoDono ?? 'quem criou a pelada'
  return (
    <Ajudando.Provider value={{ nomeDoDono: dados.nomeDoDono }}>
      <AbasDaPelada pelada={doAjudante} faixa={<Faixa cor="var(--verde)">Você está no controle · pelada de {dono}</Faixa>} />
    </Ajudando.Provider>
  )
}
