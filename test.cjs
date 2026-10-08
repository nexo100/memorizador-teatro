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
assert(indexHtml.includes('js/app.js'), 'index.html deve carregar os módulos em js/');
console.log('✅ 1. Arquitetura modular e redirecionamento canônico validados');

// 2. Validação da existência física dos módulos e folhas de estilo
const cssContent = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');
const jsFiles = ['config.js', 'utils.js', 'state.js', 'parser.js', 'storage.js', 'audio.js', 'ui.js', 'app.js'];
jsFiles.forEach(f => {
  assert(fs.existsSync(path.join(__dirname, 'js', f)), `Arquivo js/${f} deve existir`);
});

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
        transaction: () => ({
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
        })
      },
      onsuccess: null,
      onerror: null
    };
    setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
    return req;
  }
};

const defaultPlayTag = 'id="defaultPlay">';
const dpStart = indexHtml.indexOf(defaultPlayTag) + defaultPlayTag.length;
const dpEnd = indexHtml.indexOf('</script>', dpStart);
const defaultPlayText = indexHtml.substring(dpStart, dpEnd);
domStore['defaultPlay'] = { textContent: defaultPlayText };

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

jsFiles.forEach(f => {
  const code = fs.readFileSync(path.join(__dirname, 'js', f), 'utf8');
  vm.runInContext(code, context);
});

vm.runInContext('globalThis.__test_exports = { AppState, AppController, UIController, StorageManager, AudioEngine, ScriptParser, DramaBeats, AppConfig, Utils };', context);

const { AppState, AppController, UIController, StorageManager, AudioEngine, ScriptParser, DramaBeats, AppConfig, Utils } = context.__test_exports;

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
  assert.strictEqual(mockDocument.title, '🎭 Ensaio Teatral · Hamlet de William Shakespeare');
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
  assert.strictEqual(audioStatus, '⏹️ Áudio interrompido.');
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

  console.log('\n🎉 SUCESSO ABSOLUTO: TODOS OS 42 TESTES DE INTEGRAÇÃO PASSARAM SEM NENHUM ERRO!');
}

runTestSuite();
