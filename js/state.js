// 3. ESTADO DA SESSÃO (AppState)
    const AppState = {
      speeches: [],
      characters: [],
      selectedActor: '',
      hasSavedActor: false,
      currentIndex: 0,
      activeBeats: [],
      selectedBeat: 'all',
      rehearsalMode: 'cena',
      rehearsalTempo: 'normal',
      studyMethod: 'oral', // 'oral' | 'quiz' | 'typing'
      hideRubrics: false,
      alwaysStartHidden: true,
      quizTargets: [],
      quizStep: 0,
      typingCompleted: false,
      masteryLevels: [],
      isRevealed: false,
      hintsUsedThisLine: 0,
      partnerVoiceEnabled: true,
      autoAdvanceEnabled: false,
      wakeLockEnabled: true,
      speechRate: 0.95,
      activeScriptText: '',
      activePlay: null,
      currentFilter: 'all',
      currentScreen: 'lobby',
      isRetryState: false,
      isSceneFinished: false,

      // Timers & controle de fluxo
      pingPongCountdown: 4,
      pingPongInterval: null,
      pontoPaused: false,
      wakeLock: null,

      getPlayId() {
        if (this.activePlay && this.activePlay.id) {
          if (this.activePlay.id === 'os-inventariantes' || this.activePlay.id === 'default') return 'default';
          return this.activePlay.id;
        }
        if (typeof PlayStore !== 'undefined') {
          const actId = PlayStore.getActivePlayId();
          if (actId === 'os-inventariantes' || actId === 'default') return 'default';
          return actId;
        }
        if (typeof ScriptParser !== 'undefined' && ScriptParser.isDefaultPlay(this.activeScriptText)) {
          return 'default';
        }
        const title = (typeof ScriptParser !== 'undefined') ? ScriptParser.extractPlayTitle(this.activeScriptText) : 'custom';
        return 'play_' + Utils.sanitizeId(title || 'custom');
      },

      getActiveBeatRange() {
        if (this.selectedBeat === 'all') {
          return { start: 0, end: Math.max(0, this.speeches.length - 1) };
        }
        const b = this.activeBeats[parseInt(this.selectedBeat, 10)];
        return b ? { start: b.start, end: Math.min(this.speeches.length - 1, b.end) } : { start: 0, end: Math.max(0, this.speeches.length - 1) };
      },

      getFilteredSpeechIndices() {
        const range = this.getActiveBeatRange();
        const list = [];
        for (let i = range.start; i <= range.end; i++) {
          if (i < this.speeches.length) list.push(i);
        }
        return list;
      },

      getMySpeechIndices() {
        const filtered = this.getFilteredSpeechIndices();
        return filtered.filter(i => this.speeches[i].who === this.selectedActor);
      },

      sessionRetryQueue: [],

      scheduleRetry(speechIdx, delaySteps = 2) {
        if (!this.sessionRetryQueue.some(item => item.speechIdx === speechIdx)) {
          this.sessionRetryQueue.push({ speechIdx, countdown: delaySteps });
        }
      },

      stepRetryQueue() {
        for (let item of this.sessionRetryQueue) {
          if (item.countdown > 0) item.countdown--;
        }
      },

      pickNextWeakness() {
        const myIndices = this.getMySpeechIndices();
        if (myIndices.length === 0) return 0;
        if (myIndices.length === 1) return myIndices[0];

        // Priorizar falas da fila de repetição cujo countdown chegou a 0
        const readyIdx = this.sessionRetryQueue.findIndex(item => item.countdown <= 0 && item.speechIdx !== this.currentIndex && myIndices.includes(item.speechIdx));
        if (readyIdx !== -1) {
          const target = this.sessionRetryQueue[readyIdx].speechIdx;
          this.sessionRetryQueue.splice(readyIdx, 1);
          return target;
        }

        const candidates = myIndices.filter(i => i !== this.currentIndex);
        const listToUse = candidates.length > 0 ? candidates : myIndices;

        const weights = listToUse.map(i => Math.pow(Math.max(0.2, 5 - (this.masteryLevels[i] || 0)), 2));
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        let random = Math.random() * totalWeight;
        for (let k = 0; k < listToUse.length; k++) {
          random -= weights[k];
          if (random <= 0) {
            return listToUse[k];
          }
        }
        return listToUse[listToUse.length - 1];
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppState };
}
