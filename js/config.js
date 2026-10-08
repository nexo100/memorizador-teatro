// 1. CONFIGURAÇÕES GLOBAIS (AppConfig)
    const AppConfig = {
      APP_ID: 'memorizador-teatro',
      VERSION: 3,

      MASTERY_LEVEL_NAMES: [
        '1 · Leitura Completa',
        '2 · Poucas Lacunas',
        '3 · Muitas Lacunas',
        '4 · Primeiras Letras',
        '5 · De Memória Total'
      ],

      // Beats Canônicos de "Os Inventariantes"
      DEFAULT_DRAMA_BEATS: [
        { name: "Beat 1: A Fuga & A Captura (Falas 1-11)", start: 0, end: 10 },
        { name: "Beat 2: A Arma & O Desprezo (Falas 12-23)", start: 11, end: 22 },
        { name: "Beat 3: Os Primeiros Disparos (Falas 24-34)", start: 23, end: 33 },
        { name: "Beat 4: O Desabafo dos 10 Anos (Falas 35-44)", start: 34, end: 43 },
        { name: "Beat 5: A Loucura & Clímax (Falas 45-58)", start: 44, end: 57 }
      ],

      // Pedagogia Teatral (Stanislavski) para "Os Inventariantes"
      DEFAULT_INTENTIONS: {
        0: "Provocar e tripudiar sobre a fraqueza física do pai",
        1: "Conter a fuga e impor controle rígido",
        2: "Zombar da esperança; intimidar o pai",
        3: "Simular condescendência maternal fria",
        4: "Aterrorizar o pai com a proximidade da morte",
        5: "Constatar a derrota inevitável de Juliano",
        6: "Imobilizar e humilhar o pai com ataduras sujas",
        7: "Censurar Sérgio e tentar manter o decoro do ato",
        8: "Desafiar a mãe com cinismo e impaciência",
        9: "Reclamar silêncio; desespero contido",
        10: "Desumanizar Juliano chamando-o de assombração",
        11: "Implorar pelo fim da violência verbal",
        12: "Reafirmar a missão 'divina' e arrancar a culpa da mãe",
        14: "Exigir dureza e frieza de Bárbara",
        16: "Assumir a decisão prática de matar Juliano",
        18: "Relembrar a Juliano o asco físico de sua degradação",
        19: "Agredir e expor a humilhação escatológica do pai",
        20: "Justificar o ato como cansaço e falta de saída",
        21: "Apresentar a roleta russa como eutanásia justa",
        22: "Buscar anestesiar a consciência sem culpa",
        24: "Criar o ritual e a expectativa do primeiro disparo",
        25: "Racionalizar o tiro como destino e descanso",
        26: "Confrontar o pai com o espelho do próprio pavor",
        28: "Negar o valor da vida do pai e jogar por ele",
        30: "Cobrar a conta dos 10 anos de sacrifício e abandono",
        32: "Enfrentar Bárbara com a cumplicidade do silêncio dela",
        34: "Projetar grandeza ilusória e desafiar a morte no Olimpo",
        36: "Tentar frear o delírio assassino do filho",
        42: "Intimar Bárbara a puxar o gatilho sem recuar",
        45: "Celebrar o disparo seis como vitória mórbida",
        48: "Desferir o golpe psicológico final na covardia do pai",
        52: "Pedir perdão íntimo antes do blecaute final"
      },

      // Palavras de Fallback para Distratores de Quiz
      QUIZ_FALLBACK_WORDS: [
        'porta', 'tempo', 'vida', 'olhar', 'silêncio', 'verdade', 'razão', 'noite',
        'casa', 'palavra', 'momento', 'medo', 'sombra', 'luz', 'adeus', 'carta',
        'destino', 'passado', 'culpa', 'segredo', 'vento', 'mão', 'rosto', 'espera'
      ],

      // Palavras Funcionais / Conectivos em Português (Linguística Cognitiva)
      FUNCTION_WORDS: new Set([
        'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
        'de', 'do', 'da', 'dos', 'das', 'dum', 'duma', 'duns', 'dumas',
        'em', 'no', 'na', 'nos', 'nas', 'num', 'numa', 'nuns', 'numas',
        'por', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'pra', 'pro', 'pras', 'pros',
        'com', 'sem', 'sob', 'sobre', 'até', 'ante', 'após', 'desde', 'entre', 'contra', 'perante',
        'e', 'mas', 'ou', 'nem', 'que', 'se', 'como', 'quando', 'porque', 'porquê', 'pois', 'contudo', 'todavia', 'portanto',
        'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes',
        'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
        'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa',
        'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas',
        'isto', 'isso', 'aquilo', 'muito', 'pouco', 'mais', 'menos', 'tão', 'já', 'não', 'sim', 'ainda', 'só', 'somente'
      ])
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppConfig };
}
