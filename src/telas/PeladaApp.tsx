import { useContext, useState } from 'react'
import { VoltarAoInicio } from '../components/navegacao'
import { obterNuvem } from '../nuvem'
import { useConfirmar } from '../utils/confirmacao'
import { Icone, type NomeIcone } from '../components/Icone'
import { useCobranca } from '../store/cobranca'
import { useVoltar } from '../utils/voltar'
import { usePelada } from '../store/usePelada'
import { Config } from './Config'
import { Jogo } from './jogo/Jogo'
import { Lista } from './Lista'
import { Tabela } from './Tabela'

type Aba = 'lista' | 'jogo' | 'tabela' | 'ajustes'

/** A pelada do dia: abas Lista/Fila, Jogo, Tabela e Ajustes. */
export function PeladaApp() {
  const pelada = usePelada()
  // campo pago: fica ouvindo os "Já paguei" mesmo fora da Lista
  const cobranca = useCobranca(pelada)
  const { app } = pelada
  const emJogo = app.estado.emCampo !== null
  const [aba, setAba] = useState<Aba>(emJogo ? 'jogo' : 'lista')
  // "voltar" do celular em outra aba: volta para a principal (Jogo, se tem jogo; senão Lista)
  const principal: Aba = emJogo ? 'jogo' : 'lista'
  useVoltar(app.iniciada && aba !== principal, () => setAba(principal))

  // Cancelar: descarta a pelada (nada vai para o histórico nem para o caixa) e volta os ajustes de antes
  const voltarAoInicio = useContext(VoltarAoInicio)
  const confirmar = useConfirmar()
  const cancelar = () => confirmar({
    titulo: 'Cancelar a pelada?',
    mensagem: app.iniciada
      ? 'A lista, os jogos e os pagamentos de hoje serão apagados. Nada vai para o histórico nem para o caixa, e o link de pagamento deixa de funcionar.'
      : 'Os ajustes que você mudou agora voltam a ser como antes.',
    botao: 'Cancelar pelada', voltar: 'Continuar', perigo: true,
    aoConfirmar: () => {
      const codigo = app.estado.cobranca
      if (codigo) void obterNuvem().then((n) => n?.apagarCobranca(codigo)).catch(() => null)
      pelada.cancelar()
      setAba('lista')
      voltarAoInicio?.()
    },
  })

  // Criando a pelada: primeiro os ajustes, depois a lista
  if (!app.iniciada) {
    return <Config pelada={pelada} onCancelar={cancelar} onPronto={() => { pelada.iniciar(); setAba('lista') }} />
  }

  const abas: [Aba, NomeIcone, string][] = [
    ['lista', 'lista', emJogo ? 'Fila' : 'Lista'],
    ['jogo', 'bola', 'Jogo'],
    ['tabela', 'tabela', 'Tabela'],
    ['ajustes', 'ajustes', 'Ajustes'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {aba === 'lista' && <Lista pelada={pelada} cobranca={cobranca} onApitar={() => setAba('jogo')} />}
        {aba === 'jogo' && <Jogo pelada={pelada} onLista={() => setAba('lista')} />}
        {aba === 'tabela' && <Tabela pelada={pelada} />}
        {aba === 'ajustes' && <Config pelada={pelada} onCancelar={cancelar} />}
      </div>
      <nav className="nav" aria-label="Navegação">
        {abas.map(([id, icone, rotulo]) => (
          <button key={id} className={aba === id ? 'on' : ''} aria-current={aba === id ? 'page' : undefined} onClick={() => setAba(id)}>
            <Icone nome={icone} tamanho={24} />
            <span>{rotulo}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
