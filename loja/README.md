# Material da Play Store — Dois ou Dez

Tudo o que a Play Store pede para publicar o app (conta **pessoal** no Play Console, decidida em 16/10;
PLANO.md, seção 14.4).

| Arquivo | O que é |
|---|---|
| `textos.md` | Nome, descrição curta, descrição completa, categoria e contato |
| `formularios.md` | Respostas de "Conteúdo do app": segurança de dados, classificação, público-alvo, acesso ao app |
| `imagens/icone-512.png` | Ícone da loja (512×512, PNG com transparência) |
| `imagens/destaque-1024x500.png` | Imagem de destaque (gerada de `destaque.html`) |
| `imagens/captura-*.png` | 8 capturas de celular (1080×1920) |
| `~/Downloads/dois-ou-dez-1.0-loja.aab` | O app assinado com a chave de upload (gerar de novo com `npm run android:loja`) |

## A chave de upload
- Fica **fora do projeto**, em `~/.config/dois-ou-dez/upload.jks`, e a senha em
  `~/.config/dois-ou-dez/keystore.properties` (só o dono do computador lê). **Faça um backup dos dois
  arquivos** (num pendrive ou num cofre de senhas): sem eles não dá para mandar atualizações (dá para pedir
  ao Google uma chave nova, mas leva dias).
- SHA-1 da chave de upload: `1F:4C:69:6C:01:70:CA:84:82:BB:D7:3A:7C:0D:58:4A:D7:B3:D2:60` (já cadastrada
  no Firebase, para o login com Google funcionar na versão de loja).
- O app assinado com ela sai com `npm run android:loja` (`android/app/build/outputs/bundle/release/app-release.aab`).
- A cada atualização, aumentar `versionCode` (e `versionName`) em `android/app/build.gradle`.
- O ícone adaptativo do Android **não** sai mais do `npx @capacitor/assets generate` (ele punha uma margem de 16,7% e a
  logo ficava minúscula). O primeiro plano (`mipmap-*/ic_launcher_foreground.png`) é o ícone da loja (`loja/imagens/icone-512.png`)
  ocupando os 72dp visíveis do meio (fica igual ao da Play Store), e o fundo é a cor `#FFD23F`. Se rodar o gerador de novo, refazer isso (versão 1.0.2).

## Quando a conta for aprovada (lista de verificação)
1. Verificar o telefone de contato (código por SMS).
2. **Criar app**: nome "Dois ou Dez: Pelada e Torneio", idioma Português (Brasil), **App**, **Gratuito**,
   aceitar as declarações.
3. **Presença na loja**: colar os textos de `textos.md` e enviar o ícone, o destaque e as capturas.
4. **Conteúdo do app**: responder os formulários com `formularios.md`.
5. **Teste fechado**: criar a faixa, enviar o `.aab` e chamar os testadores (veja abaixo).
6. **Depois do 1º envio**, em **Teste e lançamento → Configuração → Integridade do app → Assinatura de apps**:
   copiar o **SHA-1 e o SHA-256 da "chave de assinatura do app"** (a do Google) e cadastrar no Firebase
   (Configurações do projeto → app Android → Adicionar impressão digital). **Sem isso o login com Google não
   funciona no app baixado da Play Store** (o Google assina de novo o app com a chave dele).
   O mesmo **SHA-256** da chave do Google entra também em `public/.well-known/assetlinks.json` (App Links:
   os links do site abrindo no app). Depois, publicar o site de novo.

## Situação (22/10/2026)
- Conta verificada. App criado (`app.doisoudez`), conteúdo do app, ficha da loja e categoria preenchidos.
- Teste fechado "Teste fechado - Alpha": Brasil, lista de testadores "Galera da pelada", versão 1 (1.0).
  **Enviado para revisão em 22/10** (o Google diz até 7 dias).
- Conta para a revisão do Google (Detalhes do login): e-mail e senha em `~/.config/dois-ou-dez/conta-revisao.txt`
  (fora do projeto). Não apagar essa conta no Firebase.
- Classificação: 12 anos (nomes digitados pelos usuários). Público-alvo: 18+.
- Quando ligar as assinaturas: refazer a classificação ("compra de itens digitais" = Sim) e a segurança dos dados
  (histórico de compras).
- 22/10: teste fechado aprovado. 23/10: lista "Galera da pelada" com 16 e-mails (15 testadores + o dono) e chave de
  assinatura do Google cadastrada no Firebase e no `assetlinks.json` (SHA-1 `2A:8D:72:6B:F8:CD:C0:2E:80:71:66:5C:6E:AE:0B:34:61:5A:DA:AC`).
- Link para os testadores: https://play.google.com/apps/testing/app.doisoudez
- 24/10: **12 testadores atingidos** (lista com 19 e-mails) e versão 1.0.2 (ícone igual ao da loja) aprovada. Os 14 dias
  contam a partir de 24/10: por volta de **07/11/2026** liberar "Solicitar a produção" no Painel.

## Teste fechado (obrigatório para conta pessoal nova)
- **12 testadores, 14 dias seguidos**, com o app instalado pela Play Store. Só depois disso o Play Console
  libera o pedido de publicação em produção.
- **Quem pode ser:** qualquer pessoa com conta Google e celular Android (a galera da pelada). Contas da
  mesma pessoa não contam em dobro.
- **Como montar:** Testar e lançar → Teste → **Teste fechado** → Criar faixa → Testadores: criar uma lista
  de e-mails com as 12 (ou mais) contas Google → Salvar → enviar o `.aab` numa nova versão → Notas da versão:
  "Primeira versão de teste do Dois ou Dez." → Revisar e lançar.
- **O que mandar para os testadores** (pelo grupo):
  > Galera, preciso de vocês para colocar o Dois ou Dez na Play Store! 1) Abram este link no celular
  > Android e toquem em "Quero participar": *(link de participação do teste fechado)*. 2) Instalem o app pela
  > Play Store. 3) Entrem com a conta Google e usem de vez em quando (pode ser só abrir). 4) **Não
  > desinstalem por 14 dias.** Valeu!
- **Durante os 14 dias:** convém usar o app de verdade nas peladas e pedir opinião (o Google pergunta, no
  pedido de produção, como o teste foi e o que mudou com o retorno dos testadores).
- **Depois dos 14 dias:** Painel → **Solicitar acesso à produção** → responder o questionário → a revisão do
  Google costuma levar alguns dias.
