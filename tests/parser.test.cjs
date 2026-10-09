const { createTestEnv, createRunner, assert } = require('./setup.cjs');

const { it, run } = createRunner('ScriptParser Engine & Dramaturgia');

// Inicializa ambiente isolado para a suíte
const env = createTestEnv();
const { ScriptParser } = env;

it('Universal ScriptParser: identifica nomes isolados (bold/caps), separadores e falas multilinhas', () => {
  const complexScript = `
**HAMLET**
Ser ou não ser, eis a questão.
Será mais nobre suportar na mente as pedras e flechas da fortuna injusta,
ou tomar armas contra um mar de calamidades?

OFÉLIA:
Meu senhor, há muitos dias guardo lembranças vossas.

REI CLÁUDIO -
Que tristeza é essa, sobrinho meu?
`;
  const parsed = ScriptParser.parseScript(complexScript);
  assert.strictEqual(parsed.length, 3, 'Deveria identificar exatamente 3 falas');
  assert.strictEqual(parsed[0].who, 'HAMLET');
  assert(parsed[0].spokenText.includes('Será mais nobre suportar'), 'Fala multilinha de Hamlet deve ser preservada');
  assert.strictEqual(parsed[1].who, 'OFÉLIA');
  assert.strictEqual(parsed[2].who, 'REI CLÁUDIO');
});

it('Parsing nativo de roteiro em formato Fountain (.fountain)', () => {
  const fountainScript = `
Title: Teste Fountain
Author: Dramaturgo

INT. SALA DE ESTAR - NOITE

HAMLET
Ser ou não ser, eis a questão.

(hesitante)

@Ofélia
Meu príncipe, estais bem?
`;
  const parsed = ScriptParser.parseScript(fountainScript);
  assert.strictEqual(parsed.length, 2, 'Deve identificar 2 falas no roteiro Fountain');
  assert.strictEqual(parsed[0].who, 'HAMLET');
  assert.strictEqual(parsed[1].who, 'Ofélia', 'Deve reconhecer @Ofélia');
});

it('ScriptParser.sanitizeRawText: remoção de ruídos OCR e desquebra de hifens com quebra de linha', () => {
  const dirtyOCRScript = `
ATO I - O CONFRONTO
Página 12
-----------------------
- 13 -
JULIANO
A determi-
nação da família foi clara. Não acei-
taremos isso.
pág. 14 de 90
RODRIGO
(com sarcasmo)
Apenas obede-
ça e fique calado.
[Página 15]
`;
  const sanitized = ScriptParser.sanitizeRawText(dirtyOCRScript);
  assert(!sanitized.includes('Página 12'), 'Deve remover ruído "Página 12"');
  assert(!sanitized.includes('- 13 -'), 'Deve remover ruído "- 13 -"');
  assert(!sanitized.includes('pág. 14'), 'Deve remover ruído "pág. 14"');
  assert(!sanitized.includes('[Página 15]'), 'Deve remover ruído "[Página 15]"');
  assert(sanitized.includes('determinação'), 'Deve recompor palavra hifenizada quebrada "determi-\\nnação"');
  assert(sanitized.includes('aceitaremos'), 'Deve recompor "acei-\\ntaremos"');
  assert(sanitized.includes('obedeça'), 'Deve recompor "obede-\\nça"');
});

it('ScriptParser.groupCharacterVariants: canonicalização de variantes e abreviações para nomes canônicos', () => {
  const scriptVariants = `
JULIANO
Primeira fala do irmão mais velho.

JUL.
Segunda fala abreviada do mesmo personagem.

Juliano
Terceira fala com casing misturado.

MARIA
Fala da irmã.

MAR.
Fala abreviada da Maria.
`;
  const parsed = ScriptParser.parseScript(scriptVariants);
  const chars = [...new Set(parsed.map(s => s.who))];
  assert(chars.includes('JULIANO'), 'Deve canonicalizar variações para JULIANO');
  assert(chars.includes('MARIA'), 'Deve canonicalizar variações para MARIA');
  assert(!chars.includes('JUL.'), 'Não deve conter abreviação JUL.');
  assert(!chars.includes('MAR.'), 'Não deve conter abreviação MAR.');
  assert(!chars.includes('Juliano'), 'Não deve conter casing alternativo Juliano');
});

