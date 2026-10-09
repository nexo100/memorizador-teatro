// 4. PARSER E MODELO DRAMATÚRGICO (ScriptParser & DramaBeats)
    const ScriptParser = {
      isMetaKeyword(str) {
        const s = (str || '').replace(/\*+/g, '').trim().toLowerCase();
        return (
          s === 'personagens' || s === 'personagem' || s === 'elenco' ||
          s === 'dramatis personae' ||
          s === 'cenário' || s === 'cenario' ||
          s === 'sinopse' || s === 'resumo' || s === 'argumento' ||
          s === 'rubrica' || s === 'rubricas' ||
          s === 'didascália' || s === 'didascalia' || s === 'didascálias' || s === 'didascalias' ||
          s === 'ambientação' || s === 'ambientacao' ||
          s === 'observação' || s === 'observações' || s === 'observacao' || s === 'observacoes' || s === 'obs' ||
          s === 'nota' || s === 'notas' ||
          s === 'após' || s === 'apos' ||
          s === 'texto' || s === 'texto teatral' || s === 'fim' ||
          s === 'prólogo' || s === 'prologo' ||
          s === 'epílogo' || s === 'epilogo' ||
          s === 'escuro' || s === 'blackout' || s === 'pano' || s === 'cortina' ||
          s === 'intervalo' || s === 'pausa' || s === 'silêncio' || s === 'silencio' ||
          s === 'luzes' || s === 'luz' ||
          s === 'aplausos' || s === 'cai o pano' ||
          s === 'música' || s === 'musica' ||
          s === 'title' || s === 'titulo' || s === 'título' ||
          s === 'author' || s === 'authors' || s === 'autor' || s === 'autores' || s === 'autora' || s === 'autoras' ||
          s === 'credit' ||
          s === 'source' || s === 'copyright' || s === 'contact' || s === 'date' ||
          s === 'draft date' ||
          s.startsWith('texto ') ||
          s.startsWith('autor:') ||
          s.startsWith('autora:') ||
          s.startsWith('autores:') ||
          s.startsWith('titulo:') ||
          s.startsWith('título:') ||
          s.startsWith('ato ') ||
          s.startsWith('cena ') ||
          s.startsWith('quadro ') ||
          s.startsWith('sinopse') ||
          s.startsWith('resumo') ||
          s.startsWith('argumento') ||
          s.startsWith('rubrica') ||
          s.startsWith('didasc') ||
          s.startsWith('ambient') ||
          s.startsWith('observaç') ||
          s.startsWith('observac') ||
          s.startsWith('nota ') ||
          s.startsWith('fim ') ||
          s.startsWith('fim da ') ||
          s.startsWith('fim do ') ||
          s.startsWith('fim de ') ||
          s.startsWith('cai o pano') ||
          s.startsWith('pano ') ||
          s.startsWith('cortina ') ||
          s.startsWith('música ') ||
          s.startsWith('musica ') ||
          s.startsWith('som de ') ||
          s.startsWith('ruído de ') ||
          s.startsWith('ruido de ') ||
          s.startsWith('barulho de ') ||
          s.startsWith('int.') ||
          s.startsWith('ext.') ||
          s.startsWith('est.') ||
          s.startsWith('i/e.') ||
          s.startsWith('fade ') ||
          s.startsWith('corte para') ||
          s.startsWith('dissolve para') ||
          /^\d+\s+personagens?/i.test(s) ||
          /^ato\s+[0-9ivxlcdm]+/i.test(s) ||
          /^cena\s+[0-9ivxlcdm]+/i.test(s) ||
          /^quadro\s+[0-9ivxlcdm]+/i.test(s)
        );
      },

      isDefaultPlay(rawText) {
        if (!rawText) return false;
        const norm = rawText.toUpperCase();
        if (typeof DefaultPlay !== 'undefined' && DefaultPlay.title) {
          const titleUpper = DefaultPlay.title.toUpperCase();
          if (norm.includes(titleUpper)) return true;
        }
        return norm.includes('OS INVENTARIANTES') || (norm.includes('INVENTARIANTES') && norm.includes('WALTER PAIVA'));
      },

      extractPlayTitle(rawText) {
        const lines = (rawText || '').split(/\r?\n/).slice(0, 20);
        let candidateTitle = null;

        for (const l of lines) {
          const trimmed = l.trim();
          if (!trimmed) continue;

          const titleHeaderMatch = trimmed.match(/^(?:title|t[ií]tulo):\s*(.+)$/i);
          if (titleHeaderMatch) return titleHeaderMatch[1].replace(/\*+/g, '').trim();

          const hashMatch = trimmed.match(/^#+\s*(.+)$/);
          if (hashMatch) {
            const hTitle = hashMatch[1].replace(/\*+/g, '').trim();
            if (hTitle && !this.isMetaKeyword(hTitle)) return hTitle;
          }

          const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
          if (boldMatch) {
            const title = boldMatch[1].replace(/\*+/g, '').trim();
            if (title && !this.isMetaKeyword(title) && !title.toLowerCase().startsWith('texto')) {
              return title;
            }
          }

          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            const clean = trimmed.replace(/\*+/g, '').trim();
            if (clean && !this.isMetaKeyword(clean) && !clean.toLowerCase().startsWith('texto')) {
              return clean;
            }
          }

          if (!candidateTitle && trimmed.length >= 3 && trimmed.length <= 60 && !trimmed.includes(':') && !trimmed.startsWith('(') && !trimmed.startsWith('[')) {
            const clean = trimmed.replace(/\*+/g, '').trim();
            const isMeta = this.isMetaKeyword(clean) || /^(?:autor|author|por|by|de|dramaturgia|escrito)\b/i.test(clean);
            if (!isMeta) {
              candidateTitle = clean;
            }
          }
        }

        if (candidateTitle) return candidateTitle;

        if (typeof DefaultPlay !== 'undefined' && this.isDefaultPlay(rawText)) {
          return DefaultPlay.title;
        }
        return 'Roteiro Sem Título';
      },

      extractAuthor(rawText) {
        const lines = (rawText || '').split(/\r?\n/).slice(0, 25);
        for (const l of lines) {
          const trimmed = l.trim();
          if (!trimmed) continue;

          const authorMatch = trimmed.match(/^(?:author|autor|dramaturgia|texto|de|escrito por|por|by|texto por|obra de|peça de)[:\-—–]\s*(.+)$/i);
          if (authorMatch) {
            const clean = authorMatch[1].replace(/\*+/g, '').trim();
            if (clean && !this.isMetaKeyword(clean)) return clean;
          }

          const byMatch = trimmed.match(/^(?:por|by|de|escrito por)\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,'\-–—]{3,50})$/i);
          if (byMatch) {
            const clean = byMatch[1].replace(/\*+/g, '').trim();
            if (clean && !this.isMetaKeyword(clean)) return clean;
          }
        }

        if (typeof DefaultPlay !== 'undefined' && this.isDefaultPlay(rawText)) {
          return DefaultPlay.author;
        }
        return 'Autor não informado';
      },

      filterSpeechesByCharacters(speeches, allowedCharacters) {
        if (!Array.isArray(allowedCharacters) || allowedCharacters.length === 0) return speeches;
        const set = new Set(allowedCharacters.map(c => (c || '').trim()));
        const normSet = new Set(allowedCharacters.map(c => (c || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()));
        return (speeches || []).filter(s => {
          if (set.has(s.who)) return true;
          const sNorm = (s.who || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          return normSet.has(sNorm);
        });
      },

      renameCharacterInSpeeches(speeches, oldName, newName) {
        if (!oldName || !newName || oldName === newName) return speeches;
        return (speeches || []).map(s => s.who === oldName ? { ...s, who: newName } : s);
      },

      sanitizeRawText(rawText) {
        if (!rawText) return '';
        let text = rawText;

        // Unir quebras artificiais de linha com hifenizacao (ex: "ca-\nvalo" ou "ca- \n  valo" -> "cavalo")
        text = text.replace(/([a-zA-ZÀ-ÖØ-öø-ÿ])-\s*[\r\n]+\s*([a-zA-ZÀ-ÖØ-öø-ÿ])/g, '$1$2');

        const lines = text.split(/\r?\n/);
        const cleanedLines = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) {
            cleanedLines.push('');
            continue;
          }

          // Remocao de rodapes, paginacoes e ruidos de digitalizacao / OCR
          // 1. Numeros de pagina explicitos: "Pagina 12", "[Pagina 15]", "Pag. 5", "Pag 1 de 20", "page 3"
          const isPageNumber = /^[\(\[]?\s*(?:p[aá]g(?:ina)?\.?\s*\d+(?:\s*(?:de|\/)\s*\d+)?|\d+\s*(?:de|\/)\s*\d+|page\s*\d+)\s*[\)\]]?\s*$/i.test(line);
          if (isPageNumber) continue;

          // 2. Numeros isolados entre tracos ou barras: "- 12 -", "-- 4 --", "12"
          const isDashedNumber = /^[-—–_~*#\s]*\d+[-—–_~*#\s]*$/.test(line);
          if (isDashedNumber && line.replace(/[^0-9]/g, '').length <= 4) continue;

          // 3. Avisos legais, rodapes repetitivos de digitalizacao ou carimbos de versao
          const isRecurrentFooter = /^(?:todos os direitos reservados|copyright\s*©?|all rights reserved|roteiro final|vers[aã]o preliminar|draft\s*\d*)\b/i.test(line);
          if (isRecurrentFooter) continue;

          cleanedLines.push(lines[i]);
        }

        return cleanedLines.join('\n');
      },

      canonicalizeCharacterName(rawWho, existingCharacters = []) {
        if (!rawWho) return '';
        let clean = (rawWho || '').replace(/\*+/g, '').trim();

        const parenMatch = clean.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9ºª\s_'.\-]+?)\s*[\(\[](.*?)[\)\]]$/);
        if (parenMatch) {
          clean = parenMatch[1].trim();
        }

        const hasAbbrDot = /\./.test(clean);
        clean = clean.replace(/[:.\-—–]+$/, '').trim();
        const upper = clean.toUpperCase();

        if (Array.isArray(existingCharacters) && existingCharacters.length > 0) {
          const exact = existingCharacters.find(c => (c || '').trim().toUpperCase() === upper);
          if (exact) return exact.trim().toUpperCase();

          const isAllConsonants = /^[BCDFGHJKLMNPQRSTVWXYZÇ]+$/.test(upper);
          if (hasAbbrDot || isAllConsonants) {
            if (upper.length >= 2 && upper.length <= 5) {
              const prefixMatch = existingCharacters.find(c => {
                const cu = (c || '').trim().toUpperCase();
                return cu.startsWith(upper) && cu.length > upper.length;
              });
              if (prefixMatch) return prefixMatch.trim().toUpperCase();
            }
          }
        }

        return upper;
      },

      groupCharacterVariants(speeches) {
        if (!Array.isArray(speeches) || speeches.length === 0) {
          return { speeches: [], characters: [], variantMap: {} };
        }

        const rawNames = [...new Set(speeches.map(s => (s.who || '').trim()))].filter(Boolean);
        const variantMap = {};

        const upperGroups = {};
        rawNames.forEach(raw => {
          const cleanUpper = raw.replace(/[:.\-—–]+$/, '').trim().toUpperCase();
          if (!upperGroups[cleanUpper]) upperGroups[cleanUpper] = [];
          upperGroups[cleanUpper].push(raw);
        });

        const allCleanUppers = Object.keys(upperGroups).sort((a, b) => b.length - a.length);

        allCleanUppers.forEach(canonicalUpper => {
          const list = upperGroups[canonicalUpper];
          if (list.length > 1) {
            const hasUpper = list.find(n => n === canonicalUpper);
            const chosen = hasUpper || canonicalUpper;
            list.forEach(raw => {
              variantMap[raw] = chosen;
            });
          } else {
            const single = list[0];
            if (/[.:\-—–]+$/.test(single)) {
              variantMap[single] = canonicalUpper;
            }
          }

          const hasAbbrDot = list.some(r => /\./.test(r));
          const isAllConsonants = /^[BCDFGHJKLMNPQRSTVWXYZÇ]+$/.test(canonicalUpper);

          if ((hasAbbrDot || isAllConsonants) && canonicalUpper.length >= 2 && canonicalUpper.length <= 5) {
            const fuller = allCleanUppers.find(cand => cand.length > canonicalUpper.length + 1 && cand.startsWith(canonicalUpper));
            if (fuller) {
              list.forEach(raw => {
                variantMap[raw] = fuller;
              });
            }
          }
        });

        const updatedSpeeches = speeches.map(s => {
          const mapped = variantMap[s.who];
          return mapped ? { ...s, who: mapped } : s;
        });

        const characters = [...new Set(updatedSpeeches.map(s => s.who))];
        return { speeches: updatedSpeeches, characters, variantMap };
      },

      detectCueTrigger(cueText, speechText) {
        if (!cueText || !speechText) {
          return { triggerWord: '', hookType: 'abertura', reason: 'Abertura de cena ou primeira réplica' };
        }

        const cleanC = (cueText || '').replace(/[\(\[][\s\S]*?[\)\]]/g, '').trim();
        const cleanS = (speechText || '').replace(/[\(\[][\s\S]*?[\)\]]/g, '').trim();

        const tokenize = (txt) => {
          return (txt || '')
            .toLowerCase()
            .split(/\s+/)
            .map(w => w.replace(/[.,!?;:()""«»—–“”‘’`]/g, '').trim())
            .filter(w => w.length >= 3 && (typeof AppConfig !== 'undefined' && AppConfig.FUNCTION_WORDS ? !AppConfig.FUNCTION_WORDS.has(w) : true));
        };

        const cueWords = tokenize(cleanC);
        const speechWords = tokenize(cleanS);

        // 1. Eco direto / reuso de palavra chave do final da deixa
        const cueEndWords = cueWords.slice(Math.max(0, cueWords.length - 8));
        for (const sw of speechWords.slice(0, 10)) {
          if (cueEndWords.includes(sw)) {
            return {
              triggerWord: sw,
              hookType: 'eco',
              reason: `Reuso direto da palavra-chave "${sw}" presente na deixa`
            };
          }
        }

        for (const cw of cueWords) {
          if (speechWords.includes(cw)) {
            return {
              triggerWord: cw,
              hookType: 'eco',
              reason: `Conexao dramatica pela palavra "${cw}"`
            };
          }
        }

        // 2. Conector pergunta-resposta
        if (cleanC.includes('?')) {
          const qMatches = cleanC.match(/(?:^|[^a-zA-ZÀ-ÖØ-öø-ÿ0-9])(por\s*qu[eê]|cad[eê]|qu[eê]|onde|quem|quando|como|qual|quanto)(?=[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]|$)/i);
          if (qMatches) {
            const qWord = qMatches[1].toLowerCase();
            return {
              triggerWord: qWord,
              hookType: 'pergunta_resposta',
              reason: `Resposta à pergunta cênica ("${qWord}") formulada pelo colega`
            };
          }
          const lastCueWord = cueWords[cueWords.length - 1];
          if (lastCueWord) {
            return {
              triggerWord: lastCueWord,
              hookType: 'pergunta_resposta',
              reason: `Resposta à pergunta cênica do colega ("${lastCueWord}?")`
            };
          }
          return {
            triggerWord: 'pergunta',
            hookType: 'pergunta_resposta',
            reason: 'Resposta à pergunta cênica formulada pelo colega'
          };
        }

        // 3. Conectores causais / opositivos no inicio da fala do ator (mesmo com travessão ou aspas)
        const strippedS = cleanS.replace(/^[\s—–\-"'«»“”‘’.]+/g, '');
        const causalMatch = strippedS.match(/^(?:mas|porém|contudo|todavia|porque|pois|então|portanto|logo|já que|ainda que)\b/i);
        if (causalMatch) {
          const connector = causalMatch[0].toLowerCase();
          return {
            triggerWord: connector,
            hookType: 'conector_causal',
            reason: `Engate lógico com conector "${connector}" rebatendo a deixa`
          };
        }

        // 4. Fallback para a palavra de conteudo mais forte no fim da deixa
        const lastCueWord = cueWords[cueWords.length - 1];
        if (lastCueWord) {
          return {
            triggerWord: lastCueWord,
            hookType: 'gancho_final',
            reason: `Gancho cênico sobre a última palavra marcante da deixa ("${lastCueWord}")`
          };
        }

        return {
          triggerWord: '',
          hookType: 'ritmo',
          reason: 'Transição rítmica contínua'
        };
      },

      parseScript(rawText) {
        const sanitized = this.sanitizeRawText(rawText);
        const lines = (sanitized || '').split(/\r?\n/);
        const parsed = [];
        let pendingDirections = [];
        let pendingBeat = null;
        let currentSpeech = null;
        let inDramatisPersonae = false;
        let lastLineWasBlank = false;
        const detectedTitle = this.extractPlayTitle(rawText);

        const isTitleOrMeta = (cand) => {
          if (!cand) return true;
          if (this.isMetaKeyword(cand)) return true;
          const clean = cand.replace(/\*+/g, '').trim().toLowerCase();
          if (clean.startsWith('texto ') || clean.startsWith('adapt') || clean.startsWith('autor')) return true;
          if (clean === 'após' || clean === 'apos') return true;
          if (/^\d+\s+personagens?/i.test(clean)) return true;
          return false;
        };

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
            const isItalicRubric = ((part.trim().startsWith('*') && part.trim().endsWith('*') && !part.trim().slice(1, -1).includes('*')) ||
                                    (part.trim().startsWith('_') && part.trim().endsWith('_') && !part.trim().slice(1, -1).includes('_'))) &&
                                    !part.includes(':');
            if (isParenRubric || isBracketRubric || isItalicRubric) {
              const cleanRubric = part
                .replace(/^\*?[\(\[]\s*/, '')
                .replace(/\s*[\)\]]\*?$/, '')
                .replace(/^[*_]+|[*_]+$/g, '')
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
          if (!line) {
            lastLineWasBlank = true;
            continue;
          }

          // Detecção de marcadores explícitos de Beat, Cena ou Quadro
          const beatMatch = line.match(/^(?:\[\[(?:beat|cena|bloco|quadro)\s*:\s*([^\]]+)\]\]|---+\s*(?:beat|cena|bloco|quadro)\s*:\s*([^-]+)---+|===+\s*(?:beat|cena|bloco|quadro)\s*:\s*([^=]+)===+|#+\s*(?:beat|cena|bloco|quadro)\s*[:\s]*([^\n]+)|(?:beat|cena|quadro)\s+([0-9ivxlcdm]+[:\s\S]*))$/i);
          if (beatMatch) {
            pushCurrent();
            const rawBeat = (beatMatch[1] || beatMatch[2] || beatMatch[3] || beatMatch[4] || beatMatch[5] || '').trim();
            if (rawBeat) {
              pendingBeat = rawBeat.startsWith('Beat') || rawBeat.startsWith('Cena') || rawBeat.startsWith('Quadro') ? rawBeat : `Beat: ${rawBeat}`;
            }
            lastLineWasBlank = false;
            continue;
          }

          // Sluglines (Fountain/Theatrical INT. / EXT.) e Transições
          if (/^(?:int\.|ext\.|est\.|i\/e\.)\s+/i.test(line) || /^(?:fade\s+(?:in|out|to)|corte\s+para|dissolve\s+para)\b/i.test(line)) {
            pushCurrent();
            pendingDirections.push(line);
            lastLineWasBlank = false;
            continue;
          }

          // Didascálias temporais/narrativas e ações de cena (sempre encerram fala anterior e vão para pendingDirections)
          const isNarrativeDir = /^(?:após|apos|passado|passados|decorrido|decorridos|momentos|instantes|tempo|pouco|logo|em\s+seguida)\s+(?:algum|alguns|pouco|poucos|depois|mais|a\s+seguir|tempo|minutos|instantes)\b/i.test(line);
          const isStagingDir = !line.includes(':') && /^(?:entra|entram|sai|saem|voltam|surge|surgem|ouve-se|escuta-se|pausa|silêncio|silencio|escuridão|escuro|apagam-se|cai\s+o\s+pano|blackout)\b/i.test(line);

          if (isNarrativeDir || isStagingDir) {
            pushCurrent();
            const cleanDir = line
              .replace(/^\*?[\(\[]\s*/, '')
              .replace(/\s*[\)\]]\*?$/, '')
              .replace(/^[*_]+|[*_]+$/g, '')
              .trim();
            if (cleanDir) {
              pendingDirections.push(cleanDir);
            }
            lastLineWasBlank = false;
            continue;
          }

          // Full-line scene directions (parênteses, colchetes e itálico)
          const isFullParenDir = (line.startsWith('*(') && line.endsWith(')*')) ||
                                 (line.startsWith('(') && line.endsWith(')')) ||
                                 (line.startsWith('[') && line.endsWith(']'));
          const isItalicDir = ((line.startsWith('*') && line.endsWith('*') && !line.slice(1, -1).includes('*')) ||
                               (line.startsWith('_') && line.endsWith('_') && !line.slice(1, -1).includes('_'))) &&
                               !line.includes(':');

          if (isFullParenDir || isItalicDir) {
            const cleanDir = line
              .replace(/^\*?[\(\[]\s*/, '')
              .replace(/\s*[\)\]]\*?$/, '')
              .replace(/^[*_]+|[*_]+$/g, '')
              .trim();
            if (currentSpeech && currentSpeech.segments.length === 0) {
              if (cleanDir) {
                currentSpeech.segments.push({ type: 'rubric', text: cleanDir });
              }
            } else if (currentSpeech && !lastLineWasBlank) {
              if (cleanDir) {
                currentSpeech.segments.push({ type: 'rubric', text: cleanDir });
              }
            } else {
              pushCurrent();
              if (cleanDir) {
                pendingDirections.push(cleanDir);
              }
            }
            lastLineWasBlank = false;
            continue;
          }

          // Ignore Markdown section headers and close current speech
          if (/^#+\s+/.test(line)) {
            pushCurrent();
            lastLineWasBlank = false;
            continue;
          }

          // Detecção de linhas de metadados, sinopse, resumo, elenco ou cabeçalhos de seção meta
          const cleanLineMeta = line.replace(/^(\*\*|#+\s*|\*)/, '').replace(/(\*\*|\*)$/, '').trim();
          const colonIdx = cleanLineMeta.indexOf(':');
          const prefixBeforeColon = colonIdx > 0 ? cleanLineMeta.slice(0, colonIdx).trim() : cleanLineMeta;
          if (this.isMetaKeyword(cleanLineMeta) || (colonIdx > 0 && this.isMetaKeyword(prefixBeforeColon))) {
            pushCurrent();
            const restOfLine = colonIdx > 0 ? cleanLineMeta.slice(colonIdx + 1).trim() : '';
            const isRubricOrDidascaliaPrefix = /^(?:rubrica|rubricas|didasc[aá]lia|didasc[aá]lias|ap[oó]s|ambient[aç][aã]o|observa[çc][aã]o|cen[aá]rio|cenario)\b/i.test(prefixBeforeColon);
            if (isRubricOrDidascaliaPrefix && restOfLine) {
              pendingDirections.push(restOfLine);
            }
            if (/^(\*\*|#+\s*)?Personagens:?(\*\*)?$/i.test(line) || /^\d+\s+personagens?/i.test(cleanLineMeta)) {
              inDramatisPersonae = true;
            }
            lastLineWasBlank = false;
            continue;
          }

          // Dramatis personae block detection (e.g. **Personagens:**)
          if (/^(\*\*|#+\s*)?Personagens:?(\*\*)?$/i.test(line)) {
            pushCurrent();
            inDramatisPersonae = true;
            lastLineWasBlank = false;
            continue;
          }
          if (inDramatisPersonae) {
            if (/^(\*\*|#+\s*)?(Cenário|Cenario|Ato|Cena|Quadro):?/i.test(line) ||
                line.startsWith('*(') || line.startsWith('(') ||
                (colonIdx > 0 && !this.isMetaKeyword(prefixBeforeColon))) {
              inDramatisPersonae = false;
            } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
              lastLineWasBlank = false;
              continue;
            }
          }

          if (/^(\*\*|#+\s*)?(Cenário|Cenario):?/i.test(line)) {
            pushCurrent();
            lastLineWasBlank = false;
            continue;
          }

          const extractWhoAndRubric = (rawWho) => {
            const clean = (rawWho || '').replace(/\*+/g, '').trim();
            const parenMatch = clean.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9ºª\s_'.\-]+?)\s*[\(\[](.*?)[\)\]]$/);
            if (parenMatch) {
              return { who: parenMatch[1].replace(/[:.\-—–]+$/, '').trim(), rubric: parenMatch[2].trim() };
            }
            return { who: clean.replace(/[:.\-—–]+$/, '').trim(), rubric: null };
          };

          let m = null;
          let inlineRubric = null;

          let p1 = line.match(/^\*\*([^*:]+):\*\*\s*(.*)$/);
          if (!p1) p1 = line.match(/^\*\*([^*:]+)\*\*:\s*(.*)$/);
          if (!p1) p1 = line.match(/^\*\*([^*:]+)\*\*\s*[-—–]\s*(.*)$/);
          if (p1) {
            const extracted = extractWhoAndRubric(p1[1]);
            if (!isTitleOrMeta(extracted.who)) {
              m = [line, extracted.who, p1[2] || ''];
              inlineRubric = extracted.rubric;
            }
          }

          if (!m) {
            const p2 = line.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9ºª\s_'.\-]{1,35})(?:\s*[\(\[](.*?)[\)\]])?:\s*(.*)$/);
            if (p2) {
              const whoCandidate = p2[1].trim();
              if (!isTitleOrMeta(whoCandidate)) {
                m = [line, whoCandidate, p2[3] || ''];
                inlineRubric = p2[2] ? p2[2].trim() : null;
              }
            }
          }

          if (!m) {
            const p3 = line.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9ºª\s_'.\-]+?)(?:\s*[\(\[](.*?)[\)\]])?\s*[-—–]\s*(.*)$/);
            if (p3) {
              const whoCandidate = p3[1].trim();
              if (!isTitleOrMeta(whoCandidate)) {
                m = [line, whoCandidate, p3[3] || ''];
                inlineRubric = p3[2] ? p3[2].trim() : null;
              }
            }
          }

          if (!m) {
            const p4 = line.match(/^\*\*([^*:\n]{2,40})\*\*$/);
            if (p4) {
              const extracted = extractWhoAndRubric(p4[1]);
              if (!isTitleOrMeta(extracted.who)) {
                m = [line, extracted.who, ''];
                inlineRubric = extracted.rubric;
              }
            }
          }

          if (!m) {
            const p5 = line.match(/^@([A-Za-zÀ-ÖØ-öø-ÿ0-9ºª\s_'.\-]{1,35})(?:\s*[\(\[](.*?)[\)\]])?$/);
            if (p5) {
              const whoCandidate = p5[1].trim();
              if (!isTitleOrMeta(whoCandidate)) {
                m = [line, whoCandidate, ''];
                inlineRubric = p5[2] ? p5[2].trim() : null;
              }
            }
          }

          if (!m) {
            const p6 = line.match(/^([A-ZÀ-Ú0-9ºª\s]{2,35})(?:\s*[\(\[](.*?)[\)\]])?$/);
            if (p6) {
              const whoCandidate = p6[1].trim();
              if (!isTitleOrMeta(whoCandidate)) {
                m = [line, whoCandidate, ''];
                inlineRubric = p6[2] ? p6[2].trim() : null;
              }
            }
          }

          if (m) {
            const whoCandidate = m[1].replace(/\*+/g, '').trim();
            const rawContent = (m[2] || '').trim();

            if (!isTitleOrMeta(whoCandidate)) {
              pushCurrent();
              currentSpeech = {
                who: whoCandidate,
                segments: [],
                spokenText: '',
                directions: [...pendingDirections],
                beatMarker: pendingBeat
              };
              pendingDirections = [];
              pendingBeat = null;
              if (inlineRubric) {
                currentSpeech.segments.push({ type: 'rubric', text: inlineRubric });
              }
              if (rawContent) {
                appendContent(currentSpeech, rawContent);
              }
              lastLineWasBlank = false;
              continue;
            }
          }

          // Continuation lines belonging to active speech
          if (currentSpeech) {
            appendContent(currentSpeech, line);
          }
          lastLineWasBlank = false;
        }

        pushCurrent();
        const grouped = this.groupCharacterVariants(parsed);
        return grouped.speeches;
      }
    };

    const DramaBeats = {
      generateBeats(speeches, rawText, predefinedBeats = null, strategy = 'auto') {
        // 1. Beats explicitamente informados (ex: do objeto da peca carregada)
        if (Array.isArray(predefinedBeats) && predefinedBeats.length > 0) {
          return [...predefinedBeats];
        }

        // 2. Se for a peca modelo e tiver beats definidos em DefaultPlay
        if (typeof DefaultPlay !== 'undefined' && DefaultPlay.beats && ScriptParser.isDefaultPlay(rawText) && speeches && speeches.length === 58) {
          return [...DefaultPlay.beats];
        }

        const total = (speeches || []).length;
        if (total === 0) return [];

        // 3. Estratégia de cena única completa
        if (strategy === 'single') {
          return [{
            name: `Cena Completa (Falas 1-${total})`,
            start: 0,
            end: total - 1
          }];
        }

        // 4. Estratégia de bloco fixo (10 ou 15 falas)
        if (strategy === 'block10' || strategy === 'block15') {
          const blockSize = strategy === 'block10' ? 10 : 15;
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

        // 5. Detectar marcadores coletados durante o parse (estratégia 'headers' ou 'auto')
        const markedBeats = [];
        for (let i = 0; i < total; i++) {
          if (speeches[i].beatMarker) {
            if (markedBeats.length > 0) {
              markedBeats[markedBeats.length - 1].end = i - 1;
            }
            markedBeats.push({
              name: speeches[i].beatMarker,
              start: i,
              end: total - 1
            });
          }
        }
        if (markedBeats.length >= 2) {
          return markedBeats;
        }

        // 6. Particionamento proporcional inteligente padrão
        if (total <= 15) {
          return [{
            name: `Cena Completa (Falas 1-${total})`,
            start: 0,
            end: total - 1
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

    // 4.1 ANALISADOR DRAMATÚRGICO HÍBRIDO (DramaturgyAnalyzer)
    // Arquitetura com gancho preparado para integração de IA (Passo 4) mantendo operação offline
    const DramaturgyAnalyzer = {
      aiProvider: null,

      setAIProvider(provider) {
        this.aiProvider = provider;
      },

      getAIProvider() {
        return this.aiProvider;
      },

      async analyze(rawText, options = {}) {
        if (this.aiProvider && typeof this.aiProvider.analyzeScript === 'function' && !options.forceOffline) {
          try {
            const aiResult = await this.aiProvider.analyzeScript(rawText, options);
            if (aiResult && aiResult.characters && aiResult.characters.length > 0) {
              const speeches = Array.isArray(aiResult.speeches) && aiResult.speeches.length > 0
                ? aiResult.speeches
                : ScriptParser.parseScript(rawText);
              const beats = Array.isArray(aiResult.beats) && aiResult.beats.length > 0
                ? aiResult.beats
                : DramaBeats.generateBeats(speeches, rawText, null, options.beatStrategy || 'auto');
              return {
                title: (aiResult.title || '').trim() || ScriptParser.extractPlayTitle(rawText),
                author: (aiResult.author || '').trim() || ScriptParser.extractAuthor(rawText),
                characters: [...aiResult.characters],
                speeches,
                beats,
                source: 'ai_assisted',
                providerName: aiResult.providerName || this.aiProvider.name || 'AI'
              };
            }
          } catch (err) {
            console.warn('Falha na analise de IA, aplicando fallback heuristico offline:', err?.message || err);
          }
        }

        return this.analyzeOffline(rawText, options);
      },

      analyzeOffline(rawText, options = {}) {
        const title = ScriptParser.extractPlayTitle(rawText);
        const author = ScriptParser.extractAuthor(rawText);
        const speeches = ScriptParser.parseScript(rawText);
        const detectedCharacters = [...new Set(speeches.map(s => s.who))];
        const beats = DramaBeats.generateBeats(speeches, rawText, null, options.beatStrategy || 'auto');

        return {
          title,
          author,
          characters: detectedCharacters,
          speeches,
          beats,
          source: 'heuristic_offline'
        };
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScriptParser, DramaBeats, DramaturgyAnalyzer };
}
