# Gestão do Futebol — Plano do Projeto

> Documento vivo: vamos atualizando conforme as regras forem sendo definidas.

## 1. Objetivo

Substituir o papel usado hoje para organizar a pelada: lista de chegada, montagem
dos times e rodízio de quem joga / quem espera.

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

### 3.3 Atrasados
- Entram no **final da fila**, completando o último bloco (ou formando um novo).

### 3.4 Empate
- **Com dois times completos esperando:** saem os dois. Os dois vão para o fim
  da fila e o **cara ou coroa** define qual entra na fila primeiro.
- **Sem dois times completos esperando:** sai só um, decidido no **cara ou coroa**.

### 3.5 Fim da partida
- Acaba por **tempo** ou por **gols**, o que acontecer primeiro.
- Padrão: **10 minutos ou 2 gols**. Configurável na sessão.

### 3.6 Limite de vitórias seguidas (opcional)
- Desligado por padrão. Se ativado, define-se quantas vitórias seguidas.
- Ao atingir o limite, **sai só o time vencedor** (vai para o fim da fila); o perdedor fica.

### 3.7 Goleiro
- Por padrão **não há goleiro fixo** e goleiro **não entra na contagem** da linha.
- Dá para cadastrar **vários goleiros fixos**; aparecem como **(G)**.
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
12. Desfazer última ação.

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

1. Configuração da pelada (linha, tempo, gols, limite de vitórias, goleiro fixo)
2. Lista de chegada (times montados automaticamente em blocos de N)
3. Em campo (cronômetro, placar, quem venceu / empate, próximo time)
4. Fila de espera (próximo time, time incompleto, atrasado, "foi embora")
5. Empate (cara ou coroa animado)
6. Histórico da sessão

## 7. Andamento

- [x] Lógica do rodízio (`src/logic/pelada.ts`) com testes (`npm test`)
- [x] Telas: Ajustes, Lista/Fila, Jogo (cronômetro, placar, empate com moeda), Tabela
- [x] Pelada salva no celular (localStorage) + botão desfazer
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
