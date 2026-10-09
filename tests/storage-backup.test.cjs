const { createTestEnv, createRunner, assert } = require('./setup.cjs');

const { it, run } = createRunner('StorageManager, Intenções & Backup Data Integrity');

it('Restauração e persistência de configurações no AppState e StorageManager', () => {
  const env = createTestEnv();
  const { StorageManager, AppState, AppController, mockLocalStorage } = env;

  mockLocalStorage.setItem('memorizador_study_method', 'quiz');
  mockLocalStorage.setItem('memorizador_hide_rubrics', 'true');
  mockLocalStorage.setItem('memorizador_start_hidden', 'false');
  mockLocalStorage.setItem('memorizador_rate', '1.15');

  AppController.loadActiveScript();
  assert.strictEqual(AppState.studyMethod, 'quiz');
  assert.strictEqual(AppState.hideRubrics, true);
  assert.strictEqual(AppState.alwaysStartHidden, false);

  const settings = StorageManager.loadSettings();
  assert.strictEqual(settings.studyMethod, 'quiz');
  assert.strictEqual(settings.hideRubrics, true);
  assert.strictEqual(settings.alwaysStartHidden, false);
});

it('Isolamento estrito de intenções dramáticas de Stanislavski por peça (playId scoping)', () => {
  const env = createTestEnv();
  const { StorageManager, AppConfig } = env;

  const defaultIntent = StorageManager.getSpeechIntent(0, true, 'default');
  assert.strictEqual(defaultIntent, AppConfig.DEFAULT_INTENTIONS[0]);

  // Define intenção personalizada para a peça padrão
  StorageManager.setSpeechIntent(0, 'Intenção Sérgio Experimental', false, 'default');
  assert.strictEqual(StorageManager.getSpeechIntent(0, true, 'default'), 'Intenção Sérgio Experimental');

  // Define intenção para uma peça diferente
  StorageManager.setSpeechIntent(0, 'Intenção Hamlet', false, 'play_hamlet');
  assert.strictEqual(StorageManager.getSpeechIntent(0, false, 'play_hamlet'), 'Intenção Hamlet');

  // Garante que a peça padrão não foi alterada pela intenção de Hamlet
  assert.strictEqual(StorageManager.getSpeechIntent(0, false, 'default'), 'Intenção Sérgio Experimental');

  // Reset para padrão
  StorageManager.setSpeechIntent(0, 'padrao', false, 'default');
  assert.strictEqual(StorageManager.getSpeechIntent(0, true, 'default'), AppConfig.DEFAULT_INTENTIONS[0]);
});

it('Caderno de Ensaio: persistência de anotações livres e notas vinculadas a falas por peça', () => {
  const env = createTestEnv();
  const { StorageManager } = env;

  StorageManager.setActorNotes('Subtexto de Sérgio: frieza metódica', 'default');
  assert.strictEqual(StorageManager.getActorNotes('default'), 'Subtexto de Sérgio: frieza metódica');

  StorageManager.setSpeechNote(0, 'Pausar 2 segundos antes de falar', 'default');
  assert.strictEqual(StorageManager.getSpeechNote(0, 'default'), 'Pausar 2 segundos antes de falar');

  // Outra peça deve ter notas vazias
  assert.strictEqual(StorageManager.getActorNotes('play_outra'), '');
  assert.strictEqual(StorageManager.getSpeechNote(0, 'play_outra'), '');
});

it('Gravação e recuperação de áudios no IndexedDB (STORE_NAME, saveCastAudio e getCastAudio)', async () => {
  const env = createTestEnv();
  const { StorageManager } = env;

  assert.strictEqual(StorageManager.STORE_NAME, 'recordings');

  const testBlob = { size: 1024, type: 'audio/webm' };
  await StorageManager.saveCastAudio(5, testBlob, 'play_teste');

  const loadedBlob = await StorageManager.getCastAudio(5, 'play_teste');
  assert(loadedBlob !== null, 'Deveria recuperar o áudio salvo');
  assert.strictEqual(loadedBlob.size, 1024);
  assert.strictEqual(loadedBlob.type, 'audio/webm');

  // Limpeza de gravações
  await StorageManager.clearAllCastAudios();
  const afterClear = await StorageManager.getCastAudio(5, 'play_teste');
  assert.strictEqual(afterClear, null, 'Áudio deve ter sido limpo');
});

