// ==========================================================================
// 4.2 SERVICO DE INTELIGENCIA ARTIFICIAL (AIService · BYOK Google Gemini)
// Modulo de IA para higienizacao de roteiros, arcos dramaticos,
// verbos de acao de Stanislavski, cadeia causal de deixas e quiz teatral.
// ==========================================================================

const AIService = {
  STORAGE_KEY_API_KEY: 'memorizador_gemini_api_key',
  STORAGE_KEY_MODEL: 'memorizador_gemini_model',
  DEFAULT_MODEL: 'gemini-2.5-flash',
  FALLBACK_MODEL: 'gemini-1.5-flash',

  fetchFn: (typeof fetch !== 'undefined') ? fetch : null,

  getApiKey() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(this.STORAGE_KEY_API_KEY) || '';
      }
    } catch (e) {}
    return '';
  },

  setApiKey(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        const trimmed = (key || '').trim();
        if (trimmed) {
          localStorage.setItem(this.STORAGE_KEY_API_KEY, trimmed);
        } else {
          localStorage.removeItem(this.STORAGE_KEY_API_KEY);
        }
      }
    } catch (e) {}
  },

  getModel() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(this.STORAGE_KEY_MODEL) || this.DEFAULT_MODEL;
      }
    } catch (e) {}
    return this.DEFAULT_MODEL;
  },

  setModel(model) {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = (model || '').trim() || this.DEFAULT_MODEL;
        localStorage.setItem(this.STORAGE_KEY_MODEL, val);
      }
    } catch (e) {}
  },

  hasKey() {
    return Boolean(this.getApiKey().trim());
  },

  hasApiKey() {
    return this.hasKey();
  },

  async callGeminiRaw(prompt, options = {}) {
    const apiKey = (options.apiKey || this.getApiKey()).trim();
    if (!apiKey) {
      throw new Error('Chave da API Gemini nao configurada');
    }

    const model = (options.model || this.getModel()).trim() || this.DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const fetcher = this.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) {
      throw new Error('Ambiente sem suporte a fetch HTTP');
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: options.temperature !== undefined ? options.temperature : 0.2
      }
    };

    const res = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errDetails = '';
      try {
        const errJson = await res.json();
        errDetails = errJson.error?.message || errJson.message || '';
      } catch (e) {
        errDetails = res.statusText;
      }
      throw new Error(`Falha na API Gemini (${res.status}): ${errDetails || 'Erro desconhecido'}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Resposta vazia da API Gemini');
    }

    let cleaned = (rawText || '').trim();
    // 1. Remove markdown code fences if present (```json ... ``` or ``` ...)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (jsonErr) {
      // 2. Locate outermost JSON object or array structure based on which delimiter appears first
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      let candidate = null;

      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        const lastBracket = cleaned.lastIndexOf(']');
        if (lastBracket > firstBracket) {
          candidate = cleaned.slice(firstBracket, lastBracket + 1);
        }
      } else if (firstBrace !== -1) {
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace > firstBrace) {
          candidate = cleaned.slice(firstBrace, lastBrace + 1);
        }
      }

      if (candidate) {
        try {
          return JSON.parse(candidate);
        } catch (innerErr) {}
      }
      throw new Error('Nao foi possivel interpretar a resposta JSON da IA');
    }
  },

  async testConnection(testKey = null, testModel = null) {
    const key = (testKey || this.getApiKey()).trim();
    if (!key) {
      return { ok: false, error: 'Chave de API nao informada' };
    }

    const model = (testModel || this.getModel()).trim() || this.DEFAULT_MODEL;
    try {
      const prompt = 'Ping de teste do StagePro Studio. Responda estritamente com o JSON: {"status": "ok", "app": "memorizador-teatro"}';
      const result = await this.callGeminiRaw(prompt, { apiKey: key, model, temperature: 0.1 });
      if (result && (result.status === 'ok' || result.app)) {
        return { ok: true, model, message: 'Conexao validada com sucesso via Google AI Studio' };
      }
      return { ok: true, model, message: 'Conexao estabelecida com sucesso' };
    } catch (err) {
      return { ok: false, error: err.message || 'Falha ao conectar com o modelo Gemini' };
    }
  },

  async analyzeScript(rawText, options = {}) {
    const sanitized = (typeof ScriptParser !== 'undefined' && typeof ScriptParser.sanitizeRawText === 'function')
      ? ScriptParser.sanitizeRawText(rawText)
      : rawText;

    if (!this.hasKey() || options.forceOffline) {
      throw new Error('Modo offline solicitado ou chave de IA ausente');
    }

    const prompt = `Voce e um assistente especialista em dramaturgia e preparacao de atores teatrais.
Analise o texto bruto desta peca teatral. O texto pode conter ruidos de digitalizacao (como numeros de paginas ou rodapes).
Higienize o roteiro, identifique os personagens reais do elenco, extraia as falas com suas rubricas e sugira arcos dramaticos (beats cênicos reais).

Responda estritamente no formato JSON com a seguinte estrutura:
{
  "title": "Titulo da Peca",
  "author": "Nome do Autor ou Grupo",
  "characters": ["NOME1", "NOME2"],
  "speeches": [
    {
      "who": "NOME1",
      "spokenText": "Texto que o ator fala",
      "segments": [
        {"type": "rubric", "text": "em tom baixo"},
        {"type": "speech", "text": "Texto que o ator fala"}
      ],
      "directions": ["Rubrica de abertura se houver"]
    }
  ],
  "beats": [
    {
      "name": "Nome semantico do beat (ex: O Confronto Inicial)",
      "start": 0,
      "end": 5
    }
  ]
}

Texto bruto do roteiro:
---
${sanitized.slice(0, 30000)}
---`;

    const result = await this.callGeminiRaw(prompt, {
      model: options.model || this.getModel(),
      temperature: 0.2
    });

    if (!result || !Array.isArray(result.characters) || result.characters.length === 0) {
      throw new Error('A analise de IA nao retornou personagens validos');
    }

    const cleanCharacters = result.characters.map(c => (c || '').replace(/\*+/g, '').trim().toUpperCase()).filter(Boolean);

    const fullParsedSpeeches = (typeof ScriptParser !== 'undefined' && typeof ScriptParser.parseScript === 'function')
      ? ScriptParser.parseScript(sanitized)
      : [];

    let cleanSpeeches = fullParsedSpeeches;
    // Proteção contra truncamento de tokens pelo LLM: só substitui se a IA entregou todas as falas
    if (Array.isArray(result.speeches) && result.speeches.length >= fullParsedSpeeches.length && fullParsedSpeeches.length > 0) {
      cleanSpeeches = result.speeches.map(s => ({
        who: (s.who || '').replace(/\*+/g, '').trim().toUpperCase(),
        spokenText: (s.spokenText || '').trim(),
        segments: Array.isArray(s.segments) && s.segments.length > 0
          ? s.segments
          : [{ type: 'speech', text: (s.spokenText || '').trim() }],
        directions: Array.isArray(s.directions) ? s.directions : []
      }));
    } else if (fullParsedSpeeches.length > 0) {
      if (cleanCharacters.length > 0 && typeof ScriptParser.canonicalizeCharacterName === 'function') {
        cleanSpeeches = fullParsedSpeeches.map(s => ({
          ...s,
          who: ScriptParser.canonicalizeCharacterName(s.who, cleanCharacters)
        }));
      }
    }

    const totalSpeeches = cleanSpeeches.length;
    let cleanBeats = [];
    if (Array.isArray(result.beats) && result.beats.length > 0) {
      cleanBeats = result.beats.map((b, idx) => ({
        name: (b.name || `Beat ${idx + 1}`).trim(),
        start: Math.max(0, Math.min(totalSpeeches - 1, parseInt(b.start, 10) || 0)),
        end: Math.max(0, Math.min(totalSpeeches - 1, parseInt(b.end, 10) || (totalSpeeches - 1)))
      })).filter(b => b.start <= b.end);
    }

    if (cleanBeats.length === 0 && typeof DramaBeats !== 'undefined') {
      cleanBeats = DramaBeats.generateBeats(cleanSpeeches, sanitized, null, options.beatStrategy || 'auto');
    }

    return {
      title: (result.title || '').trim() || (typeof ScriptParser !== 'undefined' ? ScriptParser.extractPlayTitle(sanitized) : 'Roteiro Sem Titulo'),
      author: (result.author || '').trim() || (typeof ScriptParser !== 'undefined' ? ScriptParser.extractAuthor(sanitized) : 'Autor nao informado'),
      characters: cleanCharacters,
      speeches: cleanSpeeches,
      beats: cleanBeats,
      source: 'ai_assisted',
      providerName: 'Google Gemini'
    };
  },

  async generateStanislavskiSubtext(speeches, actor = null, options = {}) {
    const list = Array.isArray(speeches) ? speeches : [];
    if (list.length === 0) return {};

    if (!this.hasKey() || options.forceOffline) {
      return this.generateStanislavskiSubtextOffline(list, actor);
    }

    try {
      const targetIndices = [];
      const promptLines = [];
      list.forEach((s, idx) => {
        if (!actor || s.who === actor) {
          targetIndices.push(idx);
          const preview = (s.spokenText || '').slice(0, 180);
          promptLines.push(`[${idx}] ${s.who}: "${preview}"`);
        }
      });

      if (promptLines.length === 0) return {};

      const prompt = `Voce e um preparador de elenco de teatro instruido no Sistema de Stanislavski.
Para cada fala numerada abaixo, defina o Verbo de Acao ativo (no infinitivo, ex: "Desarmar", "Intimidar", "Suplicar", "Provocar", "Desmascarar", "Sondar", "Proteger", "Acalmar", "Encurralar") e o Subtexto dramático (o que a personagem realmente quer sob as palavras).

Responda estritamente com um array JSON de objetos:
[
  {
    "speechIdx": 0,
    "actionVerb": "Desarmar",
    "subtext": "Tentar evitar o confronto direto antes que os documentos sejam lidos"
  }
]

Falas para analise:
${promptLines.join('\n')}`;

      const res = await this.callGeminiRaw(prompt, {
        model: options.model || this.getModel(),
        temperature: 0.3
      });

      const map = {};
      if (Array.isArray(res)) {
        res.forEach(item => {
          const idx = parseInt(item.speechIdx, 10);
          if (!isNaN(idx) && item.actionVerb) {
            const verb = (item.actionVerb || '').replace(/[\[\]]/g, '').trim();
            const sub = (item.subtext || '').trim();
            map[idx] = {
              actionVerb: verb,
              subtext: sub,
              formatted: `[${verb}] ${sub}`
            };
          }
        });
      } else if (res && typeof res === 'object') {
        Object.keys(res).forEach(k => {
          const idx = parseInt(k, 10);
          if (!isNaN(idx)) {
            const val = res[k];
            if (typeof val === 'string') {
              const m = val.match(/^\[(.*?)\]\s*(.*)$/);
              const verb = m ? m[1].trim() : 'Agir';
              const sub = m ? m[2].trim() : val.trim();
              map[idx] = { actionVerb: verb, subtext: sub, formatted: val.trim() };
            } else if (val && typeof val === 'object') {
              const verb = (val.actionVerb || '').replace(/[\[\]]/g, '').trim() || 'Agir';
              const sub = (val.subtext || '').trim();
              map[idx] = { actionVerb: verb, subtext: sub, formatted: val.formatted || `[${verb}] ${sub}` };
            }
          }
        });
      }

      if (Object.keys(map).length > 0) {
        return map;
      }
    } catch (err) {
      console.warn('Falha na geracao de subtexto com IA, aplicando fallback heuristico:', err?.message || err);
    }

    return this.generateStanislavskiSubtextOffline(list, actor);
  },

  generateStanislavskiSubtextOffline(speeches, actor = null) {
    const list = Array.isArray(speeches) ? speeches : [];
    const map = {};

    const actionPool = [
      { trigger: /\?/, verbs: ['Sondar', 'Investigar', 'Interrogar', 'Pressionar'], sub: 'Descobrir se o outro esconde a verdade antes de agir' },
      { trigger: /!/, verbs: ['Intimidar', 'Reivindicar', 'Impor-se', 'Confrontar'], sub: 'Fazer o outro recuar e impor autoridade na cena' },
      { trigger: /\.\.\./, verbs: ['Hesitar', 'Dissimular', 'Recuar', 'Proteger-se'], sub: 'Esconder o medo real sob uma aparente ponderacao' },
      { trigger: /\b(n[aã]o|nunca|jamais)\b/i, verbs: ['Defender-se', 'Desarmar', 'Resistir', 'Negar'], sub: 'Bloquear a investida do interlocutor e preservar a dignidade' },
      { trigger: /\b(porque|pois|raz[aã]o|justo)\b/i, verbs: ['Persuadir', 'Justificar-se', 'Convencer'], sub: 'Construir uma logica irrefutavel para mascarar a culpa' },
      { trigger: /\b(onde|quem|quando|como)\b/i, verbs: ['Encurralar', 'Desmascarar', 'Cobrar'], sub: 'Forcar o interlocutor a entregar os fatos' },
      { trigger: /\b(calma|espera|olha|ouva|escute)\b/i, verbs: ['Acalmar', 'Controlar', 'Seduzir'], sub: 'Desacelerar o ritmo cênico para retomar a vantagem' }
    ];

    const defaultVerbs = ['Provocar', 'Desafiar', 'Testar', 'Proteger', 'Desarmar', 'Enfrentar', 'Analisar'];

    list.forEach((s, idx) => {
      if (!actor || s.who === actor) {
        const text = s.spokenText || '';
        let matchedVerb = null;
        let matchedSub = null;

        for (const rule of actionPool) {
          if (rule.trigger.test(text)) {
            const verbIdx = (idx + text.length) % rule.verbs.length;
            matchedVerb = rule.verbs[verbIdx];
            matchedSub = rule.sub;
            break;
          }
        }

        if (!matchedVerb) {
          const vIdx = idx % defaultVerbs.length;
          matchedVerb = defaultVerbs[vIdx];
          matchedSub = 'Manter a tensao viva e observar a reacao do colega';
        }

        map[idx] = {
          actionVerb: matchedVerb,
          subtext: matchedSub,
          formatted: `[${matchedVerb}] ${matchedSub}`
        };
      }
    });

    return map;
  },

  async detectCueTriggers(cueText, speechText, options = {}) {
    if (this.hasKey() && !options.forceOffline) {
      try {
        const prompt = `Analise este engate de cena teatral (a deixa do colega e a réplica do ator).
Identifique a palavra-gatilho ou o conector causal que faz o ator disparar a sua fala.

Deixa do colega: "${(cueText || '').slice(0, 300)}"
Replica do ator: "${(speechText || '').slice(0, 300)}"

Responda estritamente com o JSON:
{
  "triggerWord": "palavra-chave",
  "hookType": "eco | pergunta_resposta | contraste | conexao_emocional",
  "reason": "Explicacao curta do engate"
}`;
        const res = await this.callGeminiRaw(prompt, {
          model: options.model || this.getModel(),
          temperature: 0.2
        });
        if (res && res.triggerWord) {
          return {
            triggerWord: (res.triggerWord || '').trim().toLowerCase(),
            hookType: res.hookType || 'conexao',
            reason: res.reason || 'Engate cênico causal'
          };
        }
      } catch (e) {}
    }

    if (typeof ScriptParser !== 'undefined' && typeof ScriptParser.detectCueTrigger === 'function') {
      return ScriptParser.detectCueTrigger(cueText, speechText);
    }

    return {
      triggerWord: '',
      hookType: 'linear',
      reason: 'Sequencia dramatica natural'
    };
  },

  async generateDramaturgicalQuiz(speech, prevSpeech = null, allSpeeches = [], options = {}) {
    const spoken = (speech?.spokenText || '').trim();
    if (!spoken) return null;

    if (this.hasKey() && !options.forceOffline) {
      try {
        const prompt = `Voce e um preparador cênico. Crie um desafio de compreensao cênica e fixacao para o ator:
Fala do ator (${speech?.who || 'Ator'}): "${spoken.slice(0, 350)}"
${prevSpeech ? `Deixa anterior (${prevSpeech.who}): "${prevSpeech.spokenText.slice(0, 200)}"` : ''}

Gere um desafio com:
1. Uma pergunta dramatúrgica sobre a intenção da réplica ou o gatilho da deixa.
2. 4 alternativas (1 correta e 3 distratores credíveis).
3. Uma palavra-chave essencial que completa a réplica.

Responda estritamente com o JSON:
{
  "question": "Qual a intencao principal do personagem nesta replica?",
  "correctAnswer": "Alternativa correta",
  "distractors": ["Distrator 1", "Distrator 2", "Distrator 3"],
  "keyword": "palavra_chave"
}`;
        const res = await this.callGeminiRaw(prompt, {
          model: options.model || this.getModel(),
          temperature: 0.3
        });
        if (res && res.question && res.correctAnswer && Array.isArray(res.distractors)) {
          return res;
        }
      } catch (e) {}
    }

    return this.generateQuizOffline(speech, prevSpeech, allSpeeches);
  },

  generateQuizOffline(speech, prevSpeech = null, allSpeeches = []) {
    const spoken = (speech?.spokenText || '').trim();
    if (!spoken) return null;

    const words = spoken.split(/\s+/).map(w => w.replace(/[.,!?;:()""«»—–]/g, '').trim()).filter(w => w.length >= 3);
    const contentWords = words.filter(w => typeof Utils !== 'undefined' ? !Utils.isFunctionWord(w) : true);
    const keyword = contentWords[0] || words[0] || 'fala';

    let question = `Qual e o foco dramático desta réplica de ${speech?.who || 'sua personagem'}?`;
    let correctAnswer = `Expressar com firmeza a frase central: "${spoken.slice(0, 50)}..."`;
    let distractors = [
      'Hesitar e pedir desculpas ao interlocutor',
      'Desviar de assunto e sair de cena imediatamente',
      'Concordar passivamente com a deixa do colega'
    ];

    if (prevSpeech && typeof ScriptParser !== 'undefined' && typeof ScriptParser.detectCueTrigger === 'function') {
      const hook = ScriptParser.detectCueTrigger(prevSpeech.spokenText, spoken);
      if (hook && hook.triggerWord) {
        question = `Qual palavra ou gancho da deixa de ${prevSpeech.who} conecta diretamente a sua resposta?`;
        correctAnswer = `O gancho em "${hook.triggerWord}"`;
        distractors = [
          'A mudanca de iluminacao na cena',
          'Um silencio prolongado sem conexao verbal',
          'A mencao casual a um personagem ausente'
        ];
      }
    }

    return {
      question,
      correctAnswer,
      distractors,
      keyword
    };
  }
};

if (typeof DramaturgyAnalyzer !== 'undefined' && typeof DramaturgyAnalyzer.setAIProvider === 'function') {
  DramaturgyAnalyzer.setAIProvider(AIService);
}

if (typeof globalThis !== 'undefined') {
  globalThis.AIService = AIService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIService };
}
