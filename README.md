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

### 1. Nível A: Seletor de Vozes Nativas do Celular
* Em `⚙️ Opções`, selecione qual voz do sistema fala as falas de **SÉRGIO** e qual fala as de **BÁRBARA**.
* Permite diferenciar claramente a voz masculina da feminina, com controle de velocidade da fala (de 0.75x a 1.30x).

### 2. Nível C: Gravação de Voz Real do Elenco (IndexedDB)
* **O "Santo Graal" do ensaio teatral**: você pode gravar o áudio real da atriz/ator parceiro durante uma leitura de mesa, ou a sua própria fala para conferir entonação.
* Em cada deixa ou fala, toque em **`🎙️ Gravar colega`** ou **`🎙️ Gravar voz`** e fale no microfone (compatível nativamente com iPhone/iOS e Android).
* O áudio é salvo em alta qualidade no banco de dados interno do seu aparelho (**IndexedDB**).
* Durante o ensaio, o app prioriza a **voz real gravada do elenco**, usando o sintetizador apenas quando ainda não houver gravação!

### 3. 💾 Segurança de Dados: Backup & Restauração Completa
* Em `⚙️ Opções`, você tem os botões **`📤 Exportar Backup`** e **`📥 Restaurar`**.
* Como o Safari do iPhone pode limpar o cache se o armazenamento ficar cheio, o app solicita persistência de disco (`navigator.storage.persist`) e permite que você baixe um arquivo `.json` contendo:
  - Todo o roteiro e suas edições.
  - O nível de domínio de cada fala.
  - **Todas as gravações de áudio do elenco** (convertidas e preservadas em alta fidelidade).
* Você pode salvar o arquivo no iCloud, Google Drive ou WhatsApp e restaurar em qualquer celular ou computador instantaneamente!

---

## 🧠 5 Modos de Memorização Teatral

Diferente de decorar flashcards, memorizar teatro exige resposta psicofísica, ritmo e reação à deixa:

| Modo | Como Funciona | Para quando é ideal? |
| :--- | :--- | :--- |
| **1. Cena Toda** | Passa cronologicamente por todas as 58 falas da cena. | Ensaio geral e passagem completa do texto. |
| **2. Só Minhas Falas + Deixas** | Pula falas do colega e vai direto para as suas falas, mostrando a deixa no topo. | Ganhar tempo e focar apenas no que você fala. |
| **3. Foco nas Fraquezas** | Repetição espaçada ponderada pelas falas que você mais erra. | Decorar os trechos difíceis ou monólogos travados. |
| **4. Ping-Pong de Deixas** | Toca apenas o final da deixa e abre um cronômetro de 4 segundos. | Treinar velocidade de reflexo para não deixar a cena "cair". |
| **5. Ponto Eletrônico** | Ensaio 100% auditivo: toca a deixa, dá uma pausa para você falar e sopra a fala no ouvido. | Ensaiar andando, lavando louça ou aquecendo antes de entrar em cena. |

---

## 🎭 Beats Dramáticos (Divisão da Cena em Blocos)

A peça *Os Inventariantes* está dividida em 5 blocos dramáticos para evitar a sobrecarga cognitiva:

1. **Beat 1: A Fuga & A Captura** (Falas 1 a 11)
2. **Beat 2: A Arma & O Desprezo** (Falas 12 a 23)
3. **Beat 3: Os Primeiros Disparos (1, 2 e 3)** (Falas 24 a 34)
4. **Beat 4: O Desabafo dos 10 Anos** (Falas 35 a 44)
5. **Beat 5: A Loucura do Olimpo & O Clímax** (Falas 45 a 58)

Você pode selecionar um Beat específico no menu superior e ensaiar apenas aquele bloco até a fixação completa.

---

## 📈 Os 5 Níveis de Domínio da Fala

1. **1 · Leitura Completa**: Fala visível na íntegra para leitura inicial.
2. **2 · Poucas Lacunas**: ~35% das palavras ocultadas (`______`).
3. **3 · Muitas Lacunas**: ~68% das palavras ocultadas.
4. **4 · Primeiras Letras**: Exibe apenas a primeira letra de cada palavra (`A... v... c... t... p...?`), forçando a recuperação ativa da memória verbal.
5. **5 · De Memória Total**: Ocultação completa, mostrando apenas a contagem de palavras para falar de cabeça.

* **Botão `💡 Dica` (ou tecla `D`)**: Revela a próxima palavra oculta sem abrir a fala toda, destravando o ensaio sem frustração.

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

## 📁 Estrutura do Projeto

```
memorizador-teatro/
├── index.html                     # Aplicação PWA completa e mobile-first
├── Ensaio · Os Inventariantes.html # Cópia idêntica sincronizada
├── manifest.json                  # Manifesto PWA para instalação no celular
├── sw.js                          # Service Worker para suporte 100% offline
├── icon.svg                       # Ícone vetorial das máscaras teatrais
├── Ensaio · Os Inventariantes.backup.html # Backup de segurança da versão original
└── README.md                      # Esta documentação
```

---

## 🚀 Próximas Etapas Planejadas (Roadmap)
- [ ] Integração com IA (Google Gemini API com chave do usuário):
  - Análise instantânea de **Subtexto e Intenção Dramática** (Stanislavski).
  - Reconhecimento de fala inteligente (avaliar se o ator falou o texto certo via microfone).
