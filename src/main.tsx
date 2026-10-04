import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ProtecaoDeErro } from './components/ProtecaoDeErro'
import { ProvedorDeConfirmacao } from './components/ProvedorDeConfirmacao'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProtecaoDeErro>
      <ProvedorDeConfirmacao>
        <App />
      </ProvedorDeConfirmacao>
    </ProtecaoDeErro>
  </StrictMode>,
)