it('ScriptParser: preservação estrita de personagens distintos com nomes similares', () => {
  const distinctScript = `
ANA
Olá, meu nome é Ana.

ANASTÁCIA
E eu sou Anastácia, sua prima distante.

LEO
Eu sou o Leo.

LEONARDO
E eu sou Leonardo.

JUL.
Fala com ponto abreviado.

JULIANO
Fala com nome completo.
`;
  const parsed = ScriptParser.parseScript(distinctScript);
  const chars = [...new Set(parsed.map(s => s.who))];
  assert(chars.includes('ANA'), 'ANA deve ser mantida como personagem distinta');
  assert(chars.includes('ANASTÁCIA'), 'ANASTÁCIA deve ser mantida como personagem distinta');
  assert(chars.includes('LEO'), 'LEO deve ser mantido como personagem distinto');
  assert(chars.includes('LEONARDO'), 'LEONARDO deve ser mantido como personagem distinto');
  assert(chars.includes('JULIANO'), 'JULIANO deve ser mantido');
  assert(!chars.includes('JUL.'), 'JUL. abreviado deve ser absorvido por JULIANO');
});

it('ScriptParser.isMetaKeyword: imunidade completa contra didascálias cênicas, metadados e termos de palco', () => {
  const metaKeywords = [
    'Sinopse', '3 Personagens', 'Resumo', 'Rubrica', 'Rubricas', 'Didascália',
    'Ambientação', 'Escuro', 'Blackout', 'Pano', 'Cortina', 'Intervalo',
    'Fim da cena', 'Fim de cena', 'Fim de ato', 'Cai o pano', 'Aplausos',
    'Música', 'Som de chuva'
  ];

  for (const kw of metaKeywords) {
    assert.strictEqual(ScriptParser.isMetaKeyword(kw), true, `Termo "${kw}" deve ser reconhecido como metadado cênico`);
  }

  const scriptWithStageEnd = `
ATOR:
Esta é a última fala antes do encerramento.

FIM DE CENA
(As luzes se apagam suavemente)

OUTRO:
Esta é a fala do novo quadro.
`;
  const parsed = ScriptParser.parseScript(scriptWithStageEnd);
  const chars = [...new Set(parsed.map(s => s.who))];
  assert(!chars.includes('FIM DE CENA'), 'FIM DE CENA nunca deve ser catalogado como ator');
  assert.deepStrictEqual(chars, ['ATOR', 'OUTRO']);
});

it('ScriptParser: fala de ator começando com "Após" NUNCA é apagada ou truncada', () => {
  const aposDialogueScript = `
RICARDO:
Após o almoço nós iremos conversar com tranquilidade.

MARIA:
Combinado então.
`;
  const parsed = ScriptParser.parseScript(aposDialogueScript);
  assert.strictEqual(parsed.length, 2, 'Diálogo com "Após..." deve reter as 2 falas');
  assert.strictEqual(parsed[0].who, 'RICARDO');
  assert.strictEqual(parsed[0].spokenText, 'Após o almoço nós iremos conversar com tranquilidade.');
});

it('ScriptParser: didascálias narrativas temporais e espaciais isoladas de falas faladas e roteadas para directions', () => {
  const didascaliaScript = `
RICARDO:
Fique calmo.

Após algum tempo, Maria chega apressada.

MARIA:
Cheguei atrasada!
`;
  const parsed = ScriptParser.parseScript(didascaliaScript);
  assert.strictEqual(parsed.length, 2, 'Deve ter exatamente 2 falas faladas');
  assert.strictEqual(parsed[0].who, 'RICARDO');
  assert.strictEqual(parsed[0].spokenText, 'Fique calmo.');
  assert.strictEqual(parsed[1].who, 'MARIA');
  assert.strictEqual(parsed[1].spokenText, 'Cheguei atrasada!');
  assert(parsed[1].directions && parsed[1].directions.includes('Após algum tempo, Maria chega apressada.'),
    'Didascália temporal entre falas deve ser vinculada à entrada de Maria');

  // Didascália com dois pontos
  const colonScript = `
RICARDO:
Fique calmo.
Após: Maria chega apressada.
MARIA:
Cheguei!
`;
  const parsedColon = ScriptParser.parseScript(colonScript);
  assert.strictEqual(parsedColon[0].spokenText, 'Fique calmo.');
  assert(parsedColon[1].directions.some(d => d.includes('Maria chega apressada')));

  // Didascália em itálico markdown
  const italicScript = `
RICARDO:
Fique calmo.
*Após algum tempo, Maria chega apressada.*
`;
  const parsedItalic = ScriptParser.parseScript(italicScript);
  assert.strictEqual(parsedItalic[0].spokenText, 'Fique calmo.');
  assert(parsedItalic[0].segments.some(s => s.type === 'rubric' && s.text.includes('Maria chega apressada')));
});

