import type { ReactNode } from 'react'
import { Bola } from '../../components/Bola'
import { Cartao } from '../../components/Cartao'
import { Icone } from '../../components/Icone'
import { darCartao, outro } from '../../logic'
import type { Pelada } from '../../store/usePelada'
import type { CorCartao, Jogador, Lado } from '../../types/pelada'

// Menu ao tocar num jogador em campo: gol, cartões e "foi embora".
export function AcoesJogador({ pelada, lado, jogador, decorrido, onGol, onSaiu, onFechar }: {
  pelada: Pelada; lado: Lado; jogador: Jogador; decorrido: number
  onGol: (lado: Lado, autor: Jogador, contra?: boolean) => void; onSaiu: (id: string, nome: string) => void; onFechar: () => void
}) {
  const { estado } = pelada.app
  if (!estado.emCampo) return null
  const time = estado.emCampo[lado]
  const minutos = estado.config.minutosAzul

  const fazer = (fn: Parameters<typeof pelada.aplicar>[0]) => {
    pelada.aplicar(fn)
    onFechar()
  }
  const cartao = (cor: CorCartao) => fazer((e) => darCartao(e, lado, jogador, cor, decorrido))

  const opcao = (rotulo: string, icone: ReactNode, onClick: () => void, classe = 'btn w sm') => (
    <button className={classe} style={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: 18 }} onClick={onClick}>
      {icone}{rotulo}
    </button>
  )

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Ações de ${jogador.nome}`} onClick={onFechar}>
      <section className="panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="ph">
          <span>{jogador.nome} <span className="sub">· Time {time.numero}</span></span>
          <button className="ib s" style={{ width: 32, height: 32 }} aria-label="Fechar" onClick={onFechar}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
          </button>
        </div>
        <div className="pb" style={{ display: 'grid', gap: 8 }}>
          {opcao('Gol', <Bola tamanho={22} />, () => { onFechar(); onGol(lado, jogador) })}
          {opcao('Gol contra', <Bola tamanho={22} />, () => { onFechar(); onGol(outro(lado), jogador, true) })}
          {opcao('Cartão amarelo', <Cartao cor="amarelo" tamanho={20} />, () => cartao('amarelo'))}
          {opcao('Cartão vermelho · sai da partida', <Cartao cor="vermelho" tamanho={20} />, () => cartao('vermelho'))}
          {opcao(`Cartão azul · ${minutos} min fora`, <Cartao cor="azul" tamanho={20} />, () => cartao('azul'))}
          {opcao('Foi embora', <Icone nome="saiu" />, () => { onFechar(); onSaiu(jogador.id, jogador.nome) }, 'btn r sm')}
        </div>
      </section>
    </div>
  )
}
