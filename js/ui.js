// 7. CONTROLADOR DE INTERFACE (UIController) - STAGEPRO STUDIO
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
    const tabBar = Utils.$('appTabBar');
    if (screenName === 'lobby') {
      if (lobby) lobby.hidden = false;
      if (stage) stage.hidden = true;
      if (tabBar) tabBar.hidden = false;
      this.renderLobby();
      this.updateTabBarActive('camarim');
    } else {
      if (lobby) lobby.hidden = true;
      if (stage) stage.hidden = false;
      if (tabBar) tabBar.hidden = true;
      this.renderView();
    }
  },

  updateTabBarActive(tabId) {
    const bar = Utils.$('appTabBar');
    if (!bar) return;
    const items = bar.querySelectorAll('.tab-bar-item');
    items.forEach(it => {
      if (it.dataset.tab === tabId) {
        it.classList.add('active');
      } else {
        it.classList.remove('active');
      }
    });
  },

  renderLobby() {
    const titleEl = Utils.$('playTitle');
    if (titleEl) {
      const cleanTitle = (document.title || '').replace(/^.*?Ensaio Teatral · /, '') || 'Os Inventariantes';
      titleEl.textContent = cleanTitle;
    }

    const hasActor = AppState.hasSavedActor || (typeof localStorage !== 'undefined' && !!localStorage.getItem('memorizador_actor'));
    const tabsContainer = Utils.$('characterTabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = AppState.characters.map(c => {
        const isCurrent = hasActor && c === AppState.selectedActor;
        const total = AppState.speeches.filter(s => s.who === c).length;
        let actorLevels = isCurrent ? AppState.masteryLevels : StorageManager.loadProgress(c, AppState.speeches.length);
        const mastered = AppState.speeches.map((s, i) => s.who === c && (actorLevels[i] || 0) >= 3 ? 1 : 0).reduce((a, b) => a + b, 0);
        const pct = total > 0 ? Math.round((100 * mastered) / total) : 0;
        const statusBadge = isCurrent
          ? `${Icons.get('check', { size: 12, strokeWidth: 2.5 })} Em Cena`
          : `${pct}% dominado`;

        return `
          <button class="char-tab char-card ${isCurrent ? 'active' : ''}" data-actor="${Utils.escapeHtml(c)}" type="button">
            <div class="char-card-header">
              <div class="char-card-name">
                ${Icons.get('user', { size: 18 })}
                <span>${Utils.escapeHtml(c)}</span>
              </div>
              <span class="char-badge ${isCurrent ? 'active' : ''}">${statusBadge}</span>
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
      if (hasActor && AppState.selectedActor) {
        btnEnter.innerHTML = `
          ${Icons.get('theater', { size: 20 })}
          <span>Entrar em Cena como ${Utils.escapeHtml(AppState.selectedActor)}</span>
          ${Icons.get('arrowRight', { size: 18, strokeWidth: 2.5 })}
        `;
      } else {
        btnEnter.innerHTML = `
          ${Icons.get('theater', { size: 20 })}
          <span>Escolha seu Papel para Iniciar</span>
          ${Icons.get('arrowRight', { size: 18, strokeWidth: 2.5 })}
        `;
      }
    }

    this.populateBeatSelector();
    this.updateMissionSlots();
  },

  updateMissionSlots() {
    // 1. Slot Personagem / Papel
    const slotActorVal = Utils.$('slotActorValue');
    const slotActorSub = Utils.$('slotActorSub');
    if (slotActorVal && slotActorSub) {
      if (AppState.selectedActor) {
        slotActorVal.textContent = AppState.selectedActor;
        const total = AppState.speeches.filter(s => s.who === AppState.selectedActor).length;
        const mastered = AppState.speeches.map((s, i) => s.who === AppState.selectedActor && (AppState.masteryLevels[i] || 0) >= 3 ? 1 : 0).reduce((a, b) => a + b, 0);
        const pct = total > 0 ? Math.round((100 * mastered) / total) : 0;
        slotActorSub.textContent = `${mastered} de ${total} falas dominadas (${pct}%)`;
      } else {
        slotActorVal.textContent = 'Escolha seu Papel';
        slotActorSub.textContent = 'Toque para selecionar personagem';
      }
    }

    // 2. Slot Modo de Ensaio
    const slotModeVal = Utils.$('slotModeValue');
    const slotModeSub = Utils.$('slotModeSub');
    if (slotModeVal && slotModeSub) {
      const modeTitles = {
        minhas: 'Só Minhas Falas + Deixas',
        cena: 'Passada de Cena (Completa)',
        pingpong: 'Ping-Pong de Deixas',
        ponto: 'Ponto Eletrônico',
        fraquezas: 'Foco nas Fraquezas'
      };
      const modeSubs = {
        minhas: 'Foco apenas nas suas réplicas e deixas',
        cena: 'Todas as falas em ordem cronológica',
        pingpong: 'Cronômetro de reflexo de 4 segundos',
        ponto: 'Ensaio 100% auditivo hands-free',
        fraquezas: 'Repetição espaçada focada em dúvidas'
      };
      slotModeVal.textContent = modeTitles[AppState.rehearsalMode] || AppState.rehearsalMode;
      slotModeSub.textContent = modeSubs[AppState.rehearsalMode] || 'Modo ativo';
    }

    // 3. Slot Método de Memorização
    const slotMethodVal = Utils.$('slotMethodValue');
    const slotMethodSub = Utils.$('slotMethodSub');
    if (slotMethodVal && slotMethodSub) {
      const methodTitles = {
        oral: 'Oral / Cênico',
        quiz: 'Alternativas',
        typing: 'Digitação'
      };
      const methodSubs = {
        oral: 'Fale alto de cabeça e toque para conferir',
        quiz: 'Complete lacunas escolhendo opções',
        typing: 'Digite as palavras que faltam no texto'
      };
      slotMethodVal.textContent = methodTitles[AppState.studyMethod] || AppState.studyMethod;
      slotMethodSub.textContent = methodSubs[AppState.studyMethod] || 'Método ativo';
    }

    // 4. Slot Corte Cênico / Beat
    const slotBeatVal = Utils.$('slotBeatValue');
    const slotBeatSub = Utils.$('slotBeatSub');
    if (slotBeatVal && slotBeatSub) {
      if (AppState.selectedBeat === 'all' || !AppState.activeBeats[parseInt(AppState.selectedBeat, 10)]) {
        slotBeatVal.textContent = 'Cena Completa';
        slotBeatSub.textContent = `Todas as ${AppState.speeches.length} falas da peça`;
      } else {
        const beatObj = AppState.activeBeats[parseInt(AppState.selectedBeat, 10)];
        slotBeatVal.textContent = beatObj ? beatObj.name : 'Bloco Cênico';
        slotBeatSub.textContent = beatObj ? `Falas ${beatObj.startLine + 1} a ${beatObj.endLine + 1}` : 'Trecho selecionado';
      }
    }

    // 5. Card de Continuação Rápida (Smart Resume)
    const resumeCard = Utils.$('resumeRehearsalCard');
    const resumeTitle = Utils.$('resumeCardTitle');
    if (resumeCard && resumeTitle) {
      if (AppState.currentIndex > 0 && AppState.currentIndex < AppState.speeches.length) {
        resumeCard.style.display = 'flex';
        resumeTitle.textContent = `Continuar da fala ${AppState.currentIndex + 1} de ${AppState.speeches.length}`;
      } else {
        resumeCard.style.display = 'none';
      }
    }
  },

  populateBeatSelector() {
    const select = Utils.$('selectBeat');
    if (!select) return;
    const total = AppState.speeches.length;
    let html = `<option value="all">Cena Completa (Todas as ${total} falas)</option>`;
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
          <label>${Icons.get('mic', { size: 15 })} Voz para ${Utils.escapeHtml(actor)}:</label>
          <div class="voice-select-row">
            <div class="custom-select-box" style="flex:1;">
              <select id="voiceSelect_${safeId}" class="form-control char-voice-select" data-actor="${Utils.escapeHtml(actor)}">
                ${optionsHtml}
              </select>
              <div class="select-chevron">
                <svg class="app-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <button class="btn btn-secondary btn-test-voice" style="min-height:40px; padding:0 12px;" id="btnTestVoice_${safeId}" data-actor="${Utils.escapeHtml(actor)}" title="Ouvir teste da voz de ${Utils.escapeHtml(actor)}">
              ${Icons.get('volume', { size: 16 })}
            </button>
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
      stagePlay.textContent = (document.title || '').replace(/^.*?Ensaio Teatral · /, '') || 'Os Inventariantes';
    }
    const stageBeat = Utils.$('stageBeatTitle');
    if (stageBeat) {
      if (AppState.selectedBeat === 'all') {
        stageBeat.textContent = 'Cena Completa';
      } else {
        const b = AppState.activeBeats[parseInt(AppState.selectedBeat, 10)];
        stageBeat.textContent = b ? b.name : 'Cena Completa';
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
      const labels = { oral: 'Oral', quiz: 'Quiz', typing: 'Digitação' };
      methodPill.textContent = labels[AppState.studyMethod] || 'Oral';
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
        <button class="dock-hero-btn btn btn-primary" id="btnRestartScene" type="button">
          ${Icons.get('retry', { size: 18 })}
          <span>Recomeçar bloco</span>
        </button>
        <button class="dock-hero-btn btn btn-secondary" id="btnReturnLobbyFinished" type="button">
          ${Icons.get('chevronLeft', { size: 18 })}
          <span>Camarim</span>
        </button>
      `;
      return;
    }

    const speech = AppState.speeches[AppState.currentIndex];
    const isMyTurn = speech && speech.who === AppState.selectedActor;
    const level = AppState.masteryLevels[AppState.currentIndex] || 0;

    if (!isMyTurn) {
      const nextSpeech = AppState.speeches[AppState.currentIndex + 1];
      const nextIsMine = nextSpeech && nextSpeech.who === AppState.selectedActor;
      const partnerBtnText = nextIsMine ? 'Minha vez' : 'Avançar';
      dockArea.innerHTML = `
        <button class="dock-hero-btn btn btn-primary" id="btnContinuePartner" type="button">
          <span>${partnerBtnText}</span>
          ${Icons.get('chevronRight', { size: 18 })}
        </button>
      `;
      return;
    }

    if (AppState.isRetryState) {
      dockArea.innerHTML = `
        <button class="dock-hero-btn btn btn-retry" id="btnRetry" type="button">
          ${Icons.get('retry', { size: 18 })}
          <span>Tentar de novo agora</span>
        </button>
        <button class="dock-hero-btn btn btn-secondary" id="btnNextAfterWrong" type="button">
          <span>Seguir adiante</span>
          ${Icons.get('chevronRight', { size: 18 })}
        </button>
      `;
      return;
    }

    if (AppState.studyMethod === 'quiz' && !AppState.isRevealed) {
      if (AppState.quizStep >= (AppState.quizTargets?.length || 1)) {
        dockArea.innerHTML = `
          <button class="dock-hero-btn btn btn-success" id="btnNextQuiz" type="button">
            ${Icons.get('sparkles', { size: 18 })}
            <span>Avançar com Sucesso</span>
            ${Icons.get('chevronRight', { size: 18 })}
          </button>
        `;
      } else {
        dockArea.innerHTML = `
          <button class="dock-btn-hint btn btn-hint" id="btnHint" type="button" title="Dica da próxima palavra (D)">
            ${Icons.get('bulb', { size: 18 })}
            <span>Dica</span>
          </button>
          <button class="dock-hero-btn btn btn-secondary" id="btnRevealSpeech" type="button">
            ${Icons.get('eye', { size: 18 })}
            <span>Revelar Tudo</span>
          </button>
        `;
      }
      return;
    }

    if (AppState.studyMethod === 'typing' && !AppState.isRevealed) {
      if (AppState.typingCompleted) {
        dockArea.innerHTML = `
          <button class="dock-hero-btn btn btn-success" id="btnNextTyping" type="button">
            ${Icons.get('sparkles', { size: 18 })}
            <span>Avançar com Sucesso</span>
            ${Icons.get('chevronRight', { size: 18 })}
          </button>
        `;
      } else {
        dockArea.innerHTML = `
          <button class="dock-btn-hint btn btn-hint" id="btnHint" type="button" title="Preenche a palavra ativa (D)">
            ${Icons.get('bulb', { size: 18 })}
            <span>Dica</span>
          </button>
          <button class="dock-hero-btn btn btn-secondary" id="btnRevealSpeech" type="button">
            ${Icons.get('eye', { size: 18 })}
            <span>Revelar Tudo</span>
          </button>
        `;
      }
      return;
    }

    if (level === 0 && !AppState.alwaysStartHidden) {
      dockArea.innerHTML = `
        <button class="dock-hero-btn btn btn-primary" id="btnHideWords" type="button">
          <span>Já li — Esconder palavras</span>
          ${Icons.get('arrowRight', { size: 18, strokeWidth: 2.5 })}
        </button>
      `;
      return;
    }

    if (!AppState.isRevealed) {
      dockArea.innerHTML = `
        <button class="dock-btn-hint btn btn-hint" id="btnHint" type="button" title="Revela a próxima palavra oculta (D)">
          ${Icons.get('bulb', { size: 18 })}
          <span>Dica</span>
        </button>
        <button class="dock-hero-btn btn btn-primary" id="btnCheck" type="button">
          ${Icons.get('eye', { size: 18 })}
          <span>Conferir Fala</span>
        </button>
      `;
      return;
    }

    // isRevealed && !isRetryState
    dockArea.innerHTML = `
      <button class="dock-hero-btn btn btn-danger" id="btnWrong" type="button">
        ${Icons.get('x', { size: 18, strokeWidth: 2.5 })}
        <span>Errei</span>
      </button>
      <button class="dock-hero-btn btn btn-success" id="btnCorrect" type="button">
        ${Icons.get('check', { size: 18, strokeWidth: 2.5 })}
        <span>Acertei</span>
      </button>
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
        <div class="quiz-completed-banner">
          ${Icons.get('sparkles', { size: 20 })}
          <span>Excelente! Todas as ${targets.length} palavras foram completadas!</span>
        </div>
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
        <div class="quiz-instruction">
          ${Icons.get('puzzle', { size: 16 })}
          <span>Toque na palavra para completar a lacuna [ ? ] (${step + 1} de ${targets.length}):</span>
        </div>
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

        const wLen = Math.max(50, t.cleanWord.length * 15);
        return `<input type="text" class="cloze-input" data-word="${Utils.escapeHtml(t.cleanWord)}" placeholder="..." style="width:${wLen}px;" autocomplete="off" autocapitalize="off" spellcheck="false">`;
      }).join('');
    }).join('');

    return `
      <div>${textHtml}</div>
      <div class="typing-instruction">
        ${Icons.get('keyboard', { size: 15 })}
        <span>Digite as palavras que faltam nos campos. O cursor avança sozinho ao acertar!</span>
      </div>
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
            <div class="speech-veil-badge">
              ${Icons.get('eyeOff', { size: 15 })}
              <span>Fala oculta (${totalWords} palavras)</span>
            </div>
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
      }).join('') + `
        <div class="full-memory-placeholder">
          ${Icons.get('lock', { size: 18 })}
          <span>De memória total (${totalWords} palavras) — diga em voz alta!</span>
        </div>
      `;
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
        <span class="intent-label">
          ${Icons.get('target', { size: 15 })}
          <span>Ação:</span>
        </span>
        <span class="intent-text">${Utils.escapeHtml(currentIntent || 'Definir verbo de ação ou subtexto...')}</span>
        <button class="btn-intent-edit" id="btnEditIntent" type="button">
          ${currentIntent ? `${Icons.get('edit', { size: 13 })} Editar` : `${Icons.get('plus', { size: 13 })} Definir`}
        </button>
      </div>
    ` : '';

    if (AudioEngine.isRecordingNow) {
      html += `
        <div class="recording-bar">
          <span><span class="recording-pulse"></span><span class="audio-waveform-bars" style="margin-right:8px;"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></span>Gravando áudio real do elenco...</span>
          <span id="recSeconds">${AudioEngine.recordingSeconds}s</span>
          <button class="btn btn-record" style="min-height:36px; padding:0 12px; background:#fff;" id="btnStopRecord">
            ${Icons.get('stop', { size: 15 })}
            <span>Parar e Salvar</span>
          </button>
        </div>
      `;
    }

    if (speech.directions && speech.directions.length > 0) {
      html += speech.directions.map(d => `
        <div class="scene-direction">
          ${Icons.get('clapper', { size: 16 })}
          <span>${Utils.escapeHtml(d)}</span>
        </div>
      `).join('');
    }

    if (!isMyTurn) {
      html += `
        <div class="speech-card">
          <div class="card-meta-row">
            <div class="speaker-meta-left">
              <span class="speaker-name">${Utils.escapeHtml(speech.who)}</span>
              ${hasRealAudio ? `<span class="real-audio-badge">${Icons.get('mic', { size: 12 })} Áudio Real</span>` : ''}
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
              <button class="btn btn-audio" id="btnSpeakPartner">
                ${Icons.get('volume', { size: 16 })}
                <span>Ouvir</span>
              </button>
              <button class="btn btn-record" id="btnRecordPartner">
                ${Icons.get('mic', { size: 16 })}
                <span>${hasRealAudio ? 'Regravar voz real' : 'Gravar voz real'}</span>
              </button>
              ${hasRealAudio ? `
                <button class="btn btn-icon-only" id="btnDeleteCastAudio" title="Excluir gravação">
                  ${Icons.get('trash', { size: 16 })}
                </button>
              ` : ''}
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
                <span class="cue-tag">
                  A Deixa (${Utils.escapeHtml(prevSpeech.who)})
                  ${hasPrevRealAudio ? Icons.get('mic', { size: 13 }) : ''}
                </span>
                <div class="cue-actions">
                  <button class="btn-cue-audio" id="btnSpeakCue">
                    ${Icons.get('volume', { size: 15 })}
                    <span>Ouvir</span>
                  </button>
                  <button class="btn-cue-record" id="btnRecordCue">
                    ${Icons.get('mic', { size: 15 })}
                    <span>${hasPrevRealAudio ? 'Regravar' : 'Gravar colega'}</span>
                  </button>
                </div>
              </div>
              <p class="cue-text">“${cueBody}”</p>
            </div>
          `;
        } else {
          cueHtml = `<div class="cue-mini-badge">↳ Continuação da sua fala</div>`;
        }
      } else {
        cueHtml = `<div class="cue-mini-badge">${Icons.get('clapper', { size: 14 })} Abertura da cena</div>`;
      }
      html += cueHtml;

      if (AppState.rehearsalMode === 'pingpong' && !AppState.isRevealed) {
        html += `
          <div class="pingpong-timer-box">
            <div class="pingpong-countdown" id="pingPongCountdownNum">${AppState.pingPongCountdown}</div>
            <div class="pingpong-label">
              ${Icons.get('lightning', { size: 15 })}
              <span>Dispare a fala assim que a deixa terminar!</span>
            </div>
            <button class="btn btn-primary" style="margin-top:8px; min-height:46px; width:100%;" id="btnPingPongDone">
              ${Icons.get('lightning', { size: 16 })}
              <span>Já falei! Conferir</span>
            </button>
          </div>
        `;
      }

      if (AppState.rehearsalMode === 'ponto') {
        html += `
          <div style="margin-bottom:12px; text-align:center;">
            <button class="btn btn-secondary" style="min-height:38px; font-size:0.85rem;" id="btnTogglePonto">
              ${AppState.pontoPaused
                ? `${Icons.get('play', { size: 15 })} Continuar Ponto`
                : `${Icons.get('pause', { size: 15 })} Pausar Ponto`}
            </button>
          </div>
        `;
      }

      html += `
        <div class="speech-card">
          <div class="card-meta-row">
            <div class="speaker-meta-left">
              <span class="speaker-name">${Utils.escapeHtml(speech.who)}</span>
              ${hasRealAudio ? `<span class="real-audio-badge">${Icons.get('mic', { size: 12 })} Minha Gravação</span>` : ''}
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-icon-only" id="btnToggleRubrics" title="Alternar visibilidade de rubricas" style="font-size:0.75rem; padding:2px 8px; width:auto; border-radius:10px;">
                ${AppState.hideRubrics ? 'Rubricas: Ocultas' : 'Rubricas: Visíveis'}
              </button>
              <span class="mastery-pill lv${level}">${AppConfig.MASTERY_LEVEL_NAMES[level]}</span>
            </div>
          </div>
          ${intentHtml}
          <div class="speech-content ${AppState.isRevealed ? 'revealed' : ''}" id="speechDisplay">
            ${this.renderSpeechHtml(speech, AppState.currentIndex, level, AppState.hintsUsedThisLine, AppState.isRevealed)}
          </div>
          <div class="action-row">
            <div class="action-secondary-row">
              <button class="btn btn-audio" id="btnAudioMy">
                ${Icons.get('volume', { size: 16 })}
                <span>Ouvir</span>
              </button>
              <button class="btn btn-record" id="btnRecordMy">
                ${Icons.get('mic', { size: 16 })}
                <span>${hasRealAudio ? 'Regravar voz' : 'Gravar voz'}</span>
              </button>
              ${hasRealAudio ? `
                <button class="btn btn-icon-only" id="btnDeleteCastAudio" title="Excluir gravação">
                  ${Icons.get('trash', { size: 16 })}
                </button>
              ` : ''}
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
      Utils.$('fullScriptModalTitle').innerHTML = `
        ${Icons.get('book', { size: 18 })}
        <span>${Utils.escapeHtml(playTitle)}</span>
      `;
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

      if (query && !sp.spokenText.toLowerCase().includes(query) && !sp.who.toLowerCase().includes(query)) {
        continue;
      }

      matchedCount++;
      const isMine = sp.who === AppState.selectedActor;
      const formattedContent = sp.segments.map(s => {
        if (s.type === 'rubric') {
          return `<span class="rubric">(${Utils.escapeHtml(s.text)})</span>`;
        }
        return Utils.escapeHtml(s.text);
      }).join(' ');

      html += `
        <div class="script-read-item ${isMine ? 'is-mine' : ''}" data-idx="${i}">
          <div class="script-read-header">
            <span class="script-read-speaker ${isMine ? 'highlight' : ''}">${Utils.escapeHtml(sp.who)}</span>
            <span class="script-read-num">Fala #${i + 1}</span>
          </div>
          ${sp.directions && sp.directions.length > 0
            ? sp.directions.map(d => `
                <div class="scene-direction" style="margin-bottom:6px;">
                  ${Icons.get('clapper', { size: 14 })}
                  <span>${Utils.escapeHtml(d)}</span>
                </div>
              `).join('')
            : ''}
          <div class="script-read-text">${formattedContent}</div>
          <div class="script-read-actions">
            <button class="btn-read-jump" type="button" data-jump="${i}">
              ${Icons.get('play', { size: 14 })}
              <span>Ensaiar desta fala ›</span>
            </button>
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
        <h2 style="font-size:1.4rem; margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:8px;">
          ${Icons.get('sparkles', { size: 22 })}
          <span>Fim do Bloco / Cena!</span>
        </h2>
        <p style="color:var(--fg-muted); margin-bottom:24px;">Você percorreu todas as falas selecionadas deste ensaio.</p>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-primary" id="btnRestartScene">Recomeçar bloco</button>
          <button class="btn btn-secondary" id="btnReviewWeak">Treinar só fraquezas</button>
          <button class="btn btn-secondary" id="btnReturnLobbyFinished">‹ Voltar ao Camarim</button>
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
            <span class="index-item-who">
              #${item.index + 1} · ${Utils.escapeHtml(item.who)}
              ${item.hasRec ? Icons.get('mic', { size: 12 }) : ''}
            </span>
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
