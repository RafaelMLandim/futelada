# Dois ou Dez — Plano do Projeto

> Documento vivo: vamos atualizando conforme as regras forem sendo definidas.

> **Nome do app: Dois ou Dez** (a regra clássica da pelada: 2 gols ou 10 minutos).
> **Logo:** cronômetro com um campo de futebol no mostrador, "2 OU 10" no meio, pontilhados e a fatia do tempo passado, sobre fundo amarelo (ícones em `public/`).
> **No ar:** https://dois-ou-dez.web.app (PWA no Firebase Hosting; publicar com `npm run build && npx firebase-tools deploy --only hosting`).

## 1. Objetivo

Substituir o papel usado hoje para organizar a pelada: lista de chegada, montagem
dos times e rodízio de quem joga / quem espera.

## 1.1 Padrão dos nomes
- Todo nome cadastrado fica em **MAIÚSCULAS** (jogadores, goleiros, times e o nome do
  torneio), já enquanto digita.
- Nenhuma barra de rolagem aparece: as telas rolam arrastando, como em apps de celular.

## 2. Como funciona hoje (papel)

Referência: `Captura de tela de 2026-10-03 13-56-26.png`

```
Lista de chegada | Time 1   | Time 2   | Time 3
-----------------+----------+----------+---------
1. João          | João     | Rafael   | Mano
2. Carlos        | Carlos   | Daniel   | Lucas
3. Bruno         | Bruno    | Junior   | (vaga)
4. Marcos        | Marcos   | Landim   | (vaga)
5. Rafael        |
6. Daniel        |
7. Junior        |
8. Landim        |
9. Mano          |
10. Lucas        |
```

- Os nomes entram na lista **na ordem de chegada**.
- Define-se quantos jogam **na linha** (ex.: 4). **Goleiro não conta.**
- Os times são preenchidos em blocos na ordem da lista (1–4 → Time 1, 5–8 → Time 2, ...).
- O último time pode ficar **incompleto** (no exemplo, Time 3 só tem 2).

## 3. Regras de rodízio

### 3.1 Princípio: uma fila única de jogadores
A espera não é uma fila de times, e sim uma **fila de jogadores** (a lista).
Os times de fora são só essa fila **cortada em blocos** do tamanho da linha (ex.: 4).
Com isso:
- Só o **último bloco** pode ficar incompleto → nunca há dois times incompletos.
- Tudo que entra na fila entra **no final**, mantendo a ordem.

### 3.1.1 Sorteio do primeiro jogo (contra panelinha)
- Antes do **primeiro jogo do dia**, os jogadores dos **dois primeiros times** da lista
  (Time 1 e Time 2) são **misturados aleatoriamente** ("Sortear e apitar").
- Só os dois primeiros times; o resto da lista fica na ordem de chegada.
- A mistura não marca ninguém como "subiu". Dá para desligar nos Ajustes
  ("Sortear o primeiro jogo"; vem ligado).

### 3.2 Quem perde
- Os jogadores do time que perdeu vão para o **final da fila**, na ordem da lista
  do time (de cima para baixo).
- Se o último bloco estava incompleto, os primeiros do time que perdeu o completam
  e o resto forma um novo bloco (cascata natural).
- Se todos os times de fora já estão completos, o time que perdeu vai inteiro
  para o fim como um novo bloco. É raro: normalmente sempre falta 1 ou 2 em algum.
- O primeiro bloco da fila entra em campo contra quem ganhou.

Exemplo: fila [M, N] e o Time 1 (A, B, C, D) perde →
fila [M, N, A, B, C, D] → blocos **[M, N, A, B]** e **[C, D]**.

### 3.2.1 Tamanho do time é dinâmico
- Quantos jogam na linha depende do campo (futsal 4, society 5–6, campo 10...).
- É configurado na sessão; toda a lógica usa esse número N (blocos de N na fila).

### 3.2.2 Número dos times
- O número do time vem da **lista**: 18 pessoas com 4 na linha = Times 1 a 5.
- Quem perde vai para o fim da fila **com o mesmo número**, mesmo cedendo jogadores
  para completar o time incompleto. Ex.: Time 1 perde, João e Carlos completam o
  Time 3, e Bruno e Marcos seguem como **Time 1** (incompleto), que depois é
  completado pelo próximo que perder.
- Time novo (número novo) só nasce quando **chega gente** e não há time incompleto.
- Se o último time da fila fica sem ninguém (alguém foi embora), o número some.

### 3.2.3 Marca "subiu"
- Quem muda de time fica marcado com **↑ T1** (veio do Time 1): ao completar um time
  incompleto, ao subir na fila porque alguém foi embora ou ao entrar em campo no lugar
  de alguém.
- Vale só para a **última movimentação**: na próxima vez que alguém mudar de time, as
  marcas são refeitas. Gol e cartão não mexem nas marcas; atrasado não é marcado;
  mudar o tamanho da linha limpa as marcas (é só a lista sendo recortada de novo).

### 3.3 Atrasados
- Entram no **final da fila**, completando o último bloco (ou formando um novo).

### 3.4 Empate
- **Com dois times completos esperando:** saem os dois. Os dois vão para o fim
  da fila e o **cara ou coroa** define qual entra na fila primeiro.
- **Sem dois times completos esperando:** sai só um, decidido no **cara ou coroa**.

### 3.5 Fim da partida
- Acaba por **tempo** ou por **gols**, o que acontecer primeiro.
- Padrão: **10 minutos ou 2 gols**. Configurável na sessão. A opção **"Gols terminam a
  partida"** pode ser desligada (aí vai até o fim do tempo); na pelada vem **ligada**.

