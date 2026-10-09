// 6. MOTOR DE ÁUDIO HÍBRIDO (AudioEngine)
    const AudioEngine = {
      availableVoices: [],
      activeUtterance: null,
      activeAudioPlayer: null,
      activeAudioUrl: null,
      autoAdvanceTimer: null,
      mediaRecorder: null,
      audioChunks: [],
      recordingTimer: null,
      recordingSeconds: 0,
      isRecordingNow: false,
      isPlaying: false,

      updateAudioButtonsUI(isPlaying) {
        if (typeof document === 'undefined') return;
        const btns = document.querySelectorAll('.btn-audio, .btn-cue-audio');
        if (btns && btns.forEach) {
          btns.forEach(b => {
            if (isPlaying) {
              const stopIcon = (typeof Icons !== 'undefined') ? Icons.get('stop', { size: 15 }) : '';
              b.innerHTML = `${stopIcon} <span class="audio-waveform-bars" aria-hidden="true"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></span> <span>Parar</span>`;
              b.classList.add('is-playing');
            } else {
              const playIcon = (typeof Icons !== 'undefined') ? Icons.get('volume', { size: 15 }) : '';
              b.innerHTML = `${playIcon} <span>Ouvir</span>`;
              b.classList.remove('is-playing');
            }
          });
        }
        const cadernoBtns = document.querySelectorAll('.btn-play-caderno-audio');
        if (cadernoBtns && cadernoBtns.forEach) {
          cadernoBtns.forEach(b => {
            if (!isPlaying) {
              const playIcon = (typeof Icons !== 'undefined') ? Icons.get('play', { size: 14 }) : '';
              b.innerHTML = `${playIcon} <span>Ouvir</span>`;
              b.classList.remove('is-playing');
            }
          });
        }
      },

      loadVoices(onVoicesLoaded) {
        try {
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.availableVoices = window.speechSynthesis.getVoices() || [];
            if (onVoicesLoaded) onVoicesLoaded(this.availableVoices);
          }
        } catch (e) {
          this.availableVoices = [];
        }
      },

      stopAllAudio() {
        if (this.isRecordingNow) {
          this.stopCastRecording();
        }
        this.isPlaying = false;
        this.updateAudioButtonsUI(false);
        if (this.autoAdvanceTimer) {
          clearTimeout(this.autoAdvanceTimer);
          this.autoAdvanceTimer = null;
        }
        if (this.activeAudioPlayer) {
          this.activeAudioPlayer.pause();
          this.activeAudioPlayer = null;
        }
        if (this.activeAudioUrl) {
          try { URL.revokeObjectURL(this.activeAudioUrl); } catch (e) {}
          this.activeAudioUrl = null;
        }
        try {
          if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (e) {}
        this.activeUtterance = null;
      },

      async playCustomBlob(blob, callbacks = {}) {
        if (this.isPlaying) {
          this.stopAllAudio();
          if (callbacks.onStop) callbacks.onStop();
          return false;
        }
        this.stopAllAudio();
        this.isPlaying = true;
        this.updateAudioButtonsUI(true);
        try {
          const audioUrl = URL.createObjectURL(blob);
          this.activeAudioUrl = audioUrl;
          const audio = new Audio(audioUrl);
          this.activeAudioPlayer = audio;
          audio.onended = () => {
            this.isPlaying = false;
            this.updateAudioButtonsUI(false);
            if (this.activeAudioUrl) {
              try { URL.revokeObjectURL(this.activeAudioUrl); } catch (e) {}
              this.activeAudioUrl = null;
            }
            this.activeAudioPlayer = null;
            if (callbacks.onEnd) callbacks.onEnd();
          };
          audio.onerror = () => {
            this.isPlaying = false;
            this.updateAudioButtonsUI(false);
            if (this.activeAudioUrl) {
              try { URL.revokeObjectURL(this.activeAudioUrl); } catch (e) {}
              this.activeAudioUrl = null;
            }
            this.activeAudioPlayer = null;
            if (callbacks.onError) callbacks.onError();
          };
          await audio.play();
          if (callbacks.onStart) callbacks.onStart();
          return true;
        } catch (err) {
          this.isPlaying = false;
          this.updateAudioButtonsUI(false);
          if (this.activeAudioUrl) {
            try { URL.revokeObjectURL(this.activeAudioUrl); } catch (e) {}
            this.activeAudioUrl = null;
          }
          this.activeAudioPlayer = null;
          if (callbacks.onError) callbacks.onError(err);
          return false;
        }
      },

      getEffectiveTempoRate(baseRate, tempo) {
        if (tempo === 'slow') return 0.80;
        if (tempo === 'fast') return 1.20;
        if (tempo === 'dynamic') {
          return Number((0.82 + Math.random() * 0.36).toFixed(2));
        }
        return baseRate;
      },

      getSupportedMimeType() {
        if (typeof MediaRecorder === 'undefined') return '';
        const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac'];
        for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) return t;
        }
        return '';
      },

      findVoiceForActor(characterName, actorIndex) {
        const charName = (characterName || '').trim();
        const safeIndex = Math.max(0, actorIndex || 0);
        const savedName = StorageManager.getActorVoice(charName);
        if (savedName) {
          const match = this.availableVoices.find(v => v.name === savedName);
          if (match) return match;
        }
        const ptVoices = this.availableVoices.filter(v => /^pt/i.test(v.lang));
        const list = ptVoices.length > 0 ? ptVoices : this.availableVoices;
        if (list.length === 0) return null;

        const isFeminine = /a$|bárbara|barbara|nina|arkadina|julieta|mulher|mãe|ofélia|ofelia|gertrudes|senhora|rainha|donzela|menina/i.test(charName);
        if (isFeminine) {
          const femaleVoices = list.filter(v => /female|feminina|luciana|francisca|maria|vitória|letícia|helena|camila|raquel|fernanda/i.test(v.name));
          if (femaleVoices.length > 0) {
            return femaleVoices[safeIndex % femaleVoices.length];
          }
        }
        const offset = safeIndex % list.length;
        return list[offset] || list[0];
      },

      getPitchForActor(characterName, actorIndex) {
        const charName = (characterName || '').trim();
        const safeIndex = Math.max(0, actorIndex || 0);
        const isFeminine = /a$|bárbara|barbara|nina|arkadina|julieta|mulher|mãe|ofélia|ofelia|gertrudes|senhora|rainha|donzela|menina/i.test(charName);
        if (isFeminine) {
          const femPitches = [1.15, 1.25, 1.08, 1.18];
          return femPitches[safeIndex % femPitches.length];
        }
        if (safeIndex === 0) return 0.88;
        if (safeIndex === 1) return 1.08;
        const pitches = [0.90, 1.10, 0.85, 1.15, 1.0];
        return pitches[safeIndex % pitches.length];
      },

      async playSpeechAudio(speechIndex, speech, characterName, actorIndex, baseRate, tempo, callbacks = {}) {
        if (this.isPlaying) {
          this.stopAllAudio();
          if (callbacks.onStatus) callbacks.onStatus('Áudio interrompido.');
          return;
        }
        this.stopAllAudio();
        this.isPlaying = true;
        this.updateAudioButtonsUI(true);
        const effectiveTempo = this.getEffectiveTempoRate(baseRate, tempo);
        if (tempo === 'dynamic' && callbacks.onStatus) {
          callbacks.onStatus(`Ritmo dinâmico nesta deixa: ${effectiveTempo}x`);
        }

        try {
          const castBlob = await StorageManager.getCastAudio(speechIndex);
          if (castBlob) {
            const audioUrl = URL.createObjectURL(castBlob);
            this.activeAudioUrl = audioUrl;
            const audio = new Audio(audioUrl);
            audio.defaultPlaybackRate = effectiveTempo;
            audio.playbackRate = effectiveTempo;
            audio.onloadedmetadata = () => {
              audio.playbackRate = effectiveTempo;
            };
            this.activeAudioPlayer = audio;
            audio.onended = () => {
              this.isPlaying = false;
              this.updateAudioButtonsUI(false);
              if (this.activeAudioUrl) {
                try { URL.revokeObjectURL(this.activeAudioUrl); } catch (e) {}
                this.activeAudioUrl = null;
              }
              this.activeAudioPlayer = null;
              if (callbacks.onEnd) callbacks.onEnd();
            };
            audio.onerror = () => {
              if (this.activeAudioUrl) {
                try { URL.revokeObjectURL(this.activeAudioUrl); } catch (e) {}
                this.activeAudioUrl = null;
              }
              this.activeAudioPlayer = null;
              this.speakSynthesized(speech.spokenText, characterName, actorIndex, effectiveTempo, callbacks);
            };
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                this.isPlaying = false;
                this.updateAudioButtonsUI(false);
                if (this.activeAudioUrl) {
                  try { URL.revokeObjectURL(this.activeAudioUrl); } catch (e) {}
                  this.activeAudioUrl = null;
                }
                this.activeAudioPlayer = null;
                if (callbacks.onStatus) callbacks.onStatus('Toque no botão para ouvir o áudio.');
                if (callbacks.onError) callbacks.onError(err);
              });
            }
            if (callbacks.onStatus) callbacks.onStatus(`Tocando voz real do elenco (${effectiveTempo}x)...`);
            return;
          }
        } catch (e) {}

        this.speakSynthesized(speech.spokenText, characterName, actorIndex, effectiveTempo, callbacks);
      },

      speakSynthesized(text, characterName, actorIndex, rate, callbacks = {}) {
        const UtteranceClass = (typeof SpeechSynthesisUtterance !== 'undefined')
          ? SpeechSynthesisUtterance
          : (typeof window !== 'undefined' && window.SpeechSynthesisUtterance ? window.SpeechSynthesisUtterance : null);

        if (!UtteranceClass || typeof window === 'undefined' || !window.speechSynthesis) {
          this.isPlaying = false;
          this.updateAudioButtonsUI(false);
          if (callbacks.onStatus) callbacks.onStatus('Voz indisponível neste navegador.');
          if (callbacks.onError) callbacks.onError(new Error('speechSynthesis indisponível'));
          return;
        }

        if (!text || !text.trim()) {
          this.isPlaying = false;
          this.updateAudioButtonsUI(false);
          if (callbacks.onEnd) callbacks.onEnd();
          return;
        }

        this.isPlaying = true;
        this.updateAudioButtonsUI(true);

        try {
          this.loadVoices();
          const utterance = new UtteranceClass(text);
          utterance.lang = 'pt-BR';

          const chosenVoice = this.findVoiceForActor(characterName, actorIndex);
          if (chosenVoice) utterance.voice = chosenVoice;

          utterance.pitch = this.getPitchForActor(characterName, actorIndex);
          utterance.rate = rate || 0.95;

          utterance.onstart = () => {
            this.isPlaying = true;
            this.updateAudioButtonsUI(true);
            if (callbacks.onStatus) callbacks.onStatus('');
            if (callbacks.onStart) callbacks.onStart();
          };
          utterance.onend = () => {
            this.isPlaying = false;
            this.updateAudioButtonsUI(false);
            this.activeUtterance = null;
            if (callbacks.onEnd) callbacks.onEnd();
          };
          utterance.onerror = (e) => {
            this.isPlaying = false;
            this.updateAudioButtonsUI(false);
            this.activeUtterance = null;
            if (e && e.error !== 'canceled' && e.error !== 'interrupted') {
              if (callbacks.onStatus) callbacks.onStatus('Erro no áudio (' + (e.error || 'falha') + ').');
            }
            if (callbacks.onError) callbacks.onError(e);
          };

          this.activeUtterance = utterance;
          setTimeout(() => {
            try {
              window.speechSynthesis.speak(utterance);
            } catch (e) {
              this.isPlaying = false;
              this.updateAudioButtonsUI(false);
              if (callbacks.onError) callbacks.onError(e);
            }
          }, 50);
        } catch (e) {
          this.isPlaying = false;
          this.updateAudioButtonsUI(false);
          if (callbacks.onStatus) callbacks.onStatus('Erro ao inicializar voz.');
          if (callbacks.onError) callbacks.onError(e);
        }
      },

      async startCastRecording(speechIndex, callbacks = {}) {
        try {
          if (this.isRecordingNow) {
            this.stopCastRecording();
          }
          this.stopAllAudio();
          if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (typeof alert === 'function') {
              alert('Gravação de áudio não suportada neste navegador.');
            }
            this.isRecordingNow = false;
            if (callbacks.onError) callbacks.onError(new Error('getUserMedia indisponível'));
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.activeStream = stream;
          this.audioChunks = [];
          const mimeType = this.getSupportedMimeType();
          const options = mimeType ? { mimeType } : {};
          if (typeof MediaRecorder === 'undefined') {
            if (typeof alert === 'function') {
              alert('MediaRecorder não suportado neste navegador.');
            }
            this.isRecordingNow = false;
            if (callbacks.onError) callbacks.onError(new Error('MediaRecorder indisponível'));
            return;
          }
          this.mediaRecorder = new MediaRecorder(stream, options);
          this.isRecordingNow = true;

          this.mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
          };

          this.mediaRecorder.onerror = (e) => {
            this.stopCastRecording();
            if (callbacks.onError) callbacks.onError(e);
          };

          this.mediaRecorder.onstop = async () => {
            const finalMime = this.mediaRecorder.mimeType || mimeType || 'audio/webm';
            const blob = new Blob(this.audioChunks, { type: finalMime });
            if (this.activeStream) {
              try { this.activeStream.getTracks().forEach(t => t.stop()); } catch (e) {}
              this.activeStream = null;
            } else {
              try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
            }
            await StorageManager.saveCastAudio(speechIndex, blob);
            this.isRecordingNow = false;
            Utils.triggerHaptic('success');
            if (callbacks.onSaved) callbacks.onSaved();
          };

          this.mediaRecorder.start();
          this.recordingSeconds = 0;
          if (callbacks.onStarted) callbacks.onStarted();

          this.recordingTimer = setInterval(() => {
            this.recordingSeconds++;
            if (callbacks.onTick) callbacks.onTick(this.recordingSeconds);
            if (this.recordingSeconds >= 60) {
              this.stopCastRecording();
            }
          }, 1000);
        } catch (err) {
          if (typeof alert === 'function') {
            alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
          }
          this.isRecordingNow = false;
          if (callbacks.onError) callbacks.onError(err);
        }
      },

      stopCastRecording() {
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          try { this.mediaRecorder.stop(); } catch(e) {}
        }
        if (this.activeStream) {
          try { this.activeStream.getTracks().forEach(t => t.stop()); } catch(e) {}
          this.activeStream = null;
        }
        this.isRecordingNow = false;
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioEngine };
}
