// 5. STORAGE SERVICE (StorageManager: IndexedDB + LocalStorage)
    const StorageManager = {
      dbInstance: null,

      getIndexedDB() {
        if (this.dbInstance) return Promise.resolve(this.dbInstance);
        if (typeof indexedDB === 'undefined') return Promise.resolve(null);
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('EnsaioTeatralDB', 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('recordings')) {
              db.createObjectStore('recordings', { keyPath: 'id' });
            }
          };
          req.onsuccess = () => {
            this.dbInstance = req.result;
            resolve(this.dbInstance);
          };
          req.onerror = () => reject(req.error);
        });
      },

      getRecordingKey(speechIdx, playId) {
        const pId = playId || AppState.getPlayId();
        return `${pId}_${speechIdx}`;
      },

      async saveCastAudio(speechIdx, blob, playId) {
        const db = await this.getIndexedDB();
        if (!db) return;
        const pId = playId || AppState.getPlayId();
        const key = this.getRecordingKey(speechIdx, pId);
        return new Promise((resolve, reject) => {
          const tx = db.transaction('recordings', 'readwrite');
          tx.objectStore('recordings').put({
            id: key,
            speechIdx,
            playId: pId,
            blob,
            timestamp: Date.now()
          });
          if (pId === 'default') {
            try { tx.objectStore('recordings').put({ id: speechIdx, speechIdx, playId: 'default', blob, timestamp: Date.now() }); } catch (e) {}
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      },

      async getCastAudio(speechIdx, playId) {
        const db = await this.getIndexedDB();
        if (!db) return null;
        const pId = playId || AppState.getPlayId();
        const key = this.getRecordingKey(speechIdx, pId);
        return new Promise((resolve, reject) => {
          const tx = db.transaction('recordings', 'readonly');
          const store = tx.objectStore('recordings');
          const req = store.get(key);
          req.onsuccess = () => {
            if (req.result && req.result.blob) {
              resolve(req.result.blob);
            } else if (pId === 'default') {
              const legacyReq = store.get(speechIdx);
              legacyReq.onsuccess = () => resolve(legacyReq.result ? legacyReq.result.blob : null);
              legacyReq.onerror = () => resolve(null);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => reject(req.error);
        });
      },

      async deleteCastAudio(speechIdx, playId) {
        const db = await this.getIndexedDB();
        if (!db) return;
        const pId = playId || AppState.getPlayId();
        const key = this.getRecordingKey(speechIdx, pId);
        return new Promise((resolve, reject) => {
          const tx = db.transaction('recordings', 'readwrite');
          const store = tx.objectStore('recordings');
          store.delete(key);
          if (pId === 'default') {
            try { store.delete(speechIdx); } catch (e) {}
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      },

      async clearAllCastAudios() {
        const db = await this.getIndexedDB();
        if (!db) return;
        return new Promise((resolve, reject) => {
          const tx = db.transaction('recordings', 'readwrite');
          tx.objectStore('recordings').clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      },

      async getAllRecordings() {
        const db = await this.getIndexedDB();
        if (!db) return [];
        return new Promise((resolve, reject) => {
          const tx = db.transaction('recordings', 'readonly');
          const req = tx.objectStore('recordings').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      },

      getActorProgressKey(actor, playId) {
        const pId = playId || AppState.getPlayId();
        return `memorizador_niveis_${pId}_${Utils.sanitizeId(actor || 'padrao')}`;
      },

      loadProgress(actor, totalSpeeches, playId) {
        const pId = playId || AppState.getPlayId();
        try {
          const saved = JSON.parse(localStorage.getItem(this.getActorProgressKey(actor, pId)));
          if (Array.isArray(saved) && saved.length === totalSpeeches) {
            return saved;
          }
          if (pId === 'default') {
            const leg1 = JSON.parse(localStorage.getItem('memorizador_niveis_' + (actor || 'padrao')));
            if (Array.isArray(leg1) && leg1.length === totalSpeeches) return leg1;
            const leg2 = JSON.parse(localStorage.getItem('inv-' + actor));
            if (Array.isArray(leg2) && leg2.length === totalSpeeches) return leg2;
          }
        } catch (e) {}
        return new Array(totalSpeeches).fill(0);
      },

      saveProgress(actor, masteryLevels, playId) {
        const pId = playId || AppState.getPlayId();
        try {
          localStorage.setItem(this.getActorProgressKey(actor, pId), JSON.stringify(masteryLevels));
          if (pId === 'default') {
            localStorage.setItem('memorizador_niveis_' + (actor || 'padrao'), JSON.stringify(masteryLevels));
          }
        } catch (e) {}
      },

      getActorVoiceKey(actor) {
        return 'voice_actor_' + Utils.sanitizeId(actor || 'padrao');
      },

      getActorVoice(actor) {
        const direct = localStorage.getItem(this.getActorVoiceKey(actor));
        if (direct) return direct;
        const raw = localStorage.getItem('voice_actor_' + (actor || 'padrao'));
        if (raw) return raw;
        if (actor === 'SÉRGIO') return localStorage.getItem('voice_actor_SERGIO');
        if (actor === 'BÁRBARA') return localStorage.getItem('voice_actor_BARBARA');
        return null;
      },

      setActorVoice(actor, voiceName) {
        localStorage.setItem(this.getActorVoiceKey(actor), voiceName);
        localStorage.setItem('voice_actor_' + (actor || 'padrao'), voiceName);
        if (actor === 'SÉRGIO') localStorage.setItem('voice_actor_SERGIO', voiceName);
        if (actor === 'BÁRBARA') localStorage.setItem('voice_actor_BARBARA', voiceName);
      },

      getSpeechIntent(idx, isDefaultPlay, playId) {
        const pId = playId || (isDefaultPlay ? 'default' : AppState.getPlayId());
        const scopedKey = `intent_${pId}_${idx}`;
        const custom = localStorage.getItem(scopedKey);
        if (custom !== null && custom !== undefined) return custom;

        if (pId === 'default') {
          const leg = localStorage.getItem('intent_' + idx);
          if (leg !== null && leg !== undefined) return leg;
          return AppConfig.DEFAULT_INTENTIONS[idx] || '';
        }
        return '';
      },

      setSpeechIntent(idx, val, isDefaultPlay, playId) {
        const pId = playId || (isDefaultPlay ? 'default' : AppState.getPlayId());
        const scopedKey = `intent_${pId}_${idx}`;
        const isReset = val === '__padrao__' || (val && val.toLowerCase() === 'padrao') || (val && val.toLowerCase() === 'padrão');

        if (isReset) {
          localStorage.removeItem(scopedKey);
          if (pId === 'default') localStorage.removeItem('intent_' + idx);
        } else if (val !== undefined && val !== null) {
          localStorage.setItem(scopedKey, val);
          if (pId === 'default') localStorage.setItem('intent_' + idx, val);
        }
      },

      loadSettings() {
        return {
          speechRate: parseFloat(localStorage.getItem('memorizador_rate')) || 0.95,
          partnerVoiceEnabled: localStorage.getItem('memorizador_voice') !== 'false',
          autoAdvanceEnabled: localStorage.getItem('memorizador_autoadvance') === 'true',
          wakeLockEnabled: localStorage.getItem('memorizador_wakelock') !== 'false',
          rehearsalMode: localStorage.getItem('memorizador_mode') || 'cena',
          rehearsalTempo: localStorage.getItem('memorizador_tempo') || 'normal',
          studyMethod: localStorage.getItem('memorizador_study_method') || 'oral',
          hideRubrics: localStorage.getItem('memorizador_hide_rubrics') === 'true',
          alwaysStartHidden: localStorage.getItem('memorizador_start_hidden') !== 'false',
          customScript: localStorage.getItem('memorizador_custom_script') || null,
          selectedActor: localStorage.getItem('memorizador_actor') || ''
        };
      },

      saveSettings(state) {
        try {
          localStorage.setItem('memorizador_rate', state.speechRate.toString());
          localStorage.setItem('memorizador_voice', state.partnerVoiceEnabled.toString());
          localStorage.setItem('memorizador_autoadvance', state.autoAdvanceEnabled.toString());
          localStorage.setItem('memorizador_wakelock', state.wakeLockEnabled.toString());
          localStorage.setItem('memorizador_mode', state.rehearsalMode);
          localStorage.setItem('memorizador_tempo', state.rehearsalTempo);
          if (state.studyMethod) localStorage.setItem('memorizador_study_method', state.studyMethod);
          if (state.hideRubrics !== undefined) localStorage.setItem('memorizador_hide_rubrics', state.hideRubrics.toString());
          if (state.alwaysStartHidden !== undefined) localStorage.setItem('memorizador_start_hidden', state.alwaysStartHidden.toString());
          if (state.selectedActor) {
            localStorage.setItem('memorizador_actor', state.selectedActor);
          }
        } catch (e) {}
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager };
}
