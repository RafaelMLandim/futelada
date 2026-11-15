// Botão "Compartilhar o resumo" do torneio que acabou (PLANO.md, seção 22.5): a imagem do campeão (o time no campo) com
// os prêmios individuais (de qualquer time). Fica junto do campeão, nas abas Jogos e Tabela, para todo mundo.

import { useState } from 'react'
import { Icone } from '../../components/Icone'
import { resumoDoCampeao } from '../../logic/torneio'
import { obterNuvem } from '../../nuvem'
import { semAsDenunciadas } from '../../store/denuncias'
import type { Torneio } from '../../types/torneio'
import { compartilharImagem, imagemDoCampeao, nomeDoArquivo } from '../../utils/resumoDaPelada'

/** Fotos de quem tem conta no time campeão: id do jogador → foto (quem não escolheu foto fica com a silhueta). */
async function fotosDoCampeao(jogadores: { id: string; conta?: string }[]): Promise<Record<string, string>> {
  const comConta = jogadores.flatMap((jogador) => (jogador.conta ? [[jogador.id, jogador.conta] as const] : []))
  if (!comConta.length) return {}
  const lidas = await (await obterNuvem())?.fotosDasContas([...new Set(comConta.map(([, conta]) => conta))]).catch(() => null)
  if (!lidas) return {}
  const fotos = semAsDenunciadas(lidas, (conta) => conta)
  return Object.fromEntries(comConta.flatMap(([jogador, conta]) => (fotos[conta] ? [[jogador, fotos[conta]] as const] : [])))
}

export function CompartilharCampeao({ torneio }: { torneio: Torneio }) {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const resumo = resumoDoCampeao(torneio)
  if (!resumo) return null
  const compartilhar = async () => {
    setErro(null)
    setGerando(true)
    await fotosDoCampeao([...resumo.jogadores, ...(resumo.goleiro ? [resumo.goleiro] : [])])
      .then((fotos) => imagemDoCampeao(resumo, fotos))
      .then((imagem) => compartilharImagem(imagem, nomeDoArquivo('campeao')))
      .catch(() => setErro('Não deu para gerar a imagem. Tente de novo.'))
    setGerando(false)
  }
  return (
    <>
      <button className="btn sm" style={{ flex: 'none' }} disabled={gerando} onClick={() => void compartilhar()}>
        <Icone nome="compartilhar" tamanho={20} /> {gerando ? 'Gerando a imagem…' : 'Compartilhar o resumo'}
      </button>
      {erro && <div role="status" className="mut" style={{ color: '#fff', textAlign: 'center', fontWeight: 600 }}>{erro}</div>}
    </>
  )
}