- **Chegou no limite de gols:** o placar mostra "FIM DE JOGO!", apita e vibra, mas a
  partida **não encerra sozinha**: o vencedor é escolhido no botão.
- **Acabou o tempo:** apita, vibra e abre o modal "Acabou o tempo" com o placar:
  **Encerrar** (quem está ganhando vence; empatado vai para a moeda), **Dar acréscimos**
  (se ligado) ou **Voltar ao jogo**.
- **Acréscimos** (configuração liga/desliga, pelada e torneio; padrão ligado): ao acabar o
  tempo, "Dar acréscimos" pergunta os minutos na hora (1–10, padrão 2) e já solta o relógio.
  O tempo principal fica parado em 10:00 e embaixo corre "+0:35 DE +2 MIN ACRÉSCIMOS".
  Gol nos acréscimos aparece como tempo + acréscimo ("10+1'"). Quando os acréscimos acabam,
  apita e abre o fim de jogo de novo (acréscimos só uma vez por partida).
- **Um botão só para encerrar, que segue o placar** (pelada): com alguém ganhando,
  "Time N venceu · chamar o próximo" (na cor do colete de quem ganha); empatado,
  "Empatou · ir para a moeda". Assim não dá para dar a vitória para o time errado: se faltou
  um gol, corrige o placar antes. Encerrar antes do tempo pede confirmação (mostra o placar).
- **Cartões na escalação, compactos:** expulso mostra só o vermelho (sem o tempo do azul);
  cartões repetidos viram um com a contagem (amarelo ×2).
- **Gol contra:** no "Gol do Time X" tem "Foi gol contra" (a lista passa a mostrar o outro time) e,
  tocando no jogador, a opção "Gol contra". Conta no placar de quem se beneficiou, o goleiro do
  time de quem fez sofre o gol, aparece no resumo como "NOME (contra)" no lado de quem ganhou o
  gol e **não entra na artilharia** (não soma nem subtrai os gols do jogador). Vale para pelada e torneio.
  O som é o mesmo do gol.
- **Escalações sem bolinhas de gol:** os gols aparecem só no resumo de gols (em cima); ao
  lado do nome ficam só a marca "subiu" e os cartões, para a linha não estourar.
- **Resumo de gols** (abaixo do placar, como nos placares de futebol): a bola no meio,
  quem fez de cada lado e o **minuto** ("LUCAS 6', 9'"; depois do tempo, "10+1'").
- **Gol marcado errado:** tocar no **jogador** no resumo de gols abre um modal para remover
  (com mais de um gol, escolhe qual),
  com confirmação; sai do placar, da artilharia e do goleiro menos vazado.
- **Sons de apito** (gerados pelo próprio app, funcionam offline): um silvo no play e
  dois curtos + um longo no fim. A cada gol, o áudio de gol (`public/sons/goal.mp3`, por enquanto só um);
  no gol que decide, o apito final vem depois do áudio.
  Se o áudio não tocar, usa uma fanfarrinha de 8 bits. No empate, a moeda tem som
  (peteleco, girando no ar e caindo). Dá para desligar tudo nos Ajustes.
- **Tela sempre ligada** na pelada e no torneio (Wake Lock): o celular não bloqueia no meio do
  jogo. Com o celular bloqueado na mão, o navegador congela o app e o apito não toca: só um app
  nativo (notificação agendada com som de apito) resolveria isso.

- **Transição de fim de partida (na própria tela de Jogo, nas escalações):** por ~4 s,
  cada coluna mostra **venceu / perdeu / empatou**; a de quem fica brilha; na de quem
  sai, um **X vermelho** se desenha sobre os nomes, que dão lugar aos do time que entra
  (mesmo colete, "↑ entra").

### 3.5.1 Resumo da pelada e compartilhar
- **Seleção da pelada:** contador de **vitórias por jogador** (em qualquer time; o time muda,
  a vitória fica com o jogador). A seleção são os N com mais vitórias (N = jogadores na linha);
  desempate: mais gols, menos jogos. Painel na Tabela; tocar no jogador gera a **ficha** dele.
- **Compartilhar resumo** (botão no topo da Tabela; também "Compartilhar e encerrar" ao encerrar a
  pelada): gera a imagem e **abre direto o compartilhar do celular** (sem modal, sem texto):
  - **Seleção da pelada** (1080×1920, 9:16 = tela inteira do celular, status/stories): a seleção
    ocupa a imagem toda, num campo em
    perspectiva com fundo de estádio; cada jogador é uma peça (camisa sem número, plaquinha do
    nome; a bolinha aparece só no artilheiro, se ele está na seleção) e o goleiro menos vazado fica no gol (sem goleiro fixo, a
    peça do gol aparece só com o "G", sem nome). As peças se ajustam
    ao tamanho do time (testado com 4, 5 e 10 na linha).
  - Embaixo do campo, na mesma imagem, a **Chuteira de Ouro** (artilheiro e gols) e a **Luva de
    Ouro** (goleiro menos vazado e gols sofridos): troféus dourados desenhados no app, em pedestal.
- **Artilheiro: sai um só.** Desempate: mais gols → **menos jogos** (melhor média) → **mais
  vitórias** → **menos cartões** (o vermelho dos 2 amarelos não conta de novo) → **quem chegou
  primeiro** ao número de gols (nunca empata). Gol contra não conta. Quando houve empate em gols,
  a imagem e o texto mostram o critério ("2 gols · desempate: menos jogos"); a Tabela lista a ordem.
