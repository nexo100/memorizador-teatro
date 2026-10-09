# 🏛️ Arquitetura do Memorizador Teatral (v3.2)

Este documento descreve a arquitetura técnica, modelo de dados, decisões de engenharia de software e padrões de implementação adotados no **Memorizador Teatral**.

---

## 🧭 Visão Geral

O Memorizador Teatral é uma aplicação web progressiva (**PWA**) client-side, **100% offline-first**, projetada para rodar diretamente no navegador móvel (iOS Safari, Android Chrome) e desktop sem a necessidade de servidores backend para processamento de texto ou armazenamento.

Toda a lógica de persistência, renderização, inteligência linguística de lacunas, síntese de voz e gravação de áudio opera estritamente na máquina/dispositivo do usuário.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Camada de Apresentação                          │
│                             UIController                               │
│    (Cards de Fala, Deixas, Cloze Semântico, Modais e Event Listeners)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ lê e despacha
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Estado da Sessão Reativa                        │
│                               AppState                                 │
│    (Índice atual, Ator selecionado, Beat, Modo de Ensaio, Ritmo)       │
└───────┬───────────────────────────┬────────────────────────────┬───────┘
        │                           │                            │
        ▼                           ▼                            ▼
┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│   ScriptParser   │    │     AudioEngine      │    │   StorageManager   │
│  Regex universal │    │ Web Speech API (TTS) │    │ IndexedDB (áudios) │
│  de dramaturgia, │    │    + MediaRecorder   │    │    LocalStorage    │
│  beats dinâmicos │    │  (gravações reais)   │    │ (progresso/backup) │
└──────────────────┘    └──────────────────────┘    └────────────────────┘
        ▲                           ▲                            ▲
        └───────────────────────────┴────────────────────────────┘
                                    │
                                AppConfig & Utils
                    (Constantes, Cloze, Haptic, Base64)
```

---

## 📦 Módulos do Sistema

O código JavaScript está organizado em módulos com responsabilidades estritamente delimitadas:

### 1. `AppConfig`
Concentra todas as constantes globais e configurações imutáveis do sistema:
* `APP_ID`: Identificador da aplicação (`memorizador-teatro`).
* `VERSION`: Versão do esquema de dados (`3`).
* `MASTERY_LEVEL_NAMES`: Rótulos dos 5 níveis de fixação.
* `DEFAULT_DRAMA_BEATS`: Beats canônicos da peça padrão *Os Inventariantes*.
* `DEFAULT_INTENTIONS`: Mapa de intenções dramáticas pré-configuradas de Stanislavski.
* `FUNCTION_WORDS`: Conjunto (`Set`) de termos funcionais e conectivos da língua portuguesa (preposições, artigos, pronomes, conjunções) usado pelo algoritmo de **Cloze Semântico**.

### 2. `Utils`
Funções utilitárias puras:
* `$(id)`: Atalho ergonômico para `document.getElementById`.
* `escapeHtml(str)`: Sanitização de strings para evitar injeção XSS.
* `sanitizeId(str)`: Conversão de títulos e nomes para chaves alfanuméricas seguras (`playId`).
* `isFunctionWord(word)`: Verificação de conectivos ignorando maiúsculas e pontuação.
* `hashCoord(i, j)`: Função de espalhamento determinística para mascarar palavras de forma consistente entre renderizações.
* `maskWord(word, mode)`: Mascarador de palavras imune a corrupção de entidades HTML. Realiza a tokenização de caracteres e pontuações antes do escape.
* `triggerHaptic(type)`: Disparo de vibração tátil no celular via `navigator.vibrate` (`tap`, `success`, `error`).
* `blobToBase64(blob)` e `base64ToBlob(base64Data, defaultType)`: Conversores bidirecionais de mídia binária para exportação e importação de backups JSON.

### 3. `AppState`
Armazena e gerencia o estado mutável em memória durante a sessão:
* `speeches`: Array de objetos de falas processadas pelo parser.
* `characters`: Lista de personagens únicos detectados no texto.
* `selectedActor`: Personagem atualmente selecionado pelo ator.
* `currentIndex`: Posição cronológica da fala em exibição.
* `activeBeats`: Lista de beats ativos (canônicos ou particionados dinamicamente).
* `selectedBeat`: Filtro de beat selecionado (`all` ou índice numérico).
* `rehearsalMode`: Modo de ensaio ativo (`cena`, `minhas`, `fraquezas`, `pingpong`, `ponto`).
* `rehearsalTempo`: Andamento de ritmo ativo (`normal`, `slow`, `fast`, `dynamic`).
* `studyMethod`: Método pedagógico ativo (`oral` - cênico tradicional, `quiz` - alternativas e banco de palavras, `typing` - digitação interativa).
* `alwaysStartHidden`: Configuração de Active Recall imediato (a fala chega velada/oculta por padrão mesmo no nível 0, eliminando spoilers).
* `hideRubrics`: Configuração de filtragem determinística de indicações cênicas/parênteses do corpo do diálogo.
* `masteryLevels`: Nível de domínio (0 a 4) para cada fala do ator ativo.
* `isRevealed` e `hintsUsedThisLine`: Estado de revelação e contador de dicas da fala atual.
* **Algoritmo de Fraquezas Seguro (`pickNextWeakness`)**:
  * Utiliza peso quadrático `Math.pow(Math.max(0.2, 5 - level), 2)` para priorizar falas menos dominadas.
  * Filtra a fala atual para evitar repetição consecutiva em cenas com mais de uma fala.
  * Possui piso mínimo de peso (`0.2`) para **eliminar qualquer risco de recursão infinita ou estouro de pilha (stack overflow)** caso o ator domine todas as suas falas no nível 5.

### 4. `ScriptParser`
Motor universal de análise sintática dramatúrgica:
* **Detecção de Título (`extractPlayTitle`)**: Reconhece títulos em Markdown `#`, negrito `**` ou caixa alta.
* **Palavras Reservadas (`isMetaKeyword`)**: Ignora metadados como `Personagens`, `Elenco`, `Dramatis Personae`, `Cenário`, `Ato`, `Cena`, etc.
* **Formatos de Personagem Reconhecidos**:
  * `**PERSONAGEM:** Fala` ou `**PERSONAGEM**: Fala`
  * `**PERSONAGEM** - Fala` ou `**PERSONAGEM** — Fala`
  * `PERSONAGEM: Fala`
  * `PERSONAGEM - Fala`
  * Linhas isoladas em negrito: `**PERSONAGEM**\nFala seguinte...`
  * Linhas isoladas em maiúsculas: `PERSONAGEM\nFala seguinte...`
