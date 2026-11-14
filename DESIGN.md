---
version: 1
name: dois-ou-dez
description: "Visual de jogo de futebol de computador dos anos 2000 (inspirado no Brasfoot): fundo de gramado listrado em verde, painéis brancos com borda grossa azul-marinho e uma sombra dura de 3px embaixo, cabeçalhos azul-marinho com texto amarelo, botões amarelos grossos e placares de LED preto com dígitos amarelos. Tipografia condensada em caixa alta (Barlow Condensed) para títulos, botões e números; Barlow para o texto corrido. O amarelo é a cor de ação e de destaque; vermelho só para perigo e cartão; verde para confirmado."

colors:
  navy: "#10223a"          # cabeçalhos, barra de baixo, texto principal
  borda: "#0b1a2c"         # toda borda e toda sombra dura
  amarelo: "#ffd23f"       # ação principal, título no azul, item ligado
  verde: "#2e9e44"         # confirmado, gol, ligado
  vermelho: "#c8352b"      # perigo, cartão vermelho, erro
  azul: "#1e5fbf"          # foco do campo de texto, botão secundário azul
  grama: "#1a5e2a"         # faixa escura do gramado
  grama2: "#1f6a31"        # faixa clara do gramado
  fundo: "#174f25"         # fundo atrás do app
  zebra: "#eef2e4"         # linhas pares das listas
  mut: "#4e5b68"           # texto secundário no branco
  texto-no-escuro: "#c9d4e3"   # subtítulo no azul ou no LED (hoje sem variável)
  divisoria: "#e3e8d6"     # linha entre blocos de um painel (hoje sem variável)
  led: "#0a0f14"           # fundo do placar
  branco: "#ffffff"

typography:
  titulos-e-numeros: "Barlow Condensed 700/800, caixa alta, letter-spacing .6–1px"
  texto: "Barlow 500/600"
  escala: [12, 13, 14, 15, 16, 18, 20, 22, 26, 30, 34, 40, 44]   # px; nada abaixo de 12; números gigantes do placar (64) à parte; a tela de login tem os seus

rounded:
  pequeno: 3px     # tag
  padrao: 5px      # botão, chip, campo
  painel: 6px      # painel, LED
  redondo: 50%     # bolinha de cor

elevation:
  dura: "0 3px 0 var(--borda)"        # painel, botão, campo, chip
  apertado: "0 1px 0 var(--borda)"    # botão pressionado (desce 2px)
---

## Visão geral

O Dois ou Dez parece um **manager de futebol de PC**: tudo fica sobre um **gramado listrado** (`grama`/`grama2`), e cada bloco
é um **painel branco** com borda de 2px `borda`, canto de 6px e **sombra dura** de 3px, sem desfoque. O cabeçalho do painel
(`.ph`) é `navy` com o título em `amarelo`, em Barlow Condensed caixa alta.

O **amarelo** é a única cor de ação: botão principal, item escolhido (`.chip.on`), aba ativa na barra de baixo, títulos
sobre o azul. **Vermelho** só para o que é perigoso ou disciplinar (apagar, cartão, erro). **Verde** para o que deu certo ou
está ligado. O **placar** é um LED preto (`led`) com dígitos amarelos e o relógio em vermelho quando o tempo acaba.

**Características:**
- Sombra dura de 3px embaixo de tudo que se toca; ao tocar, o elemento **desce 2px** e a sombra encolhe para 1px.
- Bordas grossas (2px) em azul quase preto; nada de borda fina cinza.
- Caixa alta condensada em títulos, botões, abas, tags e números.
- Listas em zebra (`zebra`), linhas de 42px, nome cortado com reticências.
- Sem gradiente, sem vidro, sem sombra suave.

## Cores

- **Ação:** `amarelo` com texto `navy`. Botão branco (`.btn.w`) é a ação secundária; vermelho (`.btn.r`) a destrutiva.
- **Superfícies:** gramado → painel branco → linhas `zebra`; cabeçalhos e barras em `navy`; placar em `led`.
- **Texto:** `navy` no branco; `mut` para o secundário; `texto-no-escuro` para subtítulos no azul e no LED; `amarelo` para
  títulos no azul.
- **Estado:** `verde` (ok, ligado, gol), `vermelho` (perigo, vermelho, erro), `amarelo` (atenção, escolhido).

## Tipografia

- **Barlow Condensed** (700–800, caixa alta): título da barra (30px), cabeçalho de painel (16px), botões (19px; 17px no
  `.sm`), chips e abas (14–16px), números (`.num`).
- **Barlow** (500–600): texto corrido 15–16px, secundário 13px.
- **Relógios que correm** (tempo de jogo, acréscimo, intervalo): classe `.relogio` (`tabular-nums`), para não tremer. No placar e nas tabelas, não: os dígitos fixos alargam os números e cortam o nome dos times.

## Componentes

- **Barra** (`.bar`): `navy`, borda de baixo 3px `amarelo`, título amarelo e subtítulo `texto-no-escuro` em caixa alta.
- **Painel** (`.panel` + `.ph` + `.pb`): branco, borda 2px, canto 6px, sombra dura; corpo com 12px de respiro.
- **Botão** (`.btn`): 52px de altura (46px no `.sm`), largura total, canto 5px, borda 2px, sombra dura, desce ao tocar.
- **Botão de ícone** (`.ib`): 44×44 (38 no `.s`), branco com borda; sempre com `aria-label`.
- **Chip** (`.chip`): 40px, branco; ligado = amarelo.
- **Campo** (`.inp`): 52px, borda 2px, sombra dura; em foco a borda fica `azul`. Sempre dentro de um `<label>`.
- **Chave liga/desliga** (`.tg`): cinza → `verde`.
- **Tag** (`.tag`): 22px, canto 3px, `t-ok` verde, `t-warn` vermelho, `t-y` amarelo.
- **Barra de abas** (`.nav`): `navy` com borda de cima amarela; aba ativa amarela.
- **Janela** (`.modal`): fundo escuro .82, painel até 440px de largura.
- **Placar** (`PlacarLed`, `.led`): LED preto, dígitos amarelos, relógio vermelho no fim.

## Faça

- Use as variáveis (`var(--amarelo)`, `var(--navy)`…) em vez de escrever a cor.
- Toda ação tocável: 44px de altura no mínimo, sombra dura, desce ao tocar.
- Nome que pode ser longo: uma linha com reticências (`min-width: 0` no item flexível).
- Confirmação antes de apagar (o `confirmar` do app); texto do erro dizendo o que fazer.
- Siglas onde o espaço é curto (cabeçalho do jogo, chips); nome completo onde cabe (placar, tabelas do telão).

## Evite

- Cor nova escrita direto na tela (tons de amarelo-claro, cinzas soltos).
- Tamanho de fonte fora da escala.
- Sombra suave, gradiente, canto muito arredondado (acima de 6px) em painel ou botão.
- Botão flutuante no rodapé.
- Texto corrido em caixa alta (só títulos, botões, tags e números).

## Telas grandes

- Tablet e computador: o app aumenta inteiro (zoom em `utils/telaGrande.ts`); use `--largura-tela` e `--altura-tela`
  no lugar de `100vw`/`100dvh`.
- **Telão** (TV): só o painel, sem barra nem rodapé; tudo medido em `--u` (1/100 da largura, limitado pela altura).

## Lacunas conhecidas

- Não há estilo de passar o mouse (o app é de toque); o foco por teclado tem anel azul (`:focus-visible`).
