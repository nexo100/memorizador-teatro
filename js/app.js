// 8. CONTROLADOR PRINCIPAL DO APLICATIVO (AppController)
    const AppController = {
      init() {
        this.setupPWA();
        this.setupWakeLock();
        this.setupTheme();
        this.bindEvents();
        this.bindKeyboard();
        this.loadActiveScript();
      },

      setupTheme() {
        let saved = null;
        try {
          if (typeof localStorage !== 'undefined') {
            saved = localStorage.getItem('stagepro_theme');
          }
        } catch (e) {}

        const prefersLight = typeof window !== 'undefined' && window.matchMedia && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
        const isLight = saved ? saved === 'light' : !!prefersLight;
        this.applyTheme(isLight ? 'light' : 'dark', false);
      },

      applyTheme(theme, save = true) {
        const isLight = theme === 'light';
        const docEl = (typeof document !== 'undefined' && document.documentElement) ? document.documentElement : null;
        if (docEl && docEl.setAttribute) {
          if (isLight) {
            docEl.setAttribute('data-theme', 'light');
          } else {
            docEl.removeAttribute('data-theme');
          }
        }

        const chk = Utils.$('chkDarkTheme');
        if (chk) chk.checked = !isLight;

        const iconContainer = Utils.$('themeHeaderIcon');
        if (iconContainer && typeof Icons !== 'undefined') {
          iconContainer.innerHTML = isLight
            ? Icons.get('moon', { size: 15 })
            : Icons.get('sun', { size: 15 });
        }

        if (typeof document !== 'undefined' && document.querySelector) {
          const metaTheme = document.querySelector('meta[name="theme-color"]');
          if (metaTheme && metaTheme.setAttribute) {
            metaTheme.setAttribute('content', isLight ? '#f8fafc' : '#0a0c10');
          }
        }

        if (save) {
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('stagepro_theme', isLight ? 'light' : 'dark');
            }
          } catch (e) {}
        }
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
        document.title = 'Ensaio Teatral · ' + playTitle;
        const ptEl = Utils.$('playTitle');
        if (ptEl) ptEl.textContent = playTitle;
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
        AppState.hasSavedActor = !!(savedActor && AppState.characters.includes(savedActor));
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
        const hasActor = AppState.hasSavedActor || (typeof localStorage !== 'undefined' && !!localStorage.getItem('memorizador_actor'));
        if (!hasActor && !mode) {
          UIController.openModal('sheetActor');
          UIController.showStatus('Escolha seu personagem antes de entrar no palco!');
          return;
        }
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

        UIController.showStatus('Modo Ponto: Ouvindo a deixa...');
        const runMyTurn = () => {
          if (AppState.pontoPaused || AppState.rehearsalMode !== 'ponto' || AppState.currentIndex !== currentActiveIndex) return;
          UIController.showStatus('Sua vez de falar em voz alta...');
          AudioEngine.autoAdvanceTimer = setTimeout(() => {
            if (AppState.pontoPaused || AppState.rehearsalMode !== 'ponto' || AppState.currentIndex !== currentActiveIndex) return;
            UIController.showStatus('Ponto no ouvido: conferindo fala...');
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
            UIController.showStatus('Modo Ponto pausado.');
          } else {
            UIController.showStatus('Retomando Modo Ponto...');
            this.startPontoFlow();
          }
          UIController.renderView();
        } else if (id === 'btnToggleTheme') {
          const docEl = (typeof document !== 'undefined' && document.documentElement) ? document.documentElement : null;
          const isLight = docEl && docEl.getAttribute && docEl.getAttribute('data-theme') === 'light';
          this.applyTheme(isLight ? 'dark' : 'light', true);
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
        } else if (id === 'btnOpenFullScriptLobby' || id === 'btnReadScriptBanner' || id === 'btnOpenFullScriptSettings' || id === 'tabBtnScript') {
          UIController.closeModal('modalCaderno');
          UIController.renderFullScriptModal();
          UIController.openModal('modalFullScript');
          UIController.updateTabBarActive('script');
        } else if (id === 'btnCloseFullScript') {
          UIController.closeModal('modalFullScript');
          UIController.updateTabBarActive('camarim');
        } else if (id === 'btnStartFromScript') {
          UIController.closeModal('modalFullScript');
          this.enterStage();
        } else if (id === 'btnOpenIndex' || id === 'btnOpenIndexLobby' || id === 'btnStageIndex' || id === 'btnNavIndex' || id === 'tabBtnProgress') {
          UIController.closeModal('modalCaderno');
          UIController.renderIndexModal();
          UIController.openModal('modalIndex');
          UIController.updateTabBarActive('progress');
        } else if (id === 'btnCloseIndex') {
          UIController.closeModal('modalIndex');
          UIController.updateTabBarActive('camarim');
        } else if (id === 'btnOpenSettings' || id === 'btnOpenSettingsLobby' || id === 'btnOpenSettingsStage' || id === 'tabBtnSettings') {
          UIController.closeModal('modalCaderno');
          UIController.populateVoiceSelectors();
          UIController.openModal('modalSettings');
          UIController.updateTabBarActive('settings');
        } else if (id === 'btnCloseSettings') {
          UIController.closeModal('modalSettings');
          UIController.updateTabBarActive('camarim');
        } else if (id === 'tabBtnCaderno') {
          UIController.closeModal('modalFullScript');
          UIController.closeModal('modalIndex');
          UIController.closeModal('modalSettings');
          UIController.closeModal('sheetActor');
          UIController.closeModal('sheetMode');
          UIController.closeModal('sheetMethod');
          UIController.closeModal('sheetBeat');
          UIController.renderCaderno();
          UIController.openModal('modalCaderno');
          UIController.updateTabBarActive('caderno');
        } else if (id === 'btnCloseCaderno') {
          UIController.closeModal('modalCaderno');
          UIController.updateTabBarActive('camarim');
        } else if (id === 'btnStageCaderno') {
          UIController.renderCaderno(AppState.currentIndex);
          UIController.openModal('modalCaderno');
        } else if (id === 'tabBtnCamarim') {
          UIController.closeModal('modalFullScript');
          UIController.closeModal('modalIndex');
          UIController.closeModal('modalSettings');
          UIController.closeModal('modalCaderno');
          UIController.closeModal('sheetActor');
          UIController.closeModal('sheetMode');
          UIController.closeModal('sheetMethod');
          UIController.closeModal('sheetBeat');
          UIController.updateTabBarActive('camarim');
        } else if (id === 'slotActorBtn') {
          UIController.openModal('sheetActor', Utils.$('slotActorBtn'));
        } else if (id === 'btnCloseSheetActor') {
          UIController.closeModal('sheetActor');
        } else if (id === 'slotModeBtn') {
          UIController.openModal('sheetMode', Utils.$('slotModeBtn'));
        } else if (id === 'btnCloseSheetMode') {
          UIController.closeModal('sheetMode');
        } else if (id === 'slotMethodBtn') {
          UIController.openModal('sheetMethod', Utils.$('slotMethodBtn'));
        } else if (id === 'btnCloseSheetMethod') {
          UIController.closeModal('sheetMethod');
        } else if (id === 'slotBeatBtn') {
          UIController.openModal('sheetBeat', Utils.$('slotBeatBtn'));
        } else if (id === 'btnCloseSheetBeat') {
          UIController.closeModal('sheetBeat');
        } else if (id === 'btnQuickResume') {
          this.enterStage();
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
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && allowedPrefixes.some(p => k.startsWith(p))) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

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
            await StorageManager.clearAllCastAudios();
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
        document.addEventListener('click', async (e) => {
          const actorBtn = e.target.closest('.char-tab, .welcome-actor-btn');
          if (actorBtn) {
            const actor = actorBtn.dataset.actor;
            if (actor) {
              const changed = actor !== AppState.selectedActor || !AppState.hasSavedActor;
              AppState.hasSavedActor = true;
              AppState.selectedActor = actor;
              StorageManager.saveSettings(AppState);
              if (changed) {
                AppState.masteryLevels = StorageManager.loadProgress(actor, AppState.speeches.length);
                const myIndices = AppState.getMySpeechIndices();
                this.goToSpeech(myIndices[0] !== undefined ? myIndices[0] : 0, false);
                UIController.renderLobby();
              }
            }
            UIController.closeModal('sheetActor');
            return;
          }

          const modeCard = e.target.closest('.mode-card');
          if (modeCard) {
            const mode = modeCard.dataset.mode;
            if (mode) {
              AppState.rehearsalMode = mode;
              StorageManager.saveSettings(AppState);
              UIController.closeModal('sheetMode');
              UIController.renderLobby();
            }
            return;
          }

          const tabBtn = e.target.closest('.tab-bar-item');
          if (tabBtn) {
            this.handleActionClick(tabBtn.id);
            return;
          }

          const indexItem = e.target.closest('.index-item[data-idx]');
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

          const cadernoTabBtn = e.target.closest('.caderno-tab-btn');
          if (cadernoTabBtn) {
            const subtab = cadernoTabBtn.dataset.subtab;
            document.querySelectorAll('.caderno-tab-btn').forEach(b => b.classList.toggle('active', b === cadernoTabBtn));
            const isNotes = subtab === 'notes';
            if (Utils.$('cadernoSubtabNotes')) Utils.$('cadernoSubtabNotes').hidden = !isNotes;
            if (Utils.$('cadernoSubtabRecordings')) Utils.$('cadernoSubtabRecordings').hidden = isNotes;
            return;
          }

          const btnClearNotes = e.target.closest('#btnCadernoClearFreeNotes');
          if (btnClearNotes) {
            if (confirm('Deseja realmente limpar as anotacoes do caderno?')) {
              StorageManager.setActorNotes('');
              const ta = Utils.$('cadernoFreeNotes');
              if (ta) ta.value = '';
              const wc = Utils.$('cadernoWordCount');
              if (wc) wc.textContent = '0 palavras';
            }
            return;
          }

          const btnJumpCaderno = e.target.closest('#btnCadernoJumpToStage');
          if (btnJumpCaderno) {
            const idx = parseInt(btnJumpCaderno.dataset.idx, 10);
            if (!isNaN(idx)) {
              UIController.closeModal('modalCaderno');
              if (AppState.currentScreen === 'lobby') {
                this.enterStage();
              }
              this.goToSpeech(idx);
            }
            return;
          }

          const btnDeleteSpeechAudio = e.target.closest('#btnCadernoDeleteSpeechAudio');
          if (btnDeleteSpeechAudio) {
            const idx = parseInt(btnDeleteSpeechAudio.dataset.idx, 10);
            if (!isNaN(idx) && confirm('Excluir audio gravado desta fala?')) {
              await StorageManager.deleteCastAudio(idx);
              await UIController.renderCadernoSpeechDetail(idx);
              await UIController.renderCadernoRecordings();
            }
            return;
          }

          const btnPlaySpeechAudio = e.target.closest('#btnCadernoPlaySpeechAudio');
          if (btnPlaySpeechAudio) {
            const idx = parseInt(btnPlaySpeechAudio.dataset.idx, 10);
            if (!isNaN(idx)) {
              const sp = AppState.speeches[idx];
              const actorIdx = AppState.characters.indexOf(sp.who);
              AudioEngine.playSpeechAudio(idx, sp, sp.who, actorIdx >= 0 ? actorIdx : 0, AppState.speechRate, AppState.rehearsalTempo, {
                onStatus: msg => UIController.showStatus(msg)
              });
            }
            return;
          }

          const btnRecordCaderno = e.target.closest('#btnRecordCaderno');
          if (btnRecordCaderno) {
            if (AudioEngine.isRecordingNow) {
              AudioEngine.stopCastRecording();
            } else {
              const targetSelect = Utils.$('cadernoRecordTargetSelect');
              const speechSelect = Utils.$('cadernoSpeechSelect');
              let targetIdx = 'general';

              if (targetSelect && targetSelect.value) {
                if (targetSelect.value === 'general') {
                  targetIdx = `general_${Date.now()}`;
                } else if (targetSelect.value === 'full_scene') {
                  targetIdx = `full_scene_${Date.now()}`;
                } else if (targetSelect.value === 'current') {
                  targetIdx = AppState.currentIndex >= 0 ? AppState.currentIndex : 0;
                } else {
                  const p = parseInt(targetSelect.value, 10);
                  targetIdx = !isNaN(p) ? p : `general_${Date.now()}`;
                }
              } else if (speechSelect && speechSelect.value !== '') {
                targetIdx = parseInt(speechSelect.value, 10);
              } else {
                targetIdx = AppState.currentIndex >= 0 ? AppState.currentIndex : 0;
              }

              btnRecordCaderno.classList.add('is-recording');
              const txtEl = Utils.$('btnRecordCadernoText');
              if (txtEl) txtEl.textContent = 'Gravando... Toque para Parar';

              AudioEngine.startCastRecording(targetIdx, {
                onTick: (secs) => {
                  if (txtEl) txtEl.textContent = `Gravando (${secs}s)... Toque para Parar`;
                },
                onSaved: async () => {
                  btnRecordCaderno.classList.remove('is-recording');
                  if (txtEl) txtEl.textContent = 'Gravar Voz no Ensaio';
                  await UIController.renderCadernoRecordings();
                  if (typeof targetIdx === 'number') {
                    await UIController.renderCadernoSpeechDetail(targetIdx);
                  }
                },
                onError: () => {
                  btnRecordCaderno.classList.remove('is-recording');
                  if (txtEl) txtEl.textContent = 'Gravar Voz no Ensaio';
                }
              });
            }
            return;
          }

          const btnPlayCaderno = e.target.closest('.btn-play-caderno-audio');
          if (btnPlayCaderno) {
            const recId = btnPlayCaderno.dataset.id;
            const recIdx = btnPlayCaderno.dataset.idx !== '' ? parseInt(btnPlayCaderno.dataset.idx, 10) : null;
            if (AudioEngine.isPlaying) {
              AudioEngine.stopAllAudio();
              return;
            }
            let blob = null;
            if (recIdx !== null && !isNaN(recIdx)) {
              blob = await StorageManager.getCastAudio(recIdx);
            }
            if (!blob && recId) {
              const all = await StorageManager.getAllRecordings();
              const found = all.find(r => String(r.id) === String(recId));
              if (found) blob = found.blob || found.audioBlob;
            }
            if (blob) {
              btnPlayCaderno.classList.add('is-playing');
              btnPlayCaderno.innerHTML = `${Icons.get('stop', { size: 14 })} <span>Parar</span>`;
              AudioEngine.playCustomBlob(blob, {
                onEnd: () => {
                  btnPlayCaderno.classList.remove('is-playing');
                  btnPlayCaderno.innerHTML = `${Icons.get('play', { size: 14 })} <span>Ouvir</span>`;
                },
                onStop: () => {
                  btnPlayCaderno.classList.remove('is-playing');
                  btnPlayCaderno.innerHTML = `${Icons.get('play', { size: 14 })} <span>Ouvir</span>`;
                }
              });
            }
            return;
          }

          const btnDeleteCaderno = e.target.closest('.btn-delete-caderno-audio');
          if (btnDeleteCaderno) {
            const recId = btnDeleteCaderno.dataset.id;
            const recIdx = btnDeleteCaderno.dataset.idx !== '' ? parseInt(btnDeleteCaderno.dataset.idx, 10) : null;
            if (confirm('Deseja realmente excluir este audio gravado?')) {
              if (recIdx !== null && !isNaN(recIdx)) {
                await StorageManager.deleteCastAudio(recIdx);
              } else if (recId) {
                await StorageManager.deleteRecordingById(recId);
              }
              await UIController.renderCadernoRecordings();
              const speechSelect = Utils.$('cadernoSpeechSelect');
              if (speechSelect && speechSelect.value !== '') {
                await UIController.renderCadernoSpeechDetail(parseInt(speechSelect.value, 10));
              }
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

        if (Utils.$('cadernoFreeNotes')) {
          Utils.$('cadernoFreeNotes').oninput = (e) => {
            StorageManager.setActorNotes(e.target.value);
            const words = e.target.value.trim() ? e.target.value.trim().split(/\s+/).length : 0;
            const countEl = Utils.$('cadernoWordCount');
            if (countEl) countEl.textContent = `${words} palavra${words === 1 ? '' : 's'}`;
          };
        }

        if (Utils.$('cadernoSpeechSelect')) {
          Utils.$('cadernoSpeechSelect').onchange = (e) => {
            const val = e.target.value;
            if (val === '') {
              UIController.renderCadernoSpeechDetail(null);
            } else {
              UIController.renderCadernoSpeechDetail(parseInt(val, 10));
            }
            UIController.updateCadernoRecordTarget();
          };
        }

        document.addEventListener('input', (e) => {
          if (e.target && e.target.id === 'cadernoSpeechNote') {
            const select = Utils.$('cadernoSpeechSelect');
            if (select && select.value !== '') {
              StorageManager.setSpeechNote(parseInt(select.value, 10), e.target.value);
            }
          } else if (e.target && e.target.id === 'cadernoSpeechIntent') {
            const select = Utils.$('cadernoSpeechSelect');
            if (select && select.value !== '') {
              const isDefault = ScriptParser.isDefaultPlay(AppState.activeScriptText);
              StorageManager.setSpeechIntent(parseInt(select.value, 10), e.target.value, isDefault);
            }
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
            UIController.closeModal('sheetBeat');
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

        ['modalIndex', 'modalSettings', 'modalFullScript', 'modalCaderno', 'sheetActor', 'sheetMode', 'sheetMethod', 'sheetBeat'].forEach(modalId => {
          const modalEl = Utils.$(modalId);
          if (modalEl) {
            modalEl.onclick = (e) => {
              if (e.target === modalEl || (e.target.classList && e.target.classList.contains('modal-drag-bar'))) {
                UIController.closeModal(modalId);
                UIController.updateTabBarActive('camarim');
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

        if (Utils.$('btnScriptFontSmaller')) {
          Utils.$('btnScriptFontSmaller').onclick = () => {
            UIController.adjustScriptFontSize(-1);
          };
        }

        if (Utils.$('btnScriptFontLarger')) {
          Utils.$('btnScriptFontLarger').onclick = () => {
            UIController.adjustScriptFontSize(1);
          };
        }

        if (Utils.$('selectHighlightActor')) {
          Utils.$('selectHighlightActor').onchange = () => {
            const beat = Utils.$('selectBeatFullScript')?.value || 'all';
            const query = Utils.$('inputSearchScript')?.value || '';
            UIController.renderFullScriptModal(beat, query);
          };
        }

        if (Utils.$('btnToggleHighlighter')) {
          Utils.$('btnToggleHighlighter').onclick = () => {
            UIController.isHighlighterActive = !UIController.isHighlighterActive;
            const btn = Utils.$('btnToggleHighlighter');
            if (btn) {
              btn.classList.toggle('active', UIController.isHighlighterActive);
              const txt = btn.querySelector('span');
              if (txt) txt.textContent = UIController.isHighlighterActive ? 'Grifando' : 'Grifar';
            }
            UIController.showStatus(UIController.isHighlighterActive ? 'Marca-texto ativo: toque em qualquer fala para grifar.' : 'Marca-texto desativado.');
          };
        }

        // Seletor de método de memorização no Camarim
        const studyCards = Utils.$('studyMethodsGrid')?.querySelectorAll('.study-method-card');
        studyCards?.forEach(card => {
          card.onclick = () => {
            AppState.studyMethod = card.dataset.method;
            StorageManager.saveSettings(AppState);
            if (Utils.$('selectStudyMethod')) Utils.$('selectStudyMethod').value = AppState.studyMethod;
            UIController.closeModal('sheetMethod');
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

        if (Utils.$('chkDarkTheme')) {
          const docEl = (typeof document !== 'undefined' && document.documentElement) ? document.documentElement : null;
          const isLight = docEl && docEl.getAttribute && docEl.getAttribute('data-theme') === 'light';
          Utils.$('chkDarkTheme').checked = !isLight;
          Utils.$('chkDarkTheme').onchange = (e) => {
            this.applyTheme(e.target.checked ? 'dark' : 'light', true);
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
            UIController.closeModal('modalSettings');
            this.loadActiveScript();
          };
        }

        if (Utils.$('btnRestoreOriginal')) {
          Utils.$('btnRestoreOriginal').onclick = () => {
            if (confirm('Restaurar o texto original de "Os Inventariantes"?')) {
              localStorage.removeItem('memorizador_custom_script');
              UIController.closeModal('modalSettings');
              this.loadActiveScript();
            }
          };
        }
      },

      bindKeyboard() {
        document.addEventListener('keydown', (e) => {
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
          if (e.ctrlKey || e.metaKey || e.altKey) return;

          const openModalId = ['modalIndex', 'modalSettings', 'modalFullScript', 'modalCaderno'].find(id => Utils.$(id) && !Utils.$(id).hidden);

          if (e.key === 'Tab' && openModalId) {
            const modal = Utils.$(openModalId);
            const focusables = Array.from(modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
            if (focusables.length > 0) {
              const first = focusables[0];
              const last = focusables[focusables.length - 1];
              const active = typeof document !== 'undefined' ? document.activeElement : null;
              if (e.shiftKey) {
                if (active === first || !modal.contains(active)) {
                  e.preventDefault();
                  if (typeof last.focus === 'function') last.focus();
                }
              } else {
                if (active === last || !modal.contains(active)) {
                  e.preventDefault();
                  if (typeof first.focus === 'function') first.focus();
                }
              }
            }
            return;
          }

          if (e.key === 'Escape') {
            if (openModalId) {
              UIController.closeModal(openModalId);
              UIController.updateTabBarActive('camarim');
              return;
            }
            if (AppState.currentScreen === 'stage') {
              this.returnToLobby();
            }
            return;
          }

          if (e.key === 'i' || e.key === 'I') {
            if (openModalId && openModalId !== 'modalIndex') return;
            e.preventDefault();
            const modalIndex = Utils.$('modalIndex');
            if (modalIndex) {
              if (modalIndex.hidden) {
                UIController.renderIndexModal();
                UIController.openModal('modalIndex');
              } else {
                UIController.closeModal('modalIndex');
              }
            }
            return;
          }

          if (e.key === 'c' || e.key === 'C') {
            if (openModalId && openModalId !== 'modalCaderno') return;
            e.preventDefault();
            const modalCaderno = Utils.$('modalCaderno');
            if (modalCaderno) {
              if (modalCaderno.hidden) {
                UIController.renderCaderno(AppState.currentScreen === 'stage' ? AppState.currentIndex : null);
                UIController.openModal('modalCaderno');
                UIController.updateTabBarActive('caderno');
              } else {
                UIController.closeModal('modalCaderno');
                UIController.updateTabBarActive('camarim');
              }
            }
            return;
          }

          if (openModalId) return;

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