* **Rubricas e Didascálias**:
  * Didascálias de cena completas em parênteses `( ... )` ou colchetes `[ ... ]` são associadas à fala antecedente como `directions`.
  * Rubricas em meio ao diálogo são convertidas em segmentos `{ type: 'rubric', text: '...' }` para estilização visual diferenciada e exclusão do sintetizador de voz (TTS). Podem ser completamente ocultadas visualmente sob demanda (`hideRubrics`).
* **Particionamento de Beats Dinâmicos**: Caso o texto não seja a peça canônica, divide o roteiro automaticamente em 4 a 6 blocos proporcionais (`start` e `end`).

### 5. `StorageManager`
Camada de persistência local:
* **IndexedDB (`recordings`)**:
  * Armazena áudios gravados pelo elenco como `Blob` de alta fidelidade.
  * Suporta índices por `playId` e `speechIdx`, isolando completamente áudios de peças diferentes.
* **LocalStorage**:
  * Salva preferências globais (`taxa de fala`, `modo`, `ritmo`, `método de estudo`, `sempre ocultar`, `ocultar rubricas`, `wake lock`).
  * Salva o nível de domínio do ator com chave isolada (`memorizador_niveis_<playId>_<actor>`).
  * Salva intenções dramáticas com chave isolada (`intent_<playId>_<speechIdx>`).
* **Backup & Restauração Completa (`exportFullBackup` / `importFullBackup`)**:
  * Exporta um arquivo `.json` unificado contendo o roteiro ativo, histórico de todos os atores, vozes atribuídas, intenções de Stanislavski e **todos os áudios binários convertidos em base64**.
  * Permite restaurar o backup em qualquer celular ou navegador sem perda de dados.

### 6. `AudioEngine`
Motor de áudio híbrido com controle bidirecional (Play/Stop):
* **Web Speech API (`SpeechSynthesis`) & Gravação Real**:
  * Controle de estado reativo `isPlaying`: o botão de áudio alterna dinamicamente entre `🔊 Ouvir` e `⏹️ Parar`, permitindo interrupção imediata de deixas ou falas longas.
  * Sintetiza vozes do sistema operacional para leitura das deixas do colega com seletores dinâmicos por personagem.
  * Variação de pitch e velocidade controlada pelo seletor de ritmo (`getEffectiveTempoRate`).
* **MediaRecorder (Áudio Real do Elenco)**:
  * Suporte multiplataforma com seleção dinâmica do melhor codec: `audio/webm` no Android/Chrome/Desktop e fallback automático para `audio/mp4` no iOS Safari.
  * Reprodução via `Audio` HTML5 com aplicação dinâmica de `playbackRate`.
  * **Gerenciamento de Memória**: O motor rastreia o `activeAudioUrl` e chama `URL.revokeObjectURL` de forma determinística em `onended`, `onerror` e `stopAllAudio()`, impedindo vazamento de memória durante ensaios longos.

