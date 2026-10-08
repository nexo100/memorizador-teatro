// 7. CONTROLADOR DE INTERFACE (UIController)
    const UIController = {
      currentRenderId: 0,
      lastFocusedElement: null,

      openModal(modalId, openerEl = null) {
        const modal = Utils.$(modalId);
        if (!modal) return;
        this.lastFocusedElement = openerEl || (typeof document !== 'undefined' ? document.activeElement : null);
        modal.hidden = false;
        const focusables = modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusables.length > 0 && typeof focusables[0].focus === 'function') {
          focusables[0].focus();
        }
      },

      closeModal(modalId) {
        const modal = Utils.$(modalId);
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
          this.lastFocusedElement.focus();
          this.lastFocusedElement = null;
        }
      },

      showStatus(msg) {
        const el = Utils.$('statusMessage');
        if (el) el.textContent = msg;
      },

      showScreen(screenName) {
        AppState.currentScreen = screenName;
        const lobby = Utils.$('lobbyView');
        const stage = Utils.$('rehearsalView');
        if (screenName === 'lobby') {
          if (lobby) lobby.hidden = false;
          if (stage) stage.hidden = true;
          this.renderLobby();
        } else {
          if (lobby) lobby.hidden = true;
          if (stage) stage.hidden = false;
          this.renderView();
        }
      },

      renderLobby() {
        const titleEl = Utils.$('playTitle');
        if (titleEl) {
          titleEl.textContent = '🎭 ' + (document.title.replace('🎭 Ensaio Teatral · ', '') || 'Os Inventariantes');
        }

        const tabsContainer = Utils.$('characterTabs');
        if (tabsContainer) {
          tabsContainer.innerHTML = AppState.characters.map(c => {
            const isCurrent = c === AppState.selectedActor;
            const total = AppState.speeches.filter(s => s.who === c).length;
            let actorLevels = isCurrent ? AppState.masteryLevels : StorageManager.loadProgress(c, AppState.speeches.length);
            const mastered = AppState.speeches.map((s, i) => s.who === c && (actorLevels[i] || 0) >= 3 ? 1 : 0).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((100 * mastered) / total) : 0;
            return `
              <button class="char-tab char-card ${isCurrent ? 'active' : ''}" data-actor="${Utils.escapeHtml(c)}" type="button">
                <div class="char-card-header">
                  <div class="char-card-name">🎭 ${Utils.escapeHtml(c)}</div>
                  <span class="char-badge ${isCurrent ? 'active' : ''}">${isCurrent ? '✓ Em Cena' : `${pct}% dominado`}</span>
                </div>
                <div class="char-card-info">
                  <span class="char-card-stat">${mastered} de ${total} falas dominadas</span>
                  <span class="char-card-pct">${pct}%</span>
                </div>
                <div class="char-card-progress">
                  <div class="char-card-progress-fill" style="width:${pct}%"></div>
                </div>
              </button>
            `;
          }).join('');
        }

        const modeGrid = Utils.$('modeCardsGrid');
        if (modeGrid) {
          const cards = modeGrid.querySelectorAll('.mode-card');
          cards.forEach(card => {
            if (card.dataset.mode === AppState.rehearsalMode) {
              card.classList.add('active');
            } else {
              card.classList.remove('active');
            }
          });
        }

        const studyGrid = Utils.$('studyMethodsGrid');
        if (studyGrid) {
          const cards = studyGrid.querySelectorAll('.study-method-card');
          cards.forEach(card => {
            if (card.dataset.method === AppState.studyMethod) {
              card.classList.add('active');
            } else {
              card.classList.remove('active');
            }
          });
        }

        const btnEnter = Utils.$('btnEnterStage');
        if (btnEnter) {
          btnEnter.textContent = `🎭 Entrar em Cena como ${AppState.selectedActor || 'Ator'} ›`;
        }

        this.populateBeatSelector();
      },

      populateBeatSelector() {
        const select = Utils.$('selectBeat');
        if (!select) return;
        const total = AppState.speeches.length;
        let html = `<option value="all">🎭 Cena Completa (Todas as ${total} falas)</option>`;
        AppState.activeBeats.forEach((b, idx) => {
          html += `<option value="${idx}">${Utils.escapeHtml(b.name)}</option>`;
        });
        select.innerHTML = html;
        select.value = AppState.selectedBeat;
      },

      populateVoiceSelectors() {
        const container = Utils.$('characterVoicesContainer');
        if (!container) return;

        const ptVoices = AudioEngine.availableVoices.filter(v => /^pt/i.test(v.lang));
        const voiceList = ptVoices.length > 0 ? ptVoices : AudioEngine.availableVoices;

        container.innerHTML = AppState.characters.map((actor, idx) => {
          const safeId = Utils.sanitizeId(actor);
          const savedVoiceName = StorageManager.getActorVoice(actor);

          const optionsHtml = voiceList.length > 0
            ? voiceList.map(v => {
                let isSelected = false;
                if (savedVoiceName) {
                  isSelected = v.name === savedVoiceName;
                } else {
                  const best = AudioEngine.findVoiceForActor(actor, idx);
                  isSelected = best && best.name === v.name;
                }
                return `<option value="${Utils.escapeHtml(v.name)}" ${isSelected ? 'selected' : ''}>${Utils.escapeHtml(v.name)} (${v.lang})</option>`;
              }).join('')
            : `<option value="">Voz padrão do sistema</option>`;

          return `
            <div class="form-group">
              <label>🎙️ Voz do Celular para ${Utils.escapeHtml(actor)}:</label>
              <div class="voice-select-row">
                <select id="voiceSelect_${safeId}" class="form-control char-voice-select" data-actor="${Utils.escapeHtml(actor)}">
                  ${optionsHtml}
                </select>
                <button class="btn btn-test-voice" style="min-height:38px; padding:0 10px;" id="btnTestVoice_${safeId}" data-actor="${Utils.escapeHtml(actor)}" title="Ouvir teste da voz de ${Utils.escapeHtml(actor)}">🔊</button>
              </div>
            </div>
          `;
        }).join('');

        AppState.characters.forEach((actor, idx) => {
          const safeId = Utils.sanitizeId(actor);
          const select = Utils.$('voiceSelect_' + safeId);
          if (select) {
            select.onchange = (e) => {
              StorageManager.setActorVoice(actor, e.target.value);
            };
          }
          const testBtn = Utils.$('btnTestVoice_' + safeId);
          if (testBtn) {
            testBtn.onclick = () => {
              const sampleSpeech = AppState.speeches.find(s => s.who === actor);
              const sampleText = sampleSpeech ? sampleSpeech.spokenText.slice(0, 100) : `Olá, sou a voz de ${actor}!`;
              AudioEngine.speakSynthesized(sampleText, actor, idx, AppState.speechRate);
            };
          }
        });
      },

      updateHeaderStats() {
        const stagePlay = Utils.$('stagePlayTitle');
        if (stagePlay) {
          stagePlay.textContent = document.title.replace('🎭 Ensaio Teatral · ', '') || 'Os Inventariantes';
        }
        const stageBeat = Utils.$('stageBeatTitle');
        if (stageBeat) {
          if (AppState.selectedBeat === 'all') {
            stageBeat.textContent = '🎭 Cena Completa';
          } else {
            const b = AppState.activeBeats[parseInt(AppState.selectedBeat, 10)];
            stageBeat.textContent = b ? b.name : '🎭 Cena Completa';
          }
        }

        const myIndices = AppState.getMySpeechIndices();
        const masteredCount = myIndices.filter(i => (AppState.masteryLevels[i] || 0) >= 3).length;
        const pct = myIndices.length > 0 ? Math.round((100 * masteredCount) / myIndices.length) : 0;

        const pBar = Utils.$('progressBar');
        if (pBar) pBar.style.width = pct + '%';
        const mText = Utils.$('masteryText');
        if (mText) mText.textContent = `${masteredCount} de ${myIndices.length} dominadas (${pct}%)`;
        const cText = Utils.$('counterText');
        if (cText) cText.textContent = `Fala ${AppState.currentIndex + 1} de ${AppState.speeches.length}`;
        const nLabel = Utils.$('navCounterLabel');
        if (nLabel) nLabel.textContent = `Fala ${AppState.currentIndex + 1} / ${AppState.speeches.length}`;

        const methodPill = Utils.$('stageMethodPill');
        if (methodPill) {
          const labels = { oral: '🗣️ Oral', quiz: '🧩 Quiz', typing: '⌨️ Digitação' };
          methodPill.textContent = labels[AppState.studyMethod] || '🗣️ Oral';
        }

        const range = AppState.getActiveBeatRange();
        const btnP = Utils.$('btnPrev');
        const btnN = Utils.$('btnNext');
        if (AppState.rehearsalMode === 'minhas' || AppState.rehearsalMode === 'pingpong' || AppState.rehearsalMode === 'ponto') {
          if (btnP) btnP.disabled = myIndices.length === 0 || AppState.currentIndex <= myIndices[0];
          if (btnN) btnN.disabled = myIndices.length === 0 || AppState.currentIndex >= myIndices[myIndices.length - 1];
        } else {
          if (btnP) btnP.disabled = AppState.currentIndex <= range.start;
          if (btnN) btnN.disabled = AppState.currentIndex >= range.end;
        }

        if (AppState.currentScreen === 'lobby') {
          this.renderLobby();
        }
      },

      renderDockHeroArea() {
        const dockArea = Utils.$('dockHeroArea');
        if (!dockArea) return;

        if (AppState.isSceneFinished || AppState.currentIndex >= AppState.speeches.length) {
          dockArea.innerHTML = `
            <button class="dock-hero-btn btn btn-primary" id="btnRestartScene" type="button">Recomeçar bloco</button>
            <button class="dock-hero-btn btn btn-secondary" id="btnReturnLobbyFinished" type="button">‹ Camarim</button>
          `;
          return;
        }

        const speech = AppState.speeches[AppState.currentIndex];
        const isMyTurn = speech && speech.who === AppState.selectedActor;
        const level = AppState.masteryLevels[AppState.currentIndex] || 0;

        if (!isMyTurn) {
          const nextSpeech = AppState.speeches[AppState.currentIndex + 1];
          const nextIsMine = nextSpeech && nextSpeech.who === AppState.selectedActor;
          const partnerBtnText = nextIsMine ? 'Minha vez ›' : 'Avançar ›';
          dockArea.innerHTML = `
            <button class="dock-hero-btn btn btn-primary" id="btnContinuePartner" type="button">${partnerBtnText}</button>
          `;
          return;
        }

        if (AppState.isRetryState) {
          dockArea.innerHTML = `
            <button class="dock-hero-btn btn btn-retry" id="btnRetry" type="button">🔁 Tentar de novo agora</button>
            <button class="dock-hero-btn btn btn-secondary" id="btnNextAfterWrong" type="button">Seguir adiante ›</button>
          `;
          return;
        }

        if (AppState.studyMethod === 'quiz' && !AppState.isRevealed) {
          if (AppState.quizStep >= (AppState.quizTargets?.length || 1)) {
            dockArea.innerHTML = `
              <button class="dock-hero-btn btn btn-success" id="btnNextQuiz" type="button">🎉 Avançar com Sucesso ›</button>
            `;
          } else {
            dockArea.innerHTML = `
              <button class="dock-btn-hint btn btn-hint" id="btnHint" type="button" title="Dica da próxima palavra (D)">💡 Dica</button>
              <button class="dock-hero-btn btn btn-secondary" id="btnRevealSpeech" type="button">👁️ Revelar Tudo</button>
            `;
          }
          return;
        }

        if (AppState.studyMethod === 'typing' && !AppState.isRevealed) {
          if (AppState.typingCompleted) {
            dockArea.innerHTML = `
              <button class="dock-hero-btn btn btn-success" id="btnNextTyping" type="button">🎉 Avançar com Sucesso ›</button>
            `;
          } else {
            dockArea.innerHTML = `
              <button class="dock-btn-hint btn btn-hint" id="btnHint" type="button" title="Preenche a palavra ativa (D)">💡 Dica</button>
              <button class="dock-hero-btn btn btn-secondary" id="btnRevealSpeech" type="button">👁️ Revelar Tudo</button>
            `;
          }
          return;
        }

        if (level === 0 && !AppState.alwaysStartHidden) {
          dockArea.innerHTML = `
            <button class="dock-hero-btn btn btn-primary" id="btnHideWords" type="button">Já li — Esconder palavras ➔</button>
          `;
          return;
        }

        if (!AppState.isRevealed) {
          dockArea.innerHTML = `
            <button class="dock-btn-hint btn btn-hint" id="btnHint" type="button" title="Revela a próxima palavra oculta (D)">💡 Dica</button>
            <button class="dock-hero-btn btn btn-primary" id="btnCheck" type="button">👁️ Conferir Fala</button>
          `;
          return;
        }

        // isRevealed && !isRetryState
        dockArea.innerHTML = `
          <button class="dock-hero-btn btn btn-danger" id="btnWrong" type="button">❌ Errei</button>
          <button class="dock-hero-btn btn btn-success" id="btnCorrect" type="button">✅ Acertei</button>
        `;
      },

      getDistractors(correctWord) {
        const cleanTarget = (correctWord || '').replace(/[.,!?;:()""«»—–]/g, '').trim().toLowerCase();
        const candidateSet = new Set();
        AppState.speeches.forEach(sp => {
          const words = (sp.spokenText || '').split(/\s+/);
          words.forEach(w => {
            const cln = w.replace(/[.,!?;:()""«»—–]/g, '').trim();
            if (cln.length >= 3 && cln.toLowerCase() !== cleanTarget && !Utils.isFunctionWord(cln)) {
              candidateSet.add(cln);
            }
          });
        });
        (AppConfig.QUIZ_FALLBACK_WORDS || []).forEach(w => {
          if (w.toLowerCase() !== cleanTarget) candidateSet.add(w);
        });
        const arr = Array.from(candidateSet);
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.slice(0, 3);
      },

      renderQuizSpeech(speechObj, speechIndex, level, hintsRevealed) {
        const activeSegments = AppState.hideRubrics
          ? speechObj.segments.filter(s => s.type !== 'rubric')
          : speechObj.segments;

        const targets = [];
        let wordCounter = 0;
        activeSegments.forEach(seg => {
          if (seg.type === 'rubric') return;
          const words = seg.text.split(/(\s+)/);
          words.forEach(w => {
            if (/^\s+$/.test(w) || !w) return;
            const wIdx = wordCounter++;
            const clean = w.replace(/[.,!?;:()""«»—–]/g, '').trim();
            if (clean.length < 2) return;
            const isFunc = Utils.isFunctionWord(w);
            let isMasked = false;
            if (level === 0) {
              if (!isFunc && Utils.hashCoord(speechIndex, wIdx) < 45) isMasked = true;
            } else if (level === 1) {
              if (!isFunc && Utils.hashCoord(speechIndex, wIdx) < 65) isMasked = true;
            } else if (level >= 2) {
              if (!isFunc || Utils.hashCoord(speechIndex, wIdx) < 50) isMasked = true;
            }
            if (isMasked) {
              targets.push({ wordIndex: wIdx, cleanWord: clean, rawWord: w });
            }
          });
        });

        if (targets.length === 0) {
          const spoken = speechObj.spokenText.split(/\s+/).filter(Boolean);
          const firstContent = spoken.find(w => !Utils.isFunctionWord(w)) || spoken[0];
          if (firstContent) {
            targets.push({ wordIndex: 0, cleanWord: firstContent.replace(/[.,!?;:()""«»—–]/g, '').trim(), rawWord: firstContent });
          }
        }

        AppState.quizTargets = targets;
        const step = Math.min(AppState.quizStep || 0, targets.length);

        let curCounter = 0;
        const textHtml = activeSegments.map(seg => {
          if (seg.type === 'rubric') {
            return ` <span class="rubric">(${Utils.escapeHtml(seg.text)})</span> `;
          }
          const words = seg.text.split(/(\s+)/);
          return words.map(w => {
            if (/^\s+$/.test(w) || !w) return w;
            const idx = curCounter++;
            const targetIdx = targets.findIndex(t => t.wordIndex === idx);
            if (targetIdx === -1) return Utils.escapeHtml(w);

            if (targetIdx < step) {
              return `<span class="quiz-chip-word answered">${Utils.escapeHtml(w)}</span>`;
            } else if (targetIdx === step) {
              return `<span class="quiz-slot active" id="currentQuizSlot">[ ? ]</span>`;
            } else {
              return `<span class="quiz-slot pending">${Utils.maskWord(w, 'blank')}</span>`;
            }
          }).join('');
        }).join('');

        if (step >= targets.length && targets.length > 0) {
          return `
            <div class="quiz-completed-banner">🎉 Excelente! Todas as ${targets.length} palavras foram completadas!</div>
            <div>${textHtml}</div>
          `;
        }

        const currentTarget = targets[step];
        const distractors = this.getDistractors(currentTarget.cleanWord);
        const options = [currentTarget.cleanWord, ...distractors];
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }

        return `
          <div>${textHtml}</div>
          <div class="quiz-action-area">
            <div class="quiz-instruction">🧩 Toque na palavra para completar a lacuna [ ? ] (${step + 1} de ${targets.length}):</div>
            <div class="quiz-options-grid" id="quizChipsContainer">
              ${options.map(opt => `
                <button class="quiz-chip" type="button" data-word="${Utils.escapeHtml(opt)}">
                  ${Utils.escapeHtml(opt)}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      },

      renderTypingSpeech(speechObj, speechIndex, level, hintsRevealed) {
        const activeSegments = AppState.hideRubrics
          ? speechObj.segments.filter(s => s.type !== 'rubric')
          : speechObj.segments;

        let wordCounter = 0;
        let targets = [];
        activeSegments.forEach(seg => {
          if (seg.type === 'rubric') return;
          const words = seg.text.split(/(\s+)/);
          words.forEach(w => {
            if (/^\s+$/.test(w) || !w) return;
            const wIdx = wordCounter++;
            const clean = w.replace(/[.,!?;:()""«»—–]/g, '').trim();
            if (clean.length < 2) return;
            const isFunc = Utils.isFunctionWord(w);
            let isMasked = false;
            if (level === 0) {
              if (!isFunc && Utils.hashCoord(speechIndex, wIdx) < 40) isMasked = true;
            } else if (level === 1) {
              if (!isFunc && Utils.hashCoord(speechIndex, wIdx) < 60) isMasked = true;
            } else if (level >= 2) {
              if (!isFunc || Utils.hashCoord(speechIndex, wIdx) < 50) isMasked = true;
            }
            if (isMasked) {
              targets.push({ wordIndex: wIdx, cleanWord: clean, rawWord: w });
            }
          });
        });

        if (targets.length === 0) {
          const spoken = speechObj.spokenText.split(/\s+/).filter(Boolean);
          const firstContent = spoken.find(w => !Utils.isFunctionWord(w)) || spoken[0];
          if (firstContent) {
            targets.push({ wordIndex: 0, cleanWord: firstContent.replace(/[.,!?;:()""«»—–]/g, '').trim(), rawWord: firstContent });
          }
        }

        AppState.typingTargets = targets;
        let curCounter = 0;

        const textHtml = activeSegments.map(seg => {
          if (seg.type === 'rubric') {
            return ` <span class="rubric">(${Utils.escapeHtml(seg.text)})</span> `;
          }
          const words = seg.text.split(/(\s+)/);
          return words.map(w => {
            if (/^\s+$/.test(w) || !w) return w;
            const idx = curCounter++;
            const t = targets.find(item => item.wordIndex === idx);
            if (!t) return Utils.escapeHtml(w);

            const wLen = Math.max(45, t.cleanWord.length * 14);
            return `<input type="text" class="cloze-input" data-word="${Utils.escapeHtml(t.cleanWord)}" placeholder="..." style="width:${wLen}px;" autocomplete="off" autocapitalize="off" spellcheck="false">`;
          }).join('');
        }).join('');

        return `
          <div>${textHtml}</div>
          <div class="typing-instruction">⌨️ Digite as palavras que faltam nos campos. O cursor avança sozinho ao acertar!</div>
        `;
      },

      renderSpeechHtml(speechObj, speechIndex, level, hintsRevealed, isRevealed) {
        const activeSegments = AppState.hideRubrics
          ? speechObj.segments.filter(s => s.type !== 'rubric')
          : speechObj.segments;

        if (isRevealed) {
          return activeSegments.map(seg => {
            if (seg.type === 'rubric') {
              return ` <span class="rubric">(${Utils.escapeHtml(seg.text)})</span> `;
            }
            return Utils.escapeHtml(seg.text);
          }).join('');
        }

        if (AppState.studyMethod === 'quiz') {
          return this.renderQuizSpeech(speechObj, speechIndex, level, hintsRevealed);
        }

        if (AppState.studyMethod === 'typing') {
          return this.renderTypingSpeech(speechObj, speechIndex, level, hintsRevealed);
        }

        if (level === 0) {
          if (!isRevealed && AppState.alwaysStartHidden) {
            const totalWords = speechObj.spokenText.split(/\s+/).filter(Boolean).length;
            return `
              <div class="speech-veil-card">
                <div class="speech-veil-badge">🔒 Fala oculta (${totalWords} palavras)</div>
                <div class="speech-veil-text">Sua vez em cena! Diga a fala de cabeça ou use uma dica.</div>
              </div>
            `;
          }
          return activeSegments.map(seg => {
            if (seg.type === 'rubric') {
              return ` <span class="rubric">(${Utils.escapeHtml(seg.text)})</span> `;
            }
            return Utils.escapeHtml(seg.text);
          }).join('');
        }

        if (level >= 4 && hintsRevealed === 0) {
          const totalWords = speechObj.spokenText.split(/\s+/).filter(Boolean).length;
          return activeSegments.map(seg => {
            if (seg.type === 'rubric') {
              return ` <span class="rubric">(${Utils.escapeHtml(seg.text)})</span> `;
            }
            return '';
          }).join('') + `<div class="full-memory-placeholder">🔒 De memória total (${totalWords} palavras) — diga em voz alta!</div>`;
        }

        let wordCounter = 0;
        let hintGiven = 0;

        return activeSegments.map(seg => {
          if (seg.type === 'rubric') {
            return ` <span class="rubric">(${Utils.escapeHtml(seg.text)})</span> `;
          }

          const words = seg.text.split(/(\s+)/);
          return words.map(w => {
            if (/^\s+$/.test(w) || !w) return w;
            const currentWordIdx = wordCounter++;

            const isFunc = Utils.isFunctionWord(w);
            let isHidden = false;
            let mode = 'blank';

            if (level === 1) {
              if (!isFunc) {
                isHidden = Utils.hashCoord(speechIndex, currentWordIdx) < 55;
              }
            } else if (level === 2) {
              if (isFunc) {
                isHidden = Utils.hashCoord(speechIndex, currentWordIdx) < 45;
              } else {
                isHidden = Utils.hashCoord(speechIndex, currentWordIdx) < 85;
              }
            } else if (level === 3) {
              isHidden = true;
              mode = 'initial';
            } else if (level >= 4) {
              isHidden = true;
              mode = 'blank';
            }

            if (isHidden && hintGiven < hintsRevealed) {
              hintGiven++;
              return `<span class="hint-revealed" title="Palavra revelada">${Utils.escapeHtml(w)}</span>`;
            }

            if (isHidden) {
              return Utils.maskWord(w, mode);
            }
            return Utils.escapeHtml(w);
          }).join('');
        }).join('');
      },

      async renderView() {
        const renderId = ++this.currentRenderId;
        this.updateHeaderStats();
        this.renderDockHeroArea();
        const mainApp = Utils.$('mainApp');
        if (!mainApp) return;

        if (AppState.currentIndex >= AppState.speeches.length) {
          this.renderSceneFinished();
          this.renderDockHeroArea();
          return;
        }

        const speech = AppState.speeches[AppState.currentIndex];
        const isMyTurn = speech.who === AppState.selectedActor;
        const level = AppState.masteryLevels[AppState.currentIndex] || 0;
        let html = '';

        const hasRealAudio = await StorageManager.getCastAudio(AppState.currentIndex);
        if (renderId !== this.currentRenderId) return;
        const isDefault = ScriptParser.isDefaultPlay(AppState.activeScriptText);
        const currentIntent = StorageManager.getSpeechIntent(AppState.currentIndex, isDefault);
        const intentHtml = (currentIntent || isMyTurn) ? `
          <div class="intent-bar" id="intentBarCurrent" title="Ação dramática / intenção da personagem (Toque para editar)">
            <span class="intent-label">🎯 Ação:</span>
            <span class="intent-text">${Utils.escapeHtml(currentIntent || 'Definir verbo de ação ou subtexto...')}</span>
            <button class="btn-intent-edit" id="btnEditIntent" type="button">${currentIntent ? '✏️ Editar' : '➕ Definir'}</button>
          </div>
        ` : '';

        if (AudioEngine.isRecordingNow) {
          html += `
            <div class="recording-bar">
              <span><span class="recording-pulse"></span>Gravando áudio real do elenco...</span>
              <span id="recSeconds">${AudioEngine.recordingSeconds}s</span>
              <button class="btn btn-record" style="min-height:36px; padding:0 12px; background:#fff;" id="btnStopRecord">⏹️ Parar e Salvar</button>
            </div>
          `;
        }

        if (speech.directions && speech.directions.length > 0) {
          html += speech.directions.map(d => `<div class="scene-direction">🎭 ${Utils.escapeHtml(d)}</div>`).join('');
        }

        if (!isMyTurn) {
          html += `
            <div class="speech-card">
              <div class="card-meta-row">
                <div class="speaker-meta-left">
                  <span class="speaker-name">${Utils.escapeHtml(speech.who)}</span>
                  ${hasRealAudio ? `<span class="real-audio-badge">🎙️ Áudio Real</span>` : ''}
                </div>
                <span class="mastery-pill">Fala do colega</span>
              </div>
              ${intentHtml}
              <div class="speech-content">
                ${speech.segments.map(seg => {
                  if (seg.type === 'rubric') {
                    if (AppState.hideRubrics) return '';
                    return ` <span class="rubric">(${Utils.escapeHtml(seg.text)})</span> `;
                  }
                  return Utils.escapeHtml(seg.text);
                }).join('')}
              </div>
              <div class="action-row">
                <div class="action-secondary-row">
                  <button class="btn btn-audio" id="btnSpeakPartner">🔊 Ouvir</button>
                  <button class="btn btn-record" id="btnRecordPartner">${hasRealAudio ? '🎙️ Regravar voz real' : '🎙️ Gravar voz real'}</button>
                  ${hasRealAudio ? `<button class="btn btn-icon-only" id="btnDeleteCastAudio" title="Excluir gravação">🗑️</button>` : ''}
                </div>
              </div>
            </div>
          `;
        } else {
          const prevSpeech = AppState.speeches[AppState.currentIndex - 1];
          let cueHtml = '';
          if (prevSpeech) {
            const hasPrevRealAudio = await StorageManager.getCastAudio(AppState.currentIndex - 1);
            if (renderId !== this.currentRenderId) return;
            if (prevSpeech.who !== AppState.selectedActor) {
              const cueWords = (prevSpeech.spokenText || '').trim().split(/\s+/).filter(Boolean);
              const cueStartWords = cueWords.slice(0, Math.max(0, cueWords.length - 4));
              const cueEndWords = cueWords.slice(Math.max(0, cueWords.length - 4));
              const cueStart = cueStartWords.join(' ');
              const cueEnd = cueEndWords.join(' ');
              const cueBody = cueStart
                ? `${Utils.escapeHtml(cueStart)} <span class="cue-highlight-end">${Utils.escapeHtml(cueEnd)}</span>`
                : `<span class="cue-highlight-end">${Utils.escapeHtml(cueEnd)}</span>`;

              cueHtml = `
                <div class="cue-card">
                  <div class="cue-header">
                    <span class="cue-tag">A Deixa (${Utils.escapeHtml(prevSpeech.who)}) ${hasPrevRealAudio ? '🎙️' : ''}</span>
                    <div class="cue-actions">
                      <button class="btn-cue-audio" id="btnSpeakCue">🔊 Ouvir</button>
                      <button class="btn-cue-record" id="btnRecordCue">${hasPrevRealAudio ? '🎙️ Regravar' : '🎙️ Gravar colega'}</button>
                    </div>
                  </div>
                  <p class="cue-text">“${cueBody}”</p>
                </div>
              `;
            } else {
              cueHtml = `<div class="cue-mini-badge">↳ Continuação da sua fala</div>`;
            }
          } else {
            cueHtml = `<div class="cue-mini-badge">🎬 Abertura da cena</div>`;
          }
          html += cueHtml;

          if (AppState.rehearsalMode === 'pingpong' && !AppState.isRevealed) {
            html += `
              <div class="pingpong-timer-box">
                <div class="pingpong-countdown" id="pingPongCountdownNum">${AppState.pingPongCountdown}</div>
                <div class="pingpong-label">⚡ Dispare a fala assim que a deixa terminar!</div>
                <button class="btn btn-primary" style="margin-top:8px; min-height:42px; width:100%;" id="btnPingPongDone">⚡ Já falei! Conferir</button>
              </div>
            `;
          }

          if (AppState.rehearsalMode === 'ponto') {
            html += `
              <div style="margin-bottom:12px; text-align:center;">
                <button class="btn" style="min-height:38px; font-size:0.85rem;" id="btnTogglePonto">
                  ${AppState.pontoPaused ? '▶️ Continuar Ponto' : '⏸️ Pausar Ponto'}
                </button>
              </div>
            `;
          }

          html += `
            <div class="speech-card">
              <div class="card-meta-row">
                <div class="speaker-meta-left">
                  <span class="speaker-name">${Utils.escapeHtml(speech.who)}</span>
                  ${hasRealAudio ? `<span class="real-audio-badge">🎙️ Minha Gravação</span>` : ''}
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                  <button class="btn btn-icon-only" id="btnToggleRubrics" title="Alternar visibilidade de rubricas" style="font-size:0.75rem; padding:2px 6px;">
                    ${AppState.hideRubrics ? '🎭 Rubricas: Ocultas' : '🎭 Rubricas: Visíveis'}
                  </button>
                  <span class="mastery-pill lv${level}">${AppConfig.MASTERY_LEVEL_NAMES[level]}</span>
                </div>
              </div>
              ${intentHtml}
              <div class="speech-content" id="speechDisplay">
                ${this.renderSpeechHtml(speech, AppState.currentIndex, level, AppState.hintsUsedThisLine, AppState.isRevealed)}
              </div>
              <div class="action-row">
                <div class="action-secondary-row">
                  <button class="btn btn-audio" id="btnAudioMy">🔊 Ouvir</button>
                  <button class="btn btn-record" id="btnRecordMy">${hasRealAudio ? '🎙️ Regravar voz' : '🎙️ Gravar voz'}</button>
                  ${hasRealAudio ? `<button class="btn btn-icon-only" id="btnDeleteCastAudio" title="Excluir gravação">🗑️</button>` : ''}
                </div>
              </div>
            </div>
          `;
        }

        if (renderId !== this.currentRenderId) return;
        mainApp.innerHTML = html;
        this.renderDockHeroArea();

        // Alternar rubricas pelo card
        const btnToggleRubrics = Utils.$('btnToggleRubrics');
        if (btnToggleRubrics) {
          btnToggleRubrics.onclick = () => {
            AppState.hideRubrics = !AppState.hideRubrics;
            StorageManager.saveSettings(AppState);
            if (Utils.$('chkHideRubrics')) Utils.$('chkHideRubrics').checked = AppState.hideRubrics;
            UIController.renderView();
          };
        }

        // Interação do modo Quiz
        if (AppState.studyMethod === 'quiz' && !AppState.isRevealed) {
          const chips = mainApp.querySelectorAll('.quiz-chip');
          chips.forEach(chip => {
            chip.onclick = () => {
              const clicked = (chip.dataset.word || '').trim().toLowerCase();
              const targets = AppState.quizTargets || [];
              const step = AppState.quizStep || 0;
              const currentTarget = targets[step];
              if (!currentTarget) return;
              if (clicked === currentTarget.cleanWord.toLowerCase()) {
                Utils.triggerHaptic('success');
                AppState.quizStep = step + 1;
                if (AppState.quizStep >= targets.length) {
                  AppState.isRevealed = true;
                }
                UIController.renderView();
              } else {
                Utils.triggerHaptic('error');
                chip.classList.add('wrong');
                setTimeout(() => chip.classList.remove('wrong'), 500);
              }
            };
          });
        }

        // Interação do modo Digitação
        if (AppState.studyMethod === 'typing' && !AppState.isRevealed) {
          const inputs = mainApp.querySelectorAll('.cloze-input');
          inputs.forEach(input => {
            input.oninput = () => {
              const val = input.value.trim().toLowerCase();
              const exp = (input.dataset.word || '').toLowerCase();
              if (val === exp) {
                input.classList.add('correct');
                input.disabled = true;
                Utils.triggerHaptic('tap');
                const remaining = mainApp.querySelectorAll('.cloze-input:not(:disabled)');
                if (remaining.length > 0) {
                  remaining[0].focus();
                } else {
                  AppState.typingCompleted = true;
                  AppState.isRevealed = true;
                  Utils.triggerHaptic('success');
                  UIController.renderView();
                }
              }
            };
          });
          const first = mainApp.querySelector ? mainApp.querySelector('.cloze-input:not(:disabled)') : null;
          if (first && !AudioEngine.isRecordingNow) {
            setTimeout(() => { try { first.focus(); } catch(e){} }, 60);
          }
        }
      },

      renderFullScriptModal(filterBeat = 'all', searchQuery = '') {
        const container = Utils.$('fullScriptContainer');
        const statsEl = Utils.$('fullScriptStats');
        if (!container) return;

        const playTitle = ScriptParser.extractPlayTitle(AppState.activeScriptText);
        if (Utils.$('fullScriptModalTitle')) {
          Utils.$('fullScriptModalTitle').textContent = `📖 ${playTitle}`;
        }

        const beatSelect = Utils.$('selectBeatFullScript');
        if (beatSelect && (!beatSelect.children || beatSelect.children.length <= 1)) {
          let bHtml = `<option value="all">Todas as Cenas</option>`;
          AppState.activeBeats.forEach((b, idx) => {
            bHtml += `<option value="${idx}">${Utils.escapeHtml(b.name)}</option>`;
          });
          beatSelect.innerHTML = bHtml;
          beatSelect.value = filterBeat;
        }

        let start = 0;
        let end = AppState.speeches.length - 1;
        if (filterBeat !== 'all') {
          const bIdx = parseInt(filterBeat, 10);
          if (AppState.activeBeats[bIdx]) {
            start = AppState.activeBeats[bIdx].start;
            end = AppState.activeBeats[bIdx].end;
          }
        }

        const query = (searchQuery || '').trim().toLowerCase();
        let matchedCount = 0;
        let html = '';

        for (let i = start; i <= end; i++) {
          const sp = AppState.speeches[i];
          if (!sp) continue;

          const textMatch = !query || sp.spokenText.toLowerCase().includes(query) || sp.who.toLowerCase().includes(query);
          if (!textMatch) continue;
          matchedCount++;

          const isMine = sp.who === AppState.selectedActor;
          const formattedContent = sp.segments.map(seg => {
            if (seg.type === 'rubric') {
              return `<span class="rubric">(${Utils.escapeHtml(seg.text)})</span>`;
            }
            return Utils.escapeHtml(seg.text);
          }).join(' ');

          const dirs = (sp.directions && sp.directions.length > 0)
            ? sp.directions.map(d => `<div class="scene-direction" style="margin-bottom:6px;">🎭 ${Utils.escapeHtml(d)}</div>`).join('')
            : '';

          html += `
            <div class="script-read-item ${isMine ? 'is-mine' : ''}" data-index="${i}">
              ${dirs}
              <div class="script-read-header">
                <span class="script-read-speaker ${isMine ? 'highlight' : ''}">${Utils.escapeHtml(sp.who)}</span>
                <span class="script-read-num">Fala ${i + 1}</span>
              </div>
              <div class="script-read-text">${formattedContent}</div>
              <div class="script-read-actions">
                <button class="btn-read-jump" type="button" data-jump="${i}">🎭 Ensaiar desta fala ›</button>
              </div>
            </div>
          `;
        }

        if (matchedCount === 0) {
          html = `<div style="text-align:center; padding:30px; color:var(--fg-muted);">Nenhuma fala encontrada com o filtro atual.</div>`;
        }

        container.innerHTML = html;
        if (statsEl) {
          statsEl.textContent = `${matchedCount} de ${AppState.speeches.length} falas · ${AppState.characters.length} personagens`;
        }

        const jumps = container.querySelectorAll('.btn-read-jump');
        jumps.forEach(btn => {
          btn.onclick = () => {
            const targetIdx = parseInt(btn.dataset.jump, 10);
            if (Utils.$('modalFullScript')) Utils.$('modalFullScript').hidden = true;
            AppController.goToSpeech(targetIdx);
            AppController.enterStage();
          };
        });
      },

      renderSceneFinished() {
        AppState.isSceneFinished = true;
        this.updateHeaderStats();
        const mainApp = Utils.$('mainApp');
        if (!mainApp) return;
        mainApp.innerHTML = `
          <div class="speech-card" style="text-align:center; padding:36px 20px;">
            <h2 style="font-size:1.4rem; margin-bottom:12px;">🎭 Fim do Bloco / Cena!</h2>
            <p style="color:var(--fg-muted); margin-bottom:24px;">Você percorreu todas as falas selecionadas deste ensaio.</p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
              <button class="btn btn-primary" id="btnRestartScene">Recomeçar bloco</button>
              <button class="btn" id="btnReviewWeak">Treinar só fraquezas</button>
              <button class="btn" id="btnReturnLobbyFinished">‹ Voltar ao Camarim</button>
            </div>
          </div>
        `;
        this.renderDockHeroArea();
      },

      async renderIndexModal() {
        const container = Utils.$('indexListContainer');
        if (!container) return;
        const range = AppState.getActiveBeatRange();
        let items = [];

        for (let idx = range.start; idx <= range.end; idx++) {
          if (idx < AppState.speeches.length) {
            const s = AppState.speeches[idx];
            const hasRec = await StorageManager.getCastAudio(idx);
            items.push({ ...s, index: idx, level: AppState.masteryLevels[idx] || 0, hasRec });
          }
        }

        if (AppState.currentFilter === 'mine') {
          items = items.filter(s => s.who === AppState.selectedActor);
        } else if (AppState.currentFilter === 'weak') {
          items = items.filter(s => s.who === AppState.selectedActor && s.level < 3);
        } else if (AppState.currentFilter === 'recorded') {
          items = items.filter(s => s.hasRec);
        }

        if (items.length === 0) {
          container.innerHTML = `<p style="color:var(--fg-muted); text-align:center; padding:20px;">Nenhuma fala encontrada neste filtro.</p>`;
          return;
        }

        container.innerHTML = items.map(item => {
          const isCurrent = item.index === AppState.currentIndex;
          const isMine = item.who === AppState.selectedActor;
          const badge = isMine ? `<span class="mastery-pill lv${item.level}">${AppConfig.MASTERY_LEVEL_NAMES[item.level] || ('Nível ' + (item.level + 1))}</span>` : `<span class="mastery-pill">Colega</span>`;
          return `
            <div class="index-item ${isCurrent ? 'current' : ''}" data-idx="${item.index}">
              <div class="index-item-meta">
                <span class="index-item-who">#${item.index + 1} · ${Utils.escapeHtml(item.who)} ${item.hasRec ? '🎙️' : ''}</span>
                ${badge}
              </div>
              <p class="index-item-text">${Utils.escapeHtml(item.spokenText || item.segments.map(s => s.text).join(' '))}</p>
            </div>
          `;
        }).join('');
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIController };
}
