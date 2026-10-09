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

## 🧪 Suíte de Testes Automatizados (`test.cjs`)

Para garantir que nenhuma regressão ocorra em futuras iterações, o repositório conta com uma suíte abrangente de **80 testes automatizados** em Node.js:

Para rodar a suíte:
```bash
node test.cjs
```

### Cobertura dos Testes:
1. Sincronização estrita entre `index.html` e `Ensaio · Os Inventariantes.html`.
2. Parsing da peça padrão *Os Inventariantes* (58 falas, 2 personagens, 5 beats).
3. Cloze Semântico, sistema de dicas (D) e progressão de fixação.
4. Navegação cronológica e histórico sem regressão.
5. Alternância fluida de ator ativo.
6. Filtro de beats dramáticos.
7. Carregamento de peça personalizada com 5 personagens.
8. Geração dinâmica de seletores de voz para múltiplos personagens.
9. Restauração fiel de *Os Inventariantes*.
10. Persistência de intenções de Stanislavski.
11. Modal de índice de falas com filtros.
12. ScriptParser universal (negrito isolado, maiúsculas, travessão, multilinhas).
13. Cloze Semântico com ênclise pronominal, apóstrofos e entidades HTML.
14. Algoritmo de fraquezas sem estouro de pilha com nível 5 universal.
15. Isolamento de intenções dramáticas por peça (`playId`).
16. Cancelamento de timers zumbis no modo Ping-Pong.
17. Resiliência de `Utils.base64ToBlob` para Data URLs e raw base64.
18. Revogação de URLs em `AudioEngine` para prevenir vazamentos de memória.
19. Persistência íntegra de metadados em backups.
20. Limites e barreiras de navegação em modos filtrados.
21. Ergonomia mobile, safe-area insets e redução de poluição visual.
22. Otimização dramática de deixas: ausência de cards redundantes na abertura.
23. Descarte de modais bottom sheet por toque no backdrop e drag-bar.
24. Transição fluida entre Camarim (#lobbyView) e Palco (#rehearsalView).
25. Fluxo previsível de "Errei" com retenção cênica e ciclo de retry.
26. One-Thumb Action Dock, ausência de ruído e suporte a modo desafio vs primeira leitura.
27. Sincronização do One-Thumb Dock no fim de cena e reinício por ator.
28. Isolamento de teclado no Camarim e acionamento por Enter.
29. AudioEngine: controle bidirecional de reprodução e parada imediata (Play/Stop toggle).
30. Ocultação determinística de rubricas entre parênteses (hideRubrics).
31. Chegar com a fala oculta por padrão (alwaysStartHidden) e Leitura Integral (modalFullScript).
32. Modo Quiz de Alternativas (banco de palavras, distratores e avanço).
33. Modo Digitação (inputs inline, validação e avanço).
34. Sanitização XSS contra injeção de atributos HTML.
35. Backup seguro: inclusão de intenções/vozes e blindagem contra vazamento de chaves.
36. Fila adaptativa de ensaio com reforço espaçado imediato.
37. Suporte a roteiros no padrão da indústria Fountain (.fountain).
38. Coerência de backup e restauração de áudio (STORE_NAME, gravação e recuperação).
39. Restauração de configurações salvas (studyMethod, hideRubrics, alwaysStartHidden).
40. Despacho único de eventos e eliminação de chamadas duplicadas.
41. Prevenção de race condition em renderView (token incremental de render).
42. Atalho de teclado I para alternância do índice.
43. Segurança CSP e higienização limpa de dados na restauração de backup.
44. Acessibilidade de modais: type="button", focus trap e retorno de foco.
45. Sistema de ícones vetoriais SVG, erradicação total de emojis e alternância de temas.
46. Arquitetura App Shell: Bottom Tab Bar, Mission Control de 4 slots e Bottom Sheets.
47. Caderno de Ensaio: anotações livres, vinculação opcional a falas e central de voz.
48. Leitura Dramatúrgica Contínua (ePub/PDF), Seletor de Alvo de Áudio, Marca-Texto e Onboarding.
49. Catálogo Multi-Peças (PlayStore), integridade canônica e persistência.
50. Criação dinâmica e coexistência de múltiplos roteiros no catálogo.
51. Alternância atômica de peças e isolamento rigoroso de atores, progresso e notas.
52. Cálculo de métricas dramáticas, beats e domínio por peça (PlayStore.getStats).
53. Exclusão de peças com purga e blindagem imutável da peça canônica padrão.
54. Ponto de acesso no Camarim e acionamento dos modais de biblioteca/importação.
55. Biblioteca de Roteiros, estatísticas de domínio e alternância de peça com 1 toque.
56. Fluxo de importação e leitura heurística de formatos teatrais livres.
57. Prévia e personalização dramatúrgica de roteiros reais.
58. Gancho arquitetural plugável para IA e resiliência offline.
59. Curadoria de personagens (renomear, filtrar e persistir falas customizadas).
60. ScriptParser: rubricas isoladas, transições cênicas e sluglines.
61. Exclusão segura da peça ativa com fallback limpo para a peça padrão.
62. AIService: BYOK Gemini, persistência de chave, modelos e ping de validação.
63. ScriptParser.sanitizeRawText: remoção de ruídos OCR e desquebra de hifens.
64. ScriptParser: agrupamento e canonicalização de variantes de personagens.
65. ScriptParser.detectCueTrigger: detecção causal e badge de engate cênico.
66. O Diretor Stanislavski: verbos de ação ativos, subtexto dramático e persistência.
67. Curadoria de beats dramáticos, persistência e blindagem de chaves no backup.
68. ScriptParser: preservação estrita de personagens distintos e unificação segura de abreviações.
69. AIService.callGeminiRaw: extração e parsing resiliente de arrays JSON.
70. AppController.importFullBackup: blindagem e preservação da chave de API Gemini no restore.
71. Gamificação / Quiz Dramatúrgico com IA: offline fallback, mock IA e interface do Caderno.
72. Curadoria de beats: remoção total preservada para cena única e adição de novo beat.
73. Central do Diretor IA: Bottom Tab Bar, modal dedicado e renderização.
74. Guia do Ensaio: botão de acesso no topo, modal ilustrado e seções conceituais.
75. Faxina de Ajustes: remoção de botões ambíguos e textarea inútil.
76. AudioEngine: normalização de estado isPlaying e UI no ciclo de vida de síntese de voz.
77. PWA: Robustez do Service Worker e metadados de loja no manifest.
78. ScriptParser: imunidade contra didascálias cênicas isoladas no elenco.
79. StorageManager: resiliência defensiva e consistência de intenções.
80. AppController: isolamento estrito da fila de retry entre atores.
81. AudioEngine: chamada direta de síntese, suporte a ator não-indexado (-1) e resiliência a nulos.
82. PlayStore.getStats: métrica de domínio isolada por personagem e teto de 100%.
83. ScriptParser: imunidade a falsos personagens em marcações de fim de cena, música e pano.
84. AppController: persistência de beat e isolamento de retry na troca de beat.
85. PWA: registro adaptativo de Service Worker para inicialização pós-load.
86. AudioEngine: ciclo de vida de liberação de Blob URL e tratamento de falhas.

---

## 📱 Suporte a PWA & Mobile Web APIs

* **`sw.js` (Service Worker)**: Cache de ativos estáticos para funcionamento 100% offline. Atualiza automaticamente via estratégia cache-first com fallback para rede.
* **`manifest.json`**: Configuração de ícones, modo `standalone` e tema visual para instalação na tela de início.
* **Screen Wake Lock API (`navigator.wakeLock`)**: Mantém a tela do smartphone acesa continuamente durante o ensaio para o ator não precisar tocar na tela a cada fala.
* **Storage Persistence API (`navigator.storage.persist`)**: Solicita ao sistema operacional do smartphone permissão para armazenamento durável, evitando que o Safari ou Chrome limpem o cache de gravações quando a memória estiver cheia.
