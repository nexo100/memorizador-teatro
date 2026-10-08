// PECA TEATRAL MODELO CANONICA (DefaultPlay)
// Este modulo exporta a peca padrao de demonstracao desacoplada do motor do aplicativo.
const DefaultPlay = {
  id: 'os-inventariantes',
  title: 'Os Inventariantes',
  author: 'Walter Paiva (Adaptação Dramatúrgica Depurada e Lapidada)',
  characters: ['SÉRGIO', 'BÁRBARA'],
  beats: [
    { name: "Beat 1: A Fuga & A Captura (Falas 1-11)", start: 0, end: 10 },
    { name: "Beat 2: A Arma & O Desprezo (Falas 12-23)", start: 11, end: 22 },
    { name: "Beat 3: Os Primeiros Disparos (Falas 24-34)", start: 23, end: 33 },
    { name: "Beat 4: O Desabafo dos 10 Anos (Falas 35-44)", start: 34, end: 43 },
    { name: "Beat 5: A Loucura & Clímax (Falas 45-58)", start: 44, end: 57 }
  ],
  intentions: {
    0: "Provocar e tripudiar sobre a fraqueza fisica do pai",
    1: "Conter a fuga e impor controle rigido",
    2: "Zombar da esperanca; intimidar o pai",
    3: "Simular condescendencia maternal fria",
    4: "Aterrorizar o pai com a proximidade da morte",
    5: "Constatar a derrota inevitavel de Juliano",
    6: "Imobilizar e humilhar o pai com ataduras sujas",
    7: "Censurar Sergio e tentar manter o decoro do ato",
    8: "Desafiar a mae com cinismo e impaciencia",
    9: "Reclamar silencio; desespero contido",
    10: "Desumanizar Juliano chamando-o de assombracao",
    11: "Implorar pelo fim da violencia verbal",
    12: "Reafirmar a missao 'divina' e arrancar a culpa da mae",
    14: "Exigir dureza e frieza de Barbara",
    16: "Assumir a decisao pratica de matar Juliano",
    18: "Relembrar a Juliano o asco fisico de sua degradacao",
    19: "Agredir e expor a humilhacao escatologica do pai",
    20: "Justificar o ato como cansaco e falta de saida",
    21: "Apresentar a roleta russa como eutanasia justa",
    22: "Buscar anestesiar a consciencia sem culpa",
    24: "Criar o ritual e a expectativa do primeiro disparo",
    25: "Racionalizar o tiro como destino e descanso",
    26: "Confrontar o pai com o espelho do proprio pavor",
    28: "Negar o valor da vida do pai e jogar por ele",
    30: "Cobrar a conta dos 10 anos de sacrificio e abandono",
    32: "Enfrentar Barbara com a cumplicidade do silencio dela",
    34: "Projetar grandeza ilusoria e desafiar a morte no Olimpo",
    36: "Tentar frear o delirio assassino do filho",
    42: "Intimar Barbara a puxar o gatilho sem recuar",
    45: "Celebrar o disparo seis como vitoria morbida",
    48: "Desferir o golpe psicologico final na covardia do pai",
    52: "Pedir perdao intimo antes do blecaute final"
  },
  rawScript: `**OS**** INVENTARIANTES**

**Texto Teatral de Walter Paiva (Adaptação Dramatúrgica Depurada e Lapidada)**

**Personagens:**

- **Juliano:** Um ancião mefítico (65 a 70 anos aproximadamente).

- **Bárbara:** Mulher de Juliano (60 a 65 anos aproximadamente).

- **Sérgio:** Filho de Juliano e Bárbara (35 anos aproximadamente).

**Cenário:**

Sala da casa de Sérgio. A linguagem cenográfica da peça deve traduzir uma atmosfera lúdica de sombria degradação.

*(Entra Juliano, um ancião mefítico pelas moléstias que o torturam com requintes de crueldade, movendo-se desesperadamente e com intensa fragilidade. Impossibilitado de falar, seus olhos turvos clamam por socorro. Em sua perseguição, entram Sérgio e Bárbara, cada qual com sua peculiar caracterização ameaçadora. Sérgio exala a agressividade irônica e cansada de quem definhou naquele ambiente; Bárbara traz uma rigidez contida, arrastando uma dor antiga. Sérgio delicia-se com a vulnerabilidade e o desespero do pai.)*

**SÉRGIO:** *(Sarcástico.)* Aonde vai com tanta pressa, papai?

**BÁRBARA:** Não corra, Juliano. Não corra mais!

**SÉRGIO:** Está desperdiçando seu tão precioso fôlego!

**BÁRBARA:** *(Tentando abraçá-lo com condescendência distante.)* Venha cá! *(Juliano tenta escapar das duas criaturas. Após correr muito, imobiliza-se. Está alucinado de dor. Fixa o olhar na plateia com grande dificuldade. Busca o olhar de Bárbara, mas ela desvia o rosto.)* O que está vendo, querido?

**SÉRGIO:** *(Dando uma gargalhada.)* Encontrou uma luz no fim do túnel? *(Aproxima-se.)* Aposto que é a morte vindo em sua direção... *(Juliano clama por todas as suas forças para fugir, mas não consegue mover um músculo sequer. Suas energias estão esgotadas. Fatalmente, só consegue suspirar.)*

**BÁRBARA:** *(Ajeita a cabeça de Juliano com frieza mecânica.)* Eu sabia que você não ia conseguir, Juliano. Sinto muito. *(Acomodando-o.)* Sente-se aqui e descanse.

**SÉRGIO:** *(Amarrando-o com ataduras usadas e sujas.)* Fique tranquilo. Isto é só para termos certeza de que você não fugirá de novo, seu cagão!

**BÁRBARA:** *(Censurando-o com voz seca.)* Sérgio!

**SÉRGIO:** *(Irônico.)* O que foi?

**BÁRBARA:** Você fala demais!

**SÉRGIO:** Como devo me dirigir a esta... assombração?

**BÁRBARA:** *(Chegando às lágrimas.)* Pare, Sérgio!

**SÉRGIO:** *(Abraçando-a.)* Ei, o que há? Nada disso, nada de lamentos. Já é tarde e todos têm seus objetivos nesta vida, *(Encara Juliano.)* por mais insanos que possam parecer a certos demônios... *(Voltando-se a Bárbara.)* E estamos aqui dispostos a cumprir a nossa missão "divina". Esqueceu, mamãe?

**BÁRBARA:** *(Encarando-o.)* Sérgio...

**SÉRGIO:** *(Acentuando a eloquência.)* Seja forte, dona Bárbara! Não deixe a emoção dissimular sua consciência. Pelo menos uma vez na vida, encare a realidade de frente!

**BÁRBARA:** *(Breve pausa. Vagarosamente, desenrola de um lenço um revólver. Fixa seu olhar em Juliano. Dirige-se a ele sendo seguida por Sérgio.)* Vamos acabar logo com isso. *(Sérgio aplaude. Juliano, atônito, procura livrar-se das amarras, mas não consegue.)*

**SÉRGIO:** Seja um bom menino e comporte-se!

**BÁRBARA:** *(Sentando-se ao lado de Juliano.)* Juliano, você está horrível. Seu aspecto é repugnante e nojento, o cheiro de sua pele chega a dar náuseas e você se sangra todo ao urinar.

**SÉRGIO:** *(Agarrando-o violentamente pelos testículos.)* Isto aqui fede, sangra e faz a gente vomitar! Está entendendo? *(Juliano solta um gemido abafado, quase desfalecendo.)* Que que há? Já cagou de novo? *(Examina-o. Grita.)* De novo? Sabe há quantos anos a gente aguenta isso? Alguma vez na vida você já limpou as suas cagadas? Responda!

**BÁRBARA:** *(Suspira.)* Não sabemos mais como cuidar de você, Juliano. Você não come mais nada. Não é mesmo, Sérgio? *(Sérgio continua examinando-o com desdém.)* Tudo lhe faz mal, Juliano. Também não sabemos quando descansa, pois você dorme com os olhos abertos! *(Amargurada.)* Estou assustada, Juliano. Não suporto mais!

**SÉRGIO:** *(Sorridente, pega a arma de Bárbara.)* Mas, veja só! Conseguimos, enfim, encontrar uma solução para esta tortura, um modo plenamente justo de realizar este ato de misericórdia familiar. *(Fitando-o nos olhos.)* Chame de eutanásia, se quiser.

**BÁRBARA:** Desejamos que tudo termine bem, Juliano. Sem dor, sem sofrimento...

**SÉRGIO:** Sem culpa, também!

**BÁRBARA:** Sim, é isto. Suplicamos que o destino decida tudo — somente ele.

**SÉRGIO:** *(Prepara o revólver entusiasticamente.)* Pronto: a “roleta russa” pode começar. O revólver é passado a cada jogador, que deverá acionar o gatilho contra a própria cabeça. Se a câmara estiver vazia e ressoar apenas um “clic”, muito bem: é um ponto. Do contrário, é o perdedor... *(Sorrindo.)* para sempre! *(Aponta a arma contra a própria têmpora.)* Posso começar? *(Momento de hesitação. O clima é tenso. Aciona o gatilho. Disparo 1 — Sérgio: apenas um "clic". Alívio sutil na cena. A arma é passada para Bárbara.)*

**BÁRBARA:** *(Colocando-se em pé.)* Sabe, Juliano. A proposta foi de Sérgio, mas eu gostei muito da ideia. Dessa forma não há injustiça, não há erro. Ninguém aqui está assassinando ninguém. Eu preciso acreditar que o destino de cada um aqui será o mesmo de antes, entende? Só estamos dando um jeito de apressar as coisas... *(Engatilha o revólver.)* Eu pensei que iria sofrer neste momento, Juliano. Mas, pelo contrário, estou sentindo uma sensação boa, muito boa. Uma sensação de alívio... *(Suspira.)* Sinto que talvez eu possa descansar, enfim. *(Virando-se para Sérgio, que lhe estende um sorriso.)* A propósito, Juliano, é preciso que saiba que, se você for o perdedor, um novo mundo será tomado em nossas vidas. *(Encarando-o.)* Mas, se um de nós deixar de viver, o outro continuará cuidando de você – amargurado ou não. *(Encostando a arma no crânio e fechando os olhos.)* Que tudo siga o seu caminho... *(Aciona o gatilho. Disparo 2 — Bárbara: apenas um “clic”. Chora em silêncio.)*

**SÉRGIO:** *(Toma a arma com ímpeto, encarando Juliano, que se contorce em pavor.)* Muito bem, meu pai: chegou a sua vez de jogar! Está ansioso, não? Dá para perceber. *(Forte.)* Eu queria ter um espelho aqui para você ver a sua fuça roxa de pavor!

**BÁRBARA:** Sérgio!

**SÉRGIO:** *(Extremamente irônico. Juliano tenta mover a cabeça.)* Oh, queira desculpar-me. Havia me esquecido que, além de mudo, você está quase completamente cego, também. É uma pena que talvez não consiga mesmo se ver assim: tão ativo, disposto, cheio de energia — até tentando lutar como um homem de verdade. *(Acentuando a eloquência.)* Só que é tarde demais para você buscar um ideal. *(Engatilha a arma. Aponta a arma para Juliano, que permanece inerte, incapaz de segurar o objeto.)* Mesmo que seja o ideal de viver! *(Constatando a incapacidade do pai, Sérgio encosta a arma na própria cabeça.)* Como você nunca consegue fazer nada... eu jogo por você! *(Aciona o gatilho. Disparo 3 — Sérgio joga por Juliano: câmara vazia. Permanece em silêncio por um segundo. Encarando a nuca de Juliano.)* Por que você voltou?

**BÁRBARA:** *(Em tom baixo.)* Ele não tinha para onde ir.

**SÉRGIO:** *(Rindo sem humor, numa respiração curta.)* Não tinha... Pai pródigo. Sumiu quando eu era um garoto e voltou dez anos atrás arrebentado, arrastando esse bagaço pra cá. *(Pausa.)* Dez anos. Limpando fralda. Lavando pus. Larguei o curso... larguei o trabalho... larguei tudo. Eu fiquei nesta casa por você, mãe.

*(Silêncio denso. Bárbara desvia o olhar lentamente, incapaz de olhar para Sérgio.)*

**SÉRGIO:** *(Voz baixa.)* Quando ele ainda tinha braço pra rachar a sua cara... eu entrava na frente. E quando ele voltou caindo aos pedaços... você nem precisou pedir. Eu vi nos seus olhos. Como é que eu ia embora?

**BÁRBARA:** *(Com voz rasgada.)* Eu devia ter mandado você ir.

**SÉRGIO:** *(Seco.)* Você nunca mandou.

**BÁRBARA:** *(Pausa longa. Olha para a parede desbotada.)* Eu sei. Eu tinha pavor de ficar sozinha com os restos dele. *(Passa a mão pelo próprio braço.)* Eu vi a sua vida parar aqui do meu lado, Sérgio... e eu me calei.

*(Sérgio engole em seco. Limpa o rosto com brutalidade. Respira fundo, força um sorriso largo e assume novamente uma postura empertigada, usando a teatralidade como escudo.)*

**SÉRGIO:** *(Com ironia grandiloquente.)* Mas passaram-se os anos, dona Bárbara... e é muito bom saber que, dentro de alguns instantes, eu poderei começar tudo de novo! Embora eu já esteja com esta idade e tão atormentado por tudo isso, pode acreditar que estou com mais garra do que nunca! Fatalmente, irei reconquistar o meu espaço neste mundo tão grande e maravilhoso! *(Olhando para o revólver.)* Ou, se o jogo do destino preferir assim, irei brilhar em outra dimensão. Lá no alto, com certeza, entre os mais lindos deuses do Olimpo! *(Dá uma risada histriônica. Encosta a arma na própria têmpora.)* Você admira esta minha força, não é mesmo, pai? Confesse! Eu sei o porquê: eu simplesmente represento toda aquela determinação que você sempre quis possuir um dia na vida e nunca conseguiu. Sempre evitou, fugiu ou fracassou! *(Segura o queixo de Juliano, direcionando o rosto do pai para si, embora saiba da visão quase nula dele.)* Olhe para mim, "papai"! Veja o meu sorriso, sinta o brilho dos meus olhos: eu quero que você olhe para mim! *(Sérgio aciona o gatilho. Disparo 4 — Sérgio: câmara vazia. Pausa. Sérgio sorri.)* Ainda está vivo? Até que suas pontes de safena estão mais sólidas do que eu pensava... *(Oferece o revólver a Bárbara. Bárbara recua dois passos, encarando a arma com pavor.)*

**BÁRBARA:** *(Grito contido.)* Chega!

**SÉRGIO:** *(Estranhando.)* O que houve?

**BÁRBARA:** Pare, Sérgio. Por favor, pare!

**SÉRGIO:** *(Segurando o revólver. Balança a cabeça negativamente.)* Não, minha mãe!

**BÁRBARA:** Sérgio! Pense bem no que estamos fazendo. Não tem sentido!

**SÉRGIO:** É claro que tem!

**BÁRBARA:** Sinto que vou morrer!

**SÉRGIO:** *(Num tom baixo, definitivo.)* Talvez, mãe!

**BÁRBARA:** Sérgio. Ouça-me!

**SÉRGIO:** É a sua vez de jogar, dona Bárbara. *(Grita.)* Jogue agora!

**BÁRBARA:** *(Súplice.)* Não...

**SÉRGIO:** *(Voz embargada.)* Pois, então, eu jogo por você!

**BÁRBARA:** *(Sobressalto.)* Não! *(Sérgio encosta a arma na própria cabeça e dispara. Disparo 5 — Sérgio joga por Bárbara: câmara vazia. O estalo seco ecoa. Bárbara e Sérgio se agarram num abraço tenso e exausto. Juliano move os lábios sem emitir som, tremendo na cadeira. Sérgio e Bárbara soltam-se lentamente e olham para Juliano com um sorriso estático. Dirigem-se a ele.)*

**SÉRGIO:** *(Numa melodia sarcástica.)* Olá, perdedor! Este é o disparo número seis!

**BÁRBARA:** *(Carinhosa.)* Descanse em paz, querido. Seja feliz.

**SÉRGIO:** *(Radiante.)* Bem feliz!

**BÁRBARA:** *(Ajeita o colarinho sujo de Juliano com cuidado automático. Beija-lhe a testa.)* Fique tranquilo. Não vai doer nada!

**SÉRGIO:** *(Tira um lenço do bolso, limpa delicadamente uma nesga de saliva no canto da boca de Juliano.)* Sabe por que você tem medo da morte? Porque você nunca teve coragem de viver!

**BÁRBARA:** Lembre-se agora dos bons momentos, querido.

**SÉRGIO:** Viva este momento como nunca!

**BÁRBARA:** Adeus... *(Sérgio engatilha o revólver e o encosta na têmpora de Juliano. Blecaute imediato. Ouve-se o disparo seco. Foco de luz em resistência sobre Juliano morto na cadeira de rodas. A cadeira gira lentamente e a iluminação vai se esvaziando até a escuridão total.)*

**SÉRGIO:** *(Em off. Num sussurro comedido.)* Perdão, pai!

**FIM**`
};

if (typeof globalThis !== 'undefined') {
  globalThis.DefaultPlay = DefaultPlay;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DefaultPlay };
}