it('ScriptParser: imunidade a prefixos de pontuação e colons como falsos personagens', () => {
  const prefixTestScript = `
Rubrica: O cenário é escuro.

RICARDO:
Primeira fala.

Após: Silêncio tenso toma conta.

MARIA:
Segunda fala.
`;
  const parsed = ScriptParser.parseScript(prefixTestScript);
  assert.strictEqual(parsed.length, 2);
  const chars = [...new Set(parsed.map(s => s.who))];
  assert(!chars.includes('RUBRICA') && !chars.includes('APÓS'));
  assert(parsed[0].directions.some(d => d.includes('O cenário é escuro')));
  assert(parsed[1].directions.some(d => d.includes('Silêncio tenso')));
});

it('ScriptParser.detectCueTrigger: detecção causal de engates cênicos (eco, conectores e perguntas)', () => {
  // Eco de palavra-chave
  const cueEcho = ScriptParser.detectCueTrigger(
    'Você nunca pensou em desistir dessa herança maldita?',
    'Desistir? Nunca passaria pela minha cabeça abandonar nossa família.'
  );
  assert(cueEcho !== null, 'Deve detectar engate cênico por eco');
  assert(cueEcho.triggerWord.toLowerCase() === 'desistir' || cueEcho.triggerWord.toLowerCase() === 'nunca');

  // Conector causal
  const cueConnector = ScriptParser.detectCueTrigger(
    'O testamento desapareceu do cofre do escritório.',
    'Portanto você já sabia o conteúdo do documento!'
  );
  assert(cueConnector !== null);
  assert.strictEqual(cueConnector.triggerWord.toLowerCase(), 'portanto');

  // Conector após travessão teatral
  const cueDashed = ScriptParser.detectCueTrigger(
    'Você tem que ficar aqui e assinar.',
    '— Mas não posso trair minha consciência!'
  );
  assert(cueDashed !== null);
  assert.strictEqual(cueDashed.triggerWord.toLowerCase(), 'mas');

  // Pergunta com pronome acentuado
  const cueQuestion = ScriptParser.detectCueTrigger(
    'Por quê?',
    'Porque o prazo termina hoje.'
  );
  assert(cueQuestion !== null);
  assert(cueQuestion.triggerWord.includes('qu'));
});

it('ScriptParser: extração de título e autor de roteiros livres', () => {
  const scriptWithMeta = `
# O Pagador de Promessas
Autor: Dias Gomes

**ZÉ DO BURRO:** Eu fiz uma promessa a Santa Bárbara.
**ROSA:** Zé, você está louco!
`;
  assert.strictEqual(ScriptParser.extractPlayTitle(scriptWithMeta), 'O Pagador de Promessas');
  assert.strictEqual(ScriptParser.extractAuthor(scriptWithMeta), 'Dias Gomes');
});

it('ScriptParser.filterSpeechesByCharacters: filtra falas mantendo estritamente o elenco curado', () => {
  const allSpeeches = [
    { who: 'HAMLET', spokenText: 'Ser ou não ser' },
    { who: 'OFÉLIA', spokenText: 'Meu senhor' },
    { who: 'POLÔNIO', spokenText: 'O que lês?' }
  ];
  const filtered = ScriptParser.filterSpeechesByCharacters(allSpeeches, ['HAMLET', 'OFÉLIA']);
  assert.strictEqual(filtered.length, 2);
  assert(!filtered.some(s => s.who === 'POLÔNIO'));
});

module.exports = { run };

if (require.main === module) {
  run().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
