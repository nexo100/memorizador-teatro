// 8. CONTROLADOR PRINCIPAL DO APLICATIVO (AppController)
    const AppController = {
      init() {
        this.setupPWA();
        this.setupWakeLock();
        this.bindEvents();
        this.bindKeyboard();
        this.loadActiveScript();
      },

      setupPWA() {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
          });
        }
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(() => {});
        }
      },

      setupWakeLock() {
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && AppState.wakeLockEnabled) {
              this.updateWakeLock();
            }
          });
        }
      },

      async updateWakeLock() {
        try {
          if (AppState.wakeLockEnabled && 'wakeLock' in navigator) {
            if (!AppState.wakeLock) {
              AppState.wakeLock = await navigator.wakeLock.request('screen');
              AppState.wakeLock.addEventListener('release', () => { AppState.wakeLock = null; });
            }
          } else if (!AppState.wakeLockEnabled && AppState.wakeLock) {
            await AppState.wakeLock.release();
            AppState.wakeLock = null;
          }
        } catch (e) {
          AppState.wakeLock = null;
        }
      },

      loadActiveScript() {
        let scriptText = localStorage.getItem('memorizador_custom_script');
        if (!scriptText) {
          const defEl = Utils.$('defaultPlay');
          scriptText = defEl ? defEl.textContent.trim() : '';
        }

        AppState.activeScriptText = scriptText;
        const playTitle = ScriptParser.extractPlayTitle(scriptText);
        document.title = '🎭 Ensaio Teatral · ' + playTitle;
        const ptEl = Utils.$('playTitle');
        if (ptEl) ptEl.textContent = '🎭 ' + playTitle;
        const stTitle = Utils.$('stagePlayTitle');
        if (stTitle) stTitle.textContent = playTitle;

        AppState.speeches = ScriptParser.parseScript(scriptText);
        AppState.characters = [...new Set(AppState.speeches.map(s => s.who))];

        const settings = StorageManager.loadSettings();
        AppState.speechRate = settings.speechRate;
        AppState.partnerVoiceEnabled = settings.partnerVoiceEnabled;
        AppState.autoAdvanceEnabled = settings.autoAdvanceEnabled;
        AppState.wakeLockEnabled = settings.wakeLockEnabled;
        AppState.rehearsalMode = settings.rehearsalMode;
        AppState.rehearsalTempo = settings.rehearsalTempo;
        AppState.studyMethod = settings.studyMethod || 'oral';
        AppState.hideRubrics = !!settings.hideRubrics;
        AppState.alwaysStartHidden = settings.alwaysStartHidden !== false;

        if (Utils.$('rangeSpeechRate')) Utils.$('rangeSpeechRate').value = AppState.speechRate;
        if (Utils.$('rateLabel')) Utils.$('rateLabel').textContent = AppState.speechRate.toFixed(2) + 'x';
        if (Utils.$('chkVoice')) Utils.$('chkVoice').checked = AppState.partnerVoiceEnabled;
        if (Utils.$('chkAutoAdvance')) Utils.$('chkAutoAdvance').checked = AppState.autoAdvanceEnabled;
        if (Utils.$('chkWakeLock')) Utils.$('chkWakeLock').checked = AppState.wakeLockEnabled;
        if (Utils.$('selectMode')) Utils.$('selectMode').value = AppState.rehearsalMode;
        if (Utils.$('selectTempo')) Utils.$('selectTempo').value = AppState.rehearsalTempo;
        if (Utils.$('selectStudyMethod')) Utils.$('selectStudyMethod').value = AppState.studyMethod;
        if (Utils.$('chkHideRubrics')) Utils.$('chkHideRubrics').checked = AppState.hideRubrics;
        if (Utils.$('chkStartHidden')) Utils.$('chkStartHidden').checked = AppState.alwaysStartHidden;

        const savedActor = settings.selectedActor;
        AppState.selectedActor = (savedActor && AppState.characters.includes(savedActor))
          ? savedActor
          : (AppState.characters[0] || '');

        AppState.activeBeats = DramaBeats.generateBeats(AppState.speeches, scriptText);
        AppState.selectedBeat = 'all';
        UIController.populateBeatSelector();

        AppState.masteryLevels = StorageManager.loadProgress(AppState.selectedActor, AppState.speeches.length);

        AudioEngine.loadVoices(() => {
          UIController.populateVoiceSelectors();
        });

        const range = AppState.getActiveBeatRange();
        AppState.currentIndex = range.start;
        this.goToSpeech(AppState.currentIndex, false);
        UIController.renderLobby();
        UIController.showScreen('lobby');
      },

      enterStage(mode) {
        if (mode) {
          AppState.rehearsalMode = mode;
          StorageManager.saveSettings(AppState);
          if (Utils.$('selectMode')) Utils.$('selectMode').value = mode;
        }
        UIController.showScreen('stage');
        if (AppState.rehearsalMode === 'fraquezas') {
          this.goToSpeech(AppState.pickNextWeakness(), true);
        } else if (AppState.rehearsalMode === 'minhas' || AppState.rehearsalMode === 'pingpong' || AppState.rehearsalMode === 'ponto') {
          const myIndices = AppState.getMySpeechIndices();
          if (!myIndices.includes(AppState.currentIndex)) {
            this.goToSpeech(myIndices[0] !== undefined ? myIndices[0] : 0, true);
          } else {
            this.goToSpeech(AppState.currentIndex, true);
          }
        } else {
          this.goToSpeech(AppState.currentIndex, true);
        }
      },

      returnToLobby() {
        AudioEngine.stopAllAudio();
        if (AppState.pingPongInterval) {
          clearInterval(AppState.pingPongInterval);
          AppState.pingPongInterval = null;
        }
        AppState.isRetryState = false;
        AppState.isSceneFinished = false;
        UIController.showScreen('lobby');
      },

      goToSpeech(index, triggerAudio = true) {
        AudioEngine.stopAllAudio();
        if (AppState.pingPongInterval) {
          clearInterval(AppState.pingPongInterval);
          AppState.pingPongInterval = null;
        }
        if (AudioEngine.isRecordingNow) {
          AudioEngine.stopCastRecording();
        }
        const range = AppState.getActiveBeatRange();
        AppState.currentIndex = Math.max(range.start, Math.min(range.end, index));
        AppState.isRevealed = false;
        AppState.hintsUsedThisLine = 0;
        AppState.isRetryState = false;
        AppState.isSceneFinished = false;
        AppState.quizStep = 0;
        AppState.quizTargets = [];
        AppState.typingCompleted = false;

        UIController.renderView();

        if (!triggerAudio || AppState.currentIndex >= AppState.speeches.length) return;

        const currentSpeech = AppState.speeches[AppState.currentIndex];
        const isPartner = currentSpeech.who !== AppState.selectedActor;

        if (AppState.rehearsalMode === 'pingpong') {
          this.startPingPongFlow();
          return;
        }

        if (AppState.rehearsalMode === 'ponto') {
          this.startPontoFlow();
          return;
        }

        if (isPartner && AppState.partnerVoiceEnabled) {
          const actorIdx = AppState.characters.indexOf(currentSpeech.who);
          AudioEngine.playSpeechAudio(
            AppState.currentIndex,
            currentSpeech,
            currentSpeech.who,
            actorIdx,
            AppState.speechRate,
            AppState.rehearsalTempo,
            {
              onStatus: msg => UIController.showStatus(msg),
              onEnd: () => {
                if (AppState.autoAdvanceEnabled && currentSpeech.who !== AppState.selectedActor) {
                  UIController.showStatus('Avançando para sua vez...');
                  AudioEngine.autoAdvanceTimer = setTimeout(() => {
                    UIController.showStatus('');
                    this.advanceNext();
                  }, 600);
                }
              }
            }
          );
        }
      },

      advanceNext() {
        AppState.stepRetryQueue();
        const range = AppState.getActiveBeatRange();
        if (AppState.rehearsalMode === 'fraquezas') {
          this.goToSpeech(AppState.pickNextWeakness());
        } else if (AppState.rehearsalMode === 'minhas' || AppState.rehearsalMode === 'pingpong' || AppState.rehearsalMode === 'ponto') {
          const myIndices = AppState.getMySpeechIndices();
          const next = myIndices.find(i => i > AppState.currentIndex);
          if (next !== undefined) {
            this.goToSpeech(next);
          } else {
            UIController.renderSceneFinished();
          }
        } else {
          if (AppState.currentIndex < range.end) {
            this.goToSpeech(AppState.currentIndex + 1);
          } else {
            UIController.renderSceneFinished();
          }
        }
      },

      advancePrev() {
        const range = AppState.getActiveBeatRange();
        if (AppState.rehearsalMode === 'minhas' || AppState.rehearsalMode === 'pingpong' || AppState.rehearsalMode === 'ponto') {
          const myIndices = AppState.getMySpeechIndices();
          const prev = [...myIndices].reverse().find(i => i < AppState.currentIndex);
          if (prev !== undefined) this.goToSpeech(prev);
        } else {
          if (AppState.currentIndex > range.start) this.goToSpeech(AppState.currentIndex - 1);
        }
      },

      startPingPongFlow() {
        const currentActiveIndex = AppState.currentIndex;
        const prevIdx = currentActiveIndex - 1;
        const prevSpeech = AppState.speeches[prevIdx];
        AppState.pingPongCountdown = 4;

        if (prevSpeech && prevSpeech.who !== AppState.selectedActor && AppState.partnerVoiceEnabled) {
          const actorIdx = AppState.characters.indexOf(prevSpeech.who);
          AudioEngine.playSpeechAudio(
            prevIdx,
            prevSpeech,
            prevSpeech.who,
            actorIdx,
            AppState.speechRate,
            AppState.rehearsalTempo,
            {
              onStatus: msg => UIController.showStatus(msg),
              onEnd: () => {
                if (AppState.rehearsalMode === 'pingpong' && AppState.currentIndex === currentActiveIndex) {
                  this.runPingPongTimer();
                }
              }
            }
          );
        } else {
          this.runPingPongTimer();
        }
      },

      runPingPongTimer() {
        AppState.pingPongCountdown = 4;
        UIController.renderView();
        if (AppState.pingPongInterval) clearInterval(AppState.pingPongInterval);
        AppState.pingPongInterval = setInterval(() => {
          AppState.pingPongCountdown--;
          const box = Utils.$('pingPongCountdownNum');
          if (box) box.textContent = AppState.pingPongCountdown;
          if (AppState.pingPongCountdown <= 0) {
            clearInterval(AppState.pingPongInterval);
            AppState.pingPongInterval = null;
            AppState.isRevealed = true;
            Utils.triggerHaptic('tap');
            UIController.renderView();
          }
        }, 1000);
      },

      startPontoFlow() {
        if (AppState.pontoPaused) return;
        const currentActiveIndex = AppState.currentIndex;
        const currentSpeech = AppState.speeches[currentActiveIndex];
        if (!currentSpeech) return;

        const prevIdx = currentActiveIndex - 1;
        const prevSpeech = AppState.speeches[prevIdx];
        const wordCount = currentSpeech.spokenText.split(/\s+/).length;
        const pauseDuration = Math.max(2500, wordCount * 380 + 1000);

        UIController.showStatus('🎧 Modo Ponto: Ouvindo a deixa...');
        const runMyTurn = () => {
          if (AppState.pontoPaused || AppState.rehearsalMode !== 'ponto' || AppState.currentIndex !== currentActiveIndex) return;
          UIController.showStatus('🎙️ Sua vez de falar em voz alta...');
          AudioEngine.autoAdvanceTimer = setTimeout(() => {
            if (AppState.pontoPaused || AppState.rehearsalMode !== 'ponto' || AppState.currentIndex !== currentActiveIndex) return;
            UIController.showStatus('👂 Ponto no ouvido: conferindo fala...');
            const actorIdx = AppState.characters.indexOf(currentSpeech.who);
            AudioEngine.playSpeechAudio(
              currentActiveIndex,
              currentSpeech,
              currentSpeech.who,
              actorIdx,
              AppState.speechRate,
              AppState.rehearsalTempo,
              {
                onStatus: msg => UIController.showStatus(msg),
                onEnd: () => {
                  if (AppState.pontoPaused || AppState.rehearsalMode !== 'ponto' || AppState.currentIndex !== currentActiveIndex) return;
                  UIController.showStatus('Avançando...');
                  AudioEngine.autoAdvanceTimer = setTimeout(() => {
                    if (AppState.pontoPaused || AppState.rehearsalMode !== 'ponto' || AppState.currentIndex !== currentActiveIndex) return;
                    this.advanceNext();
                  }, 1200);
                }
              }
            );
          }, pauseDuration);
        };

        if (prevSpeech && prevSpeech.who !== AppState.selectedActor && AppState.partnerVoiceEnabled) {
          const actorIdx = AppState.characters.indexOf(prevSpeech.who);
          AudioEngine.playSpeechAudio(
            prevIdx,
            prevSpeech,
            prevSpeech.who,
            actorIdx,
            AppState.speechRate,
            AppState.rehearsalTempo,
            {
              onStatus: msg => UIController.showStatus(msg),
              onEnd: runMyTurn
            }
          );
        } else {
          runMyTurn();
        }
      },

      handleActionClick(id) {
        Utils.triggerHaptic('tap');
        const currentSpeech = AppState.speeches[AppState.currentIndex];

        if (id === 'btnEditIntent' || id === 'intentBarCurrent') {
          const isDefault = ScriptParser.isDefaultPlay(AppState.activeScriptText);
          const cur = StorageManager.getSpeechIntent(AppState.currentIndex, isDefault);
          const promptMsg = `Defina a Ação Dramática / Intenção desta fala (${currentSpeech ? currentSpeech.who : ''}):\nEx: "Tripudiar sobre a fraqueza do pai", "Desarmar a culpa"\n(Digite "padrao" para restaurar a sugestão original):`;
          const val = prompt(promptMsg, cur);
          if (val !== null) {
            StorageManager.setSpeechIntent(AppState.currentIndex, val.trim());
            UIController.renderView();
          }
        } else if (id === 'btnSpeakPartner' || id === 'btnAudioMy') {
          if (currentSpeech) {
            const actorIdx = AppState.characters.indexOf(currentSpeech.who);
            AudioEngine.playSpeechAudio(
              AppState.currentIndex,
              currentSpeech,
              currentSpeech.who,
              actorIdx,
              AppState.speechRate,
              AppState.rehearsalTempo,
              { onStatus: msg => UIController.showStatus(msg) }
            );
          }
        } else if (id === 'btnSpeakCue') {
          if (AppState.currentIndex > 0) {
            const prevSpeech = AppState.speeches[AppState.currentIndex - 1];
            if (prevSpeech) {
              const actorIdx = AppState.characters.indexOf(prevSpeech.who);
              AudioEngine.playSpeechAudio(
                AppState.currentIndex - 1,
                prevSpeech,
                prevSpeech.who,
                actorIdx,
                AppState.speechRate,
                AppState.rehearsalTempo,
                { onStatus: msg => UIController.showStatus(msg) }
              );
            }
          }
        } else if (id === 'btnRecordPartner') {
          AudioEngine.startCastRecording(AppState.currentIndex, {
            onStarted: () => UIController.renderView(),
            onTick: s => {
              const recCounter = Utils.$('recSeconds');
              if (recCounter) recCounter.textContent = `${s}s`;
            },
            onSaved: () => {
              UIController.showStatus('Gravação salva com sucesso!');
              UIController.renderView();
            }
          });
        } else if (id === 'btnRecordCue') {
          if (AppState.currentIndex > 0) {
            AudioEngine.startCastRecording(AppState.currentIndex - 1, {
              onStarted: () => UIController.renderView(),
              onTick: s => {
                const recCounter = Utils.$('recSeconds');
                if (recCounter) recCounter.textContent = `${s}s`;
              },
              onSaved: () => {
                UIController.showStatus('Gravação do colega salva com sucesso!');
                UIController.renderView();
              }
            });
          }
        } else if (id === 'btnRecordMy') {
          AudioEngine.startCastRecording(AppState.currentIndex, {
            onStarted: () => UIController.renderView(),
            onTick: s => {
              const recCounter = Utils.$('recSeconds');
              if (recCounter) recCounter.textContent = `${s}s`;
            },
            onSaved: () => {
              UIController.showStatus('Sua gravação foi salva com sucesso!');
              UIController.renderView();
            }
          });
        } else if (id === 'btnPingPongDone') {
          if (AppState.pingPongInterval) clearInterval(AppState.pingPongInterval);
          AppState.pingPongInterval = null;
          AppState.isRevealed = true;
          UIController.renderView();
        } else if (id === 'btnTogglePonto') {
          AppState.pontoPaused = !AppState.pontoPaused;
          if (AppState.pontoPaused) {
            AudioEngine.stopAllAudio();
            UIController.showStatus('⏸️ Modo Ponto pausado.');
          } else {
            UIController.showStatus('▶️ Retomando Modo Ponto...');
            this.startPontoFlow();
          }
          UIController.renderView();
        } else if (id === 'btnStopRecord') {
          AudioEngine.stopCastRecording();
        } else if (id === 'btnDeleteCastAudio') {
          if (confirm('Excluir o áudio gravado desta fala?')) {
            StorageManager.deleteCastAudio(AppState.currentIndex).then(() => UIController.renderView());
          }
        } else if (id === 'btnContinuePartner') {
          this.advanceNext();
        } else if (id === 'btnNextQuiz' || id === 'btnNextTyping') {
          Utils.triggerHaptic('success');
          const cur = AppState.masteryLevels[AppState.currentIndex] || 0;
          AppState.masteryLevels[AppState.currentIndex] = Math.min(4, cur + 1);
          StorageManager.saveProgress(AppState.selectedActor, AppState.masteryLevels);
          this.advanceNext();
        } else if (id === 'btnRevealSpeech') {
          AppState.isRevealed = true;
          UIController.renderView();
        } else if (id === 'btnHideWords') {
          AppState.masteryLevels[AppState.currentIndex] = 1;
          StorageManager.saveProgress(AppState.selectedActor, AppState.masteryLevels);
          AppState.isRevealed = false;
          AppState.hintsUsedThisLine = 0;
          UIController.renderView();
        } else if (id === 'btnHint') {
          if (AppState.studyMethod === 'quiz') {
            AppState.quizStep = (AppState.quizStep || 0) + 1;
            if (AppState.quizStep >= (AppState.quizTargets?.length || 0)) {
              AppState.isRevealed = true;
            }
          } else if (AppState.studyMethod === 'typing') {
            const inputs = document.querySelectorAll('.cloze-input:not(:disabled)');
            if (inputs.length > 0) {
              const activeInput = inputs[0];
              activeInput.value = activeInput.dataset.word;
              activeInput.classList.add('correct');
              activeInput.disabled = true;
              if (inputs.length === 1) {
                AppState.typingCompleted = true;
                AppState.isRevealed = true;
              } else {
                inputs[1].focus();
              }
            }
          } else {
            AppState.hintsUsedThisLine++;
          }
          UIController.renderView();
        } else if (id === 'btnCheck') {
          AppState.isRevealed = true;
          UIController.renderView();
        } else if (id === 'btnCorrect') {
          Utils.triggerHaptic('success');
          const cur = AppState.masteryLevels[AppState.currentIndex] || 0;
          AppState.masteryLevels[AppState.currentIndex] = Math.min(4, cur + 1);
          StorageManager.saveProgress(AppState.selectedActor, AppState.masteryLevels);
          AppState.isRetryState = false;
          this.advanceNext();
        } else if (id === 'btnWrong') {
          Utils.triggerHaptic('error');
          const cur = AppState.masteryLevels[AppState.currentIndex] || 0;
          AppState.masteryLevels[AppState.currentIndex] = Math.max(0, cur - 1);
          StorageManager.saveProgress(AppState.selectedActor, AppState.masteryLevels);
          AppState.scheduleRetry(AppState.currentIndex, 2);
          AppState.isRetryState = true;
          UIController.renderView();
        } else if (id === 'btnRetry') {
          AppState.isRetryState = false;
          AppState.isRevealed = false;
          AppState.hintsUsedThisLine = 0;
          if ((AppState.masteryLevels[AppState.currentIndex] || 0) === 0) {
            AppState.masteryLevels[AppState.currentIndex] = 1;
            StorageManager.saveProgress(AppState.selectedActor, AppState.masteryLevels);
          }
          UIController.renderView();
        } else if (id === 'btnNextAfterWrong') {
          AppState.isRetryState = false;
          AppState.scheduleRetry(AppState.currentIndex, 2);
          this.advanceNext();
        } else if (id === 'btnPrev') {
          this.advancePrev();
        } else if (id === 'btnNext') {
          this.advanceNext();
        } else if (id === 'btnEnterStage') {
          this.enterStage();
        } else if (id === 'btnBackToLobby' || id === 'btnReturnLobbyFinished') {
          this.returnToLobby();
        } else if (id === 'btnRestartScene') {
          AppState.isSceneFinished = false;
          const range = AppState.getActiveBeatRange();
          if (AppState.rehearsalMode === 'minhas' || AppState.rehearsalMode === 'pingpong' || AppState.rehearsalMode === 'ponto') {
            const myIndices = AppState.getMySpeechIndices();
            this.goToSpeech(myIndices[0] !== undefined ? myIndices[0] : range.start);
          } else {
            this.goToSpeech(range.start);
          }
        } else if (id === 'btnReviewWeak') {
          AppState.isSceneFinished = false;
          AppState.rehearsalMode = 'fraquezas';
          this.goToSpeech(AppState.pickNextWeakness());
        } else if (id === 'btnOpenFullScriptLobby' || id === 'btnReadScriptBanner' || id === 'btnOpenFullScriptSettings') {
          UIController.renderFullScriptModal();
          if (Utils.$('modalFullScript')) Utils.$('modalFullScript').hidden = false;
        } else if (id === 'btnCloseFullScript') {
          if (Utils.$('modalFullScript')) Utils.$('modalFullScript').hidden = true;
        } else if (id === 'btnStartFromScript') {
          if (Utils.$('modalFullScript')) Utils.$('modalFullScript').hidden = true;
          this.enterStage();
        } else if (id === 'btnOpenIndex' || id === 'btnOpenIndexLobby' || id === 'btnStageIndex' || id === 'btnNavIndex') {
          UIController.renderIndexModal();
          if (Utils.$('modalIndex')) Utils.$('modalIndex').hidden = false;
        } else if (id === 'btnCloseIndex') {
          if (Utils.$('modalIndex')) Utils.$('modalIndex').hidden = true;
        } else if (id === 'btnOpenSettings' || id === 'btnOpenSettingsLobby' || id === 'btnOpenSettingsStage') {
          UIController.populateVoiceSelectors();
          if (Utils.$('modalSettings')) Utils.$('modalSettings').hidden = false;
        } else if (id === 'btnCloseSettings') {
          if (Utils.$('modalSettings')) Utils.$('modalSettings').hidden = true;
        }
      },

      async exportFullBackup() {
        try {
          UIController.showStatus('Gerando arquivo de backup...');
          const data = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            localStorage: {},
            recordings: []
          };

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
              key &&
              !key.toLowerCase().includes('key') &&
              !key.toLowerCase().includes('token') &&
              !key.toLowerCase().includes('secret') &&
              (key.startsWith('memorizador_') || key.startsWith('intent_') || key.startsWith('voice_actor_') || key.startsWith('inv-'))
            ) {
              data.localStorage[key] = localStorage.getItem(key);
            }
          }

          const storeName = StorageManager.STORE_NAME || 'recordings';
          const db = await StorageManager.getIndexedDB();
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);

          const getAllAudios = () => new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          const records = await getAllAudios();
          const seenAudioKeys = new Set();
          for (const item of records) {
            const audioData = item && (item.blob || item.audioBlob);
            if (audioData && item.id !== undefined) {
              const stringId = String(item.id);
              // Evitar exportar duplicatas numéricas legadas se temos chaves estruturadas
              if (seenAudioKeys.has(stringId)) continue;
              seenAudioKeys.add(stringId);
              const b64 = await Utils.blobToBase64(audioData);
              data.recordings.push({
                id: item.id,
                speechIdx: item.speechIdx,
                playId: item.playId || 'default',
                base64: b64
              });
            }
          }

          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ensaio_backup_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          UIController.showStatus('Backup baixado com sucesso!');
        } catch (err) {
          console.error(err);
          alert('Erro ao exportar backup: ' + err.message);
        }
      },

      async importFullBackup(file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);

          if (data.localStorage && typeof data.localStorage === 'object') {
            const allowedPrefixes = ['memorizador_', 'intent_', 'voice_actor_', 'inv-'];
            Object.keys(data.localStorage).forEach(k => {
              if (
                allowedPrefixes.some(p => k.startsWith(p)) &&
                !k.toLowerCase().includes('key') &&
                !k.toLowerCase().includes('token') &&
                !k.toLowerCase().includes('secret')
              ) {
                localStorage.setItem(k, data.localStorage[k]);
              }
            });
          }

          if (data.recordings && Array.isArray(data.recordings)) {
            const storeName = StorageManager.STORE_NAME || 'recordings';
            const db = await StorageManager.getIndexedDB();
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);

            for (const item of data.recordings) {
              if (item.base64 && item.id !== undefined) {
                const blob = Utils.base64ToBlob(item.base64);
                let speechIdx = item.speechIdx;
                let playId = item.playId || 'default';
                if (speechIdx === undefined) {
                  const parts = String(item.id).split('_');
                  speechIdx = parseInt(parts[parts.length - 1], 10);
                }
                store.put({ id: item.id, speechIdx, playId, blob, audioBlob: blob, timestamp: Date.now() });
              }
            }
          }

          alert('Backup restaurado com sucesso! O aplicativo será recarregado.');
          if (typeof window !== 'undefined' && window.location && window.location.reload) window.location.reload();
        } catch (err) {
          console.error(err);
          alert('Erro ao restaurar backup: ' + err.message);
        }
      },

      bindEvents() {
        document.addEventListener('click', (e) => {
          const actorBtn = e.target.closest('.char-tab');
          if (actorBtn) {
            const actor = actorBtn.dataset.actor;
            if (actor && actor !== AppState.selectedActor) {
              AppState.selectedActor = actor;
              StorageManager.saveSettings(AppState);
              AppState.masteryLevels = StorageManager.loadProgress(actor, AppState.speeches.length);
              const myIndices = AppState.getMySpeechIndices();
              this.goToSpeech(myIndices[0] !== undefined ? myIndices[0] : 0, false);
              UIController.renderLobby();
            }
            return;
          }

          const modeCard = e.target.closest('.mode-card');
          if (modeCard) {
            const mode = modeCard.dataset.mode;
            if (mode) {
              this.enterStage(mode);
            }
            return;
          }

          const indexItem = e.target.closest('[data-idx]');
          if (indexItem) {
            const idx = parseInt(indexItem.dataset.idx, 10);
            if (!isNaN(idx)) {
              if (Utils.$('modalIndex')) Utils.$('modalIndex').hidden = true;
              if (AppState.currentScreen === 'lobby') {
                this.enterStage();
              }
              this.goToSpeech(idx);
            }
            return;
          }

          const intentBarEl = e.target.closest('#btnEditIntent, .intent-bar');
          if (intentBarEl) {
            this.handleActionClick('btnEditIntent');
            return;
          }

          const bannerScriptEl = e.target.closest('#bannerReadFullScript');
          if (bannerScriptEl) {
            this.handleActionClick('btnReadScriptBanner');
            return;
          }

          const actionBtn = e.target.closest('button[id]');
          if (actionBtn) {
            this.handleActionClick(actionBtn.id);
            return;
          }
        });

        if (Utils.$('selectBeat')) {
          Utils.$('selectBeat').onchange = (e) => {
            AppState.selectedBeat = e.target.value;
            const range = AppState.getActiveBeatRange();
            if (AppState.rehearsalMode === 'minhas' || AppState.rehearsalMode === 'pingpong' || AppState.rehearsalMode === 'ponto') {
              const myIndices = AppState.getMySpeechIndices();
              this.goToSpeech(myIndices[0] !== undefined ? myIndices[0] : range.start, false);
            } else {
              this.goToSpeech(range.start, false);
            }
            UIController.renderLobby();
          };
        }

        document.querySelectorAll('.filter-tab').forEach(btn => {
          btn.onclick = () => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentFilter = btn.dataset.filter || 'all';
            UIController.renderIndexModal();
          };
        });

        ['modalIndex', 'modalSettings', 'modalFullScript'].forEach(modalId => {
          const modalEl = Utils.$(modalId);
          if (modalEl) {
            modalEl.onclick = (e) => {
              if (e.target === modalEl || (e.target.classList && e.target.classList.contains('modal-drag-bar'))) {
                modalEl.hidden = true;
              }
            };
          }
        });

        if (Utils.$('selectBeatFullScript')) {
          Utils.$('selectBeatFullScript').onchange = (e) => {
            UIController.renderFullScriptModal(e.target.value, Utils.$('inputSearchScript')?.value);
          };
        }

        if (Utils.$('inputSearchScript')) {
          Utils.$('inputSearchScript').oninput = (e) => {
            UIController.renderFullScriptModal(Utils.$('selectBeatFullScript')?.value, e.target.value);
          };
        }

        // Seletor de método de memorização no Camarim
        const studyCards = Utils.$('studyMethodsGrid')?.querySelectorAll('.study-method-card');
        studyCards?.forEach(card => {
          card.onclick = () => {
            AppState.studyMethod = card.dataset.method;
            StorageManager.saveSettings(AppState);
            if (Utils.$('selectStudyMethod')) Utils.$('selectStudyMethod').value = AppState.studyMethod;
            UIController.renderLobby();
          };
        });

        if (Utils.$('selectStudyMethod')) {
          Utils.$('selectStudyMethod').value = AppState.studyMethod;
          Utils.$('selectStudyMethod').onchange = (e) => {
            AppState.studyMethod = e.target.value;
            StorageManager.saveSettings(AppState);
            UIController.renderLobby();
          };
        }

        if (Utils.$('chkStartHidden')) {
          Utils.$('chkStartHidden').checked = AppState.alwaysStartHidden;
          Utils.$('chkStartHidden').onchange = (e) => {
            AppState.alwaysStartHidden = e.target.checked;
            StorageManager.saveSettings(AppState);
            UIController.renderView();
          };
        }

        if (Utils.$('chkHideRubrics')) {
          Utils.$('chkHideRubrics').checked = AppState.hideRubrics;
          Utils.$('chkHideRubrics').onchange = (e) => {
            AppState.hideRubrics = e.target.checked;
            StorageManager.saveSettings(AppState);
            UIController.renderView();
          };
        }

        if (Utils.$('rangeSpeechRate')) {
          Utils.$('rangeSpeechRate').oninput = (e) => {
            AppState.speechRate = parseFloat(e.target.value);
            if (Utils.$('rateLabel')) Utils.$('rateLabel').textContent = AppState.speechRate.toFixed(2) + 'x';
            StorageManager.saveSettings(AppState);
          };
        }

        if (Utils.$('chkVoice')) {
          Utils.$('chkVoice').onchange = (e) => {
            AppState.partnerVoiceEnabled = e.target.checked;
            StorageManager.saveSettings(AppState);
          };
        }

        if (Utils.$('chkAutoAdvance')) {
          Utils.$('chkAutoAdvance').onchange = (e) => {
            AppState.autoAdvanceEnabled = e.target.checked;
            StorageManager.saveSettings(AppState);
          };
        }

        if (Utils.$('chkWakeLock')) {
          Utils.$('chkWakeLock').onchange = (e) => {
            AppState.wakeLockEnabled = e.target.checked;
            StorageManager.saveSettings(AppState);
            this.updateWakeLock();
          };
        }

        if (Utils.$('selectMode')) {
          Utils.$('selectMode').onchange = (e) => {
            AppState.rehearsalMode = e.target.value;
            StorageManager.saveSettings(AppState);
            AudioEngine.stopAllAudio();
            if (AppState.pingPongInterval) {
              clearInterval(AppState.pingPongInterval);
              AppState.pingPongInterval = null;
            }
            if (AppState.rehearsalMode === 'fraquezas') {
              this.goToSpeech(AppState.pickNextWeakness());
            } else if (AppState.rehearsalMode === 'minhas' || AppState.rehearsalMode === 'pingpong' || AppState.rehearsalMode === 'ponto') {
              const myIndices = AppState.getMySpeechIndices();
              if (!myIndices.includes(AppState.currentIndex)) {
                this.goToSpeech(myIndices[0] !== undefined ? myIndices[0] : 0);
              } else {
                this.goToSpeech(AppState.currentIndex);
              }
            } else {
              UIController.renderView();
            }
          };
        }

        if (Utils.$('selectTempo')) {
          Utils.$('selectTempo').onchange = (e) => {
            AppState.rehearsalTempo = e.target.value;
            StorageManager.saveSettings(AppState);
          };
        }

        if (Utils.$('btnClearAllRecordings')) {
          Utils.$('btnClearAllRecordings').onclick = () => {
            if (confirm('Tem certeza que deseja apagar todos os áudios reais gravados?')) {
              StorageManager.clearAllCastAudios().then(() => {
                alert('Gravações removidas.');
                UIController.renderView();
              });
            }
          };
        }

        if (Utils.$('btnExportBackup')) {
          Utils.$('btnExportBackup').onclick = () => this.exportFullBackup();
        }

        if (Utils.$('fileImportBackup')) {
          Utils.$('fileImportBackup').onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
              if (confirm('A restauração substituirá todas as gravações locais e progresso. Continuar?')) {
                this.importFullBackup(file);
              }
            }
          };
        }

        if (Utils.$('btnResetProgress')) {
          Utils.$('btnResetProgress').onclick = () => {
            if (confirm(`Zerar todo o histórico de memorização para ${AppState.selectedActor}?`)) {
              AppState.masteryLevels = new Array(AppState.speeches.length).fill(0);
              StorageManager.saveProgress(AppState.selectedActor, AppState.masteryLevels);
              UIController.renderView();
              UIController.renderLobby();
              alert('Progresso zerado.');
            }
          };
        }

        if (Utils.$('btnSaveScript')) {
          Utils.$('btnSaveScript').onclick = () => {
            const txt = Utils.$('scriptEditor').value.trim();
            if (!txt) return;
            localStorage.setItem('memorizador_custom_script', txt);
            if (Utils.$('modalSettings')) Utils.$('modalSettings').hidden = true;
            this.loadActiveScript();
          };
        }

        if (Utils.$('btnRestoreOriginal')) {
          Utils.$('btnRestoreOriginal').onclick = () => {
            if (confirm('Restaurar o texto original de "Os Inventariantes"?')) {
              localStorage.removeItem('memorizador_custom_script');
              if (Utils.$('modalSettings')) Utils.$('modalSettings').hidden = true;
              this.loadActiveScript();
            }
          };
        }
      },

      bindKeyboard() {
        document.addEventListener('keydown', (e) => {
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

          const isModalOpen = !Utils.$('modalIndex')?.hidden || !Utils.$('modalSettings')?.hidden || !Utils.$('modalFullScript')?.hidden;
          if (e.key === 'Escape') {
            if (Utils.$('modalIndex') && !Utils.$('modalIndex').hidden) Utils.$('modalIndex').hidden = true;
            if (Utils.$('modalSettings') && !Utils.$('modalSettings').hidden) Utils.$('modalSettings').hidden = true;
            if (Utils.$('modalFullScript') && !Utils.$('modalFullScript').hidden) Utils.$('modalFullScript').hidden = true;
            if (!isModalOpen && AppState.currentScreen === 'stage') {
              this.returnToLobby();
            }
            return;
          }

          if (isModalOpen) return;

          if (AppState.currentScreen === 'lobby') {
            if (e.key === 'Enter') {
              e.preventDefault();
              this.enterStage();
            }
            return;
          }

          const currentSpeech = AppState.speeches[AppState.currentIndex];
          const isMyTurn = currentSpeech && currentSpeech.who === AppState.selectedActor;
          const level = AppState.masteryLevels[AppState.currentIndex] || 0;

          if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.advanceNext();
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.advancePrev();
          } else if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            if (AppState.studyMethod === 'quiz' && AppState.quizStep >= (AppState.quizTargets?.length || 1)) this.handleActionClick('btnNextQuiz');
            else if (AppState.studyMethod === 'typing' && AppState.typingCompleted) this.handleActionClick('btnNextTyping');
            else if (AppState.isRetryState) this.handleActionClick('btnRetry');
            else if (!isMyTurn) this.advanceNext();
            else if (level === 0 && !AppState.alwaysStartHidden) this.handleActionClick('btnHideWords');
            else if (!AppState.isRevealed) this.handleActionClick('btnCheck');
            else this.handleActionClick('btnCorrect');
          } else if (e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            if (isMyTurn && !AppState.isRevealed) this.handleActionClick('btnHint');
          } else if (e.key === '1') {
            e.preventDefault();
            if (AppState.isRetryState) this.handleActionClick('btnRetry');
            else if (isMyTurn && AppState.isRevealed) this.handleActionClick('btnWrong');
          } else if (e.key === '2') {
            e.preventDefault();
            if (AppState.isRetryState) this.handleActionClick('btnNextAfterWrong');
            else if (isMyTurn && AppState.isRevealed) this.handleActionClick('btnCorrect');
          } else if (e.key === 'r' || e.key === 'R' || e.key === 'o' || e.key === 'O') {
            e.preventDefault();
            if (currentSpeech) {
              const actorIdx = AppState.characters.indexOf(currentSpeech.who);
              AudioEngine.playSpeechAudio(
                AppState.currentIndex,
                currentSpeech,
                currentSpeech.who,
                actorIdx,
                AppState.speechRate,
                AppState.rehearsalTempo,
                { onStatus: msg => UIController.showStatus(msg) }
              );
            }
          }
        });
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      AudioEngine.loadVoices();
      const updateVoices = () => {
        AudioEngine.loadVoices(() => UIController.populateVoiceSelectors());
      };
      try {
        window.speechSynthesis.onvoiceschanged = updateVoices;
        window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
      } catch (e) {}
    }

AppController.init();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppController };
}
