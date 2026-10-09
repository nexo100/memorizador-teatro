const { createTestEnv, createRunner, assert } = require('./setup.cjs');

const { it, run } = createRunner('AIService & Inteligência Dramatúrgica');

it('AIService: configuração BYOK, persistência de chave no storage e alternância de modelos', () => {
  const env = createTestEnv();
  const { AIService, mockLocalStorage } = env;

  assert.strictEqual(AIService.hasKey(), false, 'Chave deve iniciar vazia');
  AIService.setApiKey('AIzaSyMockKeyParaTestes');
  assert.strictEqual(mockLocalStorage.getItem('memorizador_gemini_api_key'), 'AIzaSyMockKeyParaTestes');
  assert.strictEqual(AIService.getApiKey(), 'AIzaSyMockKeyParaTestes');
  assert.strictEqual(AIService.hasKey(), true);

  // Model switching
  AIService.setModel('gemini-1.5-flash');
  assert.strictEqual(AIService.getModel(), 'gemini-1.5-flash');
  assert.strictEqual(mockLocalStorage.getItem('memorizador_gemini_model'), 'gemini-1.5-flash');
});

it('AIService.testConnection: ping de validação com mock fetch (sucesso, 403 e ausência de chave)', async () => {
  const env = createTestEnv();
  const { AIService } = env;

  let lastUrl = '';
  AIService.fetchFn = async (url) => {
    lastUrl = url;
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({ status: 'ok' }) }] }
        }]
      })
    };
  };

  const okResult = await AIService.testConnection('AIzaSyChave123', 'gemini-1.5-flash');
  assert.strictEqual(okResult.ok, true);
  assert(lastUrl.includes('models/gemini-1.5-flash:generateContent'));
  assert(lastUrl.includes('key=AIzaSyChave123'));

  // Falha 403
  AIService.fetchFn = async () => ({
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    json: async () => ({ error: { message: 'API key not valid.' } })
  });
  const failResult = await AIService.testConnection('invalid_key');
  assert.strictEqual(failResult.ok, false);
  assert(failResult.error.includes('403') || failResult.error.includes('API key not valid'));

  // Sem chave
  const emptyResult = await AIService.testConnection('');
  assert.strictEqual(emptyResult.ok, false);
});

it('AIService.callGeminiRaw: extração e parsing resiliente de arrays JSON envolvidos em markdown e prosa', async () => {
  const env = createTestEnv();
  const { AIService } = env;

  const markdownText = `
Aqui estão as intenções analisadas pelo diretor:
\`\`\`json
[
  {"speechIdx": 0, "actionVerb": "Desarmar", "subtext": "Evitar conflito inicial"},
  {"speechIdx": 1, "actionVerb": "Intimidar", "subtext": "Impor respeito na mesa"}
]
\`\`\`
Bons ensaios!
`;

  AIService.fetchFn = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: { parts: [{ text: markdownText }] }
      }]
    })
  });

  const res = await AIService.callGeminiRaw('prompt teste', { apiKey: 'AIzaSyChave' });
  assert(Array.isArray(res), 'Deve interpretar com sucesso o array JSON extraído');
  assert.strictEqual(res.length, 2);
  assert.strictEqual(res[0].actionVerb, 'Desarmar');
  assert.strictEqual(res[1].actionVerb, 'Intimidar');
});

it('O Diretor Stanislavski: geração heurística offline e mock AI de verbos de ação e subtexto', async () => {
  const env = createTestEnv();
  const { AIService } = env;

  const speeches = [
    { who: 'BÁRBARA', spokenText: 'Por que você escondeu as cartas do papai?' },
    { who: 'JULIANO', spokenText: 'Eu só fiz o que era necessário para proteger o patrimônio.' }
  ];

  // Heurística offline
  const offlineIntents = AIService.generateStanislavskiSubtextOffline(speeches, 'BÁRBARA');
  const barbaraIntent = offlineIntents['0'];
  const formatted = typeof barbaraIntent === 'string' ? barbaraIntent : barbaraIntent?.formatted;
  assert(typeof formatted === 'string');
  assert(formatted.startsWith('[') && formatted.includes(']'), 'Deve formatar intenção com verbo entre colchetes');

  // Mock AI
  AIService.fetchFn = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              "0": "[Confrontar] Desmascarar a farsa do irmão",
              "1": "[Justificar] Defender a honra familiar"
            })
          }]
        }
      }]
    })
  });
  AIService.setApiKey('AIzaSyKey');

  const aiIntents = await AIService.generateStanislavskiSubtext(speeches, null, { forceOffline: false });
  const intent0 = typeof aiIntents['0'] === 'string' ? aiIntents['0'] : aiIntents['0']?.formatted;
  const intent1 = typeof aiIntents['1'] === 'string' ? aiIntents['1'] : aiIntents['1']?.formatted;
  assert.strictEqual(intent0, '[Confrontar] Desmascarar a farsa do irmão');
  assert.strictEqual(intent1, '[Justificar] Defender a honra familiar');
});

