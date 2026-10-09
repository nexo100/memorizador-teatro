/**
 * Suíte de Testes Automatizados do Memorizador Teatral
 *
 * Arquitetura de testes modularizada, desacoplada e focada nos motores críticos:
 * - ScriptParser & Dramaturgia (tests/parser.test.cjs)
 * - PlayStore & Catálogo Multi-Peças (tests/playstore.test.cjs)
 * - StorageManager, Intenções & Backup Data Integrity (tests/storage-backup.test.cjs)
 * - AudioEngine Core & Ciclo de Vida (tests/audio.test.cjs)
 * - Rehearsal Engine & AppState (tests/rehearsal-state.test.cjs)
 * - AIService & Inteligência Dramatúrgica (tests/ai-service.test.cjs)
 *
 * Compatível com CI (`node test.cjs`) e executável modularmente (`node tests/<suite>.test.cjs`).
 */

const path = require('path');

const suites = [
  { name: 'parser', path: './tests/parser.test.cjs' },
  { name: 'playstore', path: './tests/playstore.test.cjs' },
  { name: 'storage-backup', path: './tests/storage-backup.test.cjs' },
  { name: 'audio', path: './tests/audio.test.cjs' },
  { name: 'rehearsal-state', path: './tests/rehearsal-state.test.cjs' },
  { name: 'ai-service', path: './tests/ai-service.test.cjs' }
];

async function runAll() {
  console.log('🎭 Memorizador Teatral · Suíte de Testes dos Motores Críticos\n');
  const startTime = Date.now();

  const targetFilter = process.argv[2]?.toLowerCase();
  const selectedSuites = targetFilter
    ? suites.filter(s => s.name.toLowerCase().includes(targetFilter))
    : suites;

  if (selectedSuites.length === 0) {
    console.error(`❌ Nenhuma suíte encontrada correspondente ao filtro "${targetFilter}".`);
    console.log(`Suítes disponíveis: ${suites.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  let totalPassed = 0;
  let totalFailed = 0;
  const failedSuites = [];

  for (const suite of selectedSuites) {
    const suiteModule = require(suite.path);
    const result = await suiteModule.run();

    totalPassed += result.passed;
    totalFailed += result.failed;

    if (result.failed > 0) {
      failedSuites.push(result);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalTests = totalPassed + totalFailed;

  console.log('\n' + '─'.repeat(60));
  if (totalFailed === 0) {
    console.log(`✨ SUCESSO: Todos os ${totalTests} testes de motores e lógica passaram sem erros!`);
    console.log(`⏱️  Tempo total de execução: ${durationSec}s em ${selectedSuites.length} módulos.`);
    console.log('─'.repeat(60) + '\n');
    process.exit(0);
  } else {
    console.error(`💥 FALHA: ${totalFailed} de ${totalTests} testes falharam.`);
    console.error(`⏱️  Tempo total: ${durationSec}s`);
    console.error('─'.repeat(60) + '\n');
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('\n❌ Erro fatal durante a execução dos testes:', err);
  process.exit(1);
});