### 7. `UIController`
Camada de renderização reativa e manipulação do DOM:
* `updateHeaderStats()`: Atualiza a barra de progresso percentual, o contador de falas, o pill do método de estudo e os botões de navegação.
* `renderLobby()`: Renderiza os cartões de personagens com percentual de domínio, o grid de métodos de memorização (Oral, Alternativas, Digitação), os modos de ensaio e o banner de leitura integral do roteiro.
* `renderFullScriptModal()`: Modal de tela cheia contendo o roteiro integral formatado com busca em tempo real, filtro por beat e botão de salto direto para o ensaio.
* `renderView()`: Renderiza dinamicamente o card de fala:
  * Para o colega: Exibe didascálias e diálogo (filtrando rubricas se `hideRubrics=true`), botão de ouvir/parar e botão de gravar áudio real.
  * Para o ator: Exibe o **Cartão da Deixa (Cue Card)**, a **Barra de Intenção Dramática (Stanislavski)**, o texto adaptado ao método de estudo ativo (**Oral / Cloze**, **Quiz de Alternativas** ou **Digitação Interativa**), e o One-Thumb Action Dock adaptativo.
* `renderSpeechHtml()`: Gera o HTML da fala aplicando o método selecionado (Oral, Quiz com slots e chips de distratores, ou Digitação com inputs inline e auto-focus).
* `renderVoiceSettings()`: Constrói dinamicamente os seletores de voz para cada personagem detectado no elenco ativo.
* `renderIndexModal()`: Gera a lista completa de falas da cena com filtros por `Todas`, `Minhas`, `Fraquezas` e `Com Áudio Gravado`.

---

## 🧠 Algoritmo de Cloze Semântico

Em vez de ocultar palavras por números aleatórios brutos, o app aplica uma escala pedagógica fundamentada em linguística:

```
Nível 0: Leitura Integral (100% visível)
   │
   ▼
Nível 1: Apoio Estrutural
   ├─ Conectivos e termos funcionais: 100% VISÍVEIS (andaimes sintáticos)
   └─ Palavras de conteúdo (verbos, substantivos): 55% ocultadas
   │
   ▼
Nível 2: Desafio Lexical
   ├─ Conectivos: 45% ocultados
   └─ Palavras de conteúdo: 85% ocultadas
   │
   ▼
Nível 3: Mnemônica Fonológica
   └─ Apenas as primeiras letras de cada palavra visíveis (ex: "S... o... n... s...")
   │
   ▼
Nível 4: De Memória Total
   └─ 100% das palavras ocultadas com métrica de tamanho
```

O botão **`💡 Dica` (ou atalho `D`)** revela incrementalmente a próxima palavra oculta sem desarmar a fala inteira, mantendo o ator no fluxo de resgate mental sem frustração.

---

## 🧪 Suíte de Testes dos Motores Críticos (`test.cjs`)

Para garantir que nenhuma regressão ocorra nos motores fundamentais do aplicativo, o repositório conta com uma arquitetura de testes rigorosamente desacoplada em `tests/`, eliminando testes frágeis de marcação visual de interface e concentrando-se nos núcleos de dramaturgia, persistência, áudio, estado cênico e IA:

```bash
# Executa todos os testes dos motores
node test.cjs

# Executa uma suíte específica
node test.cjs parser
node test.cjs playstore
node test.cjs storage-backup
node test.cjs audio
node test.cjs rehearsal-state
node test.cjs ai-service
```

### Arquitetura e Domínios de Cobertura:
1. **`tests/parser.test.cjs` (ScriptParser Engine & Dramaturgia)**:
   - Parsing universal de formatos teatrais (negrito isolado, maiúsculas, travessão, multilinhas).
   - Suporte nativo ao padrão da indústria Fountain (`.fountain`, `@Personagem`, didascálias parentéticas).
   - Higienização OCR (`sanitizeRawText`) com junção de quebras de linha hifenizadas.
   - Agrupamento e canonicalização de variantes de personagens (`groupCharacterVariants`), preservando nomes distintos (`ANA` vs `ANASTÁCIA`, `LEO` vs `LEONARDO`).
   - Imunidade absoluta a falsos personagens e metadados cênicos (`isMetaKeyword`: `Sinopse`, `Resumo`, `Rubrica`, `Escuro`, `Blackout`, `Pano`, `Cortina`, `Fim de cena`, `Música`, etc.).
   - Preservação estrita de falas de diálogo que iniciam com "Após...".
   - Didascálias narrativas temporais isoladas do diálogo falado e vinculadas a `directions`.
   - Detecção causal de engates cênicos (`detectCueTrigger`: eco de palavras, conectores lógicos, perguntas interrogativas).

