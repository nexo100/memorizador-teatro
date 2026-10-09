const { createTestEnv, createRunner, assert } = require('./setup.cjs');

const { it, run } = createRunner('Rehearsal Engine & AppState');

it('Estado inicial e carregamento da Peça Padrão (Os Inventariantes)', () => {
  const env = createTestEnv();
  const { AppState } = env;

  assert.strictEqual(AppState.speeches.length, 58, 'Deveria conter 58 falas de Os Inventariantes');
  assert.strictEqual(AppState.characters.length, 2, 'Deveria conter 2 personagens');
  assert.strictEqual(JSON.stringify(AppState.characters), JSON.stringify(['SÉRGIO', 'BÁRBARA']));
  assert.strictEqual(AppState.selectedActor, 'SÉRGIO');
  assert.strictEqual(AppState.activeBeats.length, 5, 'Deveria carregar 5 beats canônicos');
});

it('Cloze Semântico: ênclise pronominal, apóstrofos e entidades HTML seguras', () => {
  const env = createTestEnv();
  const { Utils } = env;

  // Ênclise: hífen preservado
  const maskEnclise = Utils.maskWord('diga-me', 'initial');
  assert(maskEnclise.includes('first-letter-word') && maskEnclise.includes('-'), 'Hífen de ênclise deve ser preservado');

  // Apóstrofo: preservado
  const maskApostrofe = Utils.maskWord("d'água", 'initial');
  assert(maskApostrofe.includes("'"), 'Apóstrofo deve ser preservado');

  // Entidades HTML: sem quebra de tags
  const maskHtml = Utils.maskWord('Tom & Jerry', 'blank');
  assert(maskHtml.includes('&amp;'), 'Entidade HTML escapada sem corromper');
  assert(!maskHtml.includes('&<span'), 'Nenhuma tag inválida gerada');
});

it('Navegação e limites de ator em modo "minhas falas"', () => {
  const env = createTestEnv();
  const { AppState, AppController } = env;

  AppState.rehearsalMode = 'minhas';
  AppState.selectedActor = 'SÉRGIO';
  const sergioIndices = AppState.getMySpeechIndices();
  assert(sergioIndices.length > 0, 'Deve ter falas para Sérgio');

  // Primeira fala
  AppState.currentIndex = sergioIndices[0];
  AppController.advancePrev();
  assert.strictEqual(AppState.currentIndex, sergioIndices[0], 'Não deve retroceder além da primeira fala do ator');

  // Próxima fala
  AppController.advanceNext();
  assert.strictEqual(AppState.currentIndex, sergioIndices[1], 'Deve avançar para a próxima fala do ator');
});

it('Filtro de Beats dramáticos e cálculo de intervalo ativo', () => {
  const env = createTestEnv();
  const { AppState, AppController } = env;

  AppState.selectedBeat = '2'; // Beat 3: Falas 24 a 34 (índices 23 a 33)
  const range = AppState.getActiveBeatRange();
  assert.strictEqual(range.start, 23);
  assert.strictEqual(range.end, 33);

  AppController.goToSpeech(range.start, false);
  assert.strictEqual(AppState.currentIndex, 23);
});

it('Temporizadores zumbis: cancelamento garantido do Ping-Pong ao navegar', () => {
  const env = createTestEnv();
  const { AppState, AppController } = env;

  AppState.rehearsalMode = 'pingpong';
  AppState.runPingPongTimer = AppController.runPingPongTimer.bind(AppController);
  AppController.runPingPongTimer();
  assert(AppState.pingPongInterval !== null, 'Intervalo Ping-Pong deve estar ativo');

  AppController.goToSpeech(1, false);
  assert.strictEqual(AppState.pingPongInterval, null, 'Intervalo deve ser cancelado na navegação');
});

