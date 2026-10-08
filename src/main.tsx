import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ProtecaoDeErro } from './components/ProtecaoDeErro'
import { ProvedorDeConfirmacao } from './components/ProvedorDeConfirmacao'
import { voltarFechaJanelas } from './utils/voltar'
import { nativo } from './utils/nativo'

// site: funciona sem internet e se atualiza sozinho (no app de loja não precisa)
if (!nativo()) void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))

// o "voltar" do celular fecha a janela aberta (em vez de fechar o app)
voltarFechaJanelas()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProtecaoDeErro>
      <ProvedorDeConfirmacao>
        <App />
      </ProvedorDeConfirmacao>
    </ProtecaoDeErro>
  </StrictMode>,
)