it('Exportação segura de backup: exclusão estrita de chaves de API, senhas ou tokens sensíveis', () => {
  const env = createTestEnv();
  const { mockLocalStorage } = env;

  mockLocalStorage.setItem('memorizador_rate', '1.0');
  mockLocalStorage.setItem('intent_default_0', 'Afrontar o pai');
  mockLocalStorage.setItem('voice_actor_SERGIO', 'Felipe');
  mockLocalStorage.setItem('memorizador_gemini_api_key', 'AIzaSyConfidentialSecret12345');
  mockLocalStorage.setItem('auth_token', 'TOKEN_SECRETO');
  mockLocalStorage.setItem('user_secret', 'SEGREDO');

  const allowedPrefixes = ['memorizador_', 'intent_', 'voice_actor_', 'inv-'];
  const exportedKeys = [];
  for (let i = 0; i < mockLocalStorage.length; i++) {
    const key = mockLocalStorage.key(i);
    if (
      key &&
      allowedPrefixes.some(p => key.startsWith(p)) &&
      !key.toLowerCase().includes('key') &&
      !key.toLowerCase().includes('token') &&
      !key.toLowerCase().includes('secret')
    ) {
      exportedKeys.push(key);
    }
  }

  assert(exportedKeys.includes('intent_default_0'), 'Intenções devem ser exportadas');
  assert(exportedKeys.includes('voice_actor_SERGIO'), 'Vozes atribuídas devem ser exportadas');
  assert(exportedKeys.includes('memorizador_rate'), 'Configurações permitidas devem ser exportadas');
  assert(!exportedKeys.includes('memorizador_gemini_api_key'), 'Chave da API Gemini NUNCA deve ser exportada');
  assert(!exportedKeys.includes('auth_token'), 'Tokens NUNCA devem ser exportados');
  assert(!exportedKeys.includes('user_secret'), 'Segredos NUNCA devem ser exportados');
});

it('Restauração de backup: persistência íntegra de speechIdx, playId e limpeza de banco anterior', async () => {
  const env = createTestEnv();
  const { StorageManager, AppController, mockLocalStorage } = env;

  // Insere gravação e intenção antigas que devem ser limpas
  await StorageManager.saveCastAudio(99, { size: 50, type: 'audio/webm' }, 'default');
  mockLocalStorage.setItem('intent_99_default', 'Intenção fantasma');

  const backupData = {
    localStorage: {
      'memorizador_mode': 'cena',
      'intent_default_7': '[Pressionar] Subtexto restaurado'
    },
    recordings: [
      { id: 'playX_7', speechIdx: 7, playId: 'playX', base64: 'data:audio/webm;base64,AAAA' }
    ]
  };

  const fakeFile = { text: async () => JSON.stringify(backupData) };
  await AppController.importFullBackup(fakeFile);

  // Valida que gravações e dados antigos foram higienizados
  const ghostAudio = await StorageManager.getCastAudio(99, 'default');
  assert.strictEqual(ghostAudio, null, 'Áudio fantasma antigo deve ter sido limpo');
  assert.strictEqual(mockLocalStorage.getItem('intent_99_default'), null, 'Intenção fantasma deve ser limpa');

  // Valida que o novo áudio foi restaurado com fidelidade
  const restoredAudio = await StorageManager.getCastAudio(7, 'playX');
  assert(restoredAudio !== null, 'Novo áudio restaurado deve existir');
  assert.strictEqual(restoredAudio.type, 'audio/webm');
  assert.strictEqual(mockLocalStorage.getItem('intent_default_7'), '[Pressionar] Subtexto restaurado');
});

it('Blindagem da chave Gemini em importFullBackup: chave do usuário ativa NUNCA é sobrescrita ou apagada no restore', async () => {
  const env = createTestEnv();
  const { AppController, mockLocalStorage } = env;

  mockLocalStorage.setItem('memorizador_gemini_api_key', 'AIzaSyChaveQueNaoPodeSumir');
  mockLocalStorage.setItem('memorizador_study_method', 'oral');

  const incomingBackup = {
    localStorage: {
      'memorizador_study_method': 'quiz',
      'intent_default_0': '[Confrontar] Subtexto'
    },
    recordings: []
  };

  await AppController.importFullBackup({ text: async () => JSON.stringify(incomingBackup) });

  assert.strictEqual(
    mockLocalStorage.getItem('memorizador_gemini_api_key'),
    'AIzaSyChaveQueNaoPodeSumir',
    'A chave do usuário deve permanecer preservada no restore'
  );
  assert.strictEqual(mockLocalStorage.getItem('memorizador_study_method'), 'quiz');
});

it('StorageManager: resiliência defensiva e formatação de intenções estruturadas', () => {
  const env = createTestEnv();
  const { StorageManager } = env;

  const parsed = StorageManager.parseIntent({ actionVerb: 'Sondar', subtext: 'Descobrir a verdade' });
  assert.strictEqual(parsed.formatted, '[Sondar] Descobrir a verdade');

  const parsedRaw = StorageManager.parseIntent('[Afrontar] Não ceder');
  assert.strictEqual(parsedRaw.actionVerb, 'Afrontar');
  assert.strictEqual(parsedRaw.subtext, 'Não ceder');
});

module.exports = { run };

if (require.main === module) {
  run().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
