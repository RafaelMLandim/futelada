# App do iPhone (App Store)

Mesmo código do site e do Android, com o Capacitor (PLANO.md, seção 13). O projeto do Xcode fica em `ios/App`.
Atualizar depois de mudar o site: `npm run ios` (gera o site e copia para o projeto do iPhone).

## O que já está pronto no código
- Projeto iOS (Swift Package Manager, sem CocoaPods), só para iPhone (sem iPad), em português.
- Ícone e tela de abertura (de `assets/`).
- Permissões explicadas: câmera e fotos (foto da carta) e salvar nas fotos (imagens da pelada).
- **Entrar com a Apple** (só no iPhone, primeiro botão do login), também ao excluir a conta: confirma com a
  Apple e cancela a autorização dela (regra da Apple para apps com esse login).
- Compras: chave do RevenueCat própria (`VITE_REVENUECAT_IOS`) e códigos dos produtos com ponto
  (`pelada_premium.mensal`, `pelada_premium.anual`, `ultimate.mensal`, `premium_12_meses`, `torneio_avulso`);
  o servidor entende os dois formatos. Os textos falam "App Store" no iPhone.
- Sem criptografia própria (`ITSAppUsesNonExemptEncryption = false`): não pede o formulário de exportação.

## Feito em 11/11/2026
- App iOS registrado no Firebase ("Dois ou Dez (iPhone)", `1:908586591174:ios:a0b97513f1bbffd01e48c7`);
  `GoogleService-Info.plist` em `ios/App/App/` e no projeto do Xcode; `REVERSED_CLIENT_ID` no `Info.plist`.
- Provedor **Apple** ativado no Firebase Authentication (para o login nativo não precisa de Services ID).

- **Apple Developer Program:** inscrição como pessoa física (Bruno Magalhães Landim, Apple ID brunolandim13@gmail.com) feita
  e paga pelo site em 11/11/2026, sem iPhone ("Continue enrollment on the web"). Aguardando o e-mail de ativação (até 2 dias úteis).

- **Conta ativada** (Team ID `MZM2Q3HT7W`). App ID "Dois ou Dez" `app.doisoudez` registrado com Sign In with Apple e In-App Purchase.
- **App Store Connect:** app "Dois ou Dez: Pelada e Torneio" criado (Apple ID do app `6833735719`, SKU `doisoudez`, pt-BR, só iOS).

## O que falta (fora do código)
1. **Chave de API da App Store Connect** (Usuários e acesso → Integrações → Chaves, acesso "Gerente de apps") para o Codemagic; certificado e perfil o Codemagic cria.
2. **App Store Connect**: criar o app, os produtos com os códigos acima (as assinaturas Pro e Ultimate no
   mesmo grupo, para a troca de plano) e ligar ao RevenueCat; pôr a chave em `VITE_REVENUECAT_IOS`.
3. **Gerar o app sem Mac**: Codemagic, pelo `codemagic.yaml` (fluxo "iPhone · TestFlight"): ligar o repositório do GitHub, criar a
   integração "Dois ou Dez" com a chave de API do App Store Connect e o grupo de variáveis `dois_ou_dez` (as VITE_* do `.env.local`).
   A versão do iPhone acompanha a do Android (MARKETING_VERSION no projeto do Xcode).
4. **Publicar a função `avisoDeCompra`** com o novo formato dos códigos (`functions/plano.js`).

## TestFlight (12/11/2026)
- Informações de teste preenchidas (descrição, e-mail de feedback, contato da revisão, sem login obrigatório:
  a revisão entra com o próprio Apple ID).
- Grupos: interno "Equipe" e externo "Galera da pelada" (todas as compilações).
- Build 1.0.16 (1) enviado à revisão beta em 12/11.
- Link público (aberto a todos): https://testflight.apple.com/join/7Z3mzMh5 — só funciona depois que a Apple aprova a versão.
- Próximos builds do Codemagic vão sozinhos para a revisão beta (`submit_to_testflight: true`).
