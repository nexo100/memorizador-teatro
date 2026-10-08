# 🎭 Memorizador & Ensaio Teatral

> 🌐 **App publicado online:** [https://nexo100.github.io/memorizador-teatro/](https://nexo100.github.io/memorizador-teatro/)

Aplicativo progressivo (PWA) de memorização dramática, desenhado sob medida para ensaios de atores, peças de teatro e dramaturgia no celular e no computador.

Funciona **100% offline**, sem dependências externas e pode ser instalado direto na tela de início do smartphone como um aplicativo nativo.

---

## 📱 Como Instalar no Celular (Modo PWA sem loja)

O aplicativo foi construído com suporte completo a **Progressive Web App**:

### No iPhone (iOS / Safari):
1. Abra o arquivo ou acesse o endereço no Safari.
2. Toque no botão de **Compartilhar** (ícone do quadrado com a seta para cima).
3. Role para baixo e selecione **"Adicionar à Tela de Início"**.
4. O app agora abre em **tela cheia**, sem a barra do navegador, com ícone próprio e sem apagar a tela durante o ensaio.

### No Android (Chrome):
1. Abra no Google Chrome.
2. Toque nos três pontinhos no canto superior direito.
3. Selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.

---

## 🎙️ Sistema de Voz e Áudio Híbrido

O app resolve a necessidade de ensaiar com vozes diferenciadas através de dois níveis:

### 1. Nível A: Seletor Dinâmico de Vozes Nativas do Celular (Múltiplos Personagens)
* Em `⚙️ Opções`, selecione e teste (`🔊`) a voz do sistema individualmente para **cada personagem detectado no texto**, seja para 2, 3, 5 ou mais atores.
* O motor de áudio distribui automaticamente timbres e pitches distintos para cada personagem, com suporte a vozes femininas e masculinas e controle de velocidade da fala (de 0.75x a 1.30x).

### 2. Nível C: Gravação de Voz Real do Elenco (IndexedDB)
* **O "Santo Graal" do ensaio teatral**: você pode gravar o áudio real da atriz/ator parceiro durante uma leitura de mesa, ou a sua própria fala para conferir entonação.
* Em cada deixa ou fala, toque em **`🎙️ Gravar colega`** ou **`🎙️ Gravar voz`** e fale no microfone (compatível nativamente com iPhone/iOS e Android).
* O áudio é salvo em alta qualidade no banco de dados interno do seu aparelho (**IndexedDB**).
* Durante o ensaio, o app prioriza a **voz real gravada do elenco**, usando o sintetizador apenas quando ainda não houver gravação!

### 3. 💾 Segurança de Dados: Backup & Restauração Completa
* Em `⚙️ Opções`, você tem os botões **`📤 Exportar Backup`** e **`📥 Restaurar`**.
* Como o Safari do iPhone pode limpar o cache se o armazenamento ficar cheio, o app solicita persistência de disco (`navigator.storage.persist`) e permite que você baixe um arquivo `.json` contendo:
  - Todo o roteiro e suas edições.
  - O nível de domínio de cada fala para cada personagem.
  - Todas as vozes atribuídas e intenções dramáticas de Stanislavski.
  - **Todas as gravações de áudio do elenco** (convertidas e preservadas em alta fidelidade).
* Você pode salvar o arquivo no iCloud, Google Drive ou WhatsApp e restaurar em qualquer celular ou computador instantaneamente!

---

## 🧠 5 Modos de Memorização Teatral

Diferente de decorar flashcards, memorizar teatro exige resposta psicofísica, ritmo e reação à deixa:

| Modo | Como Funciona | Para quando é ideal? |
| :--- | :--- | :--- |
| **1. Cena Toda** | Passa cronologicamente por todas as falas da cena selecionada. | Ensaio geral e passagem completa do texto. |
| **2. Só Minhas Falas + Deixas** | Pula falas do colega e vai direto para as suas falas, mostrando a deixa no topo. | Ganhar tempo e focar apenas no que você fala. |
| **3. Foco nas Fraquezas** | Repetição espaçada ponderada pelas falas que você mais erra. | Decorar os trechos difíceis ou monólogos travados. |
| **4. Ping-Pong de Deixas** | Toca apenas o final da deixa e abre um cronômetro de 4 segundos. | Treinar velocidade de reflexo para não deixar a cena "cair". |
| **5. Ponto Eletrônico** | Ensaio 100% auditivo: toca a deixa, dá uma pausa para você falar e sopra a fala no ouvido. | Ensaiar andando, lavando louça ou aquecendo antes de entrar em cena. |

---

## 🎭 Beats Dramáticos (Divisão da Cena em Blocos)

A peça padrão *Os Inventariantes* está dividida em 5 blocos dramáticos para evitar a sobrecarga cognitiva:

1. **Beat 1: A Fuga & A Captura** (Falas 1 a 11)
2. **Beat 2: A Arma & O Desprezo** (Falas 12 a 23)
3. **Beat 3: Os Primeiros Disparos (1, 2 e 3)** (Falas 24 a 34)
4. **Beat 4: O Desabafo dos 10 Anos** (Falas 35 a 44)
5. **Beat 5: A Loucura do Olimpo & O Clímax** (Falas 45 a 58)

Para **qualquer outro texto ou peça colada**, o sistema calcula automaticamente blocos dramáticos proporcionais para estruturar a sessão de estudo. Você pode selecionar um Beat específico no menu superior e ensaiar apenas aquele bloco até a fixação completa.

---

## 📈 Os 5 Níveis de Domínio da Fala & Cloze Semântico

Diferente de um sorteador cego de palavras, o algoritmo utiliza **Linguística Cognitiva e Andaimes Sintáticos**:

1. **1 · Leitura Completa**: Fala visível na íntegra para leitura inicial e compreensão da proposição dramática.
2. **2 · Poucas Lacunas (Apoio Estrutural)**: Conectivos e termos funcionais (*de, para, com, que, se, mas, porque...*) ficam **100% visíveis** como andaimes sintáticos; oculta progressivamente ~55% das palavras de conteúdo (verbos, substantivos e adjetivos de impacto).
3. **3 · Muitas Lacunas (Desafio Lexical)**: Oculta 85% das palavras de conteúdo e 45% dos conectivos, exigindo resgate semântico profundo.
4. **4 · Primeiras Letras (Mnemônica Fonológica)**: Exibe apenas a primeira letra de cada palavra (`A... v... c... t... p...?`), ativando a recuperação ativa do aparelho fonador.
5. **5 · De Memória Total**: Ocultação completa, mostrando apenas a métrica de palavras para falar de cabeça.

* **Botão `💡 Dica` (ou tecla `D`)**: Revela a próxima palavra oculta sem abrir a fala toda, destravando o ensaio sem frustração.

---

## 🎯 Pedagogia Teatral (Stanislavski): Intenção Dramática & Verbo de Ação

Segundo as pesquisas cognitivas de Helga & Tony Noice com atores profissionais, a mente humana não memoriza textos teatrais por decoreba acústica mecânica, mas por **Elaborative Rehearsal (Investigação Ativa do Significado)**:

* Cada fala agora possui a sua **Barra de Ação Dramática** (ex: `Provocar e tripudiar sobre a fraqueza física do pai`, `Impor controle rígido`).
* **Edição ao toque**: Toque em `✏️ Editar` em qualquer fala para personalizar o subtexto ou o objetivo do personagem de acordo com as orientações do seu diretor ou estudo de mesa.
* As intenções são salvas localmente e preservadas integralmente nos arquivos de backup.

---

## ⏱️ Variação de Tempo-Ritmo de Ensaio

Para evitar que o ator fique com o texto "engessado" ou "viciado" em uma única velocidade métrica, a barra superior conta com o **Seletor de Ritmo**:

* ⚡ **Normal (0.95x)**: Andamento equilibrado de ensaio de mesa.
* 🐢 **Lento (0.80x)**: Andamento mastigado para prestar atenção na articulação, dicção e subtexto.
* 🔥 **Urgente (1.20x)**: Ritmo acelerado para testar prontidão e reflexo sob pressão cênica.
* 🎲 **Dinâmico / Surpresa**: Varia aleatoriamente a cada deixa (entre 0.82x e 1.18x), obrigando o ator a reagir ao tempo vivo do parceiro.

---

## ⌨️ Atalhos de Teclado (Para Ensaio no Computador)

* <kbd>Espaço</kbd>: Avançar colega / Esconder palavras / Conferir fala / Marcar acerto.
* <kbd>1</kbd>: Marcar **Errei** (reduz nível de fixação).
* <kbd>2</kbd>: Marcar **Acertei** (aumenta nível de fixação).
* <kbd>D</kbd>: **Dica** (revelar próxima palavra oculta).
* <kbd>←</kbd> e <kbd>→</kbd>: Voltar para fala anterior ou avançar.
* <kbd>R</kbd> ou <kbd>O</kbd>: Ouvir áudio novamente.
* <kbd>I</kbd>: Abrir / fechar índice de falas da cena.
* <kbd>Esc</kbd>: Fechar qualquer janela ou modal.

---

## 📚 Documentação Complementar

* 🎭 **[Manual Prático do Ator (MANUAL_DO_ATOR.md)](./MANUAL_DO_ATOR.md)**: Guia completo para atores e atrizes sobre como usar o app da leitura de mesa até a véspera da estreia, como gravar a voz dos colegas e como quebrar vícios de ritmo com a pedagogia de Stanislavski e Noice & Noice.
* 🏛️ **[Arquitetura do Software (ARQUITETURA.md)](./ARQUITETURA.md)**: Documentação técnica detalhada para desenvolvedores, descrevendo o funcionamento dos módulos (`AppConfig`, `Utils`, `AppState`, `ScriptParser`, `StorageEngine`, `AudioEngine`, `AppUI`), modelo de dados, isolamento por peça (`playId`) e suporte a PWA.

---

## 🧪 Testes Automatizados de Integração

O projeto possui uma suíte rigorosa de **42 testes automatizados** para assegurar que nenhuma regressão ocorra em navegação, parsing (incluindo Fountain), cloze semântico, memória, persistência, ergonomia de palco, sincronização de fim de cena, transição de telas, sanitização XSS, integridade de backups, despacho de eventos, concorrência assíncrona e fila adaptativa de ensaio:

```bash
# Executa todos os 42 testes de integração
node test.cjs
```

---

## 📁 Estrutura de Arquivos do Projeto

```
memorizador-teatro/
├── index.html                     # Aplicação PWA modularizada e leve (v3.2)
├── css/
│   └── style.css                  # Estilos responsivos, temas claro/escuro e safe-area
├── js/
│   ├── config.js                  # Constantes e vocabulário funcional
│   ├── utils.js                   # Utilitários puros, escape XSS e conversão base64
│   ├── state.js                   # Estado reativo da sessão e fila adaptativa
│   ├── parser.js                  # Parser universal de dramaturgia e Fountain
│   ├── storage.js                 # Persistência IndexedDB e LocalStorage
│   ├── audio.js                   # Síntese Web Speech e MediaRecorder
│   ├── ui.js                      # Renderização da interface (Camarim e Palco)
│   └── app.js                     # Controlador principal e eventos do ciclo de vida
├── Ensaio · Os Inventariantes.html # Redirecionamento canônico para index.html
├── manifest.json                  # Manifesto PWA com suporte a ícones PNG e SVG
├── sw.js                          # Service Worker para suporte 100% offline (v10)
├── icon.svg                       # Ícone vetorial das máscaras teatrais
├── icon-192.png                   # Ícone PWA 192x192 para Android e iOS
├── icon-512.png                   # Ícone PWA 512x512 para Android e instalação
├── test.cjs                       # Suíte automatizada com 42 testes de integração
├── MANUAL_DO_ATOR.md              # Guia prático de ensaio e memorização para o elenco
├── ARQUITETURA.md                 # Especificação técnica dos módulos e dados
├── LICENSE                        # Licença MIT e ressalva de direitos autorais
└── README.md                      # Visão geral do projeto e guia rápido
```

---

## 📱 Redesign Visual Mobile-First & Separação em Duas Telas (v3.2)

O aplicativo foi totalmente reprojetado em **duas telas distintas e complementares**, atendendo à realidade física do ator segurando o smartphone com uma só mão durante a movimentação cênica:

* **Tela 1: O Camarim (`#lobbyView`) — Preparação & Escolha**: Hub de entrada acolhedor com cartões grandes e táteis de personagem (nome, progresso percentual de falas dominadas e badge ativo), cartões descritivos dos 5 modos teatrais de ensaio (*Só Minhas Falas + Deixas*, *Passada Completa*, *Ping-Pong 4s*, *Ponto Eletrônico* e *Foco nas Fraquezas*), filtro opcional de Bloco Dramático (*Beat*) e o botão herói **`[ 🎭 Entrar em Cena › ]`**.
* **Tela 2: O Palco (`#rehearsalView`) — Ensaio Limpo e Imersivo**: Topo minimalista desobstruído (*HUD*) com botão de retorno `‹ Camarim`, título da peça, beat ativo, contador `Fala X de Y` e ícone de configurações `⚙️`, eliminando dropdowns ou checkboxes visíveis durante a atuação.
* **Barra de Um Polegar (*One-Thumb Action Dock*)**: Navegação lateral rápida (`[ ‹ ]` e `[ › ]`) emoldurando uma área central herói com botões táteis de 50px de altura (`Já li`, `Conferir Fala`, `Acertei`, `Errei`, `Minha vez`). Elimina ruídos visuais de desktop (legendas de teclas como Espaço, 1, 2, D).
* **Fluxo Previsível de "Errei" com Retenção Cênica**: Ao clicar em `❌ Errei`, o app não avança bruscamente para a próxima fala; em vez disso, abre um ciclo claro com **`[ 🔁 Tentar de novo agora ]`** (re-mascarando o texto na mesma fala) e **`[ Seguir adiante › ]`**.
* **Deixas Inteligentes & Mini-Badges**: Cartão de deixa destacado apenas quando há fala antecedente do parceiro; falas de abertura utilizam mini-badges discretos que economizam espaço vertical.
* **Modais em Formato *Bottom Sheet***: No celular, as listas de falas e opções abrem como folhas inferiores com barra tátil de arraste, descarte instantâneo ao tocar no fundo/backdrop e respeito rigoroso às *Safe Areas* do iOS e Android (`env(safe-area-inset-bottom)`).

---

## 🚀 Próximas Etapas Planejadas (Roadmap)
- [ ] Integração com IA (Google Gemini API com chave do usuário):
  - Análise instantânea de **Subtexto e Intenção Dramática** (Stanislavski).
  - Reconhecimento de fala inteligente (avaliar se o ator falou o texto certo via microfone).