it('Gamificação / Quiz Dramatúrgico com IA: estrutura offline e geração com mock IA', async () => {
  const env = createTestEnv();
  const { AIService } = env;

  const currentSpeech = { who: 'JULIANO', spokenText: 'Não permitirei que vendam a casa da nossa infância por preço vil!' };
  const prevSpeech = { who: 'BÁRBARA', spokenText: 'A decisão já foi tomada pela maioria dos herdeiros.' };

  // Heurística offline
  const offlineQuiz = AIService.generateQuizOffline(currentSpeech, prevSpeech, [prevSpeech, currentSpeech]);
  assert(offlineQuiz !== null);
  assert(typeof offlineQuiz.question === 'string' && offlineQuiz.question.length > 5);
  assert(typeof offlineQuiz.correctAnswer === 'string');
  assert(Array.isArray(offlineQuiz.distractors) && offlineQuiz.distractors.length >= 3);
  assert(typeof offlineQuiz.keyword === 'string');

  // Mock AI
  AIService.fetchFn = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              question: "Qual o objetivo dramático de Juliano nesta fala?",
              correctAnswer: "Impedir a venda da casa de família",
              distractors: ["Concordar com a venda", "Pedir desculpas", "Elogiar Bárbara"],
              keyword: "infância"
            })
          }]
        }
      }]
    })
  });
  AIService.setApiKey('AIzaSyKey');

  const aiQuiz = await AIService.generateDramaturgicalQuiz(currentSpeech, prevSpeech, [prevSpeech, currentSpeech], { forceOffline: false });
  assert.strictEqual(aiQuiz.keyword, 'infância');
  assert.strictEqual(aiQuiz.correctAnswer, 'Impedir a venda da casa de família');
  assert.strictEqual(aiQuiz.distractors.length, 3);
});

it('DramaturgyAnalyzer: gancho arquitetural plugável para IA e fallback transparente offline', async () => {
  const env = createTestEnv();
  const { DramaturgyAnalyzer, ScriptParser } = env;

  // Análise offline determinística padrão
  const offline = await DramaturgyAnalyzer.analyze('**ATOR:** Fala de teste.');
  assert.strictEqual(offline.source, 'heuristic_offline');

  // Mock de Provedor de IA
  const mockAI = {
    name: 'Gemini-Mock',
    analyzeScript: async (text) => ({
      title: 'Antígona',
      author: 'Sófocles',
      characters: ['ANTÍGONA', 'ISMENE'],
      speeches: ScriptParser.parseScript(text),
      beats: [{ name: 'Prólogo', start: 0, end: 1 }],
      suggestions: ['Alta tensão dramática']
    })
  };

  DramaturgyAnalyzer.setAIProvider(mockAI);
  const aiResult = await DramaturgyAnalyzer.analyze('**ANTÍGONA:** Enterrarei meu irmão.');
  assert.strictEqual(aiResult.source, 'ai_assisted');
  assert.strictEqual(aiResult.title, 'Antígona');
  assert.strictEqual(aiResult.author, 'Sófocles');

  // Fallback quando provedor de IA falha
  DramaturgyAnalyzer.setAIProvider({
    analyzeScript: async () => { throw new Error('API Rate Limit ou Sem Conexão'); }
  });
  const fallbackResult = await DramaturgyAnalyzer.analyze('**ISMENE:** Não desafies o rei.');
  assert.strictEqual(fallbackResult.source, 'heuristic_offline');
  assert.strictEqual(fallbackResult.characters[0], 'ISMENE');

  // Limpeza
  DramaturgyAnalyzer.setAIProvider(null);
  assert.strictEqual(DramaturgyAnalyzer.getAIProvider(), null);
});

module.exports = { run };

if (require.main === module) {
  run().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