it('Fluxo do botão "Errei": retenção cênica, decremento de domínio e ciclo de retry', async () => {
  const env = createTestEnv();
  const { AppState, AppController } = env;

  AppState.selectedActor = 'SÉRGIO';
  AppState.rehearsalMode = 'minhas';
  AppState.currentIndex = 0;
  AppState.masteryLevels[0] = 2;
  AppState.isRevealed = true;

  // Ator clica em Errei
  AppController.handleActionClick('btnWrong');
  assert.strictEqual(AppState.currentIndex, 0, 'Deve manter o ator na mesma fala');
  assert.strictEqual(AppState.isRetryState, true, 'Ativa estado de retry');
  assert.strictEqual(AppState.masteryLevels[0], 1, 'Nível decrementado para 1');

  // Ator clica em Tentar de novo
  AppController.handleActionClick('btnRetry');
  assert.strictEqual(AppState.isRetryState, false, 'Sai do estado de retry');
  assert.strictEqual(AppState.isRevealed, false, 'Fala volta a ficar mascarada para teste');
  assert.strictEqual(AppState.currentIndex, 0, 'Permanece na mesma fala');

  // Caso limite: erro reduz domínio para nível 0
  AppState.masteryLevels[0] = 1;
  AppState.isRevealed = true;
  AppController.handleActionClick('btnWrong');
  assert.strictEqual(AppState.masteryLevels[0], 0);

  AppController.handleActionClick('btnRetry');
  assert.strictEqual(AppState.masteryLevels[0], 1, 'Retry eleva para nível 1 para garantir teste ativo');
  assert.strictEqual(AppState.isRevealed, false);

  // Ator opta por "Seguir adiante" após errar
  AppState.isRevealed = true;
  AppController.handleActionClick('btnWrong');
  assert.strictEqual(AppState.isRetryState, true);
  AppController.handleActionClick('btnNextAfterWrong');
  assert.strictEqual(AppState.isRetryState, false);
  assert.strictEqual(AppState.currentIndex, 2, 'Avançou para a próxima fala do ator');
});

it('Algoritmo de fraquezas (pickNextWeakness): imunidade a estouro de pilha com domínio 5 em todas as falas', () => {
  const env = createTestEnv();
  const { AppState } = env;

  AppState.speeches = [
    { who: 'SÉRGIO', spokenText: 'Fala 1', segments: [{ type: 'speech', text: 'Fala 1' }] },
    { who: 'SÉRGIO', spokenText: 'Fala 2', segments: [{ type: 'speech', text: 'Fala 2' }] }
  ];
  AppState.selectedActor = 'SÉRGIO';
  AppState.masteryLevels = [5, 5];
  AppState.currentIndex = 0;

  const picked = AppState.pickNextWeakness();
  assert.strictEqual(typeof picked, 'number', 'Deve retornar índice numérico válido sem crashar');
  assert(picked >= 0 && picked <= 1);
});

it('Fila adaptativa com buffer de repetição imediata (reforço espaçado ativo)', () => {
  const env = createTestEnv();
  const { AppState } = env;

  AppState.speeches = [
    { who: 'SÉRGIO', spokenText: 'Fala 1', segments: [{ type: 'speech', text: 'Fala 1' }] },
    { who: 'SÉRGIO', spokenText: 'Fala 2', segments: [{ type: 'speech', text: 'Fala 2' }] },
    { who: 'SÉRGIO', spokenText: 'Fala 3', segments: [{ type: 'speech', text: 'Fala 3' }] }
  ];
  AppState.selectedActor = 'SÉRGIO';
  AppState.masteryLevels = [4, 4, 4];
  AppState.currentIndex = 0;
  AppState.sessionRetryQueue = [];

  // Agenda repetição da fala 0 após 2 passos
  AppState.scheduleRetry(0, 2);
  assert.strictEqual(AppState.sessionRetryQueue.length, 1);

  AppState.stepRetryQueue();
  assert.strictEqual(AppState.sessionRetryQueue[0].countdown, 1);

  AppState.stepRetryQueue();
  assert.strictEqual(AppState.sessionRetryQueue[0].countdown, 0);

  AppState.currentIndex = 1;
  const nextTarget = AppState.pickNextWeakness();
  assert.strictEqual(nextTarget, 0, 'pickNextWeakness deve priorizar imediatamente a fala agendada');
});