2. **`tests/playstore.test.cjs` (PlayStore Multi-Peças & Catálogo)**:
   - Integridade canônica e blindagem imutável da peça canônica padrão (`os-inventariantes`).
   - Cadastro dinâmico e coexistência atômica de múltiplos roteiros no catálogo.
   - Alternância atômica de peças e isolamento rigoroso de atores, progresso e anotações.
   - Exclusão com purga de dados do usuário e fallback automático seguro da peça ativa para a peça padrão.
   - Blindagem contra duplicação de peças por legado de `memorizador_custom_script` (com normalização de quebras de linha Windows CRLF).
   - Cálculo de métricas dramáticas e estatísticas por peça (`PlayStore.getStats`), com cálculo de domínio estritamente isolado por personagem e teto garantido de 100%.

3. **`tests/storage-backup.test.cjs` (StorageManager, Intenções & Backup Data Integrity)**:
   - Persistência e restauração de preferências (`studyMethod`, `hideRubrics`, `alwaysStartHidden`, `speechRate`).
   - Isolamento estrito de intenções dramáticas de Stanislavski por peça (`playId scoping`) com fallback limpo.
   - Caderno de Ensaio: persistência de anotações livres e notas vinculadas a falas individuais.
   - Gravação e recuperação assíncrona de blobs de áudio no IndexedDB (`saveCastAudio` / `getCastAudio`).
   - Exportação segura de backup com blindagem ativa de segredos (`gemini_api_key`, tokens, senhas).
   - Restauração de backup íntegra com fidelidade de `speechIdx` e `playId`, limpeza prévia de dados fantasmas e preservação da chave de API ativa do usuário.

4. **`tests/audio.test.cjs` (AudioEngine Core & Ciclo de Vida)**:
   - Controle bidirecional de reprodução e parada imediata (Play/Stop toggle).
   - Normalização do estado `isPlaying` no ciclo de vida de síntese de voz (`onend` e `onerror`).
   - Revogação ativa de Blob URLs (`URL.revokeObjectURL`) ao interromper áudios para erradicar vazamentos de memória.
   - Chamada direta de síntese de voz (`speakSynthesized`).
   - Resiliência defensiva contra atores não indexados (`actorIndex = -1`) e nomes nulos.
   - Conversão segura de áudio em `Utils.base64ToBlob` para Data URLs e raw base64.

5. **`tests/rehearsal-state.test.cjs` (Rehearsal Engine & AppState)**:
   - Carregamento íntegro da peça canônica (58 falas, 2 personagens, 5 beats).
   - Cloze semântico: preservação de hífen em ênclise (`diga-me`), apóstrofos (`d'água`) e entidades HTML seguras.
   - Navegação e limites de barreira do ator em modos filtrados (`minhas`).
   - Partição de beats dramáticos e cálculo de intervalo cênico ativo (`getActiveBeatRange`).
   - Cancelamento estrito de temporizadores zumbis no modo Ping-Pong ao navegar.
   - Fluxo previsível do botão "Errei": retenção cênica, ciclo de retry e avanço.
   - Algoritmo de fraquezas (`pickNextWeakness`): proteção universal contra estouro de pilha quando todas as falas estão em nível 5.
   - Fila adaptativa de ensaio com buffer de repetição imediata (reforço espaçado ativo).
   - Isolamento estrito da fila de retry na troca de ator e na troca de beat.
   - Ocultação determinística de didascálias parentéticas (`hideRubrics`).
   - Progressão de domínio e avanço nos modos Quiz de Alternativas e Digitação Interativa.

6. **`tests/ai-service.test.cjs` (AIService & Inteligência Dramatúrgica)**:
   - Configuração BYOK (Gemini), persistência de chave no storage e alternância de modelos.
   - Ping de conexão defensivo (tratamento de sucesso, 403 e ausência de chave).
   - Extração e parsing resiliente de arrays JSON encapsulados em respostas de IA conversacionais e blocos markdown.
   - O Diretor Stanislavski: geração determinística offline de verbos de ação e mock IA estruturado.
   - Gamificação e Quiz Dramatúrgico: geração offline de distratores e integração com mock IA.
   - Gancho arquitetural plugável para IA no `DramaturgyAnalyzer` com fallback transparente para heurística offline.

---

## 📱 Suporte a PWA & Mobile Web APIs

* **`sw.js` (Service Worker)**: Cache de ativos estáticos para funcionamento 100% offline. Atualiza automaticamente via estratégia cache-first com fallback para rede.
* **`manifest.json`**: Configuração de ícones, modo `standalone` e tema visual para instalação na tela de início.
* **Screen Wake Lock API (`navigator.wakeLock`)**: Mantém a tela do smartphone acesa continuamente durante o ensaio para o ator não precisar tocar na tela a cada fala.
* **Storage Persistence API (`navigator.storage.persist`)**: Solicita ao sistema operacional do smartphone permissão para armazenamento durável, evitando que o Safari ou Chrome limpem o cache de gravações quando a memória estiver cheia.
