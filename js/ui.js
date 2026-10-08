// 7. CONTROLADOR DE INTERFACE (UIController) - STAGEPRO STUDIO
const UIController = {
  currentRenderId: 0,
  lastFocusedElement: null,

  openModal(modalId, openerEl = null) {
    const modal = Utils.$(modalId);
    if (!modal) return;
    this.lastFocusedElement = openerEl || (typeof document !== 'undefined' ? document.activeElement : null);
    modal.hidden = false;
    if (modalId === 'modalSettings') {
      this.populateAISettings();
    }
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
    const welcomeEl = Utils.$('camarimWelcomeContainer');
    if (welcomeEl) {
      if (!hasActor) {
        welcomeEl.innerHTML = `
          <div class="camarim-welcome-card" id="camarimWelcomeCard">
            <div class="welcome-card-header">
              <div class="welcome-badge">
                ${Icons.get('sparkles', { size: 14 })}
                <span>PRIMEIRO PASSO</span>
              </div>
              <h3 class="welcome-card-title">Qual personagem você vai interpretar?</h3>
              <p class="welcome-card-desc">Escolha quem você é nesta cena para organizar suas deixas e o ensaio:</p>
            </div>
            <div class="welcome-actors-row">
              ${AppState.characters.map(c => `
                <button type="button" class="btn btn-secondary welcome-actor-btn" data-actor="${Utils.escapeHtml(c)}">
                  ${Icons.get('user', { size: 14 })}
                  <span>${Utils.escapeHtml(c)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        welcomeEl.innerHTML = '';
      }
    }

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
    const hasActor = AppState.hasSavedActor || (typeof localStorage !== 'undefined' && !!localStorage.getItem('memorizador_actor'));

    // 1. Slot Personagem / Papel
    const slotActorVal = Utils.$('slotActorValue');
    const slotActorSub = Utils.$('slotActorSub');
    if (slotActorVal && slotActorSub) {
      if (AppState.selectedActor) {
        slotActorVal.textContent = AppState.selectedActor;
        if (hasActor) {
          const total = AppState.speeches.filter(s => s.who === AppState.selectedActor).length;
          const mastered = AppState.speeches.map((s, i) => s.who === AppState.selectedActor && (AppState.masteryLevels[i] || 0) >= 3 ? 1 : 0).reduce((a, b) => a + b, 0);
          const pct = total > 0 ? Math.round((100 * mastered) / total) : 0;
          slotActorSub.textContent = `${mastered} de ${total} falas dominadas (${pct}%)`;
        } else {
          slotActorSub.textContent = 'Toque para confirmar quem você interpreta';
        }
      } else {
        slotActorVal.textContent = 'Escolha seu Papel';
        slotActorSub.textContent = 'Toque para selecionar quem você interpreta';
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

  populateAISettings() {
    if (typeof AIService === 'undefined') return;
    const inputKey = Utils.$('inputGeminiApiKey');
    const selectModel = Utils.$('selectGeminiModel');
    const feedback = Utils.$('geminiConnectionFeedback');

    if (inputKey) {
      inputKey.value = AIService.getApiKey();
    }
    if (selectModel) {
      selectModel.value = AIService.getModel();
    }
    if (feedback) {
      if (AIService.hasKey()) {
        feedback.style.display = 'block';
        feedback.className = 'file-feedback ai-connection-feedback ai-feedback-success';
        feedback.textContent = `Chave configurada para ${AIService.getModel()}`;
      } else {
        feedback.style.display = 'none';
        feedback.textContent = '';
      }
    }
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
    const intentMatch = (currentIntent || '').match(/^\[(.*?)\]\s*(.*)$/);
    const intentContentHtml = intentMatch
      ? `<span class="intent-action-badge">${Utils.escapeHtml(intentMatch[1])}</span><span class="intent-subtext-body">${Utils.escapeHtml(intentMatch[2])}</span>`
      : `<span class="intent-text">${Utils.escapeHtml(currentIntent || 'Definir verbo de ação ou subtexto...')}</span>`;

    const intentHtml = (currentIntent || isMyTurn) ? `
      <div class="intent-bar" id="intentBarCurrent" title="Ação dramática / intenção da personagem (Toque para editar)">
        <span class="intent-label">
          ${Icons.get('target', { size: 15 })}
          <span>Ação:</span>
        </span>
        ${intentContentHtml}
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

          const hook = (typeof ScriptParser !== 'undefined' && typeof ScriptParser.detectCueTrigger === 'function')
            ? ScriptParser.detectCueTrigger(prevSpeech.spokenText, speech.spokenText)
            : null;

          const highlightTrigger = (txt) => {
            if (!txt) return '';
            const escapedTxt = Utils.escapeHtml(txt);
            if (!hook || !hook.triggerWord || hook.triggerWord.length < 3) return escapedTxt;
            const tw = Utils.escapeHtml(hook.triggerWord);
            const regex = new RegExp(`(^|[^a-zA-ZÀ-ÖØ-öø-ÿ0-9])(${tw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]|$)`, 'i');
            return escapedTxt.replace(regex, (match, p1, p2) => `${p1}<span class="cue-trigger-word" title="Palavra-gatilho">${p2}</span>`);
          };

          const cueStartHtml = cueStart ? highlightTrigger(cueStart) : '';
          const cueEndHtml = highlightTrigger(cueEnd);

          const cueBody = cueStartHtml
            ? `${cueStartHtml} <span class="cue-highlight-end">${cueEndHtml}</span>`
            : `<span class="cue-highlight-end">${cueEndHtml}</span>`;

          const triggerBadgeHtml = (hook && hook.triggerWord)
            ? `<div class="cue-trigger-badge">${Icons.get('lightning', { size: 12 })} <span>Engate cênico: <strong>"${Utils.escapeHtml(hook.triggerWord)}"</strong></span></div>`
            : '';

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
              ${triggerBadgeHtml}
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

  scriptFontSizeLevel: 0,
  isHighlighterActive: false,

  adjustScriptFontSize(delta) {
    this.scriptFontSizeLevel = Math.max(-2, Math.min(3, this.scriptFontSizeLevel + delta));
    const container = Utils.$('fullScriptContainer');
    const badge = Utils.$('scriptFontSizeBadge');
    const percentages = ['80%', '90%', '100%', '115%', '130%', '150%'];
    const sizes = ['0.86rem', '0.94rem', '1.05rem', '1.20rem', '1.36rem', '1.55rem'];
    const currentIdx = 2 + this.scriptFontSizeLevel;
    if (container) {
      container.style.fontSize = sizes[currentIdx] || '1.05rem';
    }
    if (badge) {
      badge.textContent = percentages[currentIdx] || '100%';
    }
  },

  getScriptHighlights() {
    try {
      const pId = AppState.getPlayId();
      const raw = localStorage.getItem(`memorizador_highlights_${pId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  toggleScriptHighlight(speechIdx) {
    try {
      const pId = AppState.getPlayId();
      let list = this.getScriptHighlights();
      if (list.includes(speechIdx)) {
        list = list.filter(i => i !== speechIdx);
      } else {
        list.push(speechIdx);
      }
      localStorage.setItem(`memorizador_highlights_${pId}`, JSON.stringify(list));
      return list.includes(speechIdx);
    } catch (e) {
      return false;
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
    if (beatSelect) {
      const currentVal = beatSelect.value || filterBeat;
      if (!beatSelect.children || beatSelect.children.length <= 1) {
        let bHtml = `<option value="all">Todas as Cenas (Peça Completa)</option>`;
        AppState.activeBeats.forEach((b, idx) => {
          bHtml += `<option value="${idx}">${Utils.escapeHtml(b.name)}</option>`;
        });
        beatSelect.innerHTML = bHtml;
        beatSelect.value = currentVal;
      }
    }

    // Seletor de foco / destaque de personagem
    const highlightActorSelect = Utils.$('selectHighlightActor');
    const focusedActor = highlightActorSelect ? highlightActorSelect.value : 'all';
    if (highlightActorSelect && (!highlightActorSelect.children || highlightActorSelect.children.length <= 1)) {
      let actHtml = `<option value="all">Todos os Personagens</option>`;
      AppState.characters.forEach(c => {
        actHtml += `<option value="${Utils.escapeHtml(c)}">Destacar: ${Utils.escapeHtml(c)}</option>`;
      });
      highlightActorSelect.innerHTML = actHtml;
      highlightActorSelect.value = focusedActor || 'all';
    }

    if (focusedActor && focusedActor !== 'all') {
      container.classList.add('has-actor-focus');
    } else {
      container.classList.remove('has-actor-focus');
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
    const highlights = this.getScriptHighlights();
    let matchedCount = 0;
    let html = '';

    // Folha de Rosto Dramatúrgica (quando lendo do início sem filtro de busca)
    if (filterBeat === 'all' && !query) {
      html += `
        <header class="dramaturgy-book-cover">
          <div class="dramaturgy-badge">
            ${Icons.get('theater', { size: 14 })}
            <span>TEXTO DRAMATÚRGICO INTEGRAL · LEITURA CONTÍNUA</span>
          </div>
          <h1 class="dramaturgy-title">${Utils.escapeHtml(playTitle)}</h1>
          <div class="dramaturgy-cast-summary">
            <span class="dramaturgy-cast-label">Cores do Elenco em Cena</span>
            <div class="dramaturgy-cast-pills">
              ${AppState.characters.map((c, cIdx) => {
                const isMine = c === AppState.selectedActor;
                const colorCls = `char-color-${cIdx % 6}`;
                return `
                  <span class="dramaturgy-character-pill ${isMine ? 'active-role' : ''}">
                    <span class="${colorCls}" style="font-weight:900;">•</span>
                    <span>${Utils.escapeHtml(c)}${isMine ? ' (Seu Papel)' : ''}</span>
                  </span>
                `;
              }).join('')}
            </div>
          </div>
        </header>
      `;
    }

    // Mapa de quebras de cena e beats
    const beatStartMap = {};
    AppState.activeBeats.forEach((b, idx) => {
      beatStartMap[b.start] = { ...b, index: idx };
    });

    for (let i = start; i <= end; i++) {
      const sp = AppState.speeches[i];
      if (!sp) continue;

      if (query && !sp.spokenText.toLowerCase().includes(query) && !sp.who.toLowerCase().includes(query)) {
        continue;
      }

      matchedCount++;
      const isMine = sp.who === AppState.selectedActor;
      const isHighlighted = highlights.includes(i);
      const actorIdx = AppState.characters.indexOf(sp.who);
      const colorClass = `char-color-${actorIdx >= 0 ? (actorIdx % 6) : 0}`;
      const isFocused = (focusedActor === 'all' || focusedActor === sp.who);

      // Cabeçalho de Cena / Beat dramático
      if (!query && beatStartMap[i]) {
        const beatInfo = beatStartMap[i];
        html += `
          <div class="theatrical-scene-break" id="sceneBeat_${beatInfo.index}">
            <div class="theatrical-scene-tag">CENA · BEAT ${beatInfo.index + 1}</div>
            <h3 class="theatrical-scene-heading">${Utils.escapeHtml(beatInfo.name)}</h3>
          </div>
        `;
      }

      // Rubricas gerais de cena / cenografia antes da fala
      if (sp.directions && sp.directions.length > 0) {
        sp.directions.forEach(d => {
          html += `
            <div class="theatrical-stage-direction">
              <span class="direction-marker">${Icons.get('clapper', { size: 13 })}</span>
              <p class="direction-text"><em>[${Utils.escapeHtml(d)}]</em></p>
            </div>
          `;
        });
      }

      // Formatar fala com rubricas parentéticas elegantes
      const formattedSegments = sp.segments.map(s => {
        if (s.type === 'rubric') {
          return `<span class="script-rubric-inline">(${Utils.escapeHtml(s.text)})</span>`;
        }
        return `<span class="script-spoken-words">${Utils.escapeHtml(s.text)}</span>`;
      }).join(' ');

      // Parágrafo contínuo dramatúrgico (estilo livro / ePub / PDF)
      html += `
        <div class="script-read-item script-flow-paragraph ${isMine ? 'is-my-role' : ''} ${isHighlighted ? 'is-highlighted' : ''} ${isFocused ? 'is-focused-actor' : 'is-dimmed'}" data-idx="${i}">
          <button class="btn-read-jump script-marginalia-jump" type="button" data-jump="${i}" title="Iniciar ensaio a partir da fala #${i + 1}">
            #${i + 1} ${Icons.get('play', { size: 10 })}
          </button>
          <span class="script-character-lead ${colorClass}">
            <strong>${Utils.escapeHtml(sp.who)}</strong>${isMine ? '<span class="script-mine-dot" title="Seu personagem">•</span>' : ''}:
          </span>
          <span class="script-dialogue-text">${formattedSegments}</span>
        </div>
      `;
    }

    if (matchedCount === 0) {
      html = `
        <div class="theatrical-empty-state">
          ${Icons.get('book', { size: 32 })}
          <p>Nenhuma fala encontrada com o termo buscado.</p>
        </div>
      `;
    }

    container.innerHTML = html;
    if (statsEl) {
      statsEl.textContent = `${matchedCount} de ${AppState.speeches.length} falas · Leitura de livro contínua`;
    }

    // Ações de salto ao palco
    const jumps = container.querySelectorAll('.btn-read-jump');
    jumps.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const targetIdx = parseInt(btn.dataset.jump, 10);
        if (Utils.$('modalFullScript')) Utils.$('modalFullScript').hidden = true;
        AppController.goToSpeech(targetIdx);
        AppController.enterStage();
      };
    });

    // Clique no parágrafo para grifar quando o marca-texto estiver ativo
    const paragraphs = container.querySelectorAll('.script-flow-paragraph');
    paragraphs.forEach(p => {
      p.onclick = (e) => {
        if (e.target.closest('.btn-read-jump')) return;
        const idx = parseInt(p.dataset.idx, 10);
        if (isNaN(idx)) return;
        if (this.isHighlighterActive) {
          const isNow = this.toggleScriptHighlight(idx);
          p.classList.toggle('is-highlighted', isNow);
          Utils.triggerHaptic('tap');
        }
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
    let allItems = [];

    const isDefault = ScriptParser.isDefaultPlay(AppState.activeScriptText);
    for (let idx = range.start; idx <= range.end; idx++) {
      if (idx < AppState.speeches.length) {
        const s = AppState.speeches[idx];
        const hasRec = await StorageManager.getCastAudio(idx);
        const intent = StorageManager.getSpeechIntent(idx, isDefault);
        allItems.push({ ...s, index: idx, level: AppState.masteryLevels[idx] || 0, hasRec, intent });
      }
    }

    // Atualizar contadores numéricos nas abas de filtro
    const modalIndexEl = Utils.$('modalIndex');
    if (modalIndexEl) {
      const totalCount = allItems.length;
      const mineCount = allItems.filter(s => s.who === AppState.selectedActor).length;
      const weakCount = allItems.filter(s => s.who === AppState.selectedActor && s.level < 3).length;
      const recCount = allItems.filter(s => s.hasRec).length;

      const tabs = modalIndexEl.querySelectorAll('.filter-tab');
      tabs.forEach(tab => {
        if (!tab || !tab.dataset) return;
        const f = tab.dataset.filter;
        let count = totalCount;
        let label = 'Todas';
        if (f === 'mine') { count = mineCount; label = 'Minhas'; }
        else if (f === 'weak') { count = weakCount; label = 'Dúvidas'; }
        else if (f === 'recorded') { count = recCount; label = 'Áudios'; }

        tab.classList.toggle('active', f === (AppState.currentFilter || 'all'));
        tab.innerHTML = `<span>${label}</span><span class="filter-tab-count">${count}</span>`;
      });
    }

    let items = allItems;
    if (AppState.currentFilter === 'mine') {
      items = items.filter(s => s.who === AppState.selectedActor);
    } else if (AppState.currentFilter === 'weak') {
      items = items.filter(s => s.who === AppState.selectedActor && s.level < 3);
    } else if (AppState.currentFilter === 'recorded') {
      items = items.filter(s => s.hasRec);
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:32px 16px; color:var(--fg-muted);">
          <p style="margin:0 0 6px; font-weight:700;">Nenhuma fala encontrada neste filtro.</p>
          <span style="font-size:0.8rem;">Alterne a aba de filtro acima para visualizar outras réplicas da cena.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const isCurrent = item.index === AppState.currentIndex;
      const isMine = item.who === AppState.selectedActor;
      const badge = isMine
        ? `<span class="mastery-pill lv${item.level}">${AppConfig.MASTERY_LEVEL_NAMES[item.level] || ('Nível ' + (item.level + 1))}</span>`
        : `<span class="mastery-pill partner">Colega</span>`;

      const intentHtml = item.intent
        ? `<div class="index-item-intent">${Icons.get('sparkles', { size: 11 })} <em>${Utils.escapeHtml(item.intent)}</em></div>`
        : '';

      return `
        <div class="index-item ${isCurrent ? 'current' : ''} ${isMine ? 'is-mine' : ''}" data-idx="${item.index}">
          <div class="index-item-meta">
            <span class="index-item-who">
              <span class="index-num">#${item.index + 1}</span>
              <strong class="${isMine ? 'highlight' : ''}">${Utils.escapeHtml(item.who)}</strong>
              ${item.hasRec ? `<span class="badge-rec" title="Áudio gravado">${Icons.get('mic', { size: 11 })}</span>` : ''}
            </span>
            ${badge}
          </div>
          ${intentHtml}
          <p class="index-item-text">${Utils.escapeHtml(item.spokenText || item.segments.map(s => s.text).join(' '))}</p>
        </div>
      `;
    }).join('');
  },

  async renderCaderno(selectedSpeechIdx = null) {
    // 1. Carregar notas livres
    const freeNotesEl = Utils.$('cadernoFreeNotes');
    const wordCountEl = Utils.$('cadernoWordCount');
    if (freeNotesEl) {
      const savedNotes = StorageManager.getActorNotes();
      freeNotesEl.value = savedNotes;
      if (wordCountEl) {
        const words = savedNotes.trim() ? savedNotes.trim().split(/\s+/).length : 0;
        wordCountEl.textContent = `${words} palavra${words === 1 ? '' : 's'}`;
      }
    }

    // 2. Preencher seletor de falas
    const speechSelect = Utils.$('cadernoSpeechSelect');
    if (speechSelect) {
      let optionsHtml = '<option value="">-- Nenhuma fala selecionada (Escrever apenas livremente) --</option>';
      AppState.speeches.forEach((s, idx) => {
        const snippet = s.spokenText.length > 50 ? s.spokenText.slice(0, 48) + '...' : s.spokenText;
        optionsHtml += `<option value="${idx}">Fala #${idx + 1} [${Utils.escapeHtml(s.who)}]: ${Utils.escapeHtml(snippet)}</option>`;
      });
      speechSelect.innerHTML = optionsHtml;

      const targetIdx = (selectedSpeechIdx !== null && selectedSpeechIdx !== undefined && selectedSpeechIdx !== '')
        ? String(selectedSpeechIdx)
        : '';

      speechSelect.value = targetIdx;
      if (targetIdx !== '') {
        await this.renderCadernoSpeechDetail(parseInt(targetIdx, 10));
      } else {
        const detailContainer = Utils.$('cadernoSpeechDetailContainer');
        if (detailContainer) detailContainer.hidden = true;
      }
    }

    // 3. Atualizar e popular seletor de alvo de gravacao
    const targetSelect = Utils.$('cadernoRecordTargetSelect');
    if (targetSelect) {
      const curSelected = targetSelect.value || (selectedSpeechIdx !== null && selectedSpeechIdx !== undefined ? String(selectedSpeechIdx) : 'general');
      let targetOpts = `
        <option value="general">Gravação Geral de Ensaio (Notas / Tom de Voz)</option>
        <option value="full_scene">Texto Completo / Corrida Geral de Cena</option>
      `;
      if (AppState.speeches[AppState.currentIndex]) {
        const curSp = AppState.speeches[AppState.currentIndex];
        targetOpts += `<option value="current">Fala Atual no Palco (#${AppState.currentIndex + 1} · ${Utils.escapeHtml(curSp.who)})</option>`;
      }
      AppState.speeches.forEach((s, idx) => {
        const snip = s.spokenText.length > 42 ? s.spokenText.slice(0, 40) + '...' : s.spokenText;
        targetOpts += `<option value="${idx}">Fala #${idx + 1} (${Utils.escapeHtml(s.who)}): "${Utils.escapeHtml(snip)}"</option>`;
      });
      targetSelect.innerHTML = targetOpts;
      if (selectedSpeechIdx !== null && selectedSpeechIdx !== undefined && selectedSpeechIdx !== '') {
        targetSelect.value = String(selectedSpeechIdx);
      } else if (curSelected) {
        targetSelect.value = curSelected;
      }
      targetSelect.onchange = () => {
        this.updateCadernoRecordTarget();
      };
    }

    this.updateCadernoRecordTarget();

    // 4. Renderizar lista de gravacoes
    await this.renderCadernoRecordings();
  },

  updateCadernoRecordTarget() {
    const targetBadge = Utils.$('cadernoRecordTargetBadge');
    const targetSelect = Utils.$('cadernoRecordTargetSelect');
    const speechSelect = Utils.$('cadernoSpeechSelect');
    if (!targetBadge) return;

    const val = targetSelect ? targetSelect.value : (speechSelect ? speechSelect.value : '');
    if (val === 'general') {
      targetBadge.textContent = 'Gravação Geral de Ensaio';
    } else if (val === 'full_scene') {
      targetBadge.textContent = 'Texto Completo / Corrida de Cena';
    } else if (val === 'current') {
      const cur = AppState.speeches[AppState.currentIndex];
      targetBadge.textContent = cur ? `Fala #${AppState.currentIndex + 1} (${cur.who})` : 'Fala Atual';
    } else if (val !== '' && !isNaN(parseInt(val, 10)) && AppState.speeches[parseInt(val, 10)]) {
      const sp = AppState.speeches[parseInt(val, 10)];
      targetBadge.textContent = `Fala #${parseInt(val, 10) + 1} (${sp.who})`;
    } else {
      targetBadge.textContent = 'Gravação Geral de Ensaio';
    }
  },

  async renderCadernoSpeechDetail(speechIdx) {
    const detailContainer = Utils.$('cadernoSpeechDetailContainer');
    if (!detailContainer) return;

    if (speechIdx === null || speechIdx === undefined || isNaN(speechIdx) || !AppState.speeches[speechIdx]) {
      detailContainer.hidden = true;
      return;
    }

    const speech = AppState.speeches[speechIdx];
    const isDefault = ScriptParser.isDefaultPlay(AppState.activeScriptText);
    const existingNote = StorageManager.getSpeechNote(speechIdx);
    const existingIntent = StorageManager.getSpeechIntent(speechIdx, isDefault);
    const hasAudio = await StorageManager.getCastAudio(speechIdx);

    detailContainer.innerHTML = `
      <div class="caderno-quote-box">
        <div class="caderno-quote-who">${Utils.escapeHtml(speech.who)} · Fala #${speechIdx + 1}</div>
        <div class="caderno-quote-text">"${Utils.escapeHtml(speech.spokenText)}"</div>
      </div>

      <div class="caderno-field-group">
        <label for="cadernoSpeechNote">Anotacao desta fala (intencao cenica, subtexto, pausas):</label>
        <textarea id="cadernoSpeechNote" class="form-control" rows="3" placeholder="Ex: Pausa dramatica antes de responder, olhar firme...">${Utils.escapeHtml(existingNote)}</textarea>
      </div>

      <div class="caderno-field-group">
        <label for="cadernoSpeechIntent">Acao Dramatica / Intencao de Stanislavski:</label>
        <input type="text" id="cadernoSpeechIntent" class="form-control" value="${Utils.escapeHtml(existingIntent)}" placeholder="Ex: Intimidar para salvar o pai">
      </div>

      <div class="caderno-speech-actions">
        ${hasAudio ? `
          <button type="button" class="btn btn-audio btn-play-speech-audio" id="btnCadernoPlaySpeechAudio" data-idx="${speechIdx}">
            ${Icons.get('volume', { size: 15 })}
            <span>Ouvir Gravacao</span>
          </button>
          <button type="button" class="btn btn-secondary" id="btnCadernoDeleteSpeechAudio" data-idx="${speechIdx}" title="Excluir gravacao">
            ${Icons.get('trash', { size: 15 })}
            <span>Excluir Audio</span>
          </button>
        ` : `
          <span style="font-size:0.8rem; color:var(--fg-muted);">Nenhum audio gravado nesta fala.</span>
        `}
        <button type="button" class="btn btn-primary" id="btnCadernoJumpToStage" data-idx="${speechIdx}" style="margin-left:auto;">
          ${Icons.get('theater', { size: 15 })}
          <span>Ensaiar no Palco</span>
        </button>
      </div>
    `;

    detailContainer.hidden = false;
  },

  async renderCadernoRecordings() {
    const listEl = Utils.$('cadernoRecordingsList');
    const badgeEl = Utils.$('cadernoRecordingsCountBadge');
    if (!listEl) return;

    try {
      const records = await StorageManager.getAllRecordings();
      const currentPlayId = AppState.getPlayId();
      const playRecordings = records.filter(r => {
        if (!r) return false;
        if (r.playId) return r.playId === currentPlayId;
        return currentPlayId === 'default';
      });

      if (badgeEl) {
        badgeEl.textContent = String(playRecordings.length);
      }

      if (playRecordings.length === 0) {
        listEl.innerHTML = `
          <div class="caderno-empty-state">
            <div class="caderno-empty-icon">${Icons.get('mic', { size: 28 })}</div>
            <div class="caderno-empty-title">Nenhuma gravacao nesta peca</div>
            <p class="caderno-empty-desc">
              Grave sua voz usando o gravador acima ou durante o ensaio das deixas no Palco.
            </p>
          </div>
        `;
        return;
      }

      playRecordings.sort((a, b) => {
        if (typeof a.speechIdx === 'number' && typeof b.speechIdx === 'number') {
          return a.speechIdx - b.speechIdx;
        }
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      listEl.innerHTML = playRecordings.map(item => {
        const strId = String(item.id || '');
        const isGeneral = item.speechIdx === 'general' || strId.includes('_general');
        const isFullScene = item.speechIdx === 'full_scene' || strId.includes('_scene') || strId.includes('_full_scene');
        const numIdx = typeof item.speechIdx === 'number' ? item.speechIdx : (!isNaN(parseInt(item.speechIdx, 10)) ? parseInt(item.speechIdx, 10) : null);
        const hasIdx = numIdx !== null && AppState.speeches[numIdx];

        let title = 'Gravação Geral de Ensaio';
        let badgeText = 'Geral';
        let snippet = `Gravado em ${new Date(item.timestamp || Date.now()).toLocaleDateString('pt-BR')}`;

        if (isFullScene) {
          title = 'Texto Completo / Corrida Geral de Cena';
          badgeText = 'Cena Completa';
          snippet = `Gravação contínua do ensaio · ${new Date(item.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (isGeneral) {
          title = 'Gravação Geral de Ensaio';
          badgeText = 'Geral';
          snippet = `Notas vocais e ritmo · ${new Date(item.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (hasIdx) {
          const sp = AppState.speeches[numIdx];
          title = `Fala #${numIdx + 1} · ${Utils.escapeHtml(sp.who)}`;
          badgeText = sp.who;
          snippet = `"${Utils.escapeHtml(sp.spokenText.slice(0, 70))}${sp.spokenText.length > 70 ? '...' : ''}"`;
        }

        const dataIdxVal = numIdx !== null ? numIdx : (isFullScene ? 'full_scene' : 'general');

        return `
          <div class="caderno-audio-item" data-id="${Utils.escapeHtml(String(item.id))}" data-idx="${dataIdxVal}">
            <div class="caderno-audio-info">
              <div class="caderno-audio-title">
                ${Icons.get('mic', { size: 14 })}
                <span>${title}</span>
                <span class="char-badge active" style="font-size:0.65rem; padding:2px 6px;">${badgeText}</span>
              </div>
              <div class="caderno-audio-snippet">${snippet}</div>
            </div>
            <div class="caderno-audio-actions">
              <button type="button" class="btn-play-caderno-audio" data-id="${Utils.escapeHtml(String(item.id))}" data-idx="${dataIdxVal}">
                ${Icons.get('play', { size: 14 })}
                <span>Ouvir</span>
              </button>
              <button type="button" class="btn-delete-caderno-audio" data-id="${Utils.escapeHtml(String(item.id))}" data-idx="${dataIdxVal}" title="Excluir gravação" aria-label="Excluir">
                ${Icons.get('trash', { size: 14 })}
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<p style="color:var(--fg-muted); font-size:0.85rem;">Nao foi possivel carregar as gravacoes salvas.</p>';
    }
  },

  // 7.1 ESTADO DO FLUXO DE IMPORTAÇÃO & PERSONALIZAÇÃO
  ImportFlowState: {
    rawText: '',
    title: '',
    author: '',
    characters: [],
    speeches: [],
    beatStrategy: 'headers',
    source: 'heuristic_offline'
  },

  // 7.2 RENDERIZAÇÃO DO CATÁLOGO DE PEÇAS
  renderPlayCatalog() {
    const listEl = Utils.$('playCatalogList');
    if (!listEl) return;
    if (typeof PlayStore === 'undefined') {
      listEl.innerHTML = '<p class="caderno-empty-desc">Catálogo de peças indisponível.</p>';
      return;
    }

    const allPlays = PlayStore.getAll();
    const activePlayId = PlayStore.getActivePlayId();

    if (allPlays.length === 0) {
      listEl.innerHTML = '<p class="caderno-empty-desc">Nenhum roteiro cadastrado na biblioteca.</p>';
      return;
    }

    listEl.innerHTML = `
      <div class="play-catalog-grid">
        ${allPlays.map(play => {
          const stats = PlayStore.getStats(play.id) || {
            totalSpeeches: 0,
            characterCount: 0,
            characters: [],
            beatsCount: 0,
            masteryPercentage: 0
          };
          const isActive = play.id === activePlayId;
          const charsPreview = stats.characters.slice(0, 3).join(', ') + (stats.characters.length > 3 ? '...' : '');

          return `
            <div class="play-catalog-card ${isActive ? 'active-play-card' : ''}" data-play-id="${Utils.escapeHtml(play.id)}">
              <div class="play-card-header">
                <div class="play-card-title-group">
                  <span class="play-card-title">${Utils.escapeHtml(play.title)}</span>
                  <span class="play-card-author">${Utils.escapeHtml(play.author || 'Autor não informado')}</span>
                </div>
                <div class="play-card-badges">
                  ${isActive ? `<span class="play-badge-active">${Icons.get('check', { size: 12, strokeWidth: 2.5 })} Em Ensaio</span>` : ''}
                  ${play.isDefault ? `<span class="play-badge-default">Peça Modelo</span>` : ''}
                </div>
              </div>

              <div class="play-card-stats-row">
                <span class="play-card-stat-item">
                  ${Icons.get('speak', { size: 14 })}
                  <span><strong>${stats.totalSpeeches}</strong> falas</span>
                </span>
                <span class="play-card-stat-item">
                  ${Icons.get('user', { size: 14 })}
                  <span><strong>${stats.characterCount}</strong> papéis (${Utils.escapeHtml(charsPreview || 'Elenco')})</span>
                </span>
                <span class="play-card-stat-item">
                  ${Icons.get('clapper', { size: 14 })}
                  <span><strong>${stats.beatsCount}</strong> beats</span>
                </span>
              </div>

              <div class="play-card-progress">
                <div class="play-card-progress-bar">
                  <div class="play-card-progress-fill" style="width: ${stats.masteryPercentage}%;"></div>
                </div>
                <span class="play-card-progress-label">${stats.masteryPercentage}%</span>
              </div>

              <div class="play-card-actions">
                ${!play.isDefault ? `
                  <button type="button" class="btn btn-secondary btn-play-delete" data-play-id="${Utils.escapeHtml(play.id)}" title="Excluir peça do catálogo" aria-label="Excluir">
                    ${Icons.get('trash', { size: 15 })}
                  </button>
                ` : ''}
                <button type="button" class="btn ${isActive ? 'btn-secondary' : 'btn-primary'} btn-play-switch" data-play-id="${Utils.escapeHtml(play.id)}" ${isActive ? 'disabled' : ''}>
                  ${isActive ? Icons.get('check', { size: 14, strokeWidth: 2.5 }) : Icons.get('theater', { size: 15 })}
                  <span>${isActive ? 'Peça Ativa' : 'Ensaiar esta Peça'}</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openPlayCatalogModal(openerEl = null) {
    this.renderPlayCatalog();
    this.openModal('modalPlayCatalog', openerEl);
  },

  openImportPlayModal(openerEl = null) {
    this.ImportFlowState = {
      rawText: '',
      title: '',
      author: '',
      characters: [],
      speeches: [],
      beatStrategy: 'headers',
      source: 'heuristic_offline'
    };
    if (Utils.$('importRawScriptText')) Utils.$('importRawScriptText').value = '';
    if (Utils.$('fileUploadFeedback')) Utils.$('fileUploadFeedback').style.display = 'none';
    if (Utils.$('inputScriptFile')) Utils.$('inputScriptFile').value = '';
    if (Utils.$('importStepInput')) Utils.$('importStepInput').hidden = false;
    if (Utils.$('importStepReview')) Utils.$('importStepReview').hidden = true;
    if (Utils.$('importModalStepTitle')) Utils.$('importModalStepTitle').textContent = 'Importar Novo Roteiro';
    this.openModal('modalImportPlay', openerEl);
  },

  renderImportReview(analysis) {
    if (!analysis) return;
    this.ImportFlowState = {
      rawText: analysis.rawText || (Utils.$('importRawScriptText') ? Utils.$('importRawScriptText').value : ''),
      title: analysis.title || 'Roteiro Sem Título',
      author: analysis.author || 'Autor não informado',
      characters: Array.isArray(analysis.characters) ? [...analysis.characters] : [],
      speeches: Array.isArray(analysis.speeches) ? analysis.speeches : [],
      beats: Array.isArray(analysis.beats) ? [...analysis.beats] : [],
      beatStrategy: 'headers',
      source: analysis.source || 'heuristic_offline'
    };

    if (Utils.$('importReviewTitle')) Utils.$('importReviewTitle').value = this.ImportFlowState.title;
    if (Utils.$('importReviewAuthor')) Utils.$('importReviewAuthor').value = this.ImportFlowState.author;
    if (Utils.$('importReviewBeatStrategy')) Utils.$('importReviewBeatStrategy').value = 'headers';

    const sourceBadge = Utils.$('dramaturgyAnalyzerSource');
    if (sourceBadge) {
      if (this.ImportFlowState.source === 'ai_assisted') {
        sourceBadge.innerHTML = `
          ${Icons.get('sparkles', { size: 14 })}
          <span>Análise Assistida por IA Ativa</span>
        `;
      } else {
        sourceBadge.innerHTML = `
          ${Icons.get('sparkles', { size: 14 })}
          <span>Análise Heurística Offline (Gancho para IA Passo 4 pronto)</span>
        `;
      }
    }

    if (Utils.$('importModalStepTitle')) Utils.$('importModalStepTitle').textContent = 'Prévia & Personalização Dramatúrgica';
    if (Utils.$('importStepInput')) Utils.$('importStepInput').hidden = true;
    if (Utils.$('importStepReview')) Utils.$('importStepReview').hidden = false;

    this.renderReviewCharacterChips();
    this.renderReviewBeatList();
    this.updateReviewStats();
  },

  renderReviewCharacterChips() {
    const container = Utils.$('importReviewCharactersList');
    if (!container) return;
    const chars = this.ImportFlowState.characters || [];
    if (chars.length === 0) {
      container.innerHTML = '<span style="font-size:0.78rem; color:var(--fg-muted); padding:4px;">Nenhum personagem definido ainda. Adicione abaixo.</span>';
      return;
    }
    container.innerHTML = chars.map(c => `
      <span class="char-chip" data-char="${Utils.escapeHtml(c)}">
        <span class="char-chip-name">${Utils.escapeHtml(c)}</span>
        <button type="button" class="btn-rename-char" data-char="${Utils.escapeHtml(c)}" title="Renomear personagem ${Utils.escapeHtml(c)}" aria-label="Renomear">
          ${Icons.get('edit', { size: 12 })}
        </button>
        <button type="button" class="btn-remove-char" data-char="${Utils.escapeHtml(c)}" title="Remover personagem ${Utils.escapeHtml(c)}" aria-label="Remover">
          &times;
        </button>
      </span>
    `).join('');
  },

  renameReviewCharacter(oldName, newName) {
    if (!oldName || !newName || !this.ImportFlowState) return;
    const formattedOld = oldName.trim().toUpperCase();
    const formattedNew = newName.trim().toUpperCase();
    if (!formattedOld || !formattedNew || formattedOld === formattedNew) return;

    const chars = this.ImportFlowState.characters || [];
    const idx = chars.indexOf(formattedOld);
    if (idx >= 0) {
      if (chars.includes(formattedNew)) {
        chars.splice(idx, 1);
      } else {
        chars[idx] = formattedNew;
      }
    }

    if (Array.isArray(this.ImportFlowState.speeches) && typeof ScriptParser !== 'undefined' && typeof ScriptParser.renameCharacterInSpeeches === 'function') {
      this.ImportFlowState.speeches = ScriptParser.renameCharacterInSpeeches(this.ImportFlowState.speeches, formattedOld, formattedNew);
    }

    this.renderReviewCharacterChips();
    this.updateReviewStats();
  },

  removeReviewCharacter(charName) {
    if (!charName || !this.ImportFlowState) return;
    this.ImportFlowState.characters = (this.ImportFlowState.characters || []).filter(c => c !== charName);
    this.renderReviewCharacterChips();
    this.updateReviewStats();
  },

  addReviewCharacter(charName) {
    if (!charName || !this.ImportFlowState) return;
    const formatted = charName.trim().toUpperCase();
    if (!formatted) return;
    if (!this.ImportFlowState.characters.includes(formatted)) {
      this.ImportFlowState.characters.push(formatted);
      this.renderReviewCharacterChips();
      this.updateReviewStats();
    }
  },

  renderReviewBeatList() {
    const container = Utils.$('importReviewBeatsList');
    if (!container || !this.ImportFlowState) return;

    if (!Array.isArray(this.ImportFlowState.beats)) {
      const chars = this.ImportFlowState.characters || [];
      const allSpeeches = this.ImportFlowState.speeches || [];
      const filteredSpeeches = (typeof ScriptParser !== 'undefined' && typeof ScriptParser.filterSpeechesByCharacters === 'function')
        ? ScriptParser.filterSpeechesByCharacters(allSpeeches, chars)
        : allSpeeches;
      const strat = Utils.$('importReviewBeatStrategy') ? Utils.$('importReviewBeatStrategy').value : (this.ImportFlowState.beatStrategy || 'headers');
      this.ImportFlowState.beats = (typeof DramaBeats !== 'undefined')
        ? DramaBeats.generateBeats(filteredSpeeches, this.ImportFlowState.rawText, null, strat)
        : [];
    }

    const beats = this.ImportFlowState.beats || [];
    if (beats.length === 0) {
      container.innerHTML = '<span style="font-size:0.78rem; color:var(--fg-muted); padding:4px;">Nenhum beat cênico definido. O texto será tratado como cena única.</span>';
      return;
    }

    container.innerHTML = beats.map((b, idx) => `
      <div class="review-beat-item" data-idx="${idx}">
        <span class="review-beat-badge">Beat ${idx + 1}</span>
        <input type="text" class="review-beat-name-input" data-idx="${idx}" value="${Utils.escapeHtml(b.name)}" title="Editar nome do arco dramático">
        <span class="review-beat-range">Falas ${b.start + 1}-${b.end + 1}</span>
        <button type="button" class="btn-remove-beat" data-idx="${idx}" title="Remover beat">
          ${Icons.get('x', { size: 13 })}
        </button>
      </div>
    `).join('');

    const inputs = container.querySelectorAll('.review-beat-name-input');
    inputs.forEach(inp => {
      inp.oninput = (e) => {
        const i = parseInt(inp.dataset.idx, 10);
        if (this.ImportFlowState && this.ImportFlowState.beats && this.ImportFlowState.beats[i]) {
          this.ImportFlowState.beats[i].name = e.target.value.trim() || `Beat ${i + 1}`;
        }
      };
    });

    const removeBtns = container.querySelectorAll('.btn-remove-beat');
    removeBtns.forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx, 10);
        if (this.ImportFlowState && this.ImportFlowState.beats) {
          this.ImportFlowState.beats.splice(i, 1);
          this.renderReviewBeatList();
          this.updateReviewStats();
        }
      };
    });
  },

  updateReviewStats() {
    const statsBox = Utils.$('importReviewStatsBox');
    if (!statsBox || !this.ImportFlowState) return;
    const chars = this.ImportFlowState.characters || [];
    const allSpeeches = this.ImportFlowState.speeches || [];
    const filteredSpeeches = (typeof ScriptParser !== 'undefined' && typeof ScriptParser.filterSpeechesByCharacters === 'function')
      ? ScriptParser.filterSpeechesByCharacters(allSpeeches, chars)
      : allSpeeches.filter(s => chars.includes(s.who));

    const strat = Utils.$('importReviewBeatStrategy') ? Utils.$('importReviewBeatStrategy').value : (this.ImportFlowState.beatStrategy || 'headers');
    const beatsCount = (this.ImportFlowState.beats && this.ImportFlowState.beats.length > 0)
      ? this.ImportFlowState.beats.length
      : ((typeof DramaBeats !== 'undefined') ? DramaBeats.generateBeats(filteredSpeeches, this.ImportFlowState.rawText, null, strat).length : 0);

    statsBox.innerHTML = `
      <div><strong>Total de Falas Válidas:</strong> ${filteredSpeeches.length} (de ${allSpeeches.length} detectadas originalmente)</div>
      <div><strong>Personagens Confirmados:</strong> ${chars.length}</div>
      <div><strong>Divisão Dramatúrgica:</strong> ${beatsCount} beats / blocos cênicos</div>
    `;
  },

  populateAISettings() {
    if (typeof AIService === 'undefined') return;
    const keyInput = Utils.$('inputGeminiApiKey');
    if (keyInput) {
      keyInput.value = AIService.getApiKey();
    }
    const modelSelect = Utils.$('selectGeminiModel');
    if (modelSelect) {
      modelSelect.value = AIService.getModel();
    }
    const feedback = Utils.$('geminiConnectionFeedback');
    if (feedback) {
      feedback.style.display = 'none';
      feedback.textContent = '';
      feedback.className = 'file-feedback';
    }
  },

  renderCadernoQuizSpeeches() {
    const select = Utils.$('cadernoQuizSpeechSelect');
    if (!select || !Array.isArray(AppState.speeches)) return;

    const speeches = AppState.speeches;
    const actor = AppState.selectedActor;
    let opts = '';

    speeches.forEach((s, idx) => {
      const isMine = !actor || s.who === actor;
      const preview = (s.spokenText || '').slice(0, 50);
      const label = `Fala #${idx + 1} (${s.who}): "${preview}..."`;
      const selected = idx === AppState.currentIndex ? 'selected' : '';
      opts += `<option value="${idx}" ${selected}>${isMine ? '[Meu Papel] ' : ''}${Utils.escapeHtml(label)}</option>`;
    });

    select.innerHTML = opts;

    const scoreEl = Utils.$('cadernoQuizScoreBadge');
    if (scoreEl) {
      const score = AppState.quizScore || 0;
      scoreEl.textContent = `${score} ${score === 1 ? 'acerto' : 'acertos'}`;
    }
  },

  renderCadernoQuizChallenge(challenge) {
    const container = Utils.$('cadernoQuizContainer');
    if (!container) return;

    if (!challenge) {
      container.innerHTML = `
        <div class="caderno-quiz-empty">
          <p>Selecione uma fala e toque em <strong>"Gerar Desafio"</strong> para iniciar o quiz dramatúrgico.</p>
        </div>
      `;
      return;
    }

    this.currentQuizChallenge = { ...challenge };

    const allOptions = [
      { text: challenge.correctAnswer, correct: true },
      ...(challenge.distractors || []).map(d => ({ text: d, correct: false }))
    ];
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    this.currentQuizChallenge.shuffledOptions = allOptions;

    container.innerHTML = `
      <div class="quiz-challenge-card">
        <div class="quiz-challenge-question">
          ${Icons.get('sparkles', { size: 16 })}
          <span>${Utils.escapeHtml(challenge.question)}</span>
        </div>
        ${challenge.keyword ? `
          <div class="quiz-challenge-keyword-hint">
            ${Icons.get('target', { size: 13 })}
            <span>Palavra-chave dramatúrgica da réplica: <strong>"${Utils.escapeHtml(challenge.keyword)}"</strong></span>
          </div>
        ` : ''}
        <div class="quiz-challenge-options-grid">
          ${allOptions.map((opt, idx) => `
            <button type="button" class="btn-quiz-challenge-option" data-idx="${idx}">
              <span class="quiz-opt-letter">${String.fromCharCode(65 + idx)}</span>
              <span class="quiz-opt-text">${Utils.escapeHtml(opt.text)}</span>
            </button>
          `).join('')}
        </div>
        <div id="quizChallengeFeedback" class="quiz-challenge-feedback" style="display:none;"></div>
      </div>
    `;

    const btns = container.querySelectorAll('.btn-quiz-challenge-option');
    btns.forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.idx, 10);
        this.handleCadernoQuizAnswer(idx);
      };
    });
  },

  handleCadernoQuizAnswer(selectedIdx) {
    if (!this.currentQuizChallenge || this.currentQuizChallenge.answered) return;
    this.currentQuizChallenge.answered = true;

    const opt = this.currentQuizChallenge.shuffledOptions[selectedIdx];
    const isCorrect = opt && opt.correct;
    const container = Utils.$('cadernoQuizContainer');
    const fb = Utils.$('quizChallengeFeedback');

    if (container) {
      const btns = container.querySelectorAll('.btn-quiz-challenge-option');
      btns.forEach((b, idx) => {
        const optionData = this.currentQuizChallenge.shuffledOptions[idx];
        if (optionData && optionData.correct) {
          b.classList.add('correct');
        } else if (idx === selectedIdx) {
          b.classList.add('incorrect');
        }
        b.disabled = true;
      });
    }

    if (isCorrect) {
      AppState.quizScore = (AppState.quizScore || 0) + 1;
      const scoreEl = Utils.$('cadernoQuizScoreBadge');
      if (scoreEl) {
        scoreEl.textContent = `${AppState.quizScore} ${AppState.quizScore === 1 ? 'acerto' : 'acertos'}`;
      }
    }

    if (fb) {
      fb.style.display = 'flex';
      fb.className = `quiz-challenge-feedback ${isCorrect ? 'success' : 'error'}`;
      fb.innerHTML = isCorrect
        ? `${Icons.get('check', { size: 16 })} <span><strong>Resposta exata!</strong> Excelente compreensão dramatúrgica da réplica cênica.</span>`
        : `${Icons.get('x', { size: 16 })} <span><strong>Não exatamente.</strong> A resposta correta era: <em>"${Utils.escapeHtml(this.currentQuizChallenge.correctAnswer)}"</em>.</span>`;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIController };
}