it('Isolamento estrito da fila de retry na alternância de ator e na alternância de beat', () => {
  const env = createTestEnv();
  const { AppState, domStore, docListeners } = env;

  // 1. Troca de ator via clique em char-tab
  AppState.sessionRetryQueue = [];
  AppState.scheduleRetry(3, 2);
  assert.strictEqual(AppState.sessionRetryQueue.length, 1);

  const fakeActorTab = {
    dataset: { actor: 'BÁRBARA' },
    closest: (sel) => sel.includes('char-tab') ? fakeActorTab : null
  };
  AppState.hasSavedActor = true;
  AppState.selectedActor = 'SÉRGIO';
  docListeners['click']({ target: fakeActorTab });
  assert.strictEqual(AppState.sessionRetryQueue.length, 0, 'sessionRetryQueue deve ser esvaziada na troca de ator');

  // 2. Troca de beat
  AppState.scheduleRetry(2, 2);
  assert.strictEqual(AppState.sessionRetryQueue.length, 1);

  const mockBeatSelect = domStore['selectBeat'];
  if (mockBeatSelect && mockBeatSelect.onchange) {
    mockBeatSelect.onchange({ target: { value: '1' } });
    assert.strictEqual(AppState.sessionRetryQueue.length, 0, 'sessionRetryQueue deve ser esvaziada na troca de beat');
  }
});

it('Ocultação determinística de rubricas entre parênteses (...) via hideRubrics', () => {
  const env = createTestEnv();
  const { AppState, UIController } = env;

  const speechWithRubric = {
    who: 'SÉRGIO',
    spokenText: 'Você não pode fazer isso comigo.',
    segments: [
      { type: 'rubric', text: 'com raiva e desespero' },
      { type: 'speech', text: 'Você não pode fazer isso comigo.' }
    ]
  };

  AppState.hideRubrics = false;
  const htmlWith = UIController.renderSpeechHtml(speechWithRubric, 0, 0, 0, true);
  assert(htmlWith.includes('com raiva e desespero'), 'Rubrica deve aparecer quando hideRubrics=false');

  AppState.hideRubrics = true;
  const htmlWithout = UIController.renderSpeechHtml(speechWithRubric, 0, 0, 0, true);
  assert(!htmlWithout.includes('com raiva e desespero'), 'Rubrica NÃO deve aparecer quando hideRubrics=true');
  assert(htmlWithout.includes('Você não pode fazer isso comigo.'), 'Texto falado deve ser preservado integralmente');
});

it('Progressão de fixação e avanço nos modos Quiz e Digitação', () => {
  const env = createTestEnv();
  const { AppState, AppController } = env;

  AppState.selectedActor = 'SÉRGIO';
  AppState.currentIndex = 0;
  AppState.masteryLevels[0] = 1;

  // Quiz avança nível da fala 0 e navega adiante
  AppState.studyMethod = 'quiz';
  AppController.handleActionClick('btnNextQuiz');
  assert.strictEqual(AppState.masteryLevels[0], 2, 'Quiz completado avança nível de fixação da fala');

  // Digitação avança nível da nova fala atual
  const nextIdx = AppState.currentIndex;
  AppState.masteryLevels[nextIdx] = 1;
  AppState.studyMethod = 'typing';
  AppController.handleActionClick('btnNextTyping');
  assert.strictEqual(AppState.masteryLevels[nextIdx], 2, 'Digitação completada avança nível de fixação da fala');
});

module.exports = { run };

if (require.main === module) {
  run().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
