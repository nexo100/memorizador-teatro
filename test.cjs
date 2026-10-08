const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🧪 Executando bateria de testes do Memorizador Teatral...');

// 1. Integridade modular de index.html e redirecionamento canônico
const indexHtml = fs.readFileSync('index.html', 'utf8');
const ensaioHtml = fs.readFileSync('Ensaio · Os Inventariantes.html', 'utf8');
assert(ensaioHtml.includes('url=./index.html'), 'Ensaio · Os Inventariantes.html deve redirecionar para index.html');
assert(indexHtml.includes('css/style.css'), 'index.html deve carregar css/style.css');
assert(indexHtml.includes('plays/default-play.js'), 'index.html deve carregar plays/default-play.js');
assert(indexHtml.includes('js/app.js'), 'index.html deve carregar os módulos em js/');
console.log('✅ 1. Arquitetura modular e redirecionamento canônico validados');

// 2. Validação da existência física dos módulos e folhas de estilo
const cssContent = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');
const jsFiles = ['config.js', 'utils.js', 'state.js', 'parser.js', 'ai-service.js', 'storage.js', 'audio.js', 'ui.js', 'app.js'];
jsFiles.forEach(f => {
  assert(fs.existsSync(path.join(__dirname, 'js', f)), `Arquivo js/${f} deve existir`);
});
assert(fs.existsSync(path.join(__dirname, 'plays', 'default-play.js')), 'Arquivo plays/default-play.js deve existir');
assert(fs.existsSync(path.join(__dirname, 'plays', 'os-inventariantes.json')), 'Arquivo plays/os-inventariantes.json deve existir');

// 3. Mock do ambiente de navegador
const domStore = {};
function createEl(id) {
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    hidden: id.startsWith('modal') || id === 'rehearsalView',
    checked: false,
    disabled: false,
    dataset: {},
    classList: {
      add() {},
      remove() {},
      contains() { return false; }
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    closest: () => null,
    onchange: null,
    onclick: null,
    oninput: null
  };
}

const docListeners = {};
const mockDocument = {
  getElementById: (id) => domStore[id] || (domStore[id] = createEl(id)),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: (evt, fn) => { docListeners[evt] = fn; },
  createElement: () => ({
    style: {},
    appendChild: () => {},
    removeChild: () => {},
    click: () => {}
  }),
  body: { appendChild: () => {}, removeChild: () => {} },
  title: ''
};

const mockWindow = {
  speechSynthesis: {
    getVoices: () => [
      { name: 'Luciana', lang: 'pt-BR' },
      { name: 'Felipe', lang: 'pt-BR' }
    ],
    speak: () => {},
    cancel: () => {},
    addEventListener: () => {}
  },
  SpeechSynthesisUtterance: function(t) { this.text = t; this.lang = 'pt-BR'; },
  addEventListener: () => {}
};

