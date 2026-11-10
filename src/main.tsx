import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ProtecaoDeErro } from './components/ProtecaoDeErro'
import { ProvedorDeConfirmacao } from './components/ProvedorDeConfirmacao'
import { voltarFechaJanelas } from './utils/voltar'
import { nativo } from './utils/nativo'
import { abrirPeloLink } from './utils/linksDoApp'
import { ajustarAoTamanhoDaTela } from './utils/telaGrande'
import { acompanharPendencias } from './store/cartasPendentes'

// site: funciona sem internet e se atualiza sozinho (no app de loja não precisa)
if (!nativo()) void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))

// tablet e computador: o app fica maior em vez de uma faixa estreita no meio
ajustarAoTamanhoDaTela()

// o "voltar" do celular fecha a janela aberta (em vez de fechar o app)
voltarFechaJanelas()

// números da carta que não saíram por falta de sinal
acompanharPendencias()

// App aberto por um link do site: os parâmetros do link entram no endereço antes de o App ler (ele lê ao carregar)
void abrirPeloLink().finally(async () => {
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ProtecaoDeErro>
        <ProvedorDeConfirmacao>
          <App />
        </ProvedorDeConfirmacao>
      </ProtecaoDeErro>
    </StrictMode>,
  )
})
