// 4. PARSER E MODELO DRAMATÚRGICO (ScriptParser & DramaBeats)
    const ScriptParser = {
      isMetaKeyword(str) {
        const s = (str || '').replace(/\*+/g, '').trim().toLowerCase();
        return (
          s === 'personagens' || s === 'personagem' || s === 'elenco' ||
          s === 'dramatis personae' ||
          s === 'cenário' || s === 'cenario' ||
          s === 'texto' || s === 'texto teatral' || s === 'fim' ||
          s === 'prólogo' || s === 'prologo' ||
          s === 'epílogo' || s === 'epilogo' ||
          s === 'title' || s === 'author' || s === 'authors' || s === 'credit' ||
          s === 'source' || s === 'copyright' || s === 'contact' || s === 'date' ||
          s === 'draft date' ||
          s.startsWith('texto ') ||
          s.startsWith('ato ') ||
          s.startsWith('cena ') ||
          s.startsWith('int.') ||
          s.startsWith('ext.') ||
          s.startsWith('est.') ||
          s.startsWith('i/e.') ||
          s.startsWith('fade ') ||
          /^ato\s+[0-9ivxlcdm]+/i.test(s) ||
          /^cena\s+[0-9ivxlcdm]+/i.test(s)
        );
      },

      isDefaultPlay(rawText) {
        return (rawText || '').includes('OS INVENTARIANTES') || (rawText || '').includes('Walter Paiva');
      },

      extractPlayTitle(rawText) {
        const lines = (rawText || '').split(/\r?\n/).slice(0, 15);
        for (const l of lines) {
          const trimmed = l.trim();
          if (!trimmed) continue;
          if (trimmed.toLowerCase().includes('inventariantes')) {
            return 'Os Inventariantes';
          }
          const hashMatch = trimmed.match(/^#+\s*(.+)$/);
          if (hashMatch) return hashMatch[1].replace(/\*+/g, '').trim();

          const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
          if (boldMatch) {
            const title = boldMatch[1].replace(/\*+/g, '').trim();
            if (title && !this.isMetaKeyword(title) && !title.startsWith('Texto')) {
              return title;
            }
          }
          if (/^[A-ZÀ-Ú0-9\s]{3,40}$/.test(trimmed) && !this.isMetaKeyword(trimmed)) {
            return trimmed;
          }
        }
        return 'Os Inventariantes';
      },

      parseScript(rawText) {
        const lines = (rawText || '').split(/\r?\n/);
        const parsed = [];
        let pendingDirections = [];
        let currentSpeech = null;
        let inDramatisPersonae = false;

        const pushCurrent = () => {
          if (currentSpeech && currentSpeech.segments.length > 0) {
            currentSpeech.spokenText = currentSpeech.segments
              .filter(s => s.type === 'speech')
              .map(s => s.text)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (currentSpeech.spokenText || currentSpeech.segments.length > 0) {
              parsed.push(currentSpeech);
            }
          }
          currentSpeech = null;
        };

        const appendContent = (targetSpeech, content) => {
          if (!content) return;
          const regex = /(\*?\([^\)]+\)\*?|\[[^\]]+\])/g;
          const parts = content.split(regex);
          for (let part of parts) {
            if (!part) continue;
            const isParenRubric = /^\*?\(.*\)\*?$/.test(part.trim());
            const isBracketRubric = /^\[.*\]$/.test(part.trim());
            if (isParenRubric || isBracketRubric) {
              const cleanRubric = part
                .replace(/^\*?[\(\[]\s*/, '')
                .replace(/\s*[\)\]]\*?$/, '')
                .replace(/\*/g, '')
                .trim();
              if (cleanRubric) {
                targetSpeech.segments.push({ type: 'rubric', text: cleanRubric });
              }
            } else {
              const cleanText = part.replace(/\*/g, '').trim();
              if (cleanText) {
                targetSpeech.segments.push({ type: 'speech', text: cleanText });
              }
            }
          }
        };

        for (let rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          // Dramatis personae block detection (e.g. **Personagens:**)
          if (/^(\*\*|#+\s*)?Personagens:?(\*\*)?$/i.test(line)) {
            inDramatisPersonae = true;
            continue;
          }
          if (inDramatisPersonae) {
            if (/^(\*\*|#+\s*)?(Cenário|Cenario|Ato|Cena):?/i.test(line) ||
                line.startsWith('*(') || line.startsWith('(')) {
              inDramatisPersonae = false;
            } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
              continue;
            }
          }

          // Full-line scene directions
          const isFullParenDir = (line.startsWith('*(') && line.endsWith(')*')) ||
                                 (line.startsWith('(') && line.endsWith(')')) ||
                                 (line.startsWith('[') && line.endsWith(']'));
          if (isFullParenDir) {
            const cleanDir = line.replace(/^\*?[\(\[]\s*/, '').replace(/\s*[\)\]]\*?$/, '').replace(/\*/g, '').trim();
            if (cleanDir) {
              pendingDirections.push(cleanDir);
            }
            continue;
          }

          // Ignore Markdown section headers
          if (/^#+\s+/.test(line)) continue;

          let m = line.match(/^\*\*([^*:]+):\*\*\s*(.*)$/);
          if (!m) m = line.match(/^\*\*([^*:]+)\*\*:\s*(.*)$/);
          if (!m) m = line.match(/^\*\*([^*:]+)\*\*\s*[-—–]\s+(.*)$/);
          if (!m) {
            m = line.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9\s_'-]{2,35}):\s*(.*)$/);
            if (m && this.isMetaKeyword(m[1])) m = null;
          }
          if (!m) {
            m = line.match(/^([A-ZÀ-Ú0-9\s]{2,25})\s*[-—–]\s*(.*)$/);
            if (m && this.isMetaKeyword(m[1])) m = null;
          }
          if (!m) {
            const bm = line.match(/^\*\*([^*:\n]{2,35})\*\*$/);
            if (bm) {
              const cand = bm[1].replace(/\*+/g, '').trim();
              if (!this.isMetaKeyword(cand) && !cand.toLowerCase().includes('inventariantes')) {
                m = [line, cand, ''];
              }
            }
          }
          if (!m) {
            const cm = line.match(/^([A-ZÀ-Ú0-9\s]{2,25})$/);
            if (cm) {
              const cand = cm[1].trim();
              if (!this.isMetaKeyword(cand) && !cand.toLowerCase().includes('inventariantes')) {
                m = [line, cand, ''];
              }
            }
          }
          if (!m) {
            const fm = line.match(/^@([A-Za-zÀ-ÖØ-öø-ÿ0-9\s_'-]{2,35})$/);
            if (fm) {
              const cand = fm[1].trim();
              if (!this.isMetaKeyword(cand) && !cand.toLowerCase().includes('inventariantes')) {
                m = [line, cand, ''];
              }
            }
          }

          if (m) {
            const whoCandidate = m[1].replace(/\*+/g, '').trim();
            const rawContent = (m[2] || '').trim();

            if (!this.isMetaKeyword(whoCandidate) && !whoCandidate.toLowerCase().includes('inventariantes')) {
              pushCurrent();
              currentSpeech = {
                who: whoCandidate,
                segments: [],
                spokenText: '',
                directions: [...pendingDirections]
              };
              pendingDirections = [];
              if (rawContent) {
                appendContent(currentSpeech, rawContent);
              }
              continue;
            }
          }

          // Continuation lines belonging to active speech
          if (currentSpeech) {
            appendContent(currentSpeech, line);
          }
        }

        pushCurrent();
        return parsed;
      }
    };

    const DramaBeats = {
      generateBeats(speeches, rawText) {
        if (ScriptParser.isDefaultPlay(rawText) && speeches.length === 58) {
          return [...AppConfig.DEFAULT_DRAMA_BEATS];
        }

        const total = speeches.length;
        if (total <= 15) {
          return [{
            name: `Cena Completa (Falas 1-${Math.max(1, total)})`,
            start: 0,
            end: Math.max(0, total - 1)
          }];
        }

        const blockSize = total <= 30 ? 10 : (total <= 60 ? 12 : 15);
        const beats = [];
        let start = 0;
        let beatNum = 1;
        while (start < total) {
          const end = Math.min(total - 1, start + blockSize - 1);
          beats.push({
            name: `Beat ${beatNum}: Falas ${start + 1}-${end + 1}`,
            start,
            end
          });
          start = end + 1;
          beatNum++;
        }
        return beats;
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScriptParser };
}
