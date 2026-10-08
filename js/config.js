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

      // Delegacao dinamica de Beats e Intencoes da peca modelo
      get DEFAULT_DRAMA_BEATS() {
        return (typeof DefaultPlay !== 'undefined' && DefaultPlay.beats) ? DefaultPlay.beats : [];
      },

      get DEFAULT_INTENTIONS() {
        return (typeof DefaultPlay !== 'undefined' && DefaultPlay.intentions) ? DefaultPlay.intentions : {};
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
