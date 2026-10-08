// 5. STORAGE SERVICE (StorageManager: IndexedDB + LocalStorage)
    const StorageManager = {
      STORE_NAME: 'recordings',
      dbInstance: null,

      getIndexedDB() {
        if (this.dbInstance) return Promise.resolve(this.dbInstance);
        if (typeof indexedDB === 'undefined') return Promise.resolve(null);
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('EnsaioTeatralDB', 2);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('recordings')) {
              db.createObjectStore('recordings', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('plays')) {
              db.createObjectStore('plays', { keyPath: 'id' });
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
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          tx.objectStore(this.STORE_NAME).put({
            id: key,
            speechIdx,
            playId: pId,
            blob,
            timestamp: Date.now()
          });
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
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => {
            const res = req.result;
            if (res && (res.blob || res.audioBlob)) {
              resolve(res.blob || res.audioBlob);
            } else if (pId === 'default') {
              const legacyReq = store.get(speechIdx);
              legacyReq.onsuccess = () => {
                const legRes = legacyReq.result;
                resolve(legRes ? (legRes.blob || legRes.audioBlob) : null);
              };
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
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.delete(key);
          if (pId === 'default') {
            try { store.delete(speechIdx); } catch (e) {}
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      },

      async deleteRecordingById(key) {
        const db = await this.getIndexedDB();
        if (!db) return;
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      },

      async clearAllCastAudios() {
        const db = await this.getIndexedDB();
        if (!db) return;
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          tx.objectStore(this.STORE_NAME).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      },

      async getAllRecordings() {
        const db = await this.getIndexedDB();
        if (!db) return [];
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const req = tx.objectStore(this.STORE_NAME).getAll();
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
        const legacySanitized = localStorage.getItem('voice_actor_' + Utils.sanitizeId(actor || 'padrao').toUpperCase());
        if (legacySanitized) return legacySanitized;
        return null;
      },

      setActorVoice(actor, voiceName) {
        localStorage.setItem(this.getActorVoiceKey(actor), voiceName);
        localStorage.setItem('voice_actor_' + (actor || 'padrao'), voiceName);
      },

      getSpeechIntent(idx, isDefaultPlay, playId) {
        const pId = playId || (isDefaultPlay ? 'default' : AppState.getPlayId());
        const scopedKey = `intent_${pId}_${idx}`;
        const custom = localStorage.getItem(scopedKey);
        if (custom !== null && custom !== undefined) return custom;

        if (AppState.activePlay && AppState.activePlay.intentions && AppState.activePlay.intentions[idx]) {
          return AppState.activePlay.intentions[idx];
        }

        if (pId === 'default') {
          const leg = localStorage.getItem('intent_' + idx);
          if (leg !== null && leg !== undefined) return leg;
          if (typeof DefaultPlay !== 'undefined' && DefaultPlay.intentions) {
            return DefaultPlay.intentions[idx] || '';
          }
          return (AppConfig.DEFAULT_INTENTIONS && AppConfig.DEFAULT_INTENTIONS[idx]) || '';
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

      getActorNotesKey(playId) {
        const pId = playId || AppState.getPlayId();
        return `memorizador_actor_notes_${pId}`;
      },

      getActorNotes(playId) {
        try {
          return localStorage.getItem(this.getActorNotesKey(playId)) || '';
        } catch (e) {
          return '';
        }
      },

      setActorNotes(text, playId) {
        try {
          const key = this.getActorNotesKey(playId);
          if (text) {
            localStorage.setItem(key, text);
          } else {
            localStorage.removeItem(key);
          }
        } catch (e) {}
      },

      getSpeechNoteKey(speechIdx, playId) {
        const pId = playId || AppState.getPlayId();
        return `memorizador_speech_note_${pId}_${speechIdx}`;
      },

      getSpeechNote(speechIdx, playId) {
        try {
          return localStorage.getItem(this.getSpeechNoteKey(speechIdx, playId)) || '';
        } catch (e) {
          return '';
        }
      },

      setSpeechNote(speechIdx, text, playId) {
        try {
          const key = this.getSpeechNoteKey(speechIdx, playId);
          if (text) {
            localStorage.setItem(key, text);
          } else {
            localStorage.removeItem(key);
          }
        } catch (e) {}
      },

      getSelectedActor(playId) {
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        try {
          if (typeof localStorage === 'undefined') return '';
          const scoped = localStorage.getItem(`memorizador_actor_${pId}`);
          if (scoped) return scoped;
          return localStorage.getItem('memorizador_actor') || '';
        } catch (e) {
          return '';
        }
      },

      setSelectedActor(actor, playId) {
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        try {
          if (typeof localStorage === 'undefined') return;
          if (actor) {
            localStorage.setItem(`memorizador_actor_${pId}`, actor);
            localStorage.setItem('memorizador_actor', actor);
          }
        } catch (e) {}
      },

      getSelectedBeat(playId) {
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        try {
          if (typeof localStorage === 'undefined') return 'all';
          return localStorage.getItem(`memorizador_beat_${pId}`) || 'all';
        } catch (e) {
          return 'all';
        }
      },

      setSelectedBeat(beat, playId) {
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        try {
          if (typeof localStorage === 'undefined') return;
          if (beat !== undefined && beat !== null) {
            localStorage.setItem(`memorizador_beat_${pId}`, String(beat));
          }
        } catch (e) {}
      },

      async deletePlayAudios(playId) {
        const db = await this.getIndexedDB();
        if (!db) return;
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        return new Promise((resolve, reject) => {
          try {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
              const list = req.result || [];
              list.forEach(item => {
                if (item && (item.playId === pId || (pId === 'default' && (!item.playId || item.playId === 'os-inventariantes')))) {
                  store.delete(item.id);
                }
              });
              resolve();
            };
            req.onerror = () => reject(req.error);
          } catch (err) {
            resolve();
          }
        });
      },

      deletePlayProgress(playId) {
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        try {
          if (typeof localStorage === 'undefined') return;
          const prefix = `memorizador_niveis_${pId}_`;
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              toRemove.push(key);
            }
          }
          toRemove.forEach(k => localStorage.removeItem(k));
          localStorage.removeItem(`memorizador_actor_${pId}`);
          localStorage.removeItem(`memorizador_beat_${pId}`);
        } catch (e) {}
      },

      deletePlayNotes(playId) {
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        try {
          if (typeof localStorage === 'undefined') return;
          localStorage.removeItem(this.getActorNotesKey(pId));
          const notePrefix = `memorizador_speech_note_${pId}_`;
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(notePrefix)) {
              toRemove.push(key);
            }
          }
          toRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
      },

      deletePlayIntents(playId) {
        const pId = playId || (typeof AppState !== 'undefined' && AppState.getPlayId ? AppState.getPlayId() : 'default');
        try {
          if (typeof localStorage === 'undefined') return;
          const intentPrefix = `intent_${pId}_`;
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(intentPrefix)) {
              toRemove.push(key);
            }
          }
          toRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
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
            const pId = (typeof AppState !== 'undefined' && AppState.getPlayId) ? AppState.getPlayId() : 'default';
            localStorage.setItem('memorizador_actor_' + pId, state.selectedActor);
          }
        } catch (e) {}
      }
    };

    // 5.1 CATÁLOGO MULTI-PEÇAS (PlayStore)
    const PlayStore = {
      STORAGE_KEY_CATALOG: 'memorizador_plays_catalog',
      STORAGE_KEY_ACTIVE_ID: 'memorizador_active_play_id',

      getCanonicalPlay() {
        if (typeof DefaultPlay !== 'undefined' && DefaultPlay.rawScript) {
          return {
            id: DefaultPlay.id || 'os-inventariantes',
            title: DefaultPlay.title || 'Os Inventariantes',
            author: DefaultPlay.author || 'Walter Paiva (Adaptação Dramatúrgica Depurada e Lapidada)',
            rawScript: DefaultPlay.rawScript,
            characters: Array.isArray(DefaultPlay.characters) ? [...DefaultPlay.characters] : ['SÉRGIO', 'BÁRBARA'],
            beats: Array.isArray(DefaultPlay.beats) ? JSON.parse(JSON.stringify(DefaultPlay.beats)) : [],
            intentions: (DefaultPlay.intentions && typeof DefaultPlay.intentions === 'object') ? { ...DefaultPlay.intentions } : {},
            isDefault: true,
            createdAt: 1700000000000,
            updatedAt: 1700000000000
          };
        }
        return {
          id: 'os-inventariantes',
          title: 'Os Inventariantes',
          author: 'Walter Paiva (Adaptação Dramatúrgica Depurada e Lapidada)',
          rawScript: '',
          characters: ['SÉRGIO', 'BÁRBARA'],
          beats: [],
          intentions: {},
          isDefault: true,
          createdAt: 1700000000000,
          updatedAt: 1700000000000
        };
      },

      getAll() {
        const canonical = this.getCanonicalPlay();
        const playsMap = {};
        playsMap[canonical.id] = canonical;

        try {
          if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(this.STORAGE_KEY_CATALOG);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach(p => {
                  if (p && p.id) {
                    if (p.id === canonical.id || p.id === 'default') {
                      playsMap[canonical.id] = { ...canonical, ...p, isDefault: true };
                    } else {
                      playsMap[p.id] = p;
                    }
                  }
                });
              }
            }

            // Migração transparente de peça customizada legada
            const legacyCustom = localStorage.getItem('memorizador_custom_script');
            if (legacyCustom && (!ScriptParser || !ScriptParser.isDefaultPlay(legacyCustom))) {
              const title = (typeof ScriptParser !== 'undefined') ? ScriptParser.extractPlayTitle(legacyCustom) : 'Peça Personalizada';
              const customId = 'play_' + Utils.sanitizeId(title || 'customizada');
              if (!playsMap[customId]) {
                const speeches = (typeof ScriptParser !== 'undefined') ? ScriptParser.parseScript(legacyCustom) : [];
                const characters = [...new Set(speeches.map(s => s.who))];
                const beats = (typeof DramaBeats !== 'undefined') ? DramaBeats.generateBeats(speeches, legacyCustom) : [];
                playsMap[customId] = {
                  id: customId,
                  title: title,
                  author: 'Texto Importado',
                  rawScript: legacyCustom,
                  characters: characters,
                  beats: beats,
                  intentions: {},
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                };
              }
            }
          }
        } catch (e) {}

        return Object.values(playsMap).sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
      },

      get(id) {
        if (!id || id === 'default' || id === 'os-inventariantes') {
          const all = this.getAll();
          return all.find(p => p.id === 'os-inventariantes' || p.id === 'default') || this.getCanonicalPlay();
        }
        const all = this.getAll();
        return all.find(p => p.id === id) || null;
      },

      save(playData) {
        if (!playData || typeof playData !== 'object') return null;
        const rawScript = playData.rawScript || '';
        let title = (playData.title || '').trim();
        if (!title && typeof ScriptParser !== 'undefined') {
          title = ScriptParser.extractPlayTitle(rawScript);
        }
        if (!title) title = 'Sem Título';

        let id = playData.id;
        if (!id) {
          id = 'play_' + Utils.sanitizeId(title) + '_' + Math.random().toString(36).substring(2, 7);
        }

        let speeches = [];
        if (Array.isArray(playData.speeches) && playData.speeches.length > 0) {
          speeches = playData.speeches;
        } else if (typeof ScriptParser !== 'undefined') {
          speeches = ScriptParser.parseScript(rawScript);
        }
        const characters = Array.isArray(playData.characters) && playData.characters.length > 0
          ? playData.characters
          : [...new Set(speeches.map(s => s.who))];

        if (Array.isArray(characters) && characters.length > 0 && typeof ScriptParser !== 'undefined' && typeof ScriptParser.filterSpeechesByCharacters === 'function') {
          speeches = ScriptParser.filterSpeechesByCharacters(speeches, characters);
        }

        const beats = Array.isArray(playData.beats) && playData.beats.length > 0
          ? playData.beats
          : ((typeof DramaBeats !== 'undefined') ? DramaBeats.generateBeats(speeches, rawScript) : []);

        const completePlay = {
          id: id,
          title: title,
          author: playData.author || 'Autor não informado',
          rawScript: rawScript,
          speeches: speeches,
          characters: characters,
          beats: beats,
          intentions: playData.intentions || {},
          activeActor: playData.activeActor || characters[0] || '',
          selectedBeat: playData.selectedBeat || 'all',
          isDefault: id === 'os-inventariantes' || id === 'default',
          createdAt: playData.createdAt || Date.now(),
          updatedAt: Date.now()
        };

        const all = this.getAll();
        const existingIndex = all.findIndex(p => p.id === id);
        if (existingIndex >= 0) {
          all[existingIndex] = completePlay;
        } else {
          all.push(completePlay);
        }

        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.STORAGE_KEY_CATALOG, JSON.stringify(all));
            if (this.getActivePlayId() === id && !completePlay.isDefault) {
              localStorage.setItem('memorizador_custom_script', completePlay.rawScript);
            }
          }
        } catch (e) {}

        this.syncToIndexedDB(completePlay).catch(() => {});
        return completePlay;
      },

      delete(id, options = {}) {
        if (!id || id === 'os-inventariantes' || id === 'default') {
          const canonical = this.getCanonicalPlay();
          this.save(canonical);
          return false;
        }

        const all = this.getAll().filter(p => p.id !== id);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.STORAGE_KEY_CATALOG, JSON.stringify(all));
            if (this.getActivePlayId() === id) {
              this.setActivePlayId('os-inventariantes');
              localStorage.removeItem('memorizador_custom_script');
            }
          }
        } catch (e) {}

        if (options.purgeUserData) {
          StorageManager.deletePlayAudios(id);
          StorageManager.deletePlayProgress(id);
          StorageManager.deletePlayNotes(id);
          StorageManager.deletePlayIntents(id);
        }

        StorageManager.getIndexedDB().then(db => {
          if (!db || !db.objectStoreNames.contains('plays')) return;
          try {
            const tx = db.transaction('plays', 'readwrite');
            tx.objectStore('plays').delete(id);
          } catch (err) {}
        }).catch(() => {});

        return true;
      },

      getActivePlayId() {
        try {
          if (typeof localStorage !== 'undefined') {
            const activeId = localStorage.getItem(this.STORAGE_KEY_ACTIVE_ID);
            const customScript = localStorage.getItem('memorizador_custom_script');

            if (activeId) {
              const all = this.getAll();
              if (all.some(p => p.id === activeId)) return activeId;
            }

            if (customScript && (!ScriptParser || !ScriptParser.isDefaultPlay(customScript))) {
              const title = (typeof ScriptParser !== 'undefined') ? ScriptParser.extractPlayTitle(customScript) : 'custom';
              return 'play_' + Utils.sanitizeId(title || 'custom');
            }
          }
        } catch (e) {}
        return 'os-inventariantes';
      },

      setActivePlayId(id) {
        try {
          if (typeof localStorage !== 'undefined') {
            const normalizedId = (!id || id === 'default') ? 'os-inventariantes' : id;
            localStorage.setItem(this.STORAGE_KEY_ACTIVE_ID, normalizedId);
            const play = this.get(normalizedId);
            if (play && !play.isDefault) {
              localStorage.setItem('memorizador_custom_script', play.rawScript);
            } else {
              localStorage.removeItem('memorizador_custom_script');
            }
          }
        } catch (e) {}
      },

      getActivePlay() {
        const id = this.getActivePlayId();
        return this.get(id) || this.getCanonicalPlay();
      },

      createPlayFromScript(rawScript, title, author, options = {}) {
        const playTitle = (title || '').trim() || (typeof ScriptParser !== 'undefined' ? ScriptParser.extractPlayTitle(rawScript) : 'Sem Título');
        const id = 'play_' + Utils.sanitizeId(playTitle) + '_' + Date.now().toString(36);
        return this.save({
          id: id,
          title: playTitle,
          author: author || 'Autor não informado',
          rawScript: rawScript,
          speeches: options.speeches || null,
          characters: options.characters || null,
          beats: options.beats || [],
          intentions: options.intentions || {},
          activeActor: options.activeActor || '',
          selectedBeat: options.selectedBeat || 'all'
        });
      },

      getStats(id) {
        const play = this.get(id);
        if (!play) return null;
        const pId = (play.id === 'os-inventariantes' || play.id === 'default') ? 'default' : play.id;
        let speeches = [];
        if (Array.isArray(play.speeches) && play.speeches.length > 0) {
          speeches = play.speeches;
        } else if (typeof ScriptParser !== 'undefined' && play.rawScript) {
          speeches = ScriptParser.parseScript(play.rawScript);
        }
        const characters = (Array.isArray(play.characters) && play.characters.length > 0)
          ? [...play.characters]
          : [...new Set(speeches.map(s => s.who))];

        if (Array.isArray(characters) && characters.length > 0 && typeof ScriptParser !== 'undefined' && typeof ScriptParser.filterSpeechesByCharacters === 'function') {
          speeches = ScriptParser.filterSpeechesByCharacters(speeches, characters);
        }

        const totalSpeeches = speeches.length;

        const characterCounts = {};
        speeches.forEach(s => {
          characterCounts[s.who] = (characterCounts[s.who] || 0) + 1;
        });

        const actor = StorageManager.getSelectedActor(pId) || characters[0] || '';
        const progress = StorageManager.loadProgress(actor, totalSpeeches, pId);
        let masteredCount = 0;
        progress.forEach(lvl => {
          if (lvl >= 3) masteredCount++;
        });

        const actorSpeechCount = characterCounts[actor] || 0;
        const masteryPercentage = actorSpeechCount > 0 ? Math.round((masteredCount / actorSpeechCount) * 100) : 0;

        return {
          id: play.id,
          title: play.title,
          author: play.author,
          totalSpeeches,
          characterCount: characters.length,
          characters,
          characterCounts,
          beatsCount: Array.isArray(play.beats) ? play.beats.length : 0,
          activeActor: actor,
          masteryPercentage,
          hasNotes: !!StorageManager.getActorNotes(pId)
        };
      },

      resetPlayProgress(id) {
        const play = this.get(id);
        if (!play) return;
        const pId = (play.id === 'os-inventariantes' || play.id === 'default') ? 'default' : play.id;
        StorageManager.deletePlayProgress(pId);
      },

      async syncToIndexedDB(play) {
        const db = await StorageManager.getIndexedDB();
        if (!db || !db.objectStoreNames.contains('plays')) return;
        return new Promise((resolve, reject) => {
          try {
            const tx = db.transaction('plays', 'readwrite');
            tx.objectStore('plays').put(play);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          } catch (err) {
            resolve();
          }
        });
      }
    };

    StorageManager.plays = PlayStore;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, PlayStore };
}

