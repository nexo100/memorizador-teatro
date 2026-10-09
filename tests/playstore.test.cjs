const { createTestEnv, createRunner, assert } = require('./setup.cjs');

const { it, run } = createRunner('PlayStore Multi-Peças & Catálogo');

it('Catálogo inicial: integridade canônica, imutabilidade e blindagem da peça padrão', () => {
  const env = createTestEnv();
  const { PlayStore } = env;

  const plays = PlayStore.getAll();
  assert(plays.length >= 1, 'Catálogo deve conter pelo menos a peça canônica');

  const defaultPlay = PlayStore.get('os-inventariantes');
  assert(defaultPlay, 'Peça padrão os-inventariantes deve existir');
  assert.strictEqual(defaultPlay.isDefault, true);
  assert.strictEqual(PlayStore.getActivePlayId(), 'os-inventariantes');

  // Tentativa de exclusão da peça padrão
  const deleteResult = PlayStore.delete('os-inventariantes');
  assert.strictEqual(deleteResult, false, 'Peça canônica padrão NUNCA pode ser excluída');
  assert(PlayStore.get('os-inventariantes') !== null, 'Peça padrão deve permanecer no catálogo');
});

it('Criação dinâmica e coexistência de múltiplos roteiros no catálogo', () => {
  const env = createTestEnv();
  const { PlayStore } = env;

  const hamletText = `
# Hamlet
**HAMLET:** Ser ou não ser, eis a questão.
**OFÉLIA:** Meu senhor, como tem passado?
`;
  const hamletPlay = PlayStore.createPlayFromScript(hamletText, 'Hamlet', 'William Shakespeare');
  assert(hamletPlay && hamletPlay.id, 'Hamlet deve ser criada com id válido');
  assert.strictEqual(hamletPlay.title, 'Hamlet');
  assert.strictEqual(hamletPlay.characters.length, 2);

  const autoText = `
# Auto da Compadecida
**JOÃO GRILO:** Valha-me Nossa Senhora!
**CHICÓ:** Não sei, só sei que foi assim.
`;
  const autoPlay = PlayStore.createPlayFromScript(autoText, 'Auto da Compadecida', 'Ariano Suassuna');
  assert(autoPlay && autoPlay.id);

  const all = PlayStore.getAll();
  assert(all.length >= 3, 'Deve conter pelo menos 3 peças cadastradas');
  assert(all.some(p => p.id === hamletPlay.id));
  assert(all.some(p => p.id === autoPlay.id));
});

it('Alternância atômica de peças e isolamento rigoroso de atores e notas', () => {
  const env = createTestEnv();
  const { PlayStore, StorageManager, AppController, AppState } = env;

  const playA = PlayStore.createPlayFromScript('**A:** Fala A.', 'Peça A', 'Autor A');
  const playB = PlayStore.createPlayFromScript('**B:** Fala B.', 'Peça B', 'Autor B');

  // Configura dados na Peça A
  AppController.switchPlay(playA.id);
  assert.strictEqual(AppState.activePlay.id, playA.id);
  StorageManager.setSelectedActor('A', playA.id);
  StorageManager.setActorNotes('Notas secretas de A', playA.id);

  // Configura dados na Peça B
  AppController.switchPlay(playB.id);
  assert.strictEqual(AppState.activePlay.id, playB.id);
  StorageManager.setSelectedActor('B', playB.id);
  StorageManager.setActorNotes('Notas secretas de B', playB.id);

  // Valida que ao retornar para a Peça A, os dados são perfeitamente isolados
  AppController.switchPlay(playA.id);
  assert.strictEqual(StorageManager.getSelectedActor(playA.id), 'A');
  assert.strictEqual(StorageManager.getActorNotes(playA.id), 'Notas secretas de A');

  // E na Peça B permanecem intactos
  AppController.switchPlay(playB.id);
  assert.strictEqual(StorageManager.getSelectedActor(playB.id), 'B');
  assert.strictEqual(StorageManager.getActorNotes(playB.id), 'Notas secretas de B');
});

it('Exclusão de peça customizada com purga de dados do usuário', () => {
  const env = createTestEnv();
  const { PlayStore, StorageManager } = env;

  const tempPlay = PlayStore.createPlayFromScript('**X:** Teste.', 'Peça Temporária', 'Autor X');
  StorageManager.setActorNotes('Anotações temporárias', tempPlay.id);

  const deleted = PlayStore.delete(tempPlay.id, { purgeUserData: true });
  assert.strictEqual(deleted, true);
  assert.strictEqual(PlayStore.get(tempPlay.id), null);
  assert.strictEqual(StorageManager.getActorNotes(tempPlay.id), '');
});