- Os destaques de zoeira (Pé de Rato, Açougueiro etc.) foram testados e **retirados**.
- **Ficha do jogador** = **cartinha do FIFA preta e dourada** (TOTW): "nota" no canto = vitórias,
  "SEL" se está na seleção (senão a posição no dia), camisa com a inicial, nome entre filetes
  dourados e atributos em duas colunas (VIT JOG GOL | EMP CRT APR).

### 3.6 Limite de vitórias seguidas (opcional)
- Desligado por padrão. Se ativado, define-se quantas vitórias seguidas.
- Ao atingir o limite, **sai só o time vencedor** (vai para o fim da fila); o perdedor fica.

### 3.7 Goleiro
- Por padrão **não há goleiro fixo** e goleiro **não entra na contagem** da linha.
- Dá para cadastrar **vários goleiros fixos**; aparecem como **(G)**.
- **Encerrar a pelada** apaga a lista, os goleiros, os times e a tabela do dia; as outras
  configurações (tempo, gols, coletes, sons...) continuam para a próxima.
- **Um em cada gol.** Quando um time perde, o goleiro **fica em campo** e defende
  o time que entra. O vencedor pode **trocar** de goleiro com o outro gol.
- **Só um goleiro:** ele fica com o time que continua em campo; o outro gol fica
  sem goleiro fixo (alguém da linha se vira, como hoje).
- **Mais de dois:** os extras ficam de reserva e podem ser escolhidos para um gol.

### 3.8 Alguém vai embora
- Se estava **em campo**: o primeiro da fila entra no lugar dele.
- Se estava **na fila**: sai da fila.
- Em ambos os casos a fila **sobe uma posição** e os blocos se reorganizam sozinhos.

### 3.8.1 Coletes
- Cada lado do campo tem uma **cor de colete**, escolhida no início (padrão: **Vermelho x Azul**).
- O time que entra **veste o colete do time que saiu**, então em campo é sempre
  Vermelho contra Azul (ou as cores escolhidas).
- Na tela aparece **Time N** e, embaixo, a camisa e o nome da cor do colete.
- Times na fila não têm colete: aparecem com camisa cinza e "Próximo", "2º da fila"...
- A Tabela do dia continua numerando os times (Time 1, Time 2...).

### 3.8.1.1 Cor dos times x cor dos coletes
- **Em campo** o time aparece com o **colete** (vermelho/azul): é o que ele está vestindo.
- **Na Tabela**, cada time (Time 1, Time 2…) tem **cor própria**, sempre diferente das cores
  dos coletes, nos resultados e na classificação.
- Quadro **"Vermelho x Azul"** no topo da Tabela: vitórias de cada colete na pelada e empates.

### 3.8.2 Artilharia e goleiro menos vazado
- Ao marcar um gol, o app pergunta **quem fez** (jogadores do time) ou "Não sei".
- **Artilharia:** gols por jogador no dia, incluindo a partida em andamento.
- **Goleiro menos vazado:** cada gol conta contra o goleiro fixo do outro gol.
  Ranking pela **média de gols sofridos por jogo** (partidas terminadas).

### 3.8.3 Cartões
- Toque no jogador em campo → menu com Gol, Amarelo, Vermelho, Azul e Foi embora.
- **Vermelho:** sai só da partida (time joga com um a menos); depois segue normal na fila.
- **Dois amarelos** na mesma partida viram vermelho.
- **Azul:** fica fora por um tempo (padrão 2 min, ajustável); contagem ao lado do nome
  (anda com o cronômetro da partida) e o celular vibra quando ele pode voltar.
- A Tabela mostra os cartões do dia por jogador.

### 3.9 Regra geral
- **Nunca existem dois times incompletos** ao mesmo tempo (garantido pela fila única).

### 3.10 Exemplo completo (4 na linha, 10 jogadores)

Início:
- Time 1: João, Carlos, Bruno, Marcos
- Time 2: Rafael, Daniel, Junior, Landim
- Time 3: Mano, Lucas *(faltam 2)*

Partida 1: Time 1 x Time 2 → **Time 1 perde**
- Time 3 completa com os 2 primeiros do Time 1 → **Mano, Lucas, João, Carlos**
- Sobra do Time 1 vai para a fila → **Bruno, Marcos** *(faltam 2)*

Partida 2: Time 2 x Time 3 (novo) — fila: [Bruno, Marcos]

Se chegar o Pedro agora → entra no time de Bruno e Marcos (faltando 1).

### 3.11 Registro no papel (para reproduzir no app)
- Cada coluna é um time formado; as divisões representam as partidas.
- Vai escrevendo para a direita; quando acaba a folha, continua embaixo.
- No app isso vira o **histórico da sessão** (sequência de partidas/times).

## 4. Perguntas em aberto


### Respondidas
- [x] Cascata → a espera é uma fila única de jogadores cortada em blocos.
- [x] Limite de vitórias atingido → sai só o vencedor.
- [x] Goleiros fixos → vários; um em cada gol, ficam em campo; vencedor pode trocar.
- [x] Padrão de partida → 10 min ou 2 gols.
- [x] Time incompleto → completa com quem perdeu (só os que faltam, ordem da lista).
- [x] Sobra do time que perdeu → vira um novo time incompleto no fim da fila.
- [x] Empate → saem os dois se houver 2 completos fora; senão cara ou coroa decide quem sai.
- [x] Fim de partida → por tempo ou por gols.
- [x] Limite de vitórias → opcional, configurável.
- [x] Goleiro → não conta; opção de goleiro fixo marcado como (G).
- [x] Alguém vai embora → a lista sobe em cascata.
- [x] Atrasado → completa o time que está faltando gente.
- [x] Nunca há dois times incompletos.
- [x] Usuário → só o organizador, no celular.