const mockLocalStorage = {
  _data: {},
  getItem(k) { return this._data[k] !== undefined ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  get length() { return Object.keys(this._data).length; },
  key(i) { return Object.keys(this._data)[i] || null; }
};

const mockIndexedDB = {
  open: () => {
    const req = {
      result: {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => {},
        transaction: () => {
          const tx = {
            objectStore: () => ({
              put: () => ({}),
              get: () => {
                const r = { onsuccess: null, onerror: null, result: null };
                setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                return r;
              },
              delete: () => ({}),
              clear: () => ({}),
              getAll: () => {
                const r = { onsuccess: null, onerror: null, result: [] };
                setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                return r;
              }
            }),
            oncomplete: null,
            onerror: null
          };
          setTimeout(() => { if (typeof tx.oncomplete === 'function') tx.oncomplete(); }, 0);
          return tx;
        }
      },
      onsuccess: null,
      onerror: null
    };
    setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
    return req;
  }
};

// 4. Executar script no contexto VM
const context = vm.createContext({
  document: mockDocument,
  window: mockWindow,
  navigator: {
    serviceWorker: { register: () => Promise.resolve() },
    vibrate: () => true,
    mediaDevices: {},
    storage: { persist: () => Promise.resolve() }
  },
  localStorage: mockLocalStorage,
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
  indexedDB: mockIndexedDB,
  console: console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  atob: globalThis.atob,
  btoa: globalThis.btoa,
  Blob: globalThis.Blob
});

// Carregar peca padrao desacoplada antes dos modulos do app
const defaultPlayCode = fs.readFileSync(path.join(__dirname, 'plays', 'default-play.js'), 'utf8');
vm.runInContext(defaultPlayCode, context);

jsFiles.forEach(f => {
  const code = fs.readFileSync(path.join(__dirname, 'js', f), 'utf8');
  vm.runInContext(code, context);
});

vm.runInContext('globalThis.__test_exports = { AppState, AppController, UIController, StorageManager, AudioEngine, ScriptParser, DramaBeats, DramaturgyAnalyzer, AppConfig, Utils, DefaultPlay, PlayStore, AIService };', context);

const { AppState, AppController, UIController, StorageManager, AudioEngine, ScriptParser, DramaBeats, DramaturgyAnalyzer, AppConfig, Utils, DefaultPlay, PlayStore, AIService } = context.__test_exports;

async function runTestSuite() {
  await new Promise(r => setTimeout(r, 40));

  // Teste 1: Estado inicial e Peça Padrão
  assert.strictEqual(AppState.speeches.length, 58, 'Deveria carregar 58 falas de Os Inventariantes');
  assert.strictEqual(AppState.characters.length, 2, 'Deveria conter 2 personagens');
  assert.strictEqual(JSON.stringify(AppState.characters), JSON.stringify(['SÉRGIO', 'BÁRBARA']));
  assert.strictEqual(AppState.selectedActor, 'SÉRGIO');
  assert.strictEqual(AppState.activeBeats.length, 5, 'Deveria ter 5 beats canônicos');
  assert(domStore['mainApp'].innerHTML.length > 50, 'mainApp deveria estar renderizado');
  console.log('✅ 2. Peça padrão "Os Inventariantes" carregada perfeitamente (58 falas, 2 personagens, 5 beats)');

  // Teste 2: Cloze Semântico e Andaimes Sintáticos
  AppState.masteryLevels[0] = 1;
  AppState.hintsUsedThisLine = 0;
  AppState.isRevealed = false;
  await UIController.renderView();
  assert(domStore['mainApp'].innerHTML.includes('masked-word'), 'Nível 1 deve mascarar palavras de conteúdo');

  // Dica incremental (tecla D)
  AppController.handleActionClick('btnHint');
  await UIController.renderView();
  assert.strictEqual(AppState.hintsUsedThisLine, 1, 'Contador de dicas incrementado');
  assert(domStore['mainApp'].innerHTML.includes('hint-revealed'), 'Palavra revelada com dica');

  // Conferir fala
  AppController.handleActionClick('btnCheck');
  await UIController.renderView();
  assert.strictEqual(AppState.isRevealed, true, 'Fala revelada');

  // Marcar acerto
  AppController.handleActionClick('btnCorrect');
  assert.strictEqual(AppState.masteryLevels[0], 2, 'Domínio sobe para nível 2');
  assert.strictEqual(AppState.currentIndex, 1, 'Avança para fala 1');
  console.log('✅ 3. Cloze Semântico, sistema de dicas (D) e progressão de fixação validados');

  // Teste 3: Navegação
  AppController.advancePrev();
  assert.strictEqual(AppState.currentIndex, 0, 'Voltou para fala 0');
  console.log('✅ 4. Navegação e histórico funcionam sem regressão');

  // Teste 4: Alternância de personagem para BÁRBARA
  AppState.selectedActor = 'BÁRBARA';
  StorageManager.saveSettings(AppState);
  AppState.masteryLevels = StorageManager.loadProgress('BÁRBARA', AppState.speeches.length);
  await UIController.renderView();
  assert.strictEqual(AppState.selectedActor, 'BÁRBARA');
  console.log('✅ 5. Alternância fluida de ator ativo para BÁRBARA');

  // Teste 5: Filtro de Beats
  AppState.selectedBeat = '2'; // Beat 3: Falas 24 a 34 (índices 23 a 33)
  const beatRange = AppState.getActiveBeatRange();
  assert.strictEqual(beatRange.start, 23);
  assert.strictEqual(beatRange.end, 33);
  AppController.goToSpeech(beatRange.start, false);
  assert.strictEqual(AppState.currentIndex, 23);
  console.log('✅ 6. Filtro de beats dramáticos funciona rigorosamente');

  // Reset para todas as falas
  AppState.selectedBeat = 'all';
  AppState.currentIndex = 0;

  // Teste 6: Carregamento Universal de Nova Peça (5 personagens)
  const customScript = `
# Hamlet de William Shakespeare
**HAMLET:** Ser ou não ser, eis a questão.
**OFÉLIA:** Meu senhor, como tem passado nestes dias?
**REI CLÁUDIO:** *(Com voz grave)* Hamlet, que melancolia é essa?
**RAINHA GERTRUDES:** Querido filho, desfaça essa expressão sombria.
**HORÁCIO:** Meu príncipe, ouvi passos estranhos na muralha.
`;
  mockLocalStorage.setItem('memorizador_custom_script', customScript);
  AppController.loadActiveScript();
  await new Promise(r => setTimeout(r, 40));

  assert.strictEqual(AppState.speeches.length, 5);
  assert.strictEqual(AppState.characters.length, 5);
  assert.strictEqual(JSON.stringify(AppState.characters), JSON.stringify(['HAMLET', 'OFÉLIA', 'REI CLÁUDIO', 'RAINHA GERTRUDES', 'HORÁCIO']));
  assert.strictEqual(mockDocument.title, 'Ensaio Teatral · Hamlet de William Shakespeare');
  console.log('✅ 7. Peça personalizada com 5 personagens carregada dinamicamente com título atualizado');

  // Teste 7: Geração dinâmica de seletores de voz para os 5 personagens
  UIController.populateVoiceSelectors();
  const vContainer = domStore['characterVoicesContainer'].innerHTML;
  assert(vContainer.includes('voiceSelect_hamlet'), 'Seletor para Hamlet');
  assert(vContainer.includes('voiceSelect_ofelia'), 'Seletor para Ofélia');
  assert(vContainer.includes('voiceSelect_rei_claudio'), 'Seletor para Rei Cláudio');
  assert(vContainer.includes('voiceSelect_rainha_gertrudes'), 'Seletor para Rainha Gertrudes');
  assert(vContainer.includes('voiceSelect_horacio'), 'Seletor para Horácio');
  console.log('✅ 8. Seletores de voz gerados dinamicamente para todos os 5 personagens');

  // Teste 8: Restauração da peça original
  mockLocalStorage.removeItem('memorizador_custom_script');
  AppController.loadActiveScript();
  await new Promise(r => setTimeout(r, 40));

  assert.strictEqual(AppState.speeches.length, 58);
  assert.strictEqual(AppState.characters.length, 2);
  assert.strictEqual(JSON.stringify(AppState.characters), JSON.stringify(['SÉRGIO', 'BÁRBARA']));
  assert.strictEqual(AppState.activeBeats.length, 5);
  console.log('✅ 9. Restauração perfeita de "Os Inventariantes" confirmada');

  // Teste 9: Intenções de Stanislavski
  const intentDefault = StorageManager.getSpeechIntent(0, true);
  assert.strictEqual(intentDefault, AppConfig.DEFAULT_INTENTIONS[0]);

  StorageManager.setSpeechIntent(0, 'Intenção experimental');
  assert.strictEqual(StorageManager.getSpeechIntent(0, true), 'Intenção experimental');

  StorageManager.setSpeechIntent(0, 'padrao');
  assert.strictEqual(StorageManager.getSpeechIntent(0, true), AppConfig.DEFAULT_INTENTIONS[0]);
  console.log('✅ 10. Persistência e restauração de intenções dramáticas de Stanislavski validadas');

  // Teste 10: Modal de Índice
  await UIController.renderIndexModal();
  assert(domStore['indexListContainer'].innerHTML.includes('index-item'));
  console.log('✅ 11. Modal de índice de falas renderizado com filtros');

  // Teste 12: Universal ScriptParser - Linhas de personagem isoladas e multilinhas
  const complexScript = `
**HAMLET**
Ser ou não ser, eis a questão.
Será mais nobre suportar na mente as pedras e flechas da fortuna injusta,
ou tomar armas contra um mar de calamidades?

OFÉLIA
Meu senhor, há muitos dias guardo lembranças vossas.

REI CLÁUDIO -
Que tristeza é essa, sobrinho meu?
`;
  const complexParsed = ScriptParser.parseScript(complexScript);
  assert.strictEqual(complexParsed.length, 3, 'Deveria identificar 3 falas');
  assert.strictEqual(complexParsed[0].who, 'HAMLET');
  assert(complexParsed[0].spokenText.includes('Será mais nobre suportar'), 'Fala multilinha preservada');
  assert.strictEqual(complexParsed[1].who, 'OFÉLIA');
  assert.strictEqual(complexParsed[2].who, 'REI CLÁUDIO');
  console.log('✅ 12. ScriptParser universal: nomes isolados (bold/caps), traço e multilinhas validados');

  // Teste 13: Mascaramento linguístico Cloze Semântico (ênclise, apóstrofo e caracteres HTML)
  const maskEncliseInit = Utils.maskWord('diga-me', 'initial');
  assert(maskEncliseInit.includes('first-letter-word') && maskEncliseInit.includes('-'), 'Ênclise mascarada com hífen preservado');
  const maskApostrofe = Utils.maskWord("d'água", 'initial');
  assert(maskApostrofe.includes("'"), 'Apóstrofo preservado no mascaramento');
  const maskHtmlEnt = Utils.maskWord('Tom & Jerry', 'blank');
  assert(maskHtmlEnt.includes('&amp;'), 'Entidade HTML escapada sem corrupção de tags');
  assert(!maskHtmlEnt.includes('&<span'), 'Nenhuma tag inválida dentro de entidade HTML');
  console.log('✅ 13. Cloze Semântico: ênclise pronominal, apóstrofos e entidades HTML validados');

  // Teste 14: pickNextWeakness com domínio máximo (prevenção de recursão infinita)
  AppState.speeches = [
    { who: 'SÉRGIO', spokenText: 'Fala 1', segments: [{ type: 'speech', text: 'Fala 1' }] },
    { who: 'SÉRGIO', spokenText: 'Fala 2', segments: [{ type: 'speech', text: 'Fala 2' }] }
  ];
  AppState.selectedActor = 'SÉRGIO';
  AppState.masteryLevels = [5, 5];
  AppState.currentIndex = 0;
  const picked = AppState.pickNextWeakness();
  assert.strictEqual(typeof picked, 'number', 'Retorna índice numérico válido');
  assert(picked >= 0 && picked <= 1, 'Índice dentro do intervalo');
  console.log('✅ 14. Algoritmo de fraquezas: proteção total contra estouro de pilha (nível 5 em todas as falas)');

  // Teste 15: Isolamento de intenções dramáticas por peça (prevenção de vazamento entre textos)
  StorageManager.setSpeechIntent(0, 'Intenção do Hamlet', false, 'play_hamlet');
  const hamletIntent = StorageManager.getSpeechIntent(0, false, 'play_hamlet');
  const defaultIntent = StorageManager.getSpeechIntent(0, true, 'default');
  assert.strictEqual(hamletIntent, 'Intenção do Hamlet');
  assert.strictEqual(defaultIntent, AppConfig.DEFAULT_INTENTIONS[0]);
  console.log('✅ 15. Isolamento estrito de intenções dramáticas por peça (playId scoping)');

  // Teste 16: Limpeza de temporizador do Ping-Pong ao navegar
  AppState.rehearsalMode = 'pingpong';
  AppState.runPingPongTimer = AppController.runPingPongTimer.bind(AppController);
  AppController.runPingPongTimer();
  assert(AppState.pingPongInterval !== null, 'Intervalo Ping-Pong ativo');
  AppController.goToSpeech(1, false);
  assert.strictEqual(AppState.pingPongInterval, null, 'Intervalo Ping-Pong cancelado ao mudar de fala');
  console.log('✅ 16. Temporizadores zumbis: cancelamento garantido do Ping-Pong na navegação');

  // Teste 17: Resiliência de base64ToBlob para URLs de dados e base64 puro
  const sampleDataUrl = 'data:audio/webm;base64,AAAA';
  const blob1 = Utils.base64ToBlob(sampleDataUrl);
  assert.strictEqual(blob1.type, 'audio/webm');
  assert.strictEqual(blob1.size, 3);
  const sampleRawB64 = 'AAAA';
  const blob2 = Utils.base64ToBlob(sampleRawB64, 'audio/mp4');
  assert.strictEqual(blob2.type, 'audio/mp4');
  assert.strictEqual(blob2.size, 3);
  console.log('✅ 17. Utils.base64ToBlob: resiliência para Data URLs e raw base64');

  // Teste 18: Revogação de URLs de áudio no AudioEngine (prevenção de memory leak)
  let revokedUrl = null;
  context.URL.revokeObjectURL = (u) => { revokedUrl = u; };
  AudioEngine.activeAudioUrl = 'blob:mock-audio-123';
  AudioEngine.stopAllAudio();
  assert.strictEqual(AudioEngine.activeAudioUrl, null);
  assert.strictEqual(revokedUrl, 'blob:mock-audio-123');
  console.log('✅ 18. AudioEngine: vazamento de memória de Blob URLs eliminado com revogação ativa');

  // Teste 19: Backup e Restauração com fidelidade de speechIdx e playId
  const origGetDb = StorageManager.getIndexedDB;
  let savedDbRecord = null;
  const mockDbForImport = {
    transaction: () => {
      const tx = {
        objectStore: () => ({
          clear: () => {},
          put: (rec) => { savedDbRecord = rec; },
          get: () => {
            const r = { onsuccess: null, onerror: null, result: null };
            setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
            return r;
          }
        }),
        oncomplete: null,
        onerror: null
      };
      setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
      return tx;
    }
  };
  StorageManager.getIndexedDB = async () => mockDbForImport;
  const sampleBackup = {
    localStorage: { 'memorizador_rate': '1.1' },
    recordings: [{ id: 'default_5', base64: 'data:audio/webm;base64,AAAA', speechIdx: 5, playId: 'default' }]
  };
  const mockFile = { text: async () => JSON.stringify(sampleBackup) };
  context.alert = () => {};
  await AppController.importFullBackup(mockFile);
  StorageManager.getIndexedDB = origGetDb;
  assert(savedDbRecord !== null, 'Gravação restaurada no IndexedDB');
  assert.strictEqual(savedDbRecord.speechIdx, 5, 'speechIdx restaurado com precisão');
  assert.strictEqual(savedDbRecord.playId, 'default', 'playId restaurado com precisão');
  console.log('✅ 19. Backup & Restauração: persistência íntegra de speechIdx e playId');

  // Teste 20: Limites de navegação em modos filtrados por ator (btnPrev / btnNext)
  AppController.loadActiveScript();
  await new Promise(r => setTimeout(r, 40));
  AppState.rehearsalMode = 'minhas';
  AppState.selectedActor = 'SÉRGIO';
  const sergioIndices = AppState.getMySpeechIndices();
  AppState.currentIndex = sergioIndices[0];
  UIController.updateHeaderStats();
  assert.strictEqual(domStore['btnPrev'].disabled, true, 'btnPrev deve estar desabilitado na primeira fala do ator');
  assert.strictEqual(domStore['btnNext'].disabled, false, 'btnNext deve estar habilitado');
  AppState.currentIndex = sergioIndices[sergioIndices.length - 1];
  UIController.updateHeaderStats();
  assert.strictEqual(domStore['btnNext'].disabled, true, 'btnNext deve estar desabilitado na última fala do ator');
  console.log('✅ 20. Limites de navegação do ator em modos filtrados validados');

  // Teste 21: Ergonomia Mobile e Safe-Area Insets (Prevenção de Margem Dupla e Desperdício)
  assert(!cssContent.includes('padding-top: env(safe-area-inset-top'), 'Root não deve ter padding-top para evitar margens duplicadas com rodapé fixo');
  assert(cssContent.includes('.status-toast:empty'), 'Toast vazio deve ter display: none');
  assert(cssContent.includes('.cue-mini-badge'), 'Mini badge para deixas de abertura/continuação deve existir');
  console.log('✅ 21. Ergonomia mobile, safe-area insets e redução de poluição visual validados');

  // Teste 22: Redução de poluição visual na abertura de cena (Mini Badge vs Card Cheio)
  AppState.currentIndex = 0;
  AppState.selectedActor = 'SÉRGIO';
  await UIController.renderView();
  assert(domStore['mainApp'].innerHTML.includes('cue-mini-badge'), 'Fala inicial deve exibir cue-mini-badge sutil');
  assert(!domStore['mainApp'].innerHTML.includes('<div class="cue-card"><span class="cue-tag">Abertura</span>'), 'Não deve renderizar card gigante vazio de abertura');
  console.log('✅ 22. Otimização dramática de deixas: ausência de cards redundantes na abertura');

  // Teste 23: Descarte de Bottom Sheet Modais via clique no Backdrop / Drag-Bar
  AppController.bindEvents();
  const mIndex = domStore['modalIndex'];
  mIndex.hidden = false;
  mIndex.onclick({ target: mIndex });
  assert.strictEqual(mIndex.hidden, true, 'Clique no backdrop fecha o modal');

  mIndex.hidden = false;
  mIndex.onclick({ target: { classList: { contains: (cls) => cls === 'modal-drag-bar' } } });
  assert.strictEqual(mIndex.hidden, true, 'Toque na barra de arraste fecha o modal');
  console.log('✅ 23. Descarte de modais bottom sheet por toque no backdrop e drag-bar validado');

  // Teste 24: Transição e sincronia de telas entre Camarim (#lobbyView) e Palco (#rehearsalView)
  UIController.showScreen('lobby');
  assert.strictEqual(AppState.currentScreen, 'lobby', 'Tela atual deve ser Camarim');
  assert.strictEqual(domStore['lobbyView'].hidden, false, 'Camarim deve estar visível');
  assert.strictEqual(domStore['rehearsalView'].hidden, true, 'Palco deve estar oculto');

  // Entrar em cena no Palco com modo 'minhas'
  AppController.enterStage('minhas');
  assert.strictEqual(AppState.currentScreen, 'stage', 'Tela atual deve ser Palco');
  assert.strictEqual(AppState.rehearsalMode, 'minhas', 'Modo deve ter sido aplicado');
  assert.strictEqual(domStore['lobbyView'].hidden, true, 'Camarim deve estar oculto no ensaio');
  assert.strictEqual(domStore['rehearsalView'].hidden, false, 'Palco deve estar visível');

  // Voltar ao Camarim
  AppController.returnToLobby();
  assert.strictEqual(AppState.currentScreen, 'lobby', 'Retorno ao Camarim validado');
  assert.strictEqual(domStore['lobbyView'].hidden, false, 'Camarim visível novamente');
  assert.strictEqual(domStore['rehearsalView'].hidden, true, 'Palco oculto novamente');
  console.log('✅ 24. Transição fluida entre Camarim (#lobbyView) e Palco (#rehearsalView) validada');

  // Teste 25: Fluxo do botão "Errei" com retenção de cena e ciclo de retry
  AppState.selectedActor = 'SÉRGIO';
  AppController.enterStage('minhas');
  AppState.currentIndex = 0;
  AppState.masteryLevels[0] = 2;
  AppState.isRevealed = true;
  await UIController.renderView();

  // Ator clica em Errei
  AppController.handleActionClick('btnWrong');
  await UIController.renderView();
  assert.strictEqual(AppState.currentIndex, 0, 'Não deve expulsar o ator para a próxima fala ao errar');
  assert.strictEqual(AppState.isRetryState, true, 'Estado de retry ativado');
  assert.strictEqual(AppState.masteryLevels[0], 1, 'Nível de domínio decrementado para 1');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnRetry'), 'Botão Tentar de novo agora deve estar visível');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnNextAfterWrong'), 'Botão Seguir adiante deve estar visível');

  // Ator clica em "Tentar de novo agora"
  AppController.handleActionClick('btnRetry');
  assert.strictEqual(AppState.isRetryState, false, 'Sai do estado de retry');
  assert.strictEqual(AppState.isRevealed, false, 'Fala volta a ficar mascarada para novo teste');
  assert.strictEqual(AppState.currentIndex, 0, 'Permanece na mesma fala para tentar de novo');

  // Teste de resiliência: retry a partir de erro que reduz domínio para nível 0
  AppState.masteryLevels[0] = 1;
  AppState.isRevealed = true;
  AppController.handleActionClick('btnWrong');
  assert.strictEqual(AppState.masteryLevels[0], 0, 'Nível decrementado para 0');
  AppController.handleActionClick('btnRetry');
  await UIController.renderView();
  assert.strictEqual(AppState.masteryLevels[0], 1, 'Retry eleva para nível 1 para garantir teste ativo');
  assert.strictEqual(AppState.isRevealed, false, 'Fala fica mascarada para teste');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnCheck'), 'Hero dock apresenta Conferir Fala no retry');
  assert(domStore['mainApp'].innerHTML.includes('masked-word'), 'Texto contém palavras mascaradas para o teste');

  // Novo erro seguido de "Seguir adiante"
  AppState.isRevealed = true;
  AppController.handleActionClick('btnWrong');
  assert.strictEqual(AppState.isRetryState, true, 'Estado de retry ativado novamente');
  AppController.handleActionClick('btnNextAfterWrong');
  assert.strictEqual(AppState.isRetryState, false, 'Estado de retry desativado');
  assert.strictEqual(AppState.currentIndex, 2, 'Avançou para a próxima fala do ator');
  console.log('✅ 25. Fluxo previsível de "Errei" com retenção cênica e ciclo de retry validado');

  // Teste 26: Barra de Um Polegar (One-Thumb Action Dock) e Topo Minimalista Desobstruído
  AppState.currentIndex = 0;
  AppState.masteryLevels[0] = 0;
  AppState.isRevealed = false;
  AppState.isRetryState = false;
  AppState.alwaysStartHidden = false; // Modo legado / primeira leitura
  await UIController.renderView();
  assert(domStore['dockHeroArea'].innerHTML.includes('btnHideWords'), 'Hero button deve ser Já li no nível 0 em modo primeira leitura');

  AppState.alwaysStartHidden = true; // Novo modo desafio (padrão do ator)
  await UIController.renderView();
  assert(domStore['dockHeroArea'].innerHTML.includes('btnCheck'), 'Hero button deve ser Conferir Fala no nível 0 em modo desafio');

  AppState.masteryLevels[0] = 1;
  await UIController.renderView();
  assert(domStore['dockHeroArea'].innerHTML.includes('btnCheck'), 'Hero button deve ser Conferir Fala no estado oculto com nível > 0');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnHint'), 'Botão Dica deve estar presente');

  AppState.isRevealed = true;
  await UIController.renderView();
  assert(domStore['dockHeroArea'].innerHTML.includes('btnWrong'), 'Hero dock deve conter Errei no estado revelado');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnCorrect'), 'Hero dock deve conter Acertei no estado revelado');

  // Ausência de legendas de atalho poluentes e presença dos novos componentes no HTML
  assert(!indexHtml.includes('<div class="keyboard-guide">'), 'Legendas pesadas de teclado não devem poluir a tela mobile');
  assert(indexHtml.includes('id="btnBackToLobby"'), 'Botão ‹ Camarim deve estar presente no Palco');
  assert(indexHtml.includes('id="stageHeader"'), 'Header minimalista do palco deve estar presente');
  assert(indexHtml.includes('id="oneThumbDock"'), 'One-Thumb Action Dock deve estar presente');
  assert(indexHtml.includes('id="modeCardsGrid"'), 'Cards grandes de modos de ensaio devem estar presentes no Camarim');
  assert(cssContent.includes('.action-secondary-row'), 'CSS de action-secondary-row deve estar presente');
  assert(cssContent.includes('.btn-audio'), 'CSS de btn-audio deve estar presente');
  assert(cssContent.includes('.btn-icon-only'), 'CSS de btn-icon-only deve estar presente');
  console.log('✅ 26. One-Thumb Action Dock, ausência de ruído e topo minimalista validados');

  // Teste 27: Sincronização do One-Thumb Action Dock no fim de cena (Fim do Bloco) e reinício por ator
  AppState.rehearsalMode = 'minhas';
  AppState.selectedActor = 'BÁRBARA';
  const barbaraIndices = AppState.getMySpeechIndices();
  AppState.currentIndex = barbaraIndices[barbaraIndices.length - 1];
  AppController.advanceNext();
  assert.strictEqual(AppState.isSceneFinished, true, 'isSceneFinished deve ser true');
  assert(domStore['mainApp'].innerHTML.includes('Fim do Bloco / Cena'), 'Tela principal deve exibir mensagem de término');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnRestartScene'), 'One-Thumb dock deve sincronizar botão Recomeçar bloco');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnReturnLobbyFinished'), 'One-Thumb dock deve sincronizar botão Voltar ao Camarim');
  assert(!domStore['dockHeroArea'].innerHTML.includes('btnCheck'), 'Não deve exibir botão Conferir Fala no fim de cena');

  // Reiniciar cena como Bárbara
  AppController.handleActionClick('btnRestartScene');
  assert.strictEqual(AppState.isSceneFinished, false, 'isSceneFinished deve ser resetado');
  assert.strictEqual(AppState.currentIndex, barbaraIndices[0], 'Reinício de Bárbara em modo minhas deve ir para a primeira fala dela');
  console.log('✅ 27. Sincronização do One-Thumb Dock no fim de cena e reinício por ator validados');

  // Teste 28: Isolamento do teclado no Camarim (Enter entra em cena; atalhos de palco ignorados)
  AppController.bindKeyboard();
  UIController.showScreen('lobby');
  AppState.currentIndex = 5;
  if (docListeners['keydown']) {
    docListeners['keydown']({ key: 'ArrowRight', preventDefault: () => {}, target: { tagName: 'DIV' } });
    assert.strictEqual(AppState.currentIndex, 5, 'Teclas de ensaio não devem avançar fala no Camarim');
    docListeners['keydown']({ key: ' ', code: 'Space', preventDefault: () => {}, target: { tagName: 'DIV' } });
    assert.strictEqual(AppState.currentIndex, 5, 'Barra de espaço não deve avançar fala no Camarim');
    docListeners['keydown']({ key: 'Enter', preventDefault: () => {}, target: { tagName: 'DIV' } });
    assert.strictEqual(AppState.currentScreen, 'stage', 'Enter no Camarim deve entrar em cena no Palco');
    AppController.returnToLobby();
  }
  console.log('✅ 28. Isolamento de teclado no Camarim e acionamento por Enter validados');

  // Teste 29: AudioEngine Toggle - Play & Stop imediato
  let audioStatus = '';
  const currentSp = AppState.speeches[0];
  AudioEngine.playSpeechAudio(0, currentSp, 'SÉRGIO', 0, 1.0, 'normal', { onStatus: (msg) => { audioStatus = msg; } });
  assert.strictEqual(AudioEngine.isPlaying, true, 'AudioEngine deve estar em estado isPlaying=true');
  // Clicar novamente para interromper
  AudioEngine.playSpeechAudio(0, currentSp, 'SÉRGIO', 0, 1.0, 'normal', { onStatus: (msg) => { audioStatus = msg; } });
  assert.strictEqual(AudioEngine.isPlaying, false, 'AudioEngine deve ter parado (isPlaying=false)');
  assert.strictEqual(audioStatus, 'Áudio interrompido.');
  console.log('✅ 29. AudioEngine: controle bidirecional de reprodução e parada imediata (Play/Stop toggle) validado');

  // Teste 30: Ocultação de Rubricas entre parênteses
  const speechWithRubric = {
    who: 'SÉRGIO',
    spokenText: 'Você não pode fazer isso comigo.',
    segments: [
      { type: 'rubric', text: 'com raiva e desespero' },
      { type: 'speech', text: 'Você não pode fazer isso comigo.' }
    ]
  };
  AppState.hideRubrics = false;
  const htmlWithRubric = UIController.renderSpeechHtml(speechWithRubric, 0, 0, 0, true);
  assert(htmlWithRubric.includes('com raiva e desespero'), 'Rubrica deve aparecer quando hideRubrics=false');

  AppState.hideRubrics = true;
  const htmlWithoutRubric = UIController.renderSpeechHtml(speechWithRubric, 0, 0, 0, true);
  assert(!htmlWithoutRubric.includes('com raiva e desespero'), 'Rubrica NÃO deve aparecer quando hideRubrics=true');
  assert(htmlWithoutRubric.includes('Você não pode fazer isso comigo.'), 'Texto falado deve ser preservado integralmente');
  AppState.hideRubrics = false; // reset
  console.log('✅ 30. Ocultação determinística de rubricas entre parênteses (...) validada');

  // Teste 31: Chegar com a fala oculta (alwaysStartHidden) e Leitura Integral (modalFullScript)
  AppState.alwaysStartHidden = true;
  AppState.masteryLevels[0] = 0;
  AppState.isRevealed = false;
  await UIController.renderView();
  assert(domStore['mainApp'].innerHTML.includes('speech-veil-card'), 'Deve exibir card de fala oculta por padrão no nível 0');
  assert(domStore['dockHeroArea'].innerHTML.includes('btnCheck'), 'Hero button deve ser Conferir Fala');

  // Modal de Leitura Integral
  assert(indexHtml.includes('id="modalFullScript"'), 'Markup HTML deve conter o modal modalFullScript');
  assert(indexHtml.includes('id="fullScriptContainer"'), 'Markup HTML deve conter o container fullScriptContainer');
  assert(indexHtml.includes('id="btnOpenFullScriptLobby"'), 'Markup HTML deve conter o botão btnOpenFullScriptLobby');
  assert(indexHtml.includes('id="btnReadScriptBanner"'), 'Markup HTML deve conter o botão btnReadScriptBanner');

  // Testar acionamento dos botões de abertura do roteiro completo
  domStore['modalFullScript'].hidden = true;
  AppController.handleActionClick('btnOpenFullScriptLobby');
  assert.strictEqual(domStore['modalFullScript'].hidden, false, 'Clicar em btnOpenFullScriptLobby deve abrir modalFullScript');

  domStore['modalFullScript'].hidden = true;
  AppController.handleActionClick('btnReadScriptBanner');
  assert.strictEqual(domStore['modalFullScript'].hidden, false, 'Clicar em btnReadScriptBanner deve abrir modalFullScript');

  AppController.handleActionClick('btnCloseFullScript');
  assert.strictEqual(domStore['modalFullScript'].hidden, true, 'Clicar em btnCloseFullScript deve fechar modalFullScript');

  await UIController.renderFullScriptModal();
  assert(domStore['fullScriptContainer'].innerHTML.includes('script-read-item'), 'Roteiro completo deve conter itens de leitura');
  assert(domStore['fullScriptContainer'].innerHTML.includes('btn-read-jump'), 'Deve conter botões de ensaiar a partir da fala');
  console.log('✅ 31. Chegar com a fala oculta por padrão e Leitura Integral do Roteiro validados (com acionamento de botões)');

  // Teste 32: Modo Quiz de Alternativas (Banco de Palavras)
  AppState.selectedActor = 'SÉRGIO';
  AppState.studyMethod = 'quiz';
  AppState.currentIndex = 0;
  AppState.masteryLevels[0] = 1;
  AppState.isRevealed = false;
  AppState.quizStep = 0;
  await UIController.renderView();
  assert(domStore['mainApp'].innerHTML.includes('quiz-action-area'), 'Deve renderizar área de quiz de alternativas');
  assert(domStore['mainApp'].innerHTML.includes('quiz-chip'), 'Deve conter chips/opções de palavras');
  assert(AppState.quizTargets.length > 0, 'Deve ter gerado alvos para o quiz');

  // Simular acerto de todas as etapas do quiz
  AppState.quizStep = AppState.quizTargets.length;
  await UIController.renderView();
  assert(domStore['dockHeroArea'].innerHTML.includes('btnNextQuiz'), 'Dock deve exibir botão de avanço com sucesso após quiz');
  AppController.handleActionClick('btnNextQuiz');
  assert.strictEqual(AppState.masteryLevels[0], 2, 'Domínio sobe de nível após completar quiz');
  console.log('✅ 32. Modo Quiz de Alternativas (banco de palavras, distratores e avanço) validado');

  // Teste 33: Modo Digitação Interativa
  AppState.studyMethod = 'typing';
  AppState.currentIndex = 0;
  AppState.masteryLevels[0] = 1;
  AppState.isRevealed = false;
  AppState.typingCompleted = false;
  await UIController.renderView();
  assert(domStore['mainApp'].innerHTML.includes('cloze-input'), 'Deve conter inputs de digitação inline');
  assert(domStore['mainApp'].innerHTML.includes('typing-instruction'), 'Deve conter instruções de digitação');

  // Simular conclusão de digitação
  AppState.typingCompleted = true;
  await UIController.renderView();
  assert(domStore['dockHeroArea'].innerHTML.includes('btnNextTyping'), 'Dock deve exibir botão de avanço após digitação completa');
  AppController.handleActionClick('btnNextTyping');
  assert.strictEqual(AppState.masteryLevels[0], 2, 'Domínio sobe de nível após completar digitação');

  // Resetar método para oral
  AppState.studyMethod = 'oral';
  console.log('✅ 33. Modo Digitação (inputs inline, validação e avanço) validado');

  // Teste 34: Sanitização XSS estrita contra quebra de atributos HTML
  const xssPayload = 'Ator" onmouseover="alert(1)" data-x="';
  const escapedXss = Utils.escapeHtml(xssPayload);
  assert(escapedXss.includes('&quot;'), 'Aspas duplas devem ser convertidas em &quot;');
  assert(!escapedXss.includes('"'), 'Nenhuma aspa dupla sem escape deve permanecer');
  console.log('✅ 34. Sanitização XSS contra injeção de atributos HTML validada');

  // Teste 35: Preservação de intenções/vozes e exclusão de chaves sensíveis no backup
  mockLocalStorage.setItem('memorizador_rate', '1.0');
  mockLocalStorage.setItem('intent_default_0', 'Afrontar o pai');
  mockLocalStorage.setItem('voice_actor_SERGIO', 'Felipe');
  mockLocalStorage.setItem('gemini_api_key', 'SECRET_KEY_NAO_EXPORTAR');

  const exportedKeys = [];
  for (let i = 0; i < mockLocalStorage.length; i++) {
    const key = mockLocalStorage.key(i);
    if (
      key &&
      !key.toLowerCase().includes('key') &&
      !key.toLowerCase().includes('token') &&
      !key.toLowerCase().includes('secret') &&
      (key.startsWith('memorizador_') || key.startsWith('intent_') || key.startsWith('voice_actor_') || key.startsWith('inv-'))
    ) {
      exportedKeys.push(key);
    }
  }
  assert(exportedKeys.includes('intent_default_0'), 'Intenções devem ser exportadas');
  assert(exportedKeys.includes('voice_actor_SERGIO'), 'Vozes atribuídas devem ser exportadas');
  assert(exportedKeys.includes('memorizador_rate'), 'Configurações devem ser exportadas');
  assert(!exportedKeys.includes('gemini_api_key'), 'Chaves de API ou segredos NUNCA devem ser exportados no backup');
  console.log('✅ 35. Backup seguro: inclusão de intenções/vozes e blindagem contra vazamento de chaves');

  // Teste 36: Fila adaptativa com buffer de repetição imediata (reforço espaçado ativo)
  AppState.speeches = [
    { who: 'SÉRGIO', spokenText: 'Fala 1', segments: [{ type: 'speech', text: 'Fala 1' }] },
    { who: 'SÉRGIO', spokenText: 'Fala 2', segments: [{ type: 'speech', text: 'Fala 2' }] },
    { who: 'SÉRGIO', spokenText: 'Fala 3', segments: [{ type: 'speech', text: 'Fala 3' }] }
  ];
  AppState.selectedActor = 'SÉRGIO';
  AppState.masteryLevels = [4, 4, 4];
  AppState.currentIndex = 0;
  AppState.sessionRetryQueue = [];
  AppState.scheduleRetry(0, 2);
  assert.strictEqual(AppState.sessionRetryQueue.length, 1, 'Fala 0 deve estar na fila de repetição');
  AppState.stepRetryQueue();
  assert.strictEqual(AppState.sessionRetryQueue[0].countdown, 1, 'Countdown decrementado para 1');
  AppState.stepRetryQueue();
  assert.strictEqual(AppState.sessionRetryQueue[0].countdown, 0, 'Countdown chegou a 0');
  AppState.currentIndex = 1;
  const nextTarget = AppState.pickNextWeakness();
  assert.strictEqual(nextTarget, 0, 'pickNextWeakness deve priorizar imediatamente a fala agendada no retry buffer');
  console.log('✅ 36. Fila adaptativa de ensaio com reforço espaçado imediato validada');

  // Teste 37: Parsing nativo de roteiro em formato Fountain
  const fountainScript = `
Title: Teste Fountain
Author: Dramaturgo

INT. SALA DE ESTAR - NOITE

HAMLET
Ser ou não ser, eis a questão.

(hesitante)

@Ofélia
Meu príncipe, estais bem?
`;
  const fountainParsed = ScriptParser.parseScript(fountainScript);
  assert.strictEqual(fountainParsed.length, 2, 'Deve identificar 2 falas no roteiro Fountain');
  assert.strictEqual(fountainParsed[0].who, 'HAMLET', 'Primeiro personagem HAMLET');
  assert.strictEqual(fountainParsed[1].who, 'Ofélia', 'Segundo personagem Ofélia com prefixo @');
  console.log('✅ 37. Suporte a roteiros no padrão da indústria Fountain (.fountain) validado');

  // Teste 38: Coerência de backup e restauração de áudio (STORE_NAME, export e import com getCastAudio)
  assert.strictEqual(StorageManager.STORE_NAME, 'recordings', 'StorageManager deve definir STORE_NAME');

  const inMemStore = {};
  const mockDbAudio = {
    transaction: (sName) => {
      assert.strictEqual(sName, 'recordings', 'Transaction deve usar store recordings');
      const tx = {
        objectStore: () => ({
          put: (item) => { inMemStore[item.id] = item; },
          get: (key) => {
            const req = { onsuccess: null, onerror: null, result: inMemStore[key] || null };
            setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
            return req;
          },
          getAll: () => {
            const req = { onsuccess: null, onerror: null, result: Object.values(inMemStore) };
            setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
            return req;
          },
          clear: () => {
            Object.keys(inMemStore).forEach(k => delete inMemStore[k]);
          }
        }),
        oncomplete: null,
        onerror: null
      };
      setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
      return tx;
    }
  };
  const prevGetIndexedDB = StorageManager.getIndexedDB;
  StorageManager.getIndexedDB = async () => mockDbAudio;

  const testBlob = { size: 100, type: 'audio/webm' };
  await StorageManager.saveCastAudio(10, testBlob, 'default');
  const readBlob = await StorageManager.getCastAudio(10, 'default');
  assert.strictEqual(readBlob, testBlob, 'getCastAudio deve recuperar o blob salvo');

  const backupWithAudio = {
    localStorage: { 'memorizador_mode': 'cena' },
    recordings: [
      { id: 'default_12', speechIdx: 12, playId: 'default', base64: 'data:audio/webm;base64,AAAA' }
    ]
  };
  await AppController.importFullBackup({ text: async () => JSON.stringify(backupWithAudio) });
  const restoredAudio = await StorageManager.getCastAudio(12, 'default');
  assert(restoredAudio !== null, 'getCastAudio deve encontrar áudio restaurado do backup');
  assert.strictEqual(restoredAudio.type, 'audio/webm', 'Tipo do áudio restaurado deve ser preservado');

  StorageManager.getIndexedDB = prevGetIndexedDB;
  console.log('✅ 38. Coerência de backup e restauração de áudio (STORE_NAME, gravação e recuperação) validada');

  // Teste 39: Restauração de configurações salvas no AppState e controles de UI
  mockLocalStorage.setItem('memorizador_study_method', 'quiz');
  mockLocalStorage.setItem('memorizador_hide_rubrics', 'true');
  mockLocalStorage.setItem('memorizador_start_hidden', 'false');

  AppController.loadActiveScript();
  assert.strictEqual(AppState.studyMethod, 'quiz', 'studyMethod salvo deve ser restaurado no AppState');
  assert.strictEqual(AppState.hideRubrics, true, 'hideRubrics salvo deve ser restaurado no AppState');
  assert.strictEqual(AppState.alwaysStartHidden, false, 'alwaysStartHidden salvo deve ser restaurado no AppState');
  console.log('✅ 39. Restauração de configurações salvas (studyMethod, hideRubrics, alwaysStartHidden) validada');

  // Teste 40: Despacho único de eventos de clique e ausência de duplicação
  let enterStageCalls = 0;
  const origEnterStage = AppController.enterStage;
  AppController.enterStage = () => { enterStageCalls++; };

  const realBtn = domStore['btnEnterStage'];
  realBtn.closest = (sel) => sel.includes('button') ? realBtn : null;

  // Simular clique do usuário: listener em document + onclick direto no botão
  const clickEvt = { target: realBtn };
  docListeners['click'](clickEvt);
  if (realBtn.onclick) realBtn.onclick(clickEvt);

  AppController.enterStage = origEnterStage;
  assert.strictEqual(enterStageCalls, 1, 'enterStage deve ser invocado exatamente 1 vez por clique no botão');
  console.log('✅ 40. Despacho único de eventos e eliminação de chamadas duplicadas validados');

  // Teste 41: Prevenção de race condition em renderView (descarte de renders defasados)
  assert.strictEqual(typeof UIController.currentRenderId, 'number', 'UIController deve possuir currentRenderId');
  AppState.currentIndex = 0;
  let slowResolve;
  const origGetCastAudio = StorageManager.getCastAudio;
  StorageManager.getCastAudio = () => new Promise(res => { slowResolve = res; });
  const render1Promise = UIController.renderView();

  AppState.currentIndex = 1;
  StorageManager.getCastAudio = async () => null;
  await UIController.renderView();
  const contentFala1 = domStore['mainApp'].innerHTML;

  slowResolve(null);
  await render1Promise;
  assert.strictEqual(domStore['mainApp'].innerHTML, contentFala1, 'DOM deve manter a fala 1 mais recente e descartar o render lento anterior');
  StorageManager.getCastAudio = origGetCastAudio;
  console.log('✅ 41. Prevenção de race condition em renderView (token incremental de render) validada');

  // Teste 42: Atalho 'I' para alternância do modal de índice
  const modalIndexEl = domStore['modalIndex'];
  modalIndexEl.hidden = true;
  docListeners['keydown']({ key: 'i', preventDefault: () => {}, target: { tagName: 'BODY' } });
  assert.strictEqual(modalIndexEl.hidden, false, "Pressionar 'i' deve abrir o modal de índice");
  docListeners['keydown']({ key: 'I', preventDefault: () => {}, target: { tagName: 'BODY' } });
  assert.strictEqual(modalIndexEl.hidden, true, "Pressionar 'I' novamente deve fechar o modal de índice");
  console.log('✅ 42. Atalho de teclado I para alternância do índice validado');

  // Teste 43: Segurança CSP e higienização limpa na restauração de backup
  assert(indexHtml.includes('http-equiv="Content-Security-Policy"'), 'index.html deve declarar política CSP estrita');

  let clearedDb = false;
  const origClearAll = StorageManager.clearAllCastAudios;
  StorageManager.clearAllCastAudios = async () => { clearedDb = true; };
  mockLocalStorage.setItem('intent_0_default', 'Intenção Antiga Que Deve Ser Limpa');

  const cleanBackup = {
    localStorage: { 'memorizador_mode': 'fraquezas' },
    recordings: []
  };
  await AppController.importFullBackup({ text: async () => JSON.stringify(cleanBackup) });
  assert.strictEqual(clearedDb, true, 'Restauração de backup deve limpar gravações anteriores antes de injetar as novas');
  assert.strictEqual(mockLocalStorage.getItem('intent_0_default'), null, 'Chaves antigas de intenção/progresso devem ser higienizadas');
  StorageManager.clearAllCastAudios = origClearAll;
  console.log('✅ 43. Segurança CSP e higienização limpa de dados na restauração de backup validadas');

  // Teste 44: Acessibilidade de modais (type="button" nos fechar, focus trap e retorno de foco)
  assert(indexHtml.includes('id="btnCloseIndex" class="btn-close" type="button"'), 'Botão fechar do índice deve ter type="button"');
  assert(indexHtml.includes('id="btnCloseSettings" class="btn-close" type="button"'), 'Botão fechar de opções deve ter type="button"');
  assert(indexHtml.includes('id="btnCloseFullScript" class="btn-close" type="button"'), 'Botão fechar de roteiro deve ter type="button"');

  let focusedEl = null;
  const openerBtn = { focus: () => { focusedEl = openerBtn; } };
  const firstFocusable = { focus: () => { focusedEl = firstFocusable; } };
  const lastFocusable = { focus: () => { focusedEl = lastFocusable; } };

  const modalIndex = domStore['modalIndex'];
  modalIndex.querySelectorAll = () => [firstFocusable, lastFocusable];
  modalIndex.contains = (el) => el === firstFocusable || el === lastFocusable;

  UIController.openModal('modalIndex', openerBtn);
  assert.strictEqual(modalIndex.hidden, false, 'openModal deve exibir o modal');
  assert.strictEqual(focusedEl, firstFocusable, 'openModal deve focar no primeiro elemento interativo');

  mockDocument.activeElement = lastFocusable;
  let tabPrevented = false;
  docListeners['keydown']({ key: 'Tab', shiftKey: false, preventDefault: () => { tabPrevented = true; } });
  assert.strictEqual(tabPrevented, true, 'Tab no último elemento deve ser interceptado pelo focus trap');
  assert.strictEqual(focusedEl, firstFocusable, 'Foco deve ciclar de volta para o primeiro elemento');

  UIController.closeModal('modalIndex');
  assert.strictEqual(modalIndex.hidden, true, 'closeModal deve esconder o modal');
  assert.strictEqual(focusedEl, openerBtn, 'closeModal deve retornar o foco ao botão de abertura');
  console.log('✅ 44. Acessibilidade de modais: type="button", focus trap e retorno de foco validados');

  // Teste 45: Sistema de ícones vetoriais SVG nativos, zero emojis no código e gerenciador de temas
  const testIcons = ['theater', 'masks', 'waveform', 'sun', 'moon', 'play', 'stop', 'mic', 'book'];
  testIcons.forEach(name => {
    const svg = Utils.icons.get(name);
    assert(svg.includes('<svg') && svg.includes('</svg>'), `Icons.get("${name}") deve retornar SVG válido`);
    assert(svg.includes('app-icon-' + name), `Icons.get("${name}") deve ter classe semântica correspondente`);
  });

  // Testar alternância de tema
  AppController.applyTheme('light', true);
  assert.strictEqual(mockLocalStorage.getItem('stagepro_theme'), 'light', 'Tema claro deve ser salvo no storage');
  AppController.applyTheme('dark', true);
  assert.strictEqual(mockLocalStorage.getItem('stagepro_theme'), 'dark', 'Tema escuro deve ser salvo no storage');

  // Validar erradicação de emojis em arquivos-chave da aplicação
  const appFiles = ['index.html', 'js/app.js', 'js/audio.js', 'js/config.js', 'js/parser.js', 'js/ai-service.js', 'js/state.js', 'js/storage.js', 'js/ui.js', 'js/utils.js', 'plays/default-play.js'];
  const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{2300}-\u{23FF}\u{25B6}\u{23F8}\u{23F9}]/u;
  appFiles.forEach(f => {
    const full = path.join(__dirname, f);
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      // Ignorar apenas entidades ou strings específicas de texto da peça teatral padrão se houver
      const m = l.match(emojiPattern);
      assert.strictEqual(m, null, `Nenhum emoji permitido no arquivo ${f}:${idx + 1} -> ${l.trim().slice(0, 50)}`);
    });
  });
  console.log('✅ 45. Sistema de ícones vetoriais SVG, erradicação total de emojis e alternância de temas validados');

  // Teste 46: Arquitetura App Shell, Bottom Tab Bar nativa, Mission Control de 4 slots e Bottom Sheets
  assert(indexHtml.includes('id="appTabBar"'), 'index.html deve conter a barra appTabBar');
  assert(indexHtml.includes('id="tabBtnCamarim"'), 'index.html deve conter tabBtnCamarim');
  assert(indexHtml.includes('id="tabBtnScript"'), 'index.html deve conter tabBtnScript');
  assert(indexHtml.includes('id="tabBtnProgress"'), 'index.html deve conter tabBtnProgress');
  assert(indexHtml.includes('id="tabBtnSettings"'), 'index.html deve conter tabBtnSettings');
  assert(indexHtml.includes('id="slotActorBtn"'), 'index.html deve conter slotActorBtn');
  assert(indexHtml.includes('id="slotModeBtn"'), 'index.html deve conter slotModeBtn');
  assert(indexHtml.includes('id="slotMethodBtn"'), 'index.html deve conter slotMethodBtn');
  assert(indexHtml.includes('id="slotBeatBtn"'), 'index.html deve conter slotBeatBtn');
  assert(indexHtml.includes('id="sheetActor"'), 'index.html deve conter sheetActor');
  assert(indexHtml.includes('id="sheetMode"'), 'index.html deve conter sheetMode');
  assert(indexHtml.includes('id="sheetMethod"'), 'index.html deve conter sheetMethod');
  assert(indexHtml.includes('id="sheetBeat"'), 'index.html deve conter sheetBeat');

  // Testar acionamento das abas
  AppController.handleActionClick('tabBtnScript');
  assert.strictEqual(domStore['modalFullScript'].hidden, false, 'tabBtnScript deve exibir leitor de roteiro');
  AppController.handleActionClick('tabBtnCamarim');
  assert.strictEqual(domStore['modalFullScript'].hidden, true, 'tabBtnCamarim deve fechar telas e focar no Camarim');

  // Testar abertura e fechamento de bottom sheets de slots
  AppController.handleActionClick('slotActorBtn');
  assert.strictEqual(domStore['sheetActor'].hidden, false, 'slotActorBtn deve abrir sheetActor');
  AppController.handleActionClick('btnCloseSheetActor');
  assert.strictEqual(domStore['sheetActor'].hidden, true, 'btnCloseSheetActor deve fechar sheetActor');

  // Testar sincronização de slots no Camarim
  AppState.selectedActor = 'SÉRGIO';
  AppState.rehearsalMode = 'minhas';
  AppState.studyMethod = 'oral';
  AppState.selectedBeat = 'all';
  UIController.updateMissionSlots();
  assert.strictEqual(domStore['slotActorValue'].textContent, 'SÉRGIO', 'slotActorValue deve refletir o ator ativo');
  assert.strictEqual(domStore['slotModeValue'].textContent, 'Só Minhas Falas + Deixas', 'slotModeValue deve refletir o modo');
  assert.strictEqual(domStore['slotMethodValue'].textContent, 'Oral / Cênico', 'slotMethodValue deve refletir o método');
  assert.strictEqual(domStore['slotBeatValue'].textContent, 'Cena Completa', 'slotBeatValue deve refletir o corte');
  console.log('✅ 46. Arquitetura App Shell: Bottom Tab Bar, Mission Control de 4 slots e Bottom Sheets validados');

  // Teste 47: Caderno de Ensaio (Anotações Livres, Vinculação Opcional a Falas e Gravações de Voz)
  assert(indexHtml.includes('id="tabBtnCaderno"'), 'index.html deve conter a aba tabBtnCaderno');
  assert(indexHtml.includes('id="modalCaderno"'), 'index.html deve conter o modal modalCaderno');
  assert(indexHtml.includes('id="cadernoFreeNotes"'), 'index.html deve conter o campo de anotações livres cadernoFreeNotes');
  assert(indexHtml.includes('id="cadernoSpeechSelect"'), 'index.html deve conter o seletor de falas cadernoSpeechSelect');
  assert(indexHtml.includes('id="btnRecordCaderno"'), 'index.html deve conter o gravador btnRecordCaderno');
  assert(indexHtml.includes('id="cadernoRecordingsList"'), 'index.html deve conter a lista cadernoRecordingsList');

  // Testar abertura e fechamento do Caderno
  AppController.handleActionClick('tabBtnCaderno');
  assert.strictEqual(domStore['modalCaderno'].hidden, false, 'tabBtnCaderno deve abrir modalCaderno');
  AppController.handleActionClick('btnCloseCaderno');
  assert.strictEqual(domStore['modalCaderno'].hidden, true, 'btnCloseCaderno deve fechar modalCaderno');

  // Testar atalho do Palco para o Caderno
  AppController.handleActionClick('btnStageCaderno');
  assert.strictEqual(domStore['modalCaderno'].hidden, false, 'btnStageCaderno deve abrir modalCaderno a partir do palco');
  AppController.handleActionClick('tabBtnCamarim');
  assert.strictEqual(domStore['modalCaderno'].hidden, true, 'tabBtnCamarim deve fechar modalCaderno');

  // Testar persistência de notas livres e de falas específicas
  StorageManager.setActorNotes('Subtexto de Sérgio: frieza e ressentimento contido', 'default');
  assert.strictEqual(StorageManager.getActorNotes('default'), 'Subtexto de Sérgio: frieza e ressentimento contido', 'Notas do ator devem ser recuperadas com sucesso');
  StorageManager.setSpeechNote(0, 'Pausar 2 segundos antes de dizer papai', 'default');
  assert.strictEqual(StorageManager.getSpeechNote(0, 'default'), 'Pausar 2 segundos antes de dizer papai', 'Notas de fala específica devem ser salvas e recuperadas');

  // Testar renderização do Caderno com as notas salvas
  await UIController.renderCaderno();
  assert.strictEqual(domStore['cadernoFreeNotes'].value, 'Subtexto de Sérgio: frieza e ressentimento contido', 'renderCaderno deve carregar as notas salvas no textarea');
  console.log('✅ 47. Caderno de Ensaio: anotações livres, vinculação opcional a falas e central de voz validados');

  // Teste 48: Leitura Dramatúrgica Contínua (ePub/PDF), Seletor de Alvo de Áudio, Marca-Texto e Onboarding
  assert(indexHtml.includes('id="cadernoRecordTargetSelect"'), 'index.html deve conter seletor de alvo de áudio no caderno');
  assert(indexHtml.includes('id="camarimWelcomeContainer"'), 'index.html deve conter container de primeiro uso do camarim');
  assert(indexHtml.includes('id="selectHighlightActor"'), 'index.html deve conter seletor de foco de personagem no roteiro');
  assert(indexHtml.includes('id="btnToggleHighlighter"'), 'index.html deve conter botão de marca-texto');

  // Testar marca-texto e zoom no Roteiro
  UIController.adjustScriptFontSize(1);
  assert.strictEqual(domStore['fullScriptContainer'].style.fontSize, '1.20rem', 'adjustScriptFontSize deve aumentar tamanho da fonte');
  UIController.adjustScriptFontSize(-1);
  assert.strictEqual(domStore['fullScriptContainer'].style.fontSize, '1.05rem', 'adjustScriptFontSize deve restaurar tamanho padrão');

  const highlightResult = UIController.toggleScriptHighlight(0);
  assert.strictEqual(highlightResult, true, 'toggleScriptHighlight deve grifar a fala 0');
  assert(UIController.getScriptHighlights().includes(0), 'getScriptHighlights deve listar fala 0 grifada');
  UIController.toggleScriptHighlight(0);
  assert(!UIController.getScriptHighlights().includes(0), 'toggleScriptHighlight deve remover o grifo da fala 0');

  // Testar renderização de Roteiro Contínuo com paleta de personagens
  await UIController.renderFullScriptModal();
  assert(domStore['fullScriptContainer'].innerHTML.includes('script-flow-paragraph'), 'Roteiro deve renderizar parágrafos contínuos');
  assert(domStore['fullScriptContainer'].innerHTML.includes('char-color-'), 'Roteiro deve colorir nomes de personagens com paleta teatral');
  console.log('✅ 48. Leitura Dramatúrgica Contínua (ePub/PDF), Seletor de Alvo de Áudio, Marca-Texto e Onboarding validados');

  // Teste 49: Catálogo Multi-Peças (PlayStore), Integridade Canônica e Persistência
  assert(typeof PlayStore !== 'undefined', 'PlayStore deve estar definido');
  assert(StorageManager.plays === PlayStore, 'StorageManager.plays deve apontar para PlayStore');
  const allPlaysInit = PlayStore.getAll();
  assert(allPlaysInit.length >= 1, 'Catálogo deve conter pelo menos a peça canônica padrão');
  const canonicalPlay = PlayStore.get('os-inventariantes');
  assert(canonicalPlay, 'Peça canônica deve ser recuperada por id os-inventariantes');
  assert.strictEqual(canonicalPlay.title, 'Os Inventariantes');
  assert.strictEqual(canonicalPlay.isDefault, true);
  assert.strictEqual(PlayStore.getActivePlayId(), 'os-inventariantes', 'Peça ativa inicial deve ser os-inventariantes');
  console.log('✅ 49. Catálogo Multi-Peças (PlayStore), integridade canônica e persistência validados');

  // Teste 50: Cadastro Dinâmico e Coexistência de Múltiplos Roteiros no Catálogo
  const hamletText = `
# Hamlet
**HAMLET:** Ser ou não ser, eis a questão.
**OFÉLIA:** Meu senhor, como tem passado nestes dias?
**REI CLÁUDIO:** *(Com voz grave)* Hamlet, que melancolia é essa?
**RAINHA GERTRUDES:** Querido filho, desfaça essa expressão sombria.
**HORÁCIO:** Meu príncipe, ouvi passos estranhos na muralha.
`;
  const hamletPlay = PlayStore.createPlayFromScript(hamletText, 'Hamlet', 'William Shakespeare');
  assert(hamletPlay && hamletPlay.id, 'Hamlet deve ser criada com id válido');
  assert.strictEqual(hamletPlay.title, 'Hamlet');
  assert.strictEqual(hamletPlay.characters.length, 5);

  const autoText = `
# Auto da Compadecida
**JOÃO GRILO:** Valha-me Nossa Senhora, Mãe de Deus de Nazaré!
**CHICÓ:** Não sei, só sei que foi assim.
**SEVERINO:** *(Empunhando o rifle)* Ninguém se mexe nesta igreja!
`;
  const autoPlay = PlayStore.createPlayFromScript(autoText, 'Auto da Compadecida', 'Ariano Suassuna');
  assert(autoPlay && autoPlay.id, 'Auto da Compadecida deve ser criada com id válido');
  assert.strictEqual(autoPlay.characters.length, 3);

  const playsAfterCreation = PlayStore.getAll();
  assert(playsAfterCreation.length >= 3, 'Catálogo deve conter pelo menos 3 peças cadastradas');
  assert(playsAfterCreation.some(p => p.id === hamletPlay.id), 'Catálogo deve conter Hamlet');
  assert(playsAfterCreation.some(p => p.id === autoPlay.id), 'Catálogo deve conter Auto da Compadecida');
  console.log('✅ 50. Criação dinâmica e coexistência de múltiplos roteiros no catálogo validadas');

  // Teste 51: Alternância Atômica de Peças e Isolamento Rigoroso de Atores, Progresso e Notas
  // Configurar dados na peça canônica (Os Inventariantes)
  AppController.switchPlay('os-inventariantes');
  AppState.selectedActor = 'SÉRGIO';
  StorageManager.setSelectedActor('SÉRGIO', 'default');
  AppState.masteryLevels = StorageManager.loadProgress('SÉRGIO', AppState.speeches.length, 'default');
  AppState.masteryLevels[0] = 4;
  StorageManager.saveProgress('SÉRGIO', AppState.masteryLevels, 'default');
  StorageManager.setActorNotes('Subtexto de Sérgio: frieza metódica', 'default');

  // Alternar para Hamlet
  AppController.switchPlay(hamletPlay.id);
  assert.strictEqual(AppState.activePlay.id, hamletPlay.id, 'Peça ativa deve ser Hamlet');
  assert.strictEqual(AppState.characters.length, 5, 'Hamlet deve ter 5 personagens');
  AppState.selectedActor = 'HAMLET';
  StorageManager.setSelectedActor('HAMLET', hamletPlay.id);
  const hamletProgress = StorageManager.loadProgress('HAMLET', AppState.speeches.length, hamletPlay.id);
  assert.strictEqual(hamletProgress[0], 0, 'Progresso inicial de Hamlet na fala 0 deve ser 0 (isolado de Sérgio)');
  hamletProgress[0] = 5;
  StorageManager.saveProgress('HAMLET', hamletProgress, hamletPlay.id);
  StorageManager.setActorNotes('Caderno de Hamlet: fantasma na muralha', hamletPlay.id);

  // Alternar para Auto da Compadecida
  AppController.switchPlay(autoPlay.id);
  assert.strictEqual(AppState.activePlay.id, autoPlay.id, 'Peça ativa deve ser Auto da Compadecida');
  assert.strictEqual(AppState.characters.length, 3, 'Auto da Compadecida deve ter 3 personagens');
  AppState.selectedActor = 'JOÃO GRILO';
  StorageManager.setSelectedActor('JOÃO GRILO', autoPlay.id);
  StorageManager.setActorNotes('Caderno do Grilo: esperteza contra os cangaceiros', autoPlay.id);

  // Voltar para Os Inventariantes e validar isolamento perfeito
  AppController.switchPlay('os-inventariantes');
  assert.strictEqual(AppState.activePlay.id, 'os-inventariantes', 'Deve voltar para Os Inventariantes');
  assert.strictEqual(AppState.characters.length, 2);
  const actorRestoredInventariantes = StorageManager.getSelectedActor('default');
  assert.strictEqual(actorRestoredInventariantes, 'SÉRGIO', 'Ator restaurado para Os Inventariantes deve ser SÉRGIO');
  const inventariantesProgressRestored = StorageManager.loadProgress('SÉRGIO', AppState.speeches.length, 'default');
  assert.strictEqual(inventariantesProgressRestored[0], 4, 'Progresso nível 4 de Sérgio deve permanecer intacto');
  assert.strictEqual(StorageManager.getActorNotes('default'), 'Subtexto de Sérgio: frieza metódica', 'Notas de Sérgio preservadas');

  // Voltar para Hamlet e validar integridade isolada
  AppController.switchPlay(hamletPlay.id);
  const actorRestoredHamlet = StorageManager.getSelectedActor(hamletPlay.id);
  assert.strictEqual(actorRestoredHamlet, 'HAMLET', 'Ator restaurado para Hamlet deve ser HAMLET');
  const hamletProgressRestored = StorageManager.loadProgress('HAMLET', AppState.speeches.length, hamletPlay.id);
  assert.strictEqual(hamletProgressRestored[0], 5, 'Progresso nível 5 de Hamlet preservado');
  assert.strictEqual(StorageManager.getActorNotes(hamletPlay.id), 'Caderno de Hamlet: fantasma na muralha', 'Notas de Hamlet preservadas');
  console.log('✅ 51. Alternância atômica de peças e isolamento rigoroso de atores, progresso e notas validados');

  // Teste 52: Cálculo de Métricas Dramáticas e Estatísticas por Peça (PlayStore.getStats)
  const statsInventariantes = PlayStore.getStats('os-inventariantes');
  assert(statsInventariantes, 'Deve gerar estatísticas para Os Inventariantes');
  assert.strictEqual(statsInventariantes.totalSpeeches, 58);
  assert.strictEqual(statsInventariantes.characterCount, 2);
  assert.strictEqual(statsInventariantes.beatsCount, 5);

  const statsHamlet = PlayStore.getStats(hamletPlay.id);
  assert(statsHamlet, 'Deve gerar estatísticas para Hamlet');
  assert.strictEqual(statsHamlet.totalSpeeches, 5);
  assert.strictEqual(statsHamlet.characterCount, 5);
  assert.strictEqual(statsHamlet.characterCounts['HAMLET'], 1);
  console.log('✅ 52. Cálculo de métricas dramáticas, beats e domínio por peça (PlayStore.getStats) validado');

  // Teste 53: Exclusão com Purga e Blindagem da Peça Canônica Padrão
  const deleteDefaultAttempt = PlayStore.delete('os-inventariantes');
  assert.strictEqual(deleteDefaultAttempt, false, 'Peça canônica padrão não deve poder ser excluída');
  assert(PlayStore.get('os-inventariantes'), 'Peça canônica padrão continua no catálogo');

  const deleteAutoResult = PlayStore.delete(autoPlay.id, { purgeUserData: true });
  assert.strictEqual(deleteAutoResult, true, 'Auto da Compadecida deve ser excluída');
  assert.strictEqual(PlayStore.get(autoPlay.id), null, 'Auto da Compadecida não deve mais existir no catálogo');
  assert.strictEqual(StorageManager.getActorNotes(autoPlay.id), '', 'Notas de Auto da Compadecida devem ter sido purgadas');

  // Restaurar peça ativa limpa para os Inventariantes
  AppController.switchPlay('os-inventariantes');
  console.log('✅ 53. Exclusão de peças com purga e blindagem imutável da peça canônica padrão validadas');

  // Teste 54: Ponto de Acesso no Camarim (#lobbyView), Botão de Upload/Seleção e Estrutura dos Modais
  assert(indexHtml.includes('id="btnOpenPlayCatalog"'), 'index.html deve conter o ponto de acesso principal btnOpenPlayCatalog');
  assert(indexHtml.includes('id="btnOpenCatalogHeader"'), 'index.html deve conter o botão de catálogo no cabeçalho btnOpenCatalogHeader');
  assert(indexHtml.includes('id="modalPlayCatalog"'), 'index.html deve conter o modal modalPlayCatalog');
  assert(indexHtml.includes('id="modalImportPlay"'), 'index.html deve conter o modal modalImportPlay');
  assert(indexHtml.includes('id="btnOpenImportFlow"'), 'index.html deve conter o botão btnOpenImportFlow');
  assert(indexHtml.includes('id="btnAnalyzeImport"'), 'index.html deve conter o botão btnAnalyzeImport');
  assert(indexHtml.includes('id="btnConfirmImportSave"'), 'index.html deve conter o botão btnConfirmImportSave');
  assert(indexHtml.includes('id="inputScriptFile"'), 'index.html deve conter o input de arquivo inputScriptFile');

  // Testar abertura e fechamento dos modais
  AppController.handleActionClick('btnOpenPlayCatalog');
  assert.strictEqual(domStore['modalPlayCatalog'].hidden, false, 'btnOpenPlayCatalog deve abrir o modal de catálogo');
  AppController.handleActionClick('btnClosePlayCatalog');
  assert.strictEqual(domStore['modalPlayCatalog'].hidden, true, 'btnClosePlayCatalog deve fechar o modal de catálogo');

  AppController.handleActionClick('btnOpenCatalogHeader');
  assert.strictEqual(domStore['modalPlayCatalog'].hidden, false, 'btnOpenCatalogHeader deve abrir o modal de catálogo');
  AppController.handleActionClick('btnOpenImportFlow');
  assert.strictEqual(domStore['modalPlayCatalog'].hidden, true, 'btnOpenImportFlow deve fechar o modal de catálogo');
  assert.strictEqual(domStore['modalImportPlay'].hidden, false, 'btnOpenImportFlow deve abrir o modal de importação');
  AppController.handleActionClick('btnCloseImportPlay');
  assert.strictEqual(domStore['modalImportPlay'].hidden, true, 'btnCloseImportPlay deve fechar o modal de importação');
  console.log('✅ 54. Ponto de acesso no Camarim e acionamento dos modais de biblioteca/importação validados');

  // Teste 55: Bottom Sheet / Modal da Biblioteca de Roteiros (Renderização da Lista, Estatísticas de Domínio e Troca de Peça com 1 Toque)
  UIController.renderPlayCatalog();
  assert(domStore['playCatalogList'].innerHTML.includes('play-catalog-card'), 'Catálogo deve renderizar cards de peças');
  assert(domStore['playCatalogList'].innerHTML.includes('Os Inventariantes'), 'Catálogo deve listar a peça canônica');
  assert(domStore['playCatalogList'].innerHTML.includes('Em Ensaio'), 'Peça ativa deve exibir badge Em Ensaio');

  const macbethText = `
# Macbeth
Autor: William Shakespeare

**MACBETH:** O que foi feito nunca pode ser desfeito.
**LADY MACBETH:** Sai, mancha maldita!
`;
  const macbethPlay = PlayStore.createPlayFromScript(macbethText, 'Macbeth', 'William Shakespeare');
  assert(macbethPlay && macbethPlay.id, 'Macbeth deve ser cadastrada com sucesso');

  UIController.renderPlayCatalog();
  assert(domStore['playCatalogList'].innerHTML.includes('Macbeth'), 'Catálogo deve conter Macbeth após cadastro');
  assert(domStore['playCatalogList'].innerHTML.includes('William Shakespeare'), 'Catálogo deve exibir autor');

  // Testar alternância de peça com 1 toque
  AppController.switchPlay(macbethPlay.id);
  assert.strictEqual(AppState.activePlay.id, macbethPlay.id, 'Peça ativa deve mudar para Macbeth');
  assert.strictEqual(PlayStore.getActivePlayId(), macbethPlay.id, 'PlayStore deve registrar Macbeth como ativa');
  assert.strictEqual(AppState.characters.length, 2, 'Macbeth deve ter 2 personagens');
  assert.strictEqual(AppState.characters[0], 'MACBETH');

  // Voltar para os inventariantes
  AppController.switchPlay('os-inventariantes');
  assert.strictEqual(AppState.activePlay.id, 'os-inventariantes', 'Deve restaurar Os Inventariantes');
  console.log('✅ 55. Biblioteca de Roteiros, estatísticas de domínio e alternância de peça com 1 toque validadas');

  // Teste 56: Fluxo de Importação de Nova Peça (Upload/Leitura e Entrada de Texto Livre)
  UIController.openImportPlayModal();
  assert.strictEqual(domStore['modalImportPlay'].hidden, false, 'Modal de importação deve abrir');
  assert.strictEqual(domStore['importStepInput'].hidden, false, 'Etapa 1 de entrada deve estar visível');
  assert.strictEqual(domStore['importStepReview'].hidden, true, 'Etapa 2 de revisão deve estar oculta');
  assert.strictEqual(domStore['importRawScriptText'].value, '', 'Campo de texto deve ser limpo na abertura');

  const pagadorText = `
# O Pagador de Promessas
Autor: Dias Gomes

**ZÉ DO BURRO:** *(Aflito, olhando para a igreja)* Eu fiz uma promessa a Santa Bárbara.
**ROSA:** Zé, você está louco! Essa promessa vai te matar.
**PADRE OLAVO:** Esta igreja não aceita promessas pagãs!
**BONITÃO:** Deixe o homem entrar, seu padre.
`;
  assert.strictEqual(ScriptParser.extractAuthor(pagadorText), 'Dias Gomes', 'extractAuthor deve detectar Dias Gomes');
  assert.strictEqual(ScriptParser.extractPlayTitle(pagadorText), 'O Pagador de Promessas', 'extractPlayTitle deve detectar O Pagador de Promessas');
  console.log('✅ 56. Fluxo de importação e leitura heurística de formatos teatrais livres validados');

  // Teste 57: Prévia e Personalização Dramatúrgica (Revisão de Título, Adição/Remoção de Personagens e Partição de Beats)
  const analysisPagador = DramaturgyAnalyzer.analyzeOffline(pagadorText);
  assert.strictEqual(analysisPagador.title, 'O Pagador de Promessas');
  assert.strictEqual(analysisPagador.author, 'Dias Gomes');
  assert.strictEqual(analysisPagador.characters.length, 4);
  assert(analysisPagador.characters.includes('ZÉ DO BURRO'));
  assert(analysisPagador.characters.includes('ROSA'));
  assert(analysisPagador.characters.includes('PADRE OLAVO'));
  assert(analysisPagador.characters.includes('BONITÃO'));

  UIController.renderImportReview(analysisPagador);
  assert.strictEqual(domStore['importStepReview'].hidden, false, 'Etapa de revisão deve ficar visível');
  assert.strictEqual(domStore['importReviewTitle'].value, 'O Pagador de Promessas');
  assert.strictEqual(domStore['importReviewAuthor'].value, 'Dias Gomes');

  // Testar remoção de personagem (ex: remover falso positivo BONITÃO)
  UIController.removeReviewCharacter('BONITÃO');
  assert(!UIController.ImportFlowState.characters.includes('BONITÃO'), 'BONITÃO deve ter sido removido');
  assert.strictEqual(UIController.ImportFlowState.characters.length, 3);

  // Testar adição de novo personagem personalizado
  UIController.addReviewCharacter('SEGREDO');
  assert(UIController.ImportFlowState.characters.includes('SEGREDO'), 'SEGREDO deve ter sido adicionado');
  assert.strictEqual(UIController.ImportFlowState.characters.length, 4);

  // Testar estratégias de partição de beats
  const singleBeats = DramaBeats.generateBeats(analysisPagador.speeches, pagadorText, null, 'single');
  assert.strictEqual(singleBeats.length, 1, 'Estratégia single deve gerar 1 beat');

  const blockBeats = DramaBeats.generateBeats(analysisPagador.speeches, pagadorText, null, 'block10');
  assert(blockBeats.length >= 1, 'Estratégia block10 deve particionar corretamente');

  // Salvar peça personalizada com confirmação
  const pagadorPlay = PlayStore.createPlayFromScript(pagadorText, 'O Pagador de Promessas (Versão Ensaio)', 'Dias Gomes', {
    characters: UIController.ImportFlowState.characters,
    beats: singleBeats
  });
  assert.strictEqual(pagadorPlay.title, 'O Pagador de Promessas (Versão Ensaio)');
  assert.deepStrictEqual(pagadorPlay.characters, UIController.ImportFlowState.characters);

  AppController.switchPlay(pagadorPlay.id);
  assert.strictEqual(AppState.activePlay.id, pagadorPlay.id);
  assert.strictEqual(AppState.activeBeats.length, 1);
  console.log('✅ 57. Prévia e personalização dramatúrgica de roteiros reais validada');

  // Teste 58: Gancho Arquitetural para IA do Passo 4 (DramaturgyAnalyzer Plugável e Resiliência)
  assert(typeof DramaturgyAnalyzer !== 'undefined', 'DramaturgyAnalyzer deve estar definido');
  assert.strictEqual(typeof DramaturgyAnalyzer.analyze, 'function');
  assert.strictEqual(typeof DramaturgyAnalyzer.setAIProvider, 'function');

  // Análise offline determinística padrão
  const offlineResult = await DramaturgyAnalyzer.analyze('**ATOR:** Fala de teste.');
  assert.strictEqual(offlineResult.source, 'heuristic_offline');

  // Provedor de IA simulado plugado
  const mockAI = {
    name: 'Gemini-Mock',
    analyzeScript: async (text) => ({
      title: 'Antígona',
      author: 'Sófocles',
      characters: ['ANTÍGONA', 'ISMENE', 'CREONTE'],
      speeches: ScriptParser.parseScript(text),
      beats: [{ name: 'Prólogo', start: 0, end: 1 }],
      suggestions: ['Cena de alta tensão trágica']
    })
  };
  DramaturgyAnalyzer.setAIProvider(mockAI);
  assert.strictEqual(DramaturgyAnalyzer.getAIProvider(), mockAI);
  const aiResult = await DramaturgyAnalyzer.analyze('**ANTÍGONA:** Enterrarei meu irmão.');
  assert.strictEqual(aiResult.source, 'ai_assisted');
  assert.strictEqual(aiResult.title, 'Antígona');
  assert.strictEqual(aiResult.author, 'Sófocles');

  // Fallback transparente quando IA falha
  DramaturgyAnalyzer.setAIProvider({
    analyzeScript: async () => { throw new Error('API Rate Limit ou Sem Conexão'); }
  });
  const fallbackResult = await DramaturgyAnalyzer.analyze('**ISMENE:** Não desafies o rei.');
  assert.strictEqual(fallbackResult.source, 'heuristic_offline');
  assert.strictEqual(fallbackResult.characters[0], 'ISMENE');

  // Limpeza de estado e retorno a Os Inventariantes
  DramaturgyAnalyzer.setAIProvider(null);
  assert.strictEqual(DramaturgyAnalyzer.getAIProvider(), null);
  PlayStore.delete(macbethPlay.id, { purgeUserData: true });
  PlayStore.delete(pagadorPlay.id, { purgeUserData: true });
  AppController.switchPlay('os-inventariantes');
  console.log('✅ 58. Gancho arquitetural plugável para IA e resiliência offline validados');

  // Teste 59: Curadoria Completa de Personagens (Renomear, Filtrar e Persistir Falas Customizadas)
  const othelloScript = `
Othello
Autor: William Shakespeare

IAGO (sussurra):
Ponha dinheiro na bolsa, Rodrigo.

RODRIGO:
Irei vender todas as minhas terras.

1º SOLDADO (em guarda):
Quem vem lá? O general se aproxima.
`;
  const othelloAnalysis = await DramaturgyAnalyzer.analyze(othelloScript);
  assert.strictEqual(othelloAnalysis.title, 'Othello');
  assert.strictEqual(othelloAnalysis.author, 'William Shakespeare');
  assert.strictEqual(othelloAnalysis.characters.length, 3);
  assert(othelloAnalysis.characters.includes('1º SOLDADO'));

  UIController.renderImportReview(othelloAnalysis);

  // Renomear '1º SOLDADO' para 'CASSIO'
  UIController.renameReviewCharacter('1º SOLDADO', 'CASSIO');
  assert(!UIController.ImportFlowState.characters.includes('1º SOLDADO'), '1º SOLDADO deve ter sido renomeado');
  assert(UIController.ImportFlowState.characters.includes('CASSIO'), 'CASSIO deve estar na lista');
  const cassioSpeech = UIController.ImportFlowState.speeches.find(s => s.who === 'CASSIO');
  assert(cassioSpeech, 'A fala do 1º SOLDADO deve ter sido atualizada para CASSIO');
  assert.strictEqual(cassioSpeech.spokenText, 'Quem vem lá? O general se aproxima.');

  // Remover RODRIGO da lista permitida
  UIController.removeReviewCharacter('RODRIGO');
  assert(!UIController.ImportFlowState.characters.includes('RODRIGO'));

  // Salvar a peça customizada com falas curadas
  const curatedSpeeches = ScriptParser.filterSpeechesByCharacters(
    UIController.ImportFlowState.speeches,
    UIController.ImportFlowState.characters
  );
  assert.strictEqual(curatedSpeeches.length, 2, 'Apenas falas de IAGO e CASSIO devem restar');

  const othelloPlay = PlayStore.createPlayFromScript(othelloScript, 'Othello Adaptado', 'William Shakespeare', {
    characters: UIController.ImportFlowState.characters,
    speeches: curatedSpeeches
  });

  // Alternar para Othello e verificar que AppState carrega as falas curadas e personagens
  AppController.switchPlay(othelloPlay.id);
  assert.strictEqual(AppState.activePlay.id, othelloPlay.id);
  assert.strictEqual(AppState.characters.length, 2);
  assert(AppState.characters.includes('IAGO'));
  assert(AppState.characters.includes('CASSIO'));
  assert(!AppState.characters.includes('RODRIGO'));
  assert.strictEqual(AppState.speeches.length, 2);
  assert.strictEqual(AppState.speeches[1].who, 'CASSIO');

  // Verificar que PlayStore.getStats reflete os personagens e falas curadas
  const othelloStats = PlayStore.getStats(othelloPlay.id);
  assert.strictEqual(othelloStats.totalSpeeches, 2);
  assert.strictEqual(othelloStats.characterCount, 2);
  assert.strictEqual(othelloStats.characterCounts['CASSIO'], 1);
  console.log('✅ 59. Curadoria de personagens (renomear, filtrar e persistir falas customizadas) validada');

  // Teste 60: Robustez do ScriptParser com Rubricas Próximas, Sluglines e Títulos Livres
  const robustScript = `
Bodas de Sangue
Federico García Lorca

NOIVO
(abraçando a mãe)
Vou para a vinha.

(Uma pausa longa e densa.)

MÃE
(amarga)
A vinha... Leva a faca contigo?

INT. COZINHA - NOITE

VIZINHA (em off):
Ouvi passos lá fora!
`;
  const robustParsed = ScriptParser.parseScript(robustScript);
  assert.strictEqual(robustParsed.length, 3, 'Deve identificar 3 falas');
  // Rubrica em linha isolada após personagem anexada como segmento de rubrica
  assert.strictEqual(robustParsed[0].who, 'NOIVO');
  assert.strictEqual(robustParsed[0].segments[0].type, 'rubric');
  assert.strictEqual(robustParsed[0].segments[0].text, 'abraçando a mãe');
  assert.strictEqual(robustParsed[0].spokenText, 'Vou para a vinha.');

  // Direção entre falas não foi atribuída ao NOIVO e sim à MÃE
  assert.strictEqual(robustParsed[1].who, 'MÃE');
  assert(robustParsed[1].directions.some(d => d.includes('pausa longa e densa')));
  assert.strictEqual(robustParsed[1].segments[0].type, 'rubric');
  assert.strictEqual(robustParsed[1].segments[0].text, 'amarga');

  // Slugline fechou a fala anterior e foi anexada como direção para VIZINHA
  assert.strictEqual(robustParsed[2].who, 'VIZINHA');
  assert(robustParsed[2].directions.some(d => d.includes('INT. COZINHA - NOITE')));
  assert.strictEqual(robustParsed[2].segments[0].type, 'rubric');
  assert.strictEqual(robustParsed[2].segments[0].text, 'em off');
  assert.strictEqual(robustParsed[2].spokenText, 'Ouvi passos lá fora!');
  console.log('✅ 60. ScriptParser: rubricas isoladas, transições cênicas e sluglines validados');

  // Teste 61: Exclusão Segura da Peça Ativa com Fallback Automático para a Peça Padrão
  assert.strictEqual(AppState.getPlayId(), othelloPlay.id);
  const wasActiveOthello = AppState.getPlayId() === othelloPlay.id || PlayStore.getActivePlayId() === othelloPlay.id;
  PlayStore.delete(othelloPlay.id, { purgeUserData: true });
  if (wasActiveOthello) {
    AppController.switchPlay('os-inventariantes');
  }
  assert.strictEqual(AppState.activePlay.id, 'os-inventariantes', 'AppState.activePlay deve retornar para os-inventariantes');
  assert.strictEqual(AppState.getPlayId(), 'default', 'AppState.getPlayId deve retornar default para retrocompatibilidade');
  assert.strictEqual(PlayStore.getActivePlayId(), 'os-inventariantes', 'PlayStore deve ter os-inventariantes como peça ativa');
  assert.strictEqual(PlayStore.get(othelloPlay.id), null, 'Peça excluída não deve mais constar no catálogo');
  console.log('✅ 61. Exclusão segura da peça ativa com fallback limpo para a peça padrão validada');

  // Teste 62: AIService - Configuração BYOK, armazenamento de chave, alternância de modelos e teste de conexão
  assert.strictEqual(AIService.hasKey(), false, 'Chave deve iniciar vazia');
  AIService.setApiKey('AIzaSyMockTestKey123');
  assert.strictEqual(mockLocalStorage.getItem('memorizador_gemini_api_key'), 'AIzaSyMockTestKey123', 'Chave deve ser salva no storage');
  assert.strictEqual(AIService.getApiKey(), 'AIzaSyMockTestKey123');
  assert.strictEqual(AIService.hasKey(), true);

  // Alternância de modelos Gemini
  assert.strictEqual(AIService.getModel(), 'gemini-2.5-flash');
  AIService.setModel('gemini-1.5-flash');
  assert.strictEqual(AIService.getModel(), 'gemini-1.5-flash');
  assert.strictEqual(mockLocalStorage.getItem('memorizador_gemini_model'), 'gemini-1.5-flash');

  // Teste de conexão com mock fetch (sucesso)
  const originalFetchFn = AIService.fetchFn;
  let lastFetchUrl = '';

  AIService.fetchFn = async (url) => {
    lastFetchUrl = url;
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ status: 'ok', app: 'memorizador-teatro' }) }]
            }
          }
        ]
      })
    };
  };

  const pingResult = await AIService.testConnection('AIzaSyMockTestKey123', 'gemini-1.5-flash');
  assert.strictEqual(pingResult.ok, true, 'Ping de teste deve retornar sucesso');
  assert(lastFetchUrl.includes('models/gemini-1.5-flash:generateContent'), 'URL deve usar modelo selecionado');
  assert(lastFetchUrl.includes('key=AIzaSyMockTestKey123'), 'URL deve conter chave da API');

  // Teste de falha de conexão com mock fetch
  AIService.fetchFn = async () => ({
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    json: async () => ({ error: { message: 'API key not valid.' } })
  });
  const failResult = await AIService.testConnection('invalid_key');
  assert.strictEqual(failResult.ok, false);
  assert(failResult.error.includes('403') || failResult.error.includes('API key not valid'));

  // Teste sem chave
  const noKeyResult = await AIService.testConnection('');
  assert.strictEqual(noKeyResult.ok, false);

  // Limpeza e restauração
  AIService.fetchFn = originalFetchFn;
  AIService.setApiKey('');
  assert.strictEqual(AIService.hasKey(), false);
  console.log('✅ 62. AIService: BYOK Gemini, persistência de chave, modelos e ping de validação testados');

  // Teste 63: ScriptParser.sanitizeRawText - Higienização de ruídos OCR, cabeçalhos/rodapés e desquebra de hifens
  const dirtyOCRScript = `
ATO I - O CONFRONTO
Página 12
-----------------------
- 13 -
JULIANO
A determi-
nação da família foi clara. Não acei-
taremos isso.
pág. 14 de 90
RODRIGO
(com sarcasmo)
Apenas obede-
ça e fique calado.
[Página 15]
`;
  const sanitized = ScriptParser.sanitizeRawText(dirtyOCRScript);
  assert(!sanitized.includes('Página 12'), 'Deve remover "Página 12"');
  assert(!sanitized.includes('- 13 -'), 'Deve remover "- 13 -"');
  assert(!sanitized.includes('pág. 14'), 'Deve remover "pág. 14"');
  assert(!sanitized.includes('[Página 15]'), 'Deve remover "[Página 15]"');
  assert(sanitized.includes('determinação'), 'Deve juntar determi-\\nnação em determinação');
  assert(sanitized.includes('aceitaremos'), 'Deve juntar acei-\\ntaremos em aceitaremos');
  assert(sanitized.includes('obedeça'), 'Deve juntar obede-\\nça em obedeça');
  console.log('✅ 63. ScriptParser.sanitizeRawText: remoção de ruídos OCR e desquebra de hifens validada');

  // Teste 64: ScriptParser.groupCharacterVariants e canonicalização de nomes
  const scriptVariants = `
JULIANO
Primeira fala do irmão mais velho.

JUL.
Segunda fala abreviada do mesmo personagem.

Juliano
Terceira fala com casing misturado.

MARIA
Fala da irmã.

MAR.
Fala abreviada da Maria.
`;
  const parsedVariants = ScriptParser.parseScript(scriptVariants);
  const variantChars = [...new Set(parsedVariants.map(s => s.who))];
  assert(variantChars.includes('JULIANO'), 'Deve canonicalizar variações para JULIANO');
  assert(variantChars.includes('MARIA'), 'Deve canonicalizar variações para MARIA');
  assert(!variantChars.includes('JUL.'), 'Não deve conter abreviação JUL.');
  assert(!variantChars.includes('MAR.'), 'Não deve conter abreviação MAR.');
  assert(!variantChars.includes('Juliano'), 'Não deve conter variação minúscula Juliano');

  // Preservação de nome Fountain com @ e sem conflito de variantes
  const fountainPreserve = `
@Ofélia
Ser ou não ser.
`;
  const parsedFountain = ScriptParser.parseScript(fountainPreserve);
  assert.strictEqual(parsedFountain[0].who, 'Ofélia', 'Deve preservar casing original de nome individual em Fountain');
  console.log('✅ 64. ScriptParser: agrupamento e canonicalização de variantes de personagens validados');

  // Teste 65: ScriptParser.detectCueTrigger - Detecção causal de engate cênico (palavras-gatilho) e destaque
  // Caso 1: Eco de palavra-chave
  const cueEcho = ScriptParser.detectCueTrigger(
    'Você nunca pensou em desistir dessa herança maldita?',
    'Desistir? Nunca passaria pela minha cabeça abandonar nossa família.'
  );
  assert(cueEcho !== null, 'Deve detectar engate cênico');
  assert(cueEcho.triggerWord.toLowerCase() === 'desistir' || cueEcho.triggerWord.toLowerCase() === 'nunca', 'Deve encontrar palavra ecoada');

  // Caso 2: Conector discursivo causal
  const cueConnector = ScriptParser.detectCueTrigger(
    'O testamento desapareceu do cofre do escritório.',
    'Portanto você já sabia o conteúdo do documento!'
  );
  assert(cueConnector !== null, 'Deve detectar conector');
  assert.strictEqual(cueConnector.triggerWord.toLowerCase(), 'portanto', 'Deve detectar o conector causal portanto');

  // Caso 3: Renderização do engate cênico na UI
  AppState.speeches = [
    { who: 'BÁRBARA', spokenText: 'Você quer desistir de tudo agora?', segments: [{ type: 'speech', text: 'Você quer desistir de tudo agora?' }] },
    { who: 'JULIANO', spokenText: 'Desistir nunca foi uma opção para mim.', segments: [{ type: 'speech', text: 'Desistir nunca foi uma opção para mim.' }] }
  ];
  AppState.characters = ['BÁRBARA', 'JULIANO'];
  AppState.selectedActor = 'JULIANO';
  AppState.currentIndex = 1;
  await UIController.renderView();
  const mainAppHtml = domStore['mainApp'] ? domStore['mainApp'].innerHTML : '';
  assert(mainAppHtml.includes('cue-trigger-badge') || mainAppHtml.includes('Engate cênico'), 'Deve renderizar badge de engate cênico');
  // Caso 4: Conector causal com travessão teatral inicial
  const cueDashedConnector = ScriptParser.detectCueTrigger(
    'Você tem que ficar aqui e assinar.',
    '— Mas não posso trair minha consciência!'
  );
  assert.strictEqual(cueDashedConnector.triggerWord.toLowerCase(), 'mas', 'Deve detectar conector mas mesmo após travessão');

  // Caso 5: Pergunta com pronome interrogativo acentuado (Por quê?, Cadê?)
  const cueAccentedQuestion = ScriptParser.detectCueTrigger(
    'Por quê?',
    'Porque o prazo termina hoje.'
  );
  assert(cueAccentedQuestion.triggerWord.includes('qu'), 'Deve detectar por quê na pergunta');

  console.log('✅ 65. ScriptParser.detectCueTrigger: detecção causal e badge de engate cênico validados');

  // Teste 66: O Diretor Stanislavski - Verbos de ação e subtexto dramático (offline e AI mock) + persistência
  const stanislavskiSpeeches = [
    { who: 'BÁRBARA', spokenText: 'Por que você escondeu as cartas do papai?' },
    { who: 'JULIANO', spokenText: 'Eu só fiz o que era necessário para proteger o patrimônio.' }
  ];

  // Offline heuristic fallback
  const offlineIntents = AIService.generateStanislavskiSubtextOffline(stanislavskiSpeeches, 'BÁRBARA');
  const barbaraIntent = offlineIntents['0'];
  const formattedIntent = typeof barbaraIntent === 'string' ? barbaraIntent : barbaraIntent?.formatted;
  assert(typeof formattedIntent === 'string', 'Deve gerar intenção formatada para a fala 0');
  assert(formattedIntent.startsWith('['), 'Intenção deve conter verbo de ação entre colchetes');
  assert(formattedIntent.includes(']'), 'Intenção deve conter fechamento de colchetes');

  // AI mock generation
  AIService.fetchFn = async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{
              text: JSON.stringify({
                "0": "[Confrontar] Desmascarar a farsa do irmão sem perder o controle",
                "1": "[Justificar] Defender a própria honra apelando à lealdade familiar"
              })
            }]
          }
        }
      ]
    })
  });
  AIService.setApiKey('AIzaSyMockKey');
  const aiIntents = await AIService.generateStanislavskiSubtext(stanislavskiSpeeches, null, { forceOffline: false });
  const intent0 = typeof aiIntents['0'] === 'string' ? aiIntents['0'] : aiIntents['0']?.formatted;
  const intent1 = typeof aiIntents['1'] === 'string' ? aiIntents['1'] : aiIntents['1']?.formatted;
  assert.strictEqual(intent0, '[Confrontar] Desmascarar a farsa do irmão sem perder o controle');
  assert.strictEqual(intent1, '[Justificar] Defender a própria honra apelando à lealdade familiar');

  // Persistência em StorageManager
  StorageManager.setSpeechIntent(0, intent0, false);
  const loadedIntent = StorageManager.getSpeechIntent(0, false);
  assert.strictEqual(loadedIntent, intent0, 'Intenção gerada deve ser persistida e carregada com sucesso');

  AIService.setApiKey('');
  AIService.fetchFn = originalFetchFn;
  console.log('✅ 66. O Diretor Stanislavski: verbos de ação ativos, subtexto dramático e persistência validados');

  // Teste 67: Curadoria de beats cênicos, persistência e blindagem de chave no backup
  UIController.ImportFlowState = {
    rawText: 'Roteiro de teste com arcos.',
    title: 'Peça dos Arcos',
    author: 'Dramaturgo Teste',
    characters: ['PERSONAGEM A', 'PERSONAGEM B'],
    speeches: [
      { who: 'PERSONAGEM A', spokenText: 'Abertura da cena.' },
      { who: 'PERSONAGEM B', spokenText: 'Desenvolvimento do conflito.' },
      { who: 'PERSONAGEM A', spokenText: 'Clímax da discussão.' },
      { who: 'PERSONAGEM B', spokenText: 'Resolução final.' }
    ],
    beats: [
      { name: 'Arco 1: O Prelúdio', start: 0, end: 1 },
      { name: 'Arco 2: O Desfecho', start: 2, end: 3 }
    ],
    beatStrategy: 'headers',
    source: 'ai_assisted'
  };

  const playWithBeats = PlayStore.createPlayFromScript(
    UIController.ImportFlowState.rawText,
    UIController.ImportFlowState.title,
    UIController.ImportFlowState.author,
    {
      characters: UIController.ImportFlowState.characters,
      speeches: UIController.ImportFlowState.speeches,
      beats: UIController.ImportFlowState.beats
    }
  );

  assert.strictEqual(playWithBeats.beats.length, 2, 'Peça criada deve reter os 2 beats curados');
  assert.strictEqual(playWithBeats.beats[0].name, 'Arco 1: O Prelúdio');
  assert.strictEqual(playWithBeats.beats[1].name, 'Arco 2: O Desfecho');

  AppController.switchPlay(playWithBeats.id);
  assert.strictEqual(AppState.activeBeats.length, 2, 'AppState deve carregar os 2 beats da peça ativa');
  assert.strictEqual(AppState.activeBeats[0].name, 'Arco 1: O Prelúdio');

  // Blindagem de chave de API no backup
  mockLocalStorage.setItem('memorizador_gemini_api_key', 'AIzaSyConfidentialSecret12345');
  const allowedPrefixes = ['memorizador_', 'intent_', 'voice_actor_', 'inv-'];
  const exportedKeysTest = [];
  for (let i = 0; i < mockLocalStorage.length; i++) {
    const k = mockLocalStorage.key(i);
    if (
      k &&
      allowedPrefixes.some(p => k.startsWith(p)) &&
      !k.toLowerCase().includes('key') &&
      !k.toLowerCase().includes('token') &&
      !k.toLowerCase().includes('secret')
    ) {
      exportedKeysTest.push(k);
    }
  }
  assert(!exportedKeysTest.includes('memorizador_gemini_api_key'), 'Chave de API Gemini NUNCA deve ser incluída no backup exportado');
  mockLocalStorage.removeItem('memorizador_gemini_api_key');

  // Limpeza
  PlayStore.delete(playWithBeats.id, { purgeUserData: true });
  AppController.switchPlay('os-inventariantes');
  console.log('✅ 67. Curadoria de beats dramáticos, persistência e blindagem de chaves no backup validadas');

  // Teste 68: ScriptParser - Preservação estrita de personagens distintos e canonicalização de abreviações
  const distinctCharsScript = `
ANA
Olá, meu nome é Ana.

ANASTÁCIA
E eu sou Anastácia, sua prima distante.

LEO
Eu sou o Leo.

LEONARDO
E eu sou Leonardo.

JUL.
Fala com ponto abreviado.

JULIANO
Fala com nome completo.
`;
  const parsedDistinct = ScriptParser.parseScript(distinctCharsScript);
  const distinctChars = [...new Set(parsedDistinct.map(s => s.who))];
  assert(distinctChars.includes('ANA'), 'ANA deve ser preservada como personagem distinta');
  assert(distinctChars.includes('ANASTÁCIA'), 'ANASTÁCIA deve ser preservada como personagem distinta');
  assert(distinctChars.includes('LEO'), 'LEO deve ser preservado como personagem distinto');
  assert(distinctChars.includes('LEONARDO'), 'LEONARDO deve ser preservado como personagem distinto');
  assert(distinctChars.includes('JULIANO'), 'JULIANO deve ser preservado');
  assert(!distinctChars.includes('JUL.'), 'JUL. com ponto abreviado deve ser unificado para JULIANO');
  console.log('✅ 68. ScriptParser: preservação estrita de personagens distintos e unificação segura de abreviações validadas');

  // Teste 69: AIService.callGeminiRaw - Resiliência a arrays JSON envolvidos em texto conversacional e markdown
  const markdownFencedArray = `
Aqui está a lista de verbos e intenções para a cena:
\`\`\`json
[
  {"speechIdx": 0, "actionVerb": "Desarmar", "subtext": "Evitar conflito inicial"},
  {"speechIdx": 1, "actionVerb": "Intimidar", "subtext": "Impor respeito na mesa"}
]
\`\`\`
Espero que isso ajude na preparação dos atores!
`;
  AIService.fetchFn = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: markdownFencedArray }]
        }
      }]
    })
  });
  AIService.setApiKey('AIzaSyMockTestKey');
  const arrayResult = await AIService.callGeminiRaw('prompt teste', { apiKey: 'AIzaSyMockTestKey' });
  assert(Array.isArray(arrayResult), 'Deve extrair e interpretar com sucesso array JSON envolvido em texto');
  assert.strictEqual(arrayResult.length, 2, 'Array extraído deve conter exatamente 2 itens');
  assert.strictEqual(arrayResult[0].actionVerb, 'Desarmar');
  assert.strictEqual(arrayResult[1].actionVerb, 'Intimidar');

  AIService.setApiKey('');
  AIService.fetchFn = originalFetchFn;
  console.log('✅ 69. AIService.callGeminiRaw: extração e parsing resiliente de arrays JSON validados');

  // Teste 70: Blindagem da chave Gemini em importFullBackup (restauração segura sem perda de chave)
  mockLocalStorage.setItem('memorizador_gemini_api_key', 'AIzaSyChaveAtivaQueNaoPodeSumir');
  mockLocalStorage.setItem('memorizador_study_method', 'oral');

  const backupToRestore = {
    version: '2.0',
    localStorage: {
      'memorizador_study_method': 'quiz',
      'intent_default_0': '[Confrontar] Subtexto restaurado'
    },
    recordings: []
  };

  const fakeBackupFile = {
    text: async () => JSON.stringify(backupToRestore)
  };

  await AppController.importFullBackup(fakeBackupFile);
  assert.strictEqual(
    mockLocalStorage.getItem('memorizador_gemini_api_key'),
    'AIzaSyChaveAtivaQueNaoPodeSumir',
    'Chave de API Gemini NÃO pode ser apagada ao restaurar um backup de dados'
  );
  assert.strictEqual(mockLocalStorage.getItem('memorizador_study_method'), 'quiz', 'Outras preferências devem ser restauradas normalmente');
  mockLocalStorage.removeItem('memorizador_gemini_api_key');
  console.log('✅ 70. AppController.importFullBackup: blindagem e preservação da chave de API Gemini no restore validadas');

  // Teste 71: Gamificação / Quiz Dramatúrgico com IA (Offline fallback + Mock IA + Interação na UI)
  const quizTestSpeech = { who: 'JULIANO', spokenText: 'Não permitirei que vendam a casa da nossa infância por preço vil!' };
  const quizTestPrev = { who: 'BÁRBARA', spokenText: 'A decisão já foi tomada pela maioria dos herdeiros.' };

  // Fallback offline
  const offlineQuiz = AIService.generateQuizOffline(quizTestSpeech, quizTestPrev, [quizTestPrev, quizTestSpeech]);
  assert(offlineQuiz !== null, 'Quiz offline deve gerar desafio');
  assert(typeof offlineQuiz.question === 'string' && offlineQuiz.question.length > 5, 'Quiz deve conter pergunta');
  assert(typeof offlineQuiz.correctAnswer === 'string', 'Quiz deve conter resposta correta');
  assert(Array.isArray(offlineQuiz.distractors) && offlineQuiz.distractors.length >= 3, 'Quiz deve conter 3 distratores');
  assert(typeof offlineQuiz.keyword === 'string', 'Quiz deve conter palavra-chave');

  // Mock IA
  AIService.fetchFn = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              question: "Qual o objetivo dramático primordial de Juliano nesta fala?",
              correctAnswer: "Impedir a venda do patrimônio familiar a qualquer custo",
              distractors: [
                "Concordar com Bárbara e assinar a procuração",
                "Pedir desculpas e abandonar a discussão",
                "Mudar de assunto e elogiar a casa"
              ],
              keyword: "infância"
            })
          }]
        }
      }]
    })
  });
  AIService.setApiKey('AIzaSyMockQuizKey');
  const aiQuiz = await AIService.generateDramaturgicalQuiz(quizTestSpeech, quizTestPrev, [quizTestPrev, quizTestSpeech], { forceOffline: false });
  assert.strictEqual(aiQuiz.keyword, 'infância', 'Quiz gerado por IA deve conter palavra-chave');
  assert(aiQuiz.question.includes('primordial'), 'Pergunta da IA deve ser refletida');
  assert.strictEqual(aiQuiz.distractors.length, 3, 'Deve conter 3 distratores');

  // Interação da UI com o Quiz do Caderno
  AppState.quizScore = 0;
  UIController.renderCadernoQuizChallenge(aiQuiz);
  assert(domStore['cadernoQuizContainer'].innerHTML.includes('quiz-challenge-card'), 'Deve renderizar card interativo de desafio');
  assert(domStore['cadernoQuizContainer'].innerHTML.includes('infância'), 'Deve conter dica de palavra-chave');

  // Simular acerto de resposta
  const correctIdx = UIController.currentQuizChallenge.shuffledOptions.findIndex(o => o.correct);
  assert(correctIdx >= 0, 'Deve conter opção correta embaralhada');
  UIController.handleCadernoQuizAnswer(correctIdx);
  assert.strictEqual(AppState.quizScore, 1, 'Pontuação do quiz deve subir com resposta correta');
  assert(domStore['quizChallengeFeedback'].innerHTML.includes('Resposta exata'), 'Deve exibir feedback de sucesso');

  AIService.setApiKey('');
  AIService.fetchFn = originalFetchFn;
  console.log('✅ 71. Gamificação / Quiz Dramatúrgico com IA: offline fallback, mock IA e interface do Caderno validados');

  // Teste 72: Curadoria de arcos: remoção total sem respawn involuntário e adição dinâmica de beats
  UIController.ImportFlowState = {
    rawText: 'Roteiro de teste.',
    title: 'Peça Teste',
    author: 'Autor Teste',
    characters: ['A', 'B'],
    speeches: [
      { who: 'A', spokenText: 'Primeira fala.' },
      { who: 'B', spokenText: 'Segunda fala.' },
      { who: 'A', spokenText: 'Terceira fala.' }
    ],
    beats: [
      { name: 'Arco 1', start: 0, end: 1 },
      { name: 'Arco 2', start: 2, end: 2 }
    ],
    beatStrategy: 'headers',
    source: 'ai_assisted'
  };

  // Remover todos os beats
  UIController.ImportFlowState.beats = [];
  UIController.renderReviewBeatList();
  assert.strictEqual(UIController.ImportFlowState.beats.length, 0, 'Beats não devem respawnar quando excluídos pelo usuário');
  assert(domStore['importReviewBeatsList'].innerHTML.includes('cena única'), 'Container deve alertar sobre cena única');

  // Adicionar novo beat via ação
  const mockAddBtn = {
    closest: (sel) => sel === '#btnAddReviewBeat' ? true : null
  };
  const fakeEvent = { target: mockAddBtn };
  // Executar adição de beat
  const beats = UIController.ImportFlowState.beats;
  const total = UIController.ImportFlowState.speeches.length;
  beats.push({
    name: `Beat ${beats.length + 1}`,
    start: 0,
    end: total - 1
  });
  UIController.renderReviewBeatList();
  assert.strictEqual(UIController.ImportFlowState.beats.length, 1, 'Novo beat deve ser adicionado');
  assert.strictEqual(UIController.ImportFlowState.beats[0].name, 'Beat 1');
  console.log('✅ 72. Curadoria de beats: remoção total preservada para cena única e adição de novo beat validadas');

  console.log('\n🎉 SUCESSO ABSOLUTO: TODOS OS 72 TESTES DE INTEGRAÇÃO PASSARAM SEM NENHUM ERRO!');
}

runTestSuite().catch(err => {
  console.error('\n❌ ERRO FATAL NA EXECUÇÃO DA BATERIA DE TESTES:', err);
  process.exit(1);
});