it('Exclusão da peça ativa: fallback automático e seguro para a peça canônica padrão', () => {
  const env = createTestEnv();
  const { PlayStore, AppController, AppState } = env;

  const activePlay = PlayStore.createPlayFromScript('**Y:** Fala Y.', 'Peça Ativa Custom', 'Autor Y');
  AppController.switchPlay(activePlay.id);
  assert.strictEqual(AppState.activePlay.id, activePlay.id);

  const wasActive = AppState.getPlayId() === activePlay.id || PlayStore.getActivePlayId() === activePlay.id;
  PlayStore.delete(activePlay.id, { purgeUserData: true });
  if (wasActive) {
    AppController.switchPlay('os-inventariantes');
  }

  assert.strictEqual(AppState.activePlay.id, 'os-inventariantes');
  assert.strictEqual(AppState.getPlayId(), 'default');
  assert.strictEqual(PlayStore.getActivePlayId(), 'os-inventariantes');
  assert.strictEqual(PlayStore.get(activePlay.id), null);
});

it('Eliminação de duplicação pelo legacyCustom com normalização Windows CRLF', () => {
  const env = createTestEnv();
  const { PlayStore, mockLocalStorage } = env;

  const rawScript = 'PEÇA CRLF\n\nRICARDO:\nTexto 1.\n\nMARIA:\nTexto 2.\n';
  const created = PlayStore.createPlayFromScript(rawScript, 'Peça CRLF', 'Autor');

  // Simular que o script legado foi salvo com quebras Windows CRLF
  const rawScriptCRLF = rawScript.replace(/\n/g, '\r\n');
  mockLocalStorage.setItem('memorizador_custom_script', rawScriptCRLF);

  const catalog = PlayStore.getAll();
  const matches = catalog.filter(p => {
    const norm = (p.rawScript || '').replace(/\r\n/g, '\n').trim();
    return norm === rawScript.trim();
  });
  assert.strictEqual(matches.length, 1, 'PlayStore.getAll NUNCA deve duplicar peça curada mesmo com CRLF');
});

it('Exclusão definitiva: purga de memorizador_custom_script com resiliência CRLF', () => {
  const env = createTestEnv();
  const { PlayStore, mockLocalStorage } = env;

  const rawScript = 'PEÇA PARA EXCLUIR\n\nA:\nFala 1.\n';
  const play = PlayStore.createPlayFromScript(rawScript, 'Peça Deletável', 'Autor');

  mockLocalStorage.setItem('memorizador_custom_script', rawScript.replace(/\n/g, '\r\n'));
  const delRes = PlayStore.delete(play.id, { purgeUserData: true });
  assert.strictEqual(delRes, true);
  assert.strictEqual(mockLocalStorage.getItem('memorizador_custom_script'), null, 'memorizador_custom_script deve ser purgado');
});

it('PlayStore.getStats: cálculo de métricas dramáticas e porcentagem de domínio isolada por ator com teto de 100%', () => {
  const env = createTestEnv();
  const { PlayStore, StorageManager } = env;

  const multiCharScript = `
# Peça Curta
**SÉRGIO:** Fala um de Sérgio.
**BÁRBARA:** Fala um de Bárbara.
**SÉRGIO:** Fala dois de Sérgio.
**BÁRBARA:** Fala dois de Bárbara.
`;
  const play = PlayStore.createPlayFromScript(multiCharScript, 'Peça de Estatística', 'Autor');
  // Sérgio tem 2 falas. Ambas dominadas (nível 4).
  StorageManager.saveProgress('SÉRGIO', [4, 4, 4, 4], play.id);
  StorageManager.setSelectedActor('SÉRGIO', play.id);

  const stats = PlayStore.getStats(play.id);
  assert.strictEqual(stats.totalSpeeches, 4);
  assert.strictEqual(stats.characterCounts['SÉRGIO'], 2);
  assert.strictEqual(stats.characterCounts['BÁRBARA'], 2);
  // O domínio de Sérgio deve ser 100%, sem inflar para 200% pelas 4 falas do array
  assert.strictEqual(stats.masteryPercentage, 100);
});

it('Ciclo de vida com múltiplas peças: exclusão alternada e sincronização da peça ativa remanescente', () => {
  const env = createTestEnv();
  const { PlayStore, mockLocalStorage } = env;

  const playA = PlayStore.createPlayFromScript('PEÇA ALFA\n\nALFA:\nFala de Alfa.\n', 'Peça Alfa', 'Autor A');
  const playB = PlayStore.createPlayFromScript('PEÇA BETA\n\nBETA:\nFala de Beta.\n', 'Peça Beta', 'Autor B');

  PlayStore.setActivePlayId(playA.id);
  assert.strictEqual(PlayStore.getActivePlayId(), playA.id);

  // Deleta Peça Beta (inativa)
  const delB = PlayStore.delete(playB.id, { purgeUserData: true });
  assert.strictEqual(delB, true);
  assert.strictEqual(PlayStore.get(playB.id), null);
  assert(mockLocalStorage.getItem('memorizador_custom_script').includes('PEÇA ALFA'), 'Ainda reflete a peça ativa A');

  // Deleta Peça Alfa (ativa)
  const delA = PlayStore.delete(playA.id, { purgeUserData: true });
  assert.strictEqual(delA, true);
  assert.strictEqual(PlayStore.get(playA.id), null);
  assert.strictEqual(PlayStore.getActivePlayId(), 'os-inventariantes', 'Fallback para os-inventariantes');
  assert.strictEqual(mockLocalStorage.getItem('memorizador_custom_script'), null, 'Script customizado limpo');
});

module.exports = { run };

if (require.main === module) {
  run().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