## 5. Funcionalidades (rascunho)

### MVP
1. Criar a sessão do dia e definir jogadores na linha.
2. Adicionar nomes na lista de chegada (com reordenação/remoção).
3. Gerar os times automaticamente pela ordem de chegada.
4. Tela "Em campo": Time A x Time B + fila de espera.
5. Botões "Time A perdeu" / "Time B perdeu" / "Empate" → aplicam o rodízio automaticamente.
6. Empate → animação de cara ou coroa.
7. Adicionar atrasado a qualquer momento (completa o time incompleto).
8. Remover quem foi embora (lista sobe em cascata).
9. Cronômetro e placar da partida (fim por tempo ou gols).
10. Configurações da sessão: jogadores na linha, tempo, gols, limite de vitórias
    (opcional), goleiro fixo (opcional).
11. Histórico das partidas da sessão.
12. ~~Desfazer última ação~~ (removido: bagunçava a fila; gol errado se remove na lista de gols).

### Depois
- Cadastro de jogadores fixos (autocomplete na lista).
- Histórico e estatísticas.
- Compartilhar a tela para o grupo (link / WhatsApp).

## 6. Tecnologia (decidido: PWA)

- Uso: **só o organizador, no celular, na quadra**.
- **Sem banco de dados**: funciona por sessão (a pelada do dia).
- Proposta: app web (PWA) instalável no celular, funcionando offline, guardando a
  sessão no armazenamento do próprio navegador (para não perder tudo se fechar a
  aba ou a tela apagar). Botão "Nova sessão" limpa tudo.
- Stack a confirmar (ex.: React + Vite, ou HTML/JS puro).

## 6.1 Visual (decidido)

