const { createTestEnv, createRunner, assert } = require('./setup.cjs');

const { it, run } = createRunner('AudioEngine Core & Ciclo de Vida');

it('AudioEngine: controle bidirecional de reprodução e parada imediata (Play/Stop toggle)', () => {
  const env = createTestEnv();
  const { AudioEngine, AppState } = env;

  let audioStatus = '';
  const currentSpeech = AppState.speeches[0];

  // 1º Clique: Inicia reprodução
  AudioEngine.playSpeechAudio(0, currentSpeech, 'SÉRGIO', 0, 1.0, 'normal', {
    onStatus: (msg) => { audioStatus = msg; }
  });
  assert.strictEqual(AudioEngine.isPlaying, true, 'AudioEngine deve estar com isPlaying=true');

  // 2º Clique: Interrompe reprodução
  AudioEngine.playSpeechAudio(0, currentSpeech, 'SÉRGIO', 0, 1.0, 'normal', {
    onStatus: (msg) => { audioStatus = msg; }
  });
  assert.strictEqual(AudioEngine.isPlaying, false, 'AudioEngine deve parar com isPlaying=false');
  assert.strictEqual(audioStatus, 'Áudio interrompido.');
});

it('AudioEngine: normalização de estado isPlaying no ciclo de vida de síntese de voz (onend / onerror)', async () => {
  const env = createTestEnv();
  const { AudioEngine, AppState } = env;

  AudioEngine.isPlaying = false;
  let ttsEndFired = false;
  const currentSpeech = AppState.speeches[0];

  await AudioEngine.playSpeechAudio(0, currentSpeech, 'SÉRGIO', 0, 1.0, 'normal', {
    onEnd: () => { ttsEndFired = true; }
  });

  assert.strictEqual(AudioEngine.isPlaying, true, 'Deve iniciar em reprodução');
  assert(AudioEngine.activeUtterance, 'Deve ter utterance ativa');

  // Dispara término natural da fala
  AudioEngine.activeUtterance.onend();
  assert.strictEqual(AudioEngine.isPlaying, false, 'isPlaying deve retornar a false');
  assert.strictEqual(ttsEndFired, true, 'Callback onEnd deve ser invocado');

  // Teste de ciclo de erro
  AudioEngine.isPlaying = false;
  await AudioEngine.playSpeechAudio(0, currentSpeech, 'SÉRGIO', 0, 1.0, 'normal', {});
  assert.strictEqual(AudioEngine.isPlaying, true);
  if (AudioEngine.activeUtterance && AudioEngine.activeUtterance.onerror) {
    AudioEngine.activeUtterance.onerror({ error: 'interrupted' });
    assert.strictEqual(AudioEngine.isPlaying, false, 'Em caso de erro, isPlaying deve ser resetado');
  }
});

it('AudioEngine: vazamento de memória de Blob URLs eliminado com revogação ativa via URL.revokeObjectURL', () => {
  const env = createTestEnv();
  const { AudioEngine, revokedUrls } = env;

  AudioEngine.activeAudioUrl = 'blob:mock-audio-rehearsal-123';
  AudioEngine.stopAllAudio();

  assert.strictEqual(AudioEngine.activeAudioUrl, null, 'activeAudioUrl deve ser anulada');
  assert(revokedUrls.includes('blob:mock-audio-rehearsal-123'), 'URL deve ser revogada ativamente no navegador');
});

it('AudioEngine.speakSynthesized: chamada direta de síntese define isPlaying=true e limpa no onend', () => {
  const env = createTestEnv();
  const { AudioEngine } = env;

  AudioEngine.isPlaying = false;
  AudioEngine.speakSynthesized('Texto direto para teste', 'BÁRBARA', 0, 1.0);
  assert.strictEqual(AudioEngine.isPlaying, true, 'speakSynthesized direto deve definir isPlaying=true');
  assert(AudioEngine.activeUtterance);

  AudioEngine.activeUtterance.onend();
  assert.strictEqual(AudioEngine.isPlaying, false);
});

it('AudioEngine: imunidade defensiva a ator não indexado (actorIndex=-1) e nomes nulos', () => {
  const env = createTestEnv();
  const { AudioEngine } = env;

  const pitchUnindexed = AudioEngine.getPitchForActor(undefined, -1);
  assert(typeof pitchUnindexed === 'number' && !isNaN(pitchUnindexed), 'Pitch deve ser número válido');

  const voiceUnindexed = AudioEngine.findVoiceForActor(null, -1);
  assert(voiceUnindexed !== undefined, 'findVoiceForActor não deve retornar undefined');

  const pitchNull = AudioEngine.getPitchForActor('PERSONAGEM_DESCONHECIDO', 99);
  assert(typeof pitchNull === 'number' && !isNaN(pitchNull));
});

it('Utils.base64ToBlob: resiliência para Data URLs e raw base64 com especificação de MIME type', () => {
  const env = createTestEnv();
  const { Utils } = env;

  // Data URL com cabeçalho
  const sampleDataUrl = 'data:audio/webm;base64,AAAA';
  const blob1 = Utils.base64ToBlob(sampleDataUrl);
  assert.strictEqual(blob1.type, 'audio/webm');
  assert.strictEqual(blob1.size, 3);

  // Raw base64 com defaultType fornecido
  const sampleRaw = 'AAAA';
  const blob2 = Utils.base64ToBlob(sampleRaw, 'audio/mp4');
  assert.strictEqual(blob2.type, 'audio/mp4');
  assert.strictEqual(blob2.size, 3);
});

module.exports = { run };

if (require.main === module) {
  run().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
