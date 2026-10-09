const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

/**
 * Cria um ambiente de teste isolado com mocks completos de navegador (DOM, LocalStorage, IndexedDB, Audio, etc.)
 * e carrega as classes fundamentais da aplicação sem efeitos colaterais entre baterias de teste.
 */
function createTestEnv(options = {}) {
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
    title: '',
    readyState: 'complete'
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
    key(i) { return Object.keys(this._data)[i] || null; },
    clear() { this._data = {}; }
  };

  // Mock em memória para IndexedDB
  const indexedDbData = {};
  const mockIndexedDB = {
    _data: indexedDbData,
    open: (dbName, version) => {
      const req = {
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          transaction: (storeName) => {
            const stName = storeName || 'recordings';
            if (!indexedDbData[stName]) indexedDbData[stName] = {};
            const store = indexedDbData[stName];

            const tx = {
              objectStore: () => ({
                put: (item) => {
                  store[item.id] = item;
                  const r = { onsuccess: null, onerror: null, result: item.id };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                  return r;
                },
                get: (key) => {
                  const r = { onsuccess: null, onerror: null, result: store[key] || null };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                  return r;
                },
                getAll: () => {
                  const r = { onsuccess: null, onerror: null, result: Object.values(store) };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                  return r;
                },
                delete: (key) => {
                  delete store[key];
                  const r = { onsuccess: null, onerror: null };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                  return r;
                },
                clear: () => {
                  indexedDbData[stName] = {};
                  const r = { onsuccess: null, onerror: null };
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

  const revokedUrls = [];
  const mockUrl = {
    createObjectURL: () => 'blob:mock-audio-' + Math.random().toString(36).slice(2),
    revokeObjectURL: (u) => { revokedUrls.push(u); }
  };

  class MockFileReader {
    readAsDataURL(blob) {
      setTimeout(() => {
        this.result = 'data:' + (blob.type || 'audio/webm') + ';base64,AAAA';
        if (this.onloadend) this.onloadend();
      }, 0);
    }
  }

  const context = vm.createContext({
    document: mockDocument,
    window: mockWindow,
    SpeechSynthesisUtterance: mockWindow.SpeechSynthesisUtterance,
    navigator: {
      serviceWorker: { register: () => Promise.resolve() },
      vibrate: () => true,
      mediaDevices: {},
      storage: { persist: () => Promise.resolve() }
    },
    localStorage: mockLocalStorage,
    URL: mockUrl,
    indexedDB: mockIndexedDB,
    FileReader: MockFileReader,
    console: console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    Blob: globalThis.Blob,
    alert: () => {}
  });

  const rootDir = path.resolve(__dirname, '..');
  const defaultPlayCode = fs.readFileSync(path.join(rootDir, 'plays', 'default-play.js'), 'utf8');
  vm.runInContext(defaultPlayCode, context);

  const jsFiles = ['config.js', 'utils.js', 'state.js', 'parser.js', 'ai-service.js', 'storage.js', 'audio.js', 'ui.js', 'app.js'];
  jsFiles.forEach(f => {
    const code = fs.readFileSync(path.join(rootDir, 'js', f), 'utf8');
    vm.runInContext(code, context);
  });

  vm.runInContext('globalThis.__test_exports = { AppState, AppController, UIController, StorageManager, AudioEngine, ScriptParser, DramaBeats, DramaturgyAnalyzer, AppConfig, Utils, DefaultPlay, PlayStore, AIService };', context);

  return {
    ...context.__test_exports,
    context,
    domStore,
    mockDocument,
    mockWindow,
    mockLocalStorage,
    mockIndexedDB,
    docListeners,
    revokedUrls
  };
}

/**
 * Cria um executor estruturado de suíte de testes.
 */
function createRunner(suiteName) {
  const tests = [];

  function it(name, fn) {
    tests.push({ name, fn });
  }

  async function run({ silent = false } = {}) {
    let passed = 0;
    let failed = 0;
    const errors = [];
    const startTime = Date.now();

    if (!silent) {
      console.log(`\n📦 Suíte: ${suiteName}`);
    }

    for (const t of tests) {
      try {
        await t.fn();
        passed++;
        if (!silent) {
          console.log(`  ✅ ${t.name}`);
        }
      } catch (err) {
        failed++;
        if (!silent) {
          console.error(`  ❌ ${t.name}`);
          console.error(`     Erro: ${err.message}`);
        }
        errors.push({ name: t.name, error: err });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      suiteName,
      passed,
      failed,
      total: tests.length,
      durationMs,
      errors
    };
  }

  return { it, run };
}

module.exports = {
  createTestEnv,
  createRunner,
  assert
};