Estilo inspirado no **Brasfoot** (jogo de técnico de futebol), sem copiar:
- fundo de gramado listrado verde;
- barras azul-marinho (#10223A) com títulos amarelos (#FFD23F);
- times como tabelas brancas com linhas alternadas e número do jogador;
- camisa colorida por time;
- placar estilo painel (fundo preto, dígitos amarelos);
- botões grossos com sombra (visual retrô);
- tela "Tabela" com resultados e classificação do dia (J, V, E, D).
- Fontes: Barlow Condensed (títulos/números) + Barlow (texto).

## 6.2 Telas (protótipo)

https://claude.ai/artifact/33Ay4WiDStBbBRTJi3hJkP

1. Configuração da pelada (linha, tempo, gols, limite de vitórias, goleiro fixo) —
   aparece ao criar a pelada e depois fica na aba **Ajustes** da barra de baixo
2. Lista de chegada (times montados automaticamente em blocos de N)
3. Em campo (cronômetro, placar, quem venceu / empate, próximo time)
4. Fila de espera (próximo time, time incompleto, atrasado, "foi embora")
5. Empate (cara ou coroa animado)
6. Histórico da sessão

## 7. Andamento

- [x] Lógica do rodízio (`src/logic/pelada.ts`) com testes (`npm test`)
- [x] Telas: Ajustes, Lista/Fila, Jogo (cronômetro, placar, empate com moeda), Tabela
- [x] Pelada salva no celular (localStorage)
- [ ] Deixar instalável (PWA: manifest, ícone, offline)
- [ ] Publicar num endereço para abrir no celular

## 8. Estrutura do código

```
src/
  types/        tipos do domínio (pelada.ts) e do app (app.ts)
  logic/        regras puras, uma por assunto: sessao, jogadores, fila,
                partida, empate, goleiros, campo (movimentação), lado
    __tests__/  testes de cada regra
  store/        estado do app: reducer, cronômetro, armazenamento, hook usePelada
  utils/        formatação, nomes, cores dos times
  components/   peças visuais reutilizáveis (Barra, Camisa, Icone, Passo, Chave, Aviso)
  telas/        Config, Lista, Tabela e jogo/ (Jogo, Placar, Escalacoes, Empate)
```

## 9. Torneio (planejamento)

### 9.1 Decisões até aqui
- **Formato escolhido na hora**, ao criar o torneio: **pontos corridos**, **mata-mata** ou
  **grupos + mata-mata**.
- **Times cadastrados time a time** (não são sorteados): nome, cor e jogadores. Os
  primeiros nomes (quantos jogam na linha) são os **titulares**; os demais são **reservas**
  daquele time. Um botão **"Fechar time"** confirma que acabaram os jogadores dele.
  Dá para **editar** o time depois (fora de um jogo em andamento).
- **Sorteio aleatório** do que depende de sorte: grupos, chave do mata-mata e ordem dos jogos.
- **Empate no mata-mata: pênaltis**, registrados cobrança a cobrança.
- **Cada time tem nome e cor**, escolhidos na criação (o app sugere "Time 1", "Time 2"…
  e cores diferentes; dá para trocar). Todas as mensagens usam o nome do time:
  "**Galácticos venceu**", "Pênaltis: **Galácticos** 4 x 3 **Real Várzea**".
- **30 cores** para os times (cada time uma, sem repetir), então o torneio aceita até 30 times.
- **Reservas:** cada time tem titulares (os da linha) e reservas.
- **Substituição durante o jogo:** "Substituir" → escolhe quem sai (em campo) → escolhe quem
  entra (reserva). Quem sai **não é removido do time**: só vai para o banco de reservas e
  pode voltar numa próxima substituição.
- **Duração: depende da competição.** O torneio fica salvo no celular até ser encerrado,
  então pode durar um dia ou várias semanas. É separado da pelada do dia: dá para ter
  uma pelada e um torneio guardados ao mesmo tempo.

### 9.2 Como entra no app
- Tela inicial nova: **Pelada** ou **Torneio** (continuar o que estiver em andamento ou criar).
- Torneio tem as próprias abas: **Jogos**, **Jogo**, **Tabela** (classificação/chave),
  **Ajustes**.

### 9.3 Fluxo
1. **Criar:** nome do torneio, formato, jogadores na linha, tempo da partida e, opcional,
   **"Gols terminam a partida"** (desligado por padrão: a partida vai até o fim do tempo).
2. **Regras do torneio** (configuráveis): turno único ou ida e volta, nº de grupos e
   quantos passam, disputa de 3º lugar, nº de cobranças de pênalti, limite de substituições.
3. **Times:** cadastra cada time (nome, cor, goleiro, jogadores em ordem: titulares e reservas) →
   "Fechar time" → próximo. Cores não se repetem. Dá para editar depois.
4. **Sorteio:** grupos / chave / ordem dos jogos, com "sortear de novo" antes de confirmar.
5. **Tabela de jogos:** o app gera todos os jogos da fase (ordem pensada para ninguém
   jogar duas seguidas, quando possível).
6. **Jogar:** escolhe o próximo jogo → mesma tela de Jogo da pelada (placar, cronômetro,
   gols com autor, cartões, goleiro, sons), com o nome e a cor de cada time e o botão
   **Substituir** (titular ⇄ reserva).
7. **Fim do jogo:** resultado entra na classificação / chave; no mata-mata, empate abre
   os pênaltis.
8. **Campeão:** tela de campeão + artilheiro e goleiro menos vazado do torneio.

### 9.4 Regras de cada formato
- **Pontos corridos:** todos contra todos (turno único; opção de turno e returno).
  Vitória 3, empate 1, derrota 0. Desempate (como o Brasileirão, sem gols pró e confronto
  direto): pontos → vitórias → saldo de gols → menos vermelhos → menos azuis → menos
  amarelos → sorteio.
- **Mata-mata:** chave a partir do sorteio. Se o número de times não for potência de 2,
  alguns passam direto na 1ª rodada ("bye"). Empate → pênaltis.
- **Grupos + mata-mata:** times sorteados nos grupos; pontos corridos dentro do grupo;
  os N primeiros de cada grupo vão para o mata-mata (1º de um grupo x 2º do outro).

### 9.5 Pênaltis
- Alternado, número de cobranças configurável (ex.: 3 ou 5); depois, alternadas até
  alguém errar.
- Cada cobrança: quem bateu e **gol / perdeu**. O app avisa quando já está decidido.
- Não conta para artilharia nem para goleiro menos vazado.

### 9.4.1 Mata-mata em ida e volta (opcional)
- Como na **Libertadores**: cada confronto tem **ida e volta** com o **mando invertido**; vale o
  **placar agregado** (não existe gol fora de casa). A ida pode empatar (sem pênaltis); se o
  **agregado** empatar, **prorrogação** (se ligada, 9.4.2) e/ou **pênaltis no fim da volta**. A volta só é liberada depois da ida.
- **Final em jogo único** (padrão, como na Libertadores) ou também ida e volta. Disputa de 3º
  lugar sempre jogo único. Vale para "mata-mata" e para o mata-mata de "grupos + mata-mata".
- Na tela: "Semifinal 1 · ida/volta"; no jogo de volta aparecem a ida e o **agregado**; na chave,
  cada confronto numa caixa com **ida · volta · agregado**.

### 9.4.2 Tempos, intervalo e prorrogação
- **Tempos regulamentares:** quantos (1, 2, 3…), a duração de cada um e o **intervalo** entre eles
  (0 = sem intervalo). Cada tempo conta do zero no relógio; acabou um tempo: "Fim do 1º tempo"
  com **Intervalo** (contagem e apito no fim), **Começar o 2º tempo** ou **Dar acréscimos**.
- **Prorrogação no mata-mata** (opcional): quantos tempos e a duração de cada um. Só entra quando o
  desempate exige, no fim do último tempo regulamentar:
  - **Jogo único** empatado: prorrogação (se ligada) ou direto para os **pênaltis** (se desligada).
  - **Ida e volta:** a **ida** nunca tem prorrogação nem pênaltis (pode terminar empatada). Na
    **volta** vale o **agregado** (ida + volta, **sem gol fora de casa**): empatado → prorrogação
    (ligada) ou pênaltis (desligada); com vencedor no agregado, acaba.
  - Empatou também na prorrogação (no placar, ou no agregado na volta): **pênaltis**.
- O gol guarda em que tempo saiu ("2ºT 7'", "Pror. 1ºT 3'"); o cartão azul conta o jogo todo
  (o intervalo não conta). Fase de grupos e pontos corridos nunca têm prorrogação.

### 9.4.3 Chave como na Copa e mata-mata em tela cheia
- **Chave como na Copa** (grupos + mata-mata; ligada por padrão): dois lados que só se encontram na final.
  - **Passam 2**, com 2, 4 ou 8 grupos: igual à Copa (lado 1: 1ºA x 2ºB, 1ºC x 2ºD…; lado 2: 1ºB x 2ºA,
    1ºD x 2ºC…). O 1º e o 2º do mesmo grupo ficam em lados opostos.
  - **Passam 2**, outros números de grupos: lado 1 = 1º dos grupos A, C, E… e 2º dos B, D…; lado 2 o
    contrário. Sobram vagas: **W.O.** para os 1º com **melhor campanha** daquele lado.
  - **Passa 1**: 1ºA x 1ºB, 1ºC x 1ºD… (2 grupos = direto a final); não fechando, W.O. para os campeões
    de grupo com melhor campanha.
  - **Melhor campanha** (entre grupos): pontos por jogo, vitórias por jogo, saldo por jogo, disciplinar,
    sorteio (por jogo, porque os grupos podem ter tamanhos diferentes). A vaga só sai quando os grupos acabam.
  - 3 ou mais passando por grupo, ou a opção desligada: cruzamento simples de antes.
- **Tela cheia** ("Ver chave do mata-mata" em Jogos, "Tela cheia" na Tabela): lado 1 à esquerda, lado 2 à
  direita, final no meio com o troféu e o campeão; 3º lugar embaixo; quem passa por W.O. aparece tracejado.
  Abre ajustada à tela (zoom mínimo legível) e centralizada na final; botões − / +; deitar o celular mostra tudo.
- **Depois:** melhores terceiros (a "melhor campanha" já serve para isso).

### 9.5.1 Substituições e cartões no torneio
- **Substituições:** ilimitadas por padrão ou com um máximo por jogo (configurável).
  Quem sai vai para o banco e pode voltar.
- **Cartão vermelho:** sai do jogo **sem poder ser substituído** (o time fica com um a menos)
  e fica **suspenso no próximo jogo** do time.
- **Dois amarelos no mesmo jogo** viram vermelho; o vermelho **zera** os amarelos acumulados.
- **Amarelos acumulam no torneio:** ao chegar no **3º amarelo**, fica **suspenso no próximo
  jogo** e a contagem **zera**.
- O app avisa quem está suspenso e não deixa ele entrar em campo naquele jogo.

### 9.5.2 Jogos simultâneos
- Regra **Campos** (1 a 4): quantos jogos podem acontecer ao mesmo tempo (padrão 1).
- Cada jogo em andamento fica num campo ("Campo 1", "Campo 2"), com placar, cronômetro,
  gols, cartões e substituições próprios.
- **Um time não joga dois jogos ao mesmo tempo**: o app só oferece jogos sem time ocupado.
- Aba **Ao vivo**: faixa no topo para trocar entre os jogos em andamento. Ao encerrar um,
  continua no outro que ainda está rolando.
- **Cada grupo no seu campo** (grupos + mata-mata com 2+ campos, ligado por padrão):
  Grupo A sempre no Campo 1, Grupo B no Campo 2… (mais grupos que campos: revezam).
  A lista mostra o próximo jogo de cada campo livre. O mata-mata usa qualquer campo.

### 9.6 O que reaproveita da pelada
| Já temos | No torneio |
|---|---|
| Lista de jogadores + aviso de nome repetido | Cadastro dos jogadores de cada time |
| "Foi embora" (troca com o 1º da fila) | Substituição (troca com um reserva, que fica no time) |
| Tela de Jogo (placar, cronômetro, sons, fim por tempo/gols) | Cada jogo do torneio |
| Gols com autor, remover gol, bolinhas | Igual |
| Cartões (amarelo, vermelho, azul) | Igual + suspensões (ver 9.5.1) |
| Goleiros fixos | Cada time tem o próprio goleiro (cadastrado no time) |
| Coletes, camisas coloridas | Cor fixa de cada time, escolhida na criação |
| Artilharia, goleiro menos vazado, cartões do dia | Estatísticas do torneio |
| Moeda (cara ou coroa) | Sorteio de quem começa os pênaltis |
| Modal de confirmação, salvar no celular, migração de dados | Igual |

O que muda: na pelada os times **se refazem** a cada partida (fila); no torneio os
times são **fixos** e os jogos vêm de uma **tabela**. A lógica nova fica em
`src/logic/torneio/` (sorteio, tabela de jogos, classificação, chave, pênaltis).

### 9.7 Ordem de construção
1. ✅ Lógica pura + testes (`src/logic/torneio/`, tipos em `src/types/torneio.ts`): sorteio,
   tabela de jogos (pontos corridos), classificação com desempates, chave do mata-mata
   com byes, grupos, pênaltis, substituições e suspensões.
2. ✅ Tela inicial Pelada/Torneio e criação do torneio (formato, regras, times, sorteio).
3. ✅ Tela de jogos (próximo jogo, jogar, em andamento, campeão) e o Jogo do torneio
   (placar e lista de gols reaproveitados, banco, suspensos, substituição, fim de jogo e pênaltis).
4. ✅ Aba Tabela: classificação (pontos corridos e grupos, com quem passa destacado), chave do
   mata-mata (colunas por rodada, rolando de lado, 3º lugar embaixo) e pênaltis no placar.
5. ✅ Campeão (painel em Jogos e Tabela) e estatísticas do torneio: artilharia (com o time),
   goleiro menos vazado e cartões (amarelos acumulados x/3 e quem está suspenso).

### 9.8 Perguntas em aberto
- [x] Times: cadastrados time a time; primeiros nomes = titulares, resto = reservas;
      "Fechar time"; editável.
- [x] Cores e nomes: cada time escolhe na criação; mensagens usam o nome do time.
- [x] Substituições: ilimitadas ou máximo configurável; quem sai vai pro banco.
- [x] Turno/returno, grupos, 3º lugar, cobranças de pênalti: configuráveis.
- [x] Vermelho suspende o próximo jogo; 3 amarelos acumulados suspendem e zeram.
- [x] Sorteio (grupos/chave/ordem): aleatório.
- [x] Expulso não pode ser substituído: o time fica com um a menos.
- [x] 2 amarelos no jogo = vermelho; o vermelho zera os amarelos acumulados.
- [x] Cada time tem o próprio goleiro, cadastrado à parte (não conta na linha).

## 10. Torneio compartilhado (nuvem)

### 10.1 Por quê
Com jogos simultâneos, cada campo tem alguém marcando. Salvo só no celular, cada um
veria só o seu jogo. O torneio passa a ficar na **nuvem (Firebase)**, sincronizado em tempo
real e **funcionando sem internet** (as marcações sobem quando o sinal voltar).
A **pelada continua só no celular**.

### 10.2 Papéis
- **Organizador:** cria o torneio, cadastra times, sorteia, muda regras, vê e controla tudo.
  Compartilha um **código** (ou link) para os outros entrarem.
- **Mesário de campo:** entra com o código, escolhe o campo dele e marca os jogos daquele
  campo (gols, cartões, substituições, encerrar, pênaltis). Vê tudo dos outros campos ao vivo.
- **Mais grupos que campos** (cada grupo no seu campo): os grupos se revezam (A→1, B→2, C→1…),
  mas o campo que termina os jogos dos seus grupos passa a pegar jogos dos outros grupos (não fica
  parado esperando o mata-mata).
- **Campo travado:** quem pega um campo trava para os outros mesários (aparece "Campo 2 · Nome"
  em cinza). Para trocar de mesário: ele toca em "Só acompanhar" (libera) ou o organizador toca
  em **Liberar** na lista de mesários (Ajustes). Nuvem: `torneios/{código}/campos/{n}`; as regras
  garantem que só o dono ou o organizador soltam.
- Precisa entrar com o Google (desde 06/10): conta anônima não lê nem marca o torneio.

### 10.3 Como os dados ficam na nuvem (sem conflito entre celulares)
- `torneios/{código}`: base do torneio (regras, times, grupos, jogos) — só o organizador grava.
- `torneios/{código}/partidas/{jogo}`: jogo em andamento (placar, gols, cartões, escalação,
  cronômetro, campo) — cada mesário grava só o do seu campo.
- `torneios/{código}/resultados/{jogo}`: resultado de jogo encerrado (com a hora em que
  acabou, que define a ordem para as suspensões).
- Cada celular junta as três partes e usa a mesma lógica de hoje (`src/logic/torneio`).

### 10.4 Etapas
1. ✅ Lógica de sincronização (separar / juntar / o que mudou) + testes (`logic/torneio/sincronia.ts`).
2. ✅ Camada "nuvem" (`src/nuvem/`): Firebase e uma de teste (servidor local
   `testes-e2e/servidor-nuvem.mjs`), escolhida pelo `.env.local` / localStorage.
3. ✅ Telas: criar (já compartilhado) / entrar com código ou link de convite, campo do
   mesário, travas por papel, faixa com código e "sem internet".
4. ✅ Teste com dois "celulares" (organizador + mesário) no navegador.
5. Ligar no Firebase de verdade (projeto do usuário) e testar.

## 12. Campo pago (pelada)
- **Ajustes → Campo pago:** valor do campo; divisão **proporcional** (campo ÷ quem está na
  lista, arredondado para cima no centavo; ex.: R$ 120 ÷ 12 = R$ 10) ou **valor por pessoa**
  (ex.: R$ 15; o que passa do campo é sobra para o caixa); **chave Pix** e nome de quem recebe
  (a cidade do Pix vai sempre "BRASIL": o banco não confere); opção **"Já paguei" já vale como pago** (sem conferir).
- **Pix copia e cola + QR Code** gerados no próprio app (BR Code do Banco Central), com o valor.
  O dinheiro vai **direto** de quem paga para o organizador: **sem taxa**, o app não toca no dinheiro.
- **Lista:** faixa "💰 Campo · R$ 10 cada · 7/12 pagos" → janela com o QR, "Copiar Pix",
  **"Link p/ grupo"** e todos os pagantes (toque = pago/desfaz; amarelo = avisou).
- **Link de pagamento** (`?pagar=CÓDIGO`, sem instalar nada): mostra o valor, o QR e os nomes; a
  pessoa paga e toca no **próprio nome → "Já paguei"** → no app do organizador fica amarelo
  ("avisou · confirmar") na hora; ele confere no banco e confirma (verde, aparece no link também).
- **Nuvem:** `cobrancas/{código}` (o organizador publica) + `avisos/{jogador}`. Regras: quem tem
  o link só marca "avisou" (ou "pago" com a confirmação automática); só o organizador confirma;
  ninguém de fora desfaz um "pago".
- Quem foi embora depois de pagar continua na conta. **Depois:** confirmação automática via
  empresa de pagamento (com taxa).

### 12.1 Login com Google e caixa da pelada
- **Login com Google é a primeira tela** (quem já entrou vai direto para o início). Exceção: o link
  de pagamento (`?pagar=`) abre sem login. Ao entrar, a conta anônima do celular **vira** a conta
  Google (mesmo uid: torneios e cobranças continuam seus); se essa conta já existe (outro celular),
  troca para ela. "Sair" volta para a tela de login.
- **Sem janela nova** (no celular a janela separada trava): login de um toque do Google (folha por
  cima do app, Google Identity Services); se o celular não mostra a folha, vai para a página do
  Google **na mesma tela** e volta (redirect). O `authDomain` no site é o próprio domínio
  (`dois-ou-dez.web.app/__/auth/`), senão Safari/Chrome bloqueiam a volta. No cliente OAuth
  (Google Cloud → Credenciais): origem `https://dois-ou-dez.web.app` e redirecionamento
  `https://dois-ou-dez.web.app/__/auth/handler`.
- **Foto do Google** ao lado da logo em todas as telas.
- **Caixa da pelada** (cartão na tela inicial, precisa de login): **saldo** + lançamentos
  (data, descrição, +entrada / −saída); botões "+ Entrada" e "− Saída"; tocar apaga.
- No campo pago: **"Lançar no caixa"** (uma vez por pelada) → entra o que foi pago e sai o campo
  (ex.: R$ 180 − R$ 120 = +R$ 60).
- Nuvem: `usuarios/{uid}/caixa/{id}`; regra: só o dono lê e escreve. Fica no perfil: troca de
  celular, entra com o Google e o caixa está lá.

### 12.1.1 Cancelar a pelada
- **"Cancelar pelada"** no fim da tela "Nova pelada" e no fim dos Ajustes (com a pelada rolando):
  descarta tudo do dia (lista, jogos, pagamentos) **sem salvar**: nada vai para o histórico nem
  para o caixa, e o link de pagamento é apagado (quem abrir vê "Link não encontrado").
- Os **ajustes voltam a ser os de antes** daquela pelada (ex.: o campo pago ligado só para teste).
  Diferente de **Encerrar** (na Tabela), que guarda no histórico e mantém os ajustes.
- **Encerrar ou cancelar a pelada volta para a tela inicial.** No torneio, quando sai o campeão
  (final confirmada), o app volta para o início, e o cartão do torneio mostra "🏆 campeão" ("Ver");
  abrir de novo um torneio encerrado mostra a tabela e a chave normalmente.

### 12.2 Histórico das peladas e temporada
- Ao **encerrar** a pelada (com login), ela vai para `usuarios/{uid}/peladas/{id}`: data, dia e o
  estado só com as partidas terminadas (a em andamento e o campo pago ficam de fora). Peladas
  encerradas antes disso não voltam.
- Tela **Histórico** (cartão no início): aba **Temporada** (vitórias, artilharia com 👑 vezes
  artilheiro do dia, goleiros por média de gols sofridos) e aba **Peladas** (toca para ver os
  jogos e destaques, compartilhar a seleção de novo ou apagar).
- O mesmo jogador em peladas diferentes é reconhecido **pelo nome** (sem acento/maiúsculas).

## 13. App de loja (Capacitor)

O **mesmo código** do site vira app Android (e iPhone depois) com o Capacitor; o site continua
no ar para quem não instalar.
- **Identificador:** `app.doisoudez` (dá para trocar até publicar na loja; depois, nunca mais).
- **Login do Google:** no app, pela tela de contas do próprio celular (`@capacitor-firebase/authentication`;
  o Google não deixa entrar pelo navegador interno). App Android registrado no Firebase com a impressão
  digital (SHA-1/SHA-256) da chave de teste; `android/app/google-services.json`.
- **Links** (pagamento, convite do torneio) apontam para `https://dois-ou-dez.web.app` (no app o
  endereço interno é "localhost"). **Compartilhar** (imagens e textos) usa o do celular.
- Service worker só no site (no app já está tudo dentro).
- **Ferramentas** (na pasta do usuário, sem instalar no sistema): Node 22, Java 21 e Android SDK em
  `~/.local/opt` e `~/Android/Sdk`; `source ~/.local/opt/android-env.sh`. Gerar o APK de teste:
  `npm run android` → `android/app/build/outputs/apk/debug/app-debug.apk`.
- **Ícone e abertura:** gerados da logo (`assets/` → `npx @capacitor/assets generate --android`).
- **Próximos:** apito com o celular bloqueado (notificação agendada com som), chave de assinatura
  da loja (a de teste não serve para publicar) e conta na Play Store (US$ 25).

## 11. Melhorias para comercializar (depois)

Hoje já dá para usar. Antes de vender para clientes:

**Indispensável**
1. **Conta de verdade do organizador** (Google / e-mail) no lugar do login anônimo: não
   perde o torneio ao trocar de celular; vê os torneios dele em qualquer aparelho.
2. **Mesários aprovados pelo organizador**: quem entra com o código fica aguardando; só
   aprovados marcam jogos (garantido pelas regras do Firebase).
3. **Código de convite separado do torneio**: id longo e secreto para o torneio; o código
   curto é só convite, que o organizador pode trocar/desativar se vazar.
4. **App Check**: só o app oficial acessa o Firebase (evita abuso e custo inflado).

**Operação**
5. Dois projetos Firebase: **teste** e **produção**.
6. **Custos**: alerta de gastos, limpeza de torneios antigos, modelo de preço (assinatura?).
7. **LGPD**: política de privacidade, termos de uso, excluir dados a pedido.
8. **Monitoramento de erros** e **backup**.

**Mais à frente**
9. Pelada na nuvem também (histórico e estatísticas ao longo das semanas).
