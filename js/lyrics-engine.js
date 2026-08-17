/**
 * lyrics-engine.js — on-device lyric generation and phonetic rhyme analysis.
 *
 * The engine has no UI or network dependency. It keeps draft generation,
 * Kannada/English phonetic normalization, rhyme-family analysis, metre/rhythm
 * heuristics and suggestions independently testable. Scores are descriptive
 * songwriting aids, not linguistic or artistic verdicts.
 */
'use strict';

(function (root) {
  var SCHEMES = {
    auto: { pattern: 'AUTO', description: 'Lyrics Lab chooses a natural pattern for the section and mood.' },
    AAAA: { pattern: 'AAAA', description: 'All four lines return to one memorable rhyme family.' },
    AABB: { pattern: 'AABB', description: 'Lines 1–2 rhyme, then lines 3–4 move to a new family.' },
    ABAB: { pattern: 'ABAB', description: 'Alternating rhyme families keep a verse moving.' },
    ABBA: { pattern: 'ABBA', description: 'The outside lines rhyme and the middle pair answers them.' },
    ABCB: { pattern: 'ABCB', description: 'Only lines 2 and 4 resolve together; useful for story-led verses.' },
    AABA: { pattern: 'AABA', description: 'Three familiar returns with one contrasting third line.' },
    AAAB: { pattern: 'AAAB', description: 'Three repeated rhymes lead to a contrasting final line.' },
    ABAC: { pattern: 'ABAC', description: 'Line 3 returns to A while lines 2 and 4 stay open.' },
    AABC: { pattern: 'AABC', description: 'An opening couplet is followed by two freer lines.' },
    AAXA: { pattern: 'AAXA', description: 'A strong repeated family surrounds one intentionally free line.' }
  };

  var WEIGHTS = {
    phonetic: 0.34,
    ending: 0.20,
    vowel: 0.16,
    syllable: 0.11,
    rhythm: 0.11,
    semantic: 0.08
  };

  var K_CONS = {
    'ಕ':'k','ಖ':'kh','ಗ':'g','ಘ':'gh','ಙ':'ng','ಚ':'c','ಛ':'ch','ಜ':'j','ಝ':'jh','ಞ':'ny',
    'ಟ':'tt','ಠ':'tth','ಡ':'dd','ಢ':'ddh','ಣ':'nn','ತ':'t','ಥ':'th','ದ':'d','ಧ':'dh','ನ':'n',
    'ಪ':'p','ಫ':'ph','ಬ':'b','ಭ':'bh','ಮ':'m','ಯ':'y','ರ':'r','ಱ':'rr','ಲ':'l','ಳ':'ll',
    'ವ':'v','ಶ':'sh','ಷ':'ss','ಸ':'s','ಹ':'h'
  };
  var K_VOWELS = {
    'ಅ':'a','ಆ':'aa','ಇ':'i','ಈ':'ii','ಉ':'u','ಊ':'uu','ಋ':'ru','ೠ':'ruu',
    'ಎ':'e','ಏ':'ee','ಐ':'ai','ಒ':'o','ಓ':'oo','ಔ':'au'
  };
  var K_SIGNS = {
    'ಾ':'aa','ಿ':'i','ೀ':'ii','ು':'u','ೂ':'uu','ೃ':'ru','ೄ':'ruu',
    'ೆ':'e','ೇ':'ee','ೈ':'ai','ೊ':'o','ೋ':'oo','ೌ':'au'
  };
  var VIRAMA = '್';
  var K_SUFFIXES = [
    'ಗಳಲ್ಲಿ','ದಲ್ಲಿ','ನಲ್ಲಿ','ವಲ್ಲಿ','ಯಲ್ಲಿ','ಅಲ್ಲಿ','ಿನಲ್ಲಿ','ಿಂದಲಿ','ಿನಲಿ','ದಲಿ','ನಲಿ','ವಲಿ','ಯಲಿ','ಲಿ',
    'ತ್ತೇನೆ','ುತ್ತೇನೆ','ುತ್ತದೆ','ುತ್ತಾರೆ','ುವನು','ುವಳು','ುವುದು','ುವೆ','ವೆ','ೇನೆ','ಾನೆ',
    'ಿಸಿದ','ಾಡಿದ','ೋಡಿದ','ೇರಿದ','ಿದ','ಾಗಿ','ಕ್ಕೆ','ಿಗೆ','ಗೆ','ನ್ನು','ನು','ಳು','ರು'
  ];

  /* A compact pronunciation lexicon covers high-value songwriting words and
     irregular spellings. Unknown words use the rule-based fallback below. */
  var EN_PRON = {
    'a':'AH0','above':'AH0 B AH1 V','again':'AH0 G EH1 N','air':'EH1 R','alone':'AH0 L OW1 N',
    'apart':'AH0 P AA1 R T','away':'AH0 W EY1','blue':'B L UW1','bright':'B R AY1 T',
    'choir':'K W AY1 ER','come':'K AH1 M','day':'D EY1','desire':'D IH0 Z AY1 ER',
    'dove':'D AH1 V','dream':'D R IY1 M','fire':'F AY1 ER','flow':'F L OW1','flower':'F L AW1 ER',
    'glove':'G L AH1 V','gone':'G AO1 N','hard':'HH AA1 R D','heart':'HH AA1 R T',
    'higher':'HH AY1 ER','home':'HH OW1 M','ignite':'IH0 G N AY1 T','known':'N OW1 N','light':'L AY1 T','love':'L AH1 V',
    'move':'M UW1 V','new':'N UW1','night':'N AY1 T','rain':'R EY1 N','remain':'R IH0 M EY1 N',
    'road':'R OW1 D','roam':'R OW1 M','rough':'R AH1 F','say':'S EY1','sky':'S K AY1',
    'sight':'S AY1 T','song':'S AO1 NG','start':'S T AA1 R T','stay':'S T EY1','story':'S T AO1 R IY0',
    'through':'TH R UW1','time':'T AY1 M','together':'T AH0 G EH1 DH ER0','true':'T R UW1',
    'view':'V Y UW1','way':'W EY1','wire':'W AY1 ER','word':'W ER1 D','world':'W ER1 L D','you':'Y UW1'
  };
  var EN_VOWEL = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)[012]?$/;

  var SEMANTIC = {
    love: ['ಪ್ರೀತಿ','ಮಮತೆ','ಒಲವು','ಬಂಧ','ಸ್ನೇಹ','love','heart','affection','together','desire'],
    dream: ['ಕನಸು','ಹೊಂಗನಸು','ಆಸೆ','dream','hope','wish','sky'],
    song: ['ಗೀತಿ','ಹಾಡು','ರಾಗ','ಸ್ವರ','song','music','melody','choir'],
    night: ['ರಾತ್ರಿ','ಇರುಳು','ಚಂದ್ರ','ನಕ್ಷತ್ರ','night','moon','star','dark'],
    journey: ['ದಾರಿ','ಹೆಜ್ಜೆ','ಪಯಣ','road','way','journey','path','home'],
    rain: ['ಮಳೆ','ಹನಿ','ಮೋಡ','rain','cloud','river','water'],
    memory: ['ನೆನಪು','ಸ್ಮರಣೆ','ಮೌನ','memory','remember','silence','echo'],
    devotion: ['ಭಕ್ತಿ','ದೇವರು','ನಾಮ','ದೀಪ','prayer','divine','faith','light'],
    courage: ['ಧೈರ್ಯ','ಗೆಲುವು','ಶಕ್ತಿ','rise','courage','win','fire','strong']
  };

  var K_LEXICON = [
    'ಪ್ರೀತಿ','ರೀತಿ','ನೀತಿ','ಗೀತಿ','ಬೀದಿ','ಕೀರ್ತಿ','ಮಮತೆ','ಒಲವು','ಬಂಧ','ಸ್ನೇಹ',
    'ಕನಸು','ಮನಸು','ಸೊಗಸು','ಹೊಂಗನಸು','ನೆನಪು','ಉಸಿರು','ಹೆಸರು','ಮಳೆ','ಹನಿ','ಮೋಡ',
    'ನೀನು','ನಾನು','ತಾನು','ಏನು','ಹಾಡು','ಮಾತು','ದಾರಿ','ರಾತ್ರಿ','ಬೆಳಕು','ಕತ್ತಲು',
    'ಬರುವೆ','ನಗುವೆ','ಕರೆಯುವೆ','ಸಾಗುವೆ','ನೋಡಿದ','ಆಡಿದ','ಹಾಡಿದ','ಕಾಡಿದ','ಸೇರಿದ',
    'ಕಣ್ಣಲಿ','ಕನಸಲಿ','ನಗುವಲಿ','ಮನಸಲಿ','ನಿನ್ನಲ್ಲಿ','ನನ್ನಲ್ಲಿ','ಅವಳಲ್ಲಿ','ಹೃದಯ','ರಾಗ','ಸ್ವರ'
  ];
  var EN_LEXICON = [
    'love','above','dove','glove','move','heart','start','apart','hard','dark',
    'night','light','bright','sight','fire','desire','higher','wire','choir',
    'day','way','stay','say','away','blue','true','you','new','through',
    'home','roam','known','alone','dream','stream','seem','song','long','strong',
    'rain','remain','again','road','word','world','story','memory','affection','together'
  ];

  var K_FAMILIES = [
    [
      'ನಿನ್ನ ಕಣ್ಣಲ್ಲಿ ಮೂಡಿದ ಹೊಸ ಪ್ರೀತಿ',
      'ನನ್ನ ಮೌನವೇ ಹಾಡಿದ ಮಧುರ ಗೀತಿ',
      'ಕಾಲ ಬದಲಿಸಿದ ಬದುಕಿನ ರೀತಿ',
      'ಹೃದಯ ಕಲಿಸಿದ ಒಂದೇ ಸರಳ ನೀತಿ'
    ],
    [
      'ಕೈ ಹಿಡಿದು ಸಾಗುವ ಬಣ್ಣದ ಕನಸು',
      'ನೀ ಜೊತೆಗಿರಲು ಹಗುರ ಈ ಮನಸು',
      'ಮಳೆಯ ಹನಿಯಲ್ಲೂ ಕಾಣುವ ಸೊಗಸು',
      'ನಾಳೆಯ ಕಣ್ಣಲ್ಲಿ ಅರಳುವ ಹೊಂಗನಸು'
    ],
    [
      'ದೂರವಾದರೂ ನಿನ್ನ ಬಳಿಗೆ ಬರುವೆ',
      'ಮೌನದ ನಡುವೆಯೂ ನಿನ್ನಂತೆ ನಗುವೆ',
      'ಕಳೆದುಹೋದ ಕ್ಷಣವನ್ನು ಮತ್ತೆ ಕರೆಯುವೆ',
      'ಬೆಳಕಿರುವ ದಾರಿಯಲ್ಲಿ ನಿನ್ನೊಡನೆ ಸಾಗುವೆ'
    ],
    [
      'ಮೊದಲ ಮಳೆಯ ಹಾಗೆ ಬಂದೆ ನೀನು',
      'ಮರೆತ ದಾರಿಯಲ್ಲಿ ನಿಂತೆ ನಾನು',
      'ಈ ಮೌನದ ಅರ್ಥ ಈಗ ಏನು',
      'ಕಥೆಯೊಳಗೆ ಮಾತಾದೆ ನೀನು'
    ],
    [
      'ಕಣ್ಣಿನ ಭಾಷೆಯನ್ನು ಮೌನವೇ ನೋಡಿದ',
      'ನಮ್ಮ ಚಿಕ್ಕ ಕನಸನ್ನು ಗಾಳಿಯು ಹಾಡಿದ',
      'ನಿನ್ನ ಹೆಜ್ಜೆಯ ನೆನಪು ಮತ್ತೆ ಕಾಡಿದ',
      'ದೂರದ ಎರಡು ದಾರಿಗಳನ್ನು ಕಾಲ ಸೇರಿಸಿದ'
    ]
  ];
  var K_SHORT_FAMILIES = [
    ['ನಿನ್ನ ಹೊಸ ಪ್ರೀತಿ','ಮೌನದ ಮಧುರ ಗೀತಿ','ಬದುಕಿನ ಹೊಸ ರೀತಿ','ಹೃದಯದ ಸರಳ ನೀತಿ'],
    ['ನಮ್ಮ ಚಿಕ್ಕ ಕನಸು','ಹಗುರಾಯಿತು ಮನಸು','ಮಳೆಯ ಸರಳ ಸೊಗಸು','ನಾಳೆಯ ಹೊಂಗನಸು'],
    ['ನಿನ್ನ ಬಳಿಗೆ ಬರುವೆ','ನಿನ್ನ ಹಾಗೆ ನಗುವೆ','ಮತ್ತೆ ನಿನ್ನ ಕರೆಯುವೆ','ಜೊತೆಯಾಗಿ ಸಾಗುವೆ'],
    ['ನನ್ನ ಕಥೆಯ ನೀನು','ಇಲ್ಲಿ ನಿಂತ ನಾನು','ಉತ್ತರವೇನು','ಮಾತಾದೆ ನೀನು'],
    ['ಮೌನವೇ ನೋಡಿದ','ಗಾಳಿಯು ಹಾಡಿದ','ನೆನಪು ಕಾಡಿದ','ಕಾಲವೇ ಸೇರಿಸಿದ']
  ];
  var EN_FAMILIES = [
    [
      'You turn the longest road to light',
      'I hear your name inside the night',
      'We hold tomorrow in our sight',
      'The quiet stars begin to ignite'
    ],
    [
      'We keep the honest spark of fire',
      'A small hello becomes desire',
      'Every falling hope can climb up higher',
      'Our restless voices meet like a choir'
    ],
    [
      'I will meet you halfway on the road',
      'We can share the weight of every load',
      'Let the open sky become our code',
      'Step by step we leave the old abode'
    ],
    [
      'We let the morning show the way',
      'What truly matters learns to stay',
      'We choose each other every day',
      'And leave one honest word to say'
    ],
    [
      'The farthest road can lead us home',
      'No heart was ever made to roam',
      'We name the truth we have always known',
      'Together means we are not alone'
    ]
  ];

  var EN_BILINGUAL_U = [
    'Every road comes home to you',
    'I keep this simple promise true',
    'The rain makes every colour new',
    'We hold the same unbroken view'
  ];
  var EN_SHORT_FAMILIES = [
    ['Turn the dark to light','Hold me through the night','Keep hope in sight','Let the stars ignite'],
    ['Keep the honest fire','Name this desire','Lift the hope higher','Sing it like a choir'],
    ['Meet me on the road','Share the heavy load','Make this hope our code','Leave the old abode'],
    ['Show me the way','Give this reason to stay','Choose us every day','Say what you need to say'],
    ['Lead the long way home','No more need to roam','Trust what we have known','We are not alone']
  ];

  /* Mood banks keep the emotional world coherent while preserving reliable
     sound families. They are intentionally plain-spoken; rhyme serves the
     selected feeling rather than replacing it. */
  var K_MOOD_FAMILIES = {
    sad: [
      ['ಖಾಲಿ ಕಣ್ಣಲ್ಲಿ ಉಳಿದ ಹಳೆಯ ಪ್ರೀತಿ','ಮುರಿದ ಮೌನವೇ ಹಾಡಿದ ಕೊನೆಯ ಗೀತಿ','ನಿನ್ನಿಲ್ಲದೆ ಬದಲಾಗಿದ ಬದುಕಿನ ರೀತಿ','ನೋವನ್ನು ಮರೆಮಾಡುವುದೇ ದಿನದ ನೀತಿ'],
      ['ಕೈ ಜಾರಿದ ಮೇಲೆ ಉಳಿದ ಕನಸು','ನೀ ದೂರವಾದ ಮೇಲೆ ಭಾರ ಈ ಮನಸು','ಹಿಂತಿರುಗಿ ನೋಡಿದ ಕ್ಷಣದ ಸೊಗಸು','ಕಣ್ಣೀರಲ್ಲಿ ಕರಗಿತು ಹೊಂಗನಸು'],
      ['ಖಾಲಿ ಕೋಣೆಯು ಹೆಜ್ಜೆಯನ್ನು ನೋಡಿದ','ಹಳೆಯ ಗಾಳಿಯು ನಿನ್ನ ಹೆಸರ ಹಾಡಿದ','ಒಂಟಿ ರಾತ್ರಿಯು ಮತ್ತೆ ನನ್ನ ಕಾಡಿದ','ಕಾಲ ನಮ್ಮ ಎರಡು ದಾರಿಗಳನ್ನು ಬೇರ್ಪಡಿಸಿದ']
    ],
    devotional: [
      ['ನಿನ್ನ ನಾಮವೇ ಉಸಿರಿನ ಗೀತಿ','ನೀ ತೋರಿದ ಕರುಣೆಯ ರೀತಿ','ಸತ್ಯದ ದಾರಿಯೇ ಬದುಕಿನ ನೀತಿ','ಎಲ್ಲ ಜೀವದೊಳಗೂ ನಿನ್ನ ಪ್ರೀತಿ'],
      ['ನಿನ್ನ ಮುಂದೆ ಮಗು ನಾನು','ಪ್ರತಿ ಉಸಿರಲ್ಲಿರುವೆ ನೀನು','ನಿನ್ನ ಕರುಣೆಯ ಅಳತೆ ಏನು','ಎಲ್ಲ ಜೀವದ ಬೆಳಕು ನೀನು'],
      ['ದೀಪದ ಮುಂದೆ ನಿನ್ನ ನಾಮ ಕರೆಯುವೆ','ಮೌನದ ಪ್ರಾರ್ಥನೆಯಲ್ಲಿ ನಗುವೆ','ಕರುಣೆಯ ದಾರಿಯಲ್ಲಿ ನಿಧಾನ ಸಾಗುವೆ','ಪ್ರತಿ ಹೆಜ್ಜೆಯಲ್ಲೂ ನಿನ್ನ ಕಾಣುವೆ']
    ],
    motivational: [
      ['ಬಿದ್ದರೂ ಮತ್ತೊಮ್ಮೆ ಎದ್ದು ಬರುವೆ','ಭಯದ ಎದುರಲ್ಲೂ ಧೈರ್ಯವಾಗಿ ನಗುವೆ','ನನ್ನೊಳಗಿನ ಶಕ್ತಿಯನ್ನು ಮತ್ತೆ ಕರೆಯುವೆ','ಒಂದೊಂದು ಹೆಜ್ಜೆಯಾಗಿ ಮುಂದೆ ಸಾಗುವೆ'],
      ['ಕಣ್ಣ ಮುಂದಿರಲಿ ದೊಡ್ಡ ಕನಸು','ಗೆಲುವನ್ನು ನಂಬಲಿ ನನ್ನ ಮನಸು','ಪ್ರತಿ ಸವಾಲಲ್ಲೂ ಹುಡುಕಲಿ ಸೊಗಸು','ನಾಳೆ ನಿಜವಾಗಲಿ ಈ ಹೊಂಗನಸು'],
      ['ಸೋಲಿನ ಪಾಠವನ್ನು ಮನಸು ನೋಡಿದ','ಹೊಸ ಬೆಳಗಿನ ಗಾಳಿಯು ಗೆಲುವ ಹಾಡಿದ','ನನ್ನೊಳಗಿನ ಧೈರ್ಯ ಮತ್ತೆ ಕಾಡಿದ','ಒಂದು ನಿರ್ಧಾರವೇ ದಾರಿಗಳನ್ನು ಸೇರಿಸಿದ']
    ],
    celebration: [
      ['ಈ ಸಂತೋಷವೇ ಇಂದಿನ ಗೀತಿ','ಕೈತಟ್ಟಿ ಕುಣಿಯಲಿ ನಮ್ಮದೇ ರೀತಿ','ಒಟ್ಟಾಗಿ ನಗುವುದೇ ಹಬ್ಬದ ನೀತಿ','ಈ ಕ್ಷಣದೊಳಗೆ ತುಂಬಿರಲಿ ಪ್ರೀತಿ'],
      ['ಕಣ್ಣ ಮುಂದೆ ಅರಳಿದೆ ಕನಸು','ತಾಳಕ್ಕೆ ಕುಣಿಯಲಿ ಎಲ್ಲರ ಮನಸು','ಈ ಸಂಭ್ರಮದಲ್ಲಿದೆ ಬದುಕಿನ ಸೊಗಸು','ನಾಳೆಯವರೆಗೂ ಉಳಿಯಲಿ ಹೊಂಗನಸು'],
      ['ವೇದಿಕೆಯ ಬೆಳಕು ಎಲ್ಲರನ್ನು ನೋಡಿದ','ನಮ್ಮ ನಗುವಿಗೆ ತಾಳವೇ ಹಾಡಿದ','ಹಬ್ಬದ ಸದ್ದು ಊರನ್ನೆಲ್ಲ ಕಾಡಿದ','ಒಂದೇ ರಾಗವು ಸಾವಿರ ಕೈ ಸೇರಿಸಿದ']
    ],
    folk: [
      ['ಮಣ್ಣಿನ ವಾಸನೆಯೇ ನಮ್ಮ ಗೀತಿ','ಡೊಳ್ಳಿನ ತಾಳವೇ ಹೆಜ್ಜೆಯ ರೀತಿ','ಒಟ್ಟಾಗಿ ದುಡಿಯುವುದೇ ಊರಿನ ನೀತಿ','ಜನಪದ ಹಾಡಿನೊಳಗೆ ಮನೆಯ ಪ್ರೀತಿ'],
      ['ಹೊಲದ ಅಂಚಿನಲ್ಲಿ ಚಿಕ್ಕ ಕನಸು','ಮಣ್ಣಿನ ಬಣ್ಣದಲ್ಲಿ ಊರಿನ ಮನಸು','ಜಾತ್ರೆಯ ದಾರಿಯಲ್ಲಿ ಬದುಕಿನ ಸೊಗಸು','ಬೆಳೆದು ನಿಲ್ಲಲಿ ನಾಳೆಯ ಹೊಂಗನಸು'],
      ['ಹಳ್ಳಿಯ ದಾರಿಯು ಹೆಜ್ಜೆಯನ್ನು ನೋಡಿದ','ಬೇವಿನ ಗಾಳಿಯು ಹಳೆಯ ಪದ ಹಾಡಿದ','ಡೊಳ್ಳಿನ ಸದ್ದು ಮನವನ್ನೇ ಕಾಡಿದ','ಜಾತ್ರೆಯ ತಾಳವು ಊರನ್ನೆಲ್ಲ ಸೇರಿಸಿದ']
    ],
    cinematic: [
      ['ಬೆಳ್ಳಿತೆರೆಯ ಬೆಳಕಲ್ಲಿ ಮೂಡಿದ ಪ್ರೀತಿ','ಮಳೆಯ ಮೌನವೇ ಹಾಡಿದ ಹಿನ್ನೆಲೆ ಗೀತಿ','ಒಂದು ನೋಟದಿಂದ ಬದಲಾಗುವ ಕಥೆಯ ರೀತಿ','ಕೊನೆಯ ದೃಶ್ಯ ಹೇಳುವ ಹೃದಯದ ನೀತಿ'],
      ['ಆಕಾಶದ ಅಂಚಿನಲ್ಲಿ ತೆರೆಯುವ ಕನಸು','ನೀಲಿಯ ನೆರಳಲ್ಲಿ ತೇಲುವ ಮನಸು','ಮಳೆಯ ಬೆಳಕಿನಲ್ಲಿ ಕಾಣುವ ಸೊಗಸು','ಕೊನೆಯ ಫ್ರೇಮಿನಲ್ಲೂ ಉಳಿಯುವ ಹೊಂಗನಸು'],
      ['ಕ್ಯಾಮೆರಾ ಮೌನದ ಕಣ್ಣೀರ ನೋಡಿದ','ಹಿನ್ನೆಲೆ ರಾಗವು ನಮ್ಮ ಕಥೆ ಹಾಡಿದ','ದೂರದ ದೃಶ್ಯವು ನೆನಪಾಗಿ ಕಾಡಿದ','ಒಂದು ಕ್ಷಣವೇ ಎರಡು ಕಾಲ ಸೇರಿಸಿದ']
    ]
  };
  K_MOOD_FAMILIES.melancholic = K_MOOD_FAMILIES.sad;
  K_MOOD_FAMILIES.happy = K_MOOD_FAMILIES.celebration;

  var EN_MOOD_FAMILIES = {
    sad: [
      ['I keep your shadow through the night','The empty window loses light','Your fading footsteps leave my sight','I hold the words I could not write'],
      ['The last goodbye still feeds the fire','A broken promise outlives desire','I watch your memory climbing higher','Then lose your voice inside the choir'],
      ['The farthest road no longer feels like home','These quiet rooms were never made to roam','I miss the truth we once had known','And learn how heavy it is to be alone']
    ],
    devotional: [
      ['A quiet prayer becomes my light','Your grace stays near me through the night','Faith keeps the truest path in sight','One humble flame can still burn bright'],
      ['I bring an honest heart to the fire','Let service rise above desire','Teach every tired hope to climb higher','And join our many voices like a choir'],
      ['Your open door can guide me home','With faith beside me I need not roam','I trust the love I have always known','In every prayer I am not alone']
    ],
    motivational: [
      ['I turn the hardest lesson into light','I meet the longest challenge in the night','I keep tomorrow steady in my sight','One brave decision helps the dream ignite'],
      ['I guard the honest spark of fire','Let daily courage grow through desire','Every small step takes the dream up higher','We lift each other louder than a choir'],
      ['I take the first step down the road','I learn to carry my own load','Let every action match my code','I leave behind the fear I once bestowed']
    ],
    celebration: [
      ['We fill this open room with light','We sing together through the night','A hundred smiles are now in sight','Let every joyful spark ignite'],
      ['Raise every hand around the fire','Let laughter climb a little higher','Tonight the whole room is our choir','This living moment is our one desire'],
      ['The music shows us all the way','The people we love are here to stay','We choose this joy again today','And sing the words we came to say']
    ],
    folk: [
      ['Dust on our feet knows every road','We share the harvest and the load','The oldest drum becomes our code','A village song is our abode'],
      ['The evening bell can lead us home','The river teaches feet to roam','We sing the stories we have known','No one around the fire is alone'],
      ['The morning field will show the way','Old hands and young hearts choose to stay','We work and sing through every day','Then leave one tale for time to say']
    ],
    cinematic: [
      ['The silver skyline opens into light','A single close-up holds the night','The final frame keeps love in sight','Then all the quiet stars ignite'],
      ['The screen goes dark around the fire','One word in rain becomes desire','The camera lifts the dream up higher','While distant streets become a choir'],
      ['The final road still leads us home','Across the silver rain we roam','The closing scene reveals what we have known','Two separate shadows are no longer alone']
    ]
  };
  EN_MOOD_FAMILIES.melancholic = EN_MOOD_FAMILIES.sad;
  EN_MOOD_FAMILIES.happy = EN_MOOD_FAMILIES.celebration;

  var MOOD_FREE_K = {
    Romantic: 'ನಿನ್ನ ಸನಿಹದಲ್ಲಿ ಸಮಯವೂ ನಿಧಾನ',
    Sad: 'ಉಳಿದ ಮೌನಕ್ಕೆ ಉತ್ತರವೇ ಇಲ್ಲ',
    Happy: 'ಇಂದು ಗಾಳಿಗೂ ನಗುವಿನ ಬಣ್ಣ',
    Devotional: 'ಒಳಗಿನ ದೀಪಕ್ಕೆ ನಿನ್ನದೇ ನಾಮ',
    Motivational: 'ಒಂದು ಹೆಜ್ಜೆಯಿಂದ ಬದಲಾಗಲಿ ದಾರಿ',
    Melancholic: 'ಮಸುಕಾದ ಸಂಜೆ ನೆನಪನ್ನು ಹೊತ್ತು',
    Celebration: 'ಈ ಕ್ಷಣ ನಮ್ಮದು ಕೈತಟ್ಟಿ ಹಾಡೋಣ',
    Folk: 'ಮಣ್ಣಿನ ವಾಸನೆ ತಾಳವಾಗಿ ಬಂತು',
    Cinematic: 'ಆಕಾಶದ ಅಂಚಿನಲ್ಲಿ ಕಥೆಯೊಂದು ತೆರೆದು',
    Custom: 'ಮನದೊಳಗಿನ ಮಾತು ಹಾಡಾಗಿ ಹರಿದು'
  };
  var MOOD_FREE_E = {
    Romantic: 'Time slows down whenever you are near',
    Sad: 'The empty room still knows your name',
    Happy: 'Even the morning is learning to smile',
    Devotional: 'A quiet prayer keeps the lamp alive',
    Motivational: 'One brave step can redraw the road',
    Melancholic: 'The evening carries what we could not say',
    Celebration: 'This is our moment so sing it aloud',
    Folk: 'Dust on our feet keeps time with the drum',
    Cinematic: 'The skyline opens like a silver screen',
    Custom: 'An honest feeling finds its own voice'
  };

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function cleanText(text) {
    var s = String(text == null ? '' : text);
    try { s = s.normalize('NFC'); } catch (e) {}
    return s.replace(/[\u200c\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isKannadaChar(ch) { return /[\u0C80-\u0CFF]/.test(ch || ''); }
  function detectLanguage(text, fallback) {
    var s = String(text || '');
    var k = (s.match(/[\u0C80-\u0CFF]/g) || []).length;
    var e = (s.match(/[A-Za-z]/g) || []).length;
    if (k && e) return 'bilingual';
    if (k) return 'kannada';
    if (e) return 'english';
    return fallback || 'english';
  }
  function wordsOf(text) {
    return cleanText(text).replace(/[“”‘’]/g, '').split(/[^A-Za-z'\u0C80-\u0CFF]+/).filter(Boolean);
  }
  function lastWord(text) {
    var words = wordsOf(text);
    return words.length ? words[words.length - 1] : '';
  }

  function parseKannadaWord(word) {
    var s = cleanText(word).replace(/[^\u0C80-\u0CFF]/g, '');
    var chars = Array.from ? Array.from(s) : s.split('');
    var units = [];
    var i = 0;
    while (i < chars.length) {
      var ch = chars[i];
      if (K_VOWELS[ch]) {
        var independent = { text: ch, onset: '', vowel: K_VOWELS[ch], coda: '' };
        i++;
        if (chars[i] === 'ಂ') { independent.coda = 'm'; independent.text += chars[i++]; }
        if (chars[i] === 'ಃ') { independent.coda = 'h'; independent.text += chars[i++]; }
        units.push(independent);
        continue;
      }
      if (!K_CONS[ch]) { i++; continue; }
      var text = ch;
      var onset = K_CONS[ch];
      var vowel = 'a';
      var coda = '';
      i++;
      while (chars[i] === VIRAMA && K_CONS[chars[i + 1]]) {
        text += chars[i] + chars[i + 1];
        onset += K_CONS[chars[i + 1]];
        i += 2;
      }
      if (chars[i] === VIRAMA) {
        text += chars[i++]; vowel = '';
      } else if (K_SIGNS[chars[i]]) {
        vowel = K_SIGNS[chars[i]]; text += chars[i++];
      }
      if (chars[i] === 'ಂ') { coda = 'm'; text += chars[i++]; }
      if (chars[i] === 'ಃ') { coda = 'h'; text += chars[i++]; }
      if (!vowel && units.length) {
        units[units.length - 1].coda += onset;
      } else {
        units.push({ text: text, onset: onset, vowel: vowel, coda: coda });
      }
    }
    var vowelSequence = units.map(function (u) { return u.vowel; }).filter(Boolean);
    var last = units[units.length - 1] || { onset: '', vowel: '', coda: '', text: '' };
    var suffix = detectKannadaSuffix(s);
    return {
      source: word,
      normalized: units.map(function (u) { return u.onset + u.vowel + u.coda; }).join('-'),
      units: units,
      syllables: units.length,
      vowelSequence: vowelSequence,
      finalVowel: last.vowel,
      finalOnset: last.onset,
      finalCoda: last.coda,
      /* Kannada rhyme comparison includes the spoken onset of the final
         akshara. A shared vowel alone (e.g. ತಿ / ದಿ) is useful as a near
         relationship, but is not enough to claim a perfect rhyme. */
      nucleus: last.onset + last.vowel + last.coda,
      ending: units.slice(-2).map(function (u) { return u.text; }).join(''),
      endingKey: units.slice(-2).map(function (u) { return u.onset + u.vowel + u.coda; }).join('-'),
      suffix: suffix
    };
  }

  function detectKannadaSuffix(word) {
    for (var i = 0; i < K_SUFFIXES.length; i++) {
      if (word.length > K_SUFFIXES[i].length && word.slice(-K_SUFFIXES[i].length) === K_SUFFIXES[i]) return K_SUFFIXES[i];
    }
    return '';
  }

  function guessEnglishPronunciation(word) {
    var w = String(word || '').toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
    if (!w) return [];
    if (EN_PRON[w]) return EN_PRON[w].split(' ');
    var src = w;
    var tokens = [];
    var map = {
      'tion':'SH AH0 N','sion':'ZH AH0 N','ture':'CH ER0','igh':'AY1','air':'EH1 R','ear':'IY1 R',
      'eer':'IY1 R','ire':'AY1 ER','ore':'AO1 R','oo':'UW1','ee':'IY1','ea':'IY1','oa':'OW1',
      'ai':'EY1','ay':'EY1','oi':'OY1','oy':'OY1','ou':'AW1','ow':'AW1','au':'AO1','aw':'AO1',
      'ph':'F','th':'TH','sh':'SH','ch':'CH','ng':'NG','qu':'K W','ck':'K'
    };
    var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
    var i = 0, stressed = false;
    while (i < src.length) {
      var hit = '';
      for (var k = 0; k < keys.length; k++) {
        if (src.slice(i, i + keys[k].length) === keys[k]) { hit = keys[k]; break; }
      }
      if (hit) {
        var parts = map[hit].split(' ');
        parts.forEach(function (p) {
          if (EN_VOWEL.test(p) && !stressed && /1$/.test(p)) stressed = true;
          tokens.push(p);
        });
        i += hit.length; continue;
      }
      var ch = src[i++];
      var single = {
        a:'AE',e:'EH',i:'IH',o:'AA',u:'AH',y:'IY',
        b:'B',c:'K',d:'D',f:'F',g:'G',h:'HH',j:'JH',k:'K',l:'L',m:'M',n:'N',
        p:'P',q:'K',r:'R',s:'S',t:'T',v:'V',w:'W',x:'K S',z:'Z'
      }[ch];
      if (!single) continue;
      if (EN_VOWEL.test(single)) {
        /* Silent final e, except very short words. */
        if (ch === 'e' && i === src.length && src.length > 3) continue;
        tokens.push(single + (stressed ? '0' : '1')); stressed = true;
      } else {
        Array.prototype.push.apply(tokens, single.split(' '));
      }
    }
    return tokens;
  }

  function parseEnglishWord(word) {
    var w = cleanText(word).toLowerCase().replace(/[^a-z']/g, '');
    var tokens = guessEnglishPronunciation(w);
    var vowelIndexes = [];
    var stressed = -1;
    tokens.forEach(function (t, i) {
      if (EN_VOWEL.test(t)) {
        vowelIndexes.push(i);
        if (/[12]$/.test(t)) stressed = i;
      }
    });
    if (stressed < 0 && vowelIndexes.length) stressed = vowelIndexes[vowelIndexes.length - 1];
    var nucleusTokens = stressed >= 0 ? tokens.slice(stressed) : tokens.slice(-2);
    var lastVowel = vowelIndexes.length ? tokens[vowelIndexes[vowelIndexes.length - 1]].replace(/[012]$/, '') : '';
    var coda = vowelIndexes.length ? tokens.slice(vowelIndexes[vowelIndexes.length - 1] + 1).join(' ') : tokens.join(' ');
    return {
      source: word,
      normalized: tokens.map(function (t) { return t.replace(/[012]$/, ''); }).join(' '),
      tokens: tokens,
      syllables: vowelIndexes.length || (w ? 1 : 0),
      vowelSequence: vowelIndexes.map(function (i) { return tokens[i].replace(/[012]$/, ''); }),
      finalVowel: lastVowel,
      finalOnset: '',
      finalCoda: coda,
      nucleus: nucleusTokens.map(function (t) { return t.replace(/[012]$/, ''); }).join(' '),
      ending: nucleusTokens.map(function (t) { return t.replace(/[012]$/, ''); }).join('·'),
      endingKey: nucleusTokens.map(function (t) { return t.replace(/[012]$/, ''); }).join(' '),
      stressIndex: stressed,
      suffix: ''
    };
  }

  function analyzeWord(word, language) {
    var lang = language || detectLanguage(word, 'english');
    if (lang === 'kannada' || (lang === 'bilingual' && /[\u0C80-\u0CFF]/.test(word))) return parseKannadaWord(word);
    return parseEnglishWord(word);
  }

  function vowelSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    var families = [
      ['a','aa','AH','AA','AE'], ['i','ii','IH','IY'], ['u','uu','UH','UW'],
      ['e','ee','EH','EY'], ['o','oo','AO','OW'], ['ai','AY'], ['au','AW'], ['ru','ruu','ER']
    ];
    for (var i = 0; i < families.length; i++) {
      if (families[i].indexOf(a) >= 0 && families[i].indexOf(b) >= 0) return 0.82;
    }
    return 0.12;
  }

  function tokenTailSimilarity(a, b) {
    var aa = String(a || '').split(/[\s-]+/).filter(Boolean);
    var bb = String(b || '').split(/[\s-]+/).filter(Boolean);
    if (!aa.length || !bb.length) return 0;
    var same = 0;
    while (same < aa.length && same < bb.length && aa[aa.length - 1 - same] === bb[bb.length - 1 - same]) same++;
    if (same) return same / Math.max(aa.length, bb.length);
    var la = aa[aa.length - 1], lb = bb[bb.length - 1];
    var voicedPairs = { 't:d':1, 'd:t':1, 'p:b':1, 'b:p':1, 'k:g':1, 'g:k':1, 'S:Z':1, 'T:D':1, 'F:V':1 };
    return voicedPairs[la + ':' + lb] ? 0.45 : 0;
  }

  function kannadaSuffixType(suffix) {
    if (!suffix) return 'Suffix';
    if (/(ಲ್ಲಿ|ದಿಂದ|ಕ್ಕೆ|ಿಗೆ|ಗೆ|ನ್ನು)$/.test(suffix)) return 'Case-ending';
    if (/(ತ್ತೇನೆ|ುತ್ತದೆ|ುತ್ತಾರೆ|ುವೆ|ವೆ|ೇನೆ|ಾನೆ)$/.test(suffix)) return 'Verb-ending';
    if (/(ಿಸಿದ|ಾಡಿದ|ೋಡಿದ|ೇರಿದ|ಿದ|ದ)$/.test(suffix)) return 'Participial';
    return 'Suffix';
  }

  function semanticGroupsFor(word) {
    var w = cleanText(word).toLowerCase();
    return Object.keys(SEMANTIC).filter(function (group) {
      return SEMANTIC[group].some(function (x) { return x.toLowerCase() === w; });
    });
  }
  function semanticSimilarity(a, b) {
    var ag = semanticGroupsFor(a), bg = semanticGroupsFor(b);
    return ag.some(function (x) { return bg.indexOf(x) >= 0; }) ? 1 : 0;
  }

  function compareWords(a, b, opts) {
    opts = opts || {};
    var language = opts.language || detectLanguage(String(a) + ' ' + String(b), 'english');
    var pa = analyzeWord(a, language), pb = analyzeWord(b, language);
    var sameWord = cleanText(a).toLowerCase() === cleanText(b).toLowerCase();
    var vowel = vowelSimilarity(pa.finalVowel, pb.finalVowel);
    var nucleusExact = !!pa.nucleus && pa.nucleus === pb.nucleus;
    var keyExact = !!pa.endingKey && pa.endingKey === pb.endingKey;
    var tail = tokenTailSimilarity(pa.endingKey, pb.endingKey);
    var bothCodasEmpty = !pa.finalCoda && !pb.finalCoda;
    var coda = bothCodasEmpty ? 0 : (pa.finalCoda === pb.finalCoda ? 1 : tokenTailSimilarity(pa.finalCoda, pb.finalCoda));
    var phonetic;
    if (language === 'kannada') {
      var oa = String(pa.finalOnset || '').replace(/(.)\1+/g, '$1');
      var ob = String(pb.finalOnset || '').replace(/(.)\1+/g, '$1');
      var onsetPairs = { 't:d':1, 'd:t':1, 'tt:dd':1, 'dd:tt':1, 'p:b':1, 'b:p':1, 'k:g':1, 'g:k':1 };
      var onset = oa === ob ? 1 : (onsetPairs[oa + ':' + ob] ? 0.58 : 0);
      phonetic = nucleusExact ? 1 : clamp(vowel * 0.54 + onset * 0.28 + coda * 0.10 + tail * 0.08, 0, 1);
    } else if (language === 'bilingual') {
      /* Cross-script rhyme can legitimately meet at the vowel family (ನೀನು / you).
         Keep it near/hybrid, never "perfect", unless the full normalized ending agrees. */
      phonetic = nucleusExact ? 0.92 : clamp(vowel * 0.80 + coda * 0.20, 0, 0.84);
    } else {
      phonetic = nucleusExact ? 1 : clamp(vowel * 0.58 + coda * 0.27 + tail * 0.15, 0, 1);
    }
    var ending = keyExact ? 1 : clamp(tail * 0.68 + coda * 0.20 + vowel * 0.12, 0, 1);
    var suffixMatch = !!(pa.suffix && pb.suffix && pa.suffix === pb.suffix);
    if (suffixMatch) {
      phonetic = Math.max(phonetic, 0.68);
      ending = Math.max(ending, 0.78);
    }
    var syl = 1 - Math.min(Math.abs(pa.syllables - pb.syllables), 4) / 4;
    var rhythm = syl;
    var semantic = semanticSimilarity(a, b);
    var style = opts.style || 'hybrid';
    var weights = Object.assign({}, WEIGHTS);
    if (style === 'perfect') { weights.phonetic += 0.13; weights.semantic = 0.02; }
    if (style === 'semantic') { weights.semantic = 0.30; weights.phonetic = 0.25; }
    if (style === 'rhythmic') { weights.rhythm = 0.27; weights.syllable = 0.18; }
    if (style === 'suffix') { weights.ending = 0.27; weights.phonetic = 0.35; }
    var weightSum = Object.keys(weights).reduce(function (n, k) { return n + weights[k]; }, 0);
    var overall = (
      phonetic * weights.phonetic + ending * weights.ending + vowel * weights.vowel +
      syl * weights.syllable + rhythm * weights.rhythm + semantic * weights.semantic
    ) / weightSum;
    if (sameWord) overall = Math.min(overall, 0.72); /* repetition is not a free perfect rhyme */

    var type = 'Weak';
    var multiExact = pa.syllables > 1 && pb.syllables > 1 && pa.endingKey === pb.endingKey;
    var kannadaVowelFamily = language === 'kannada' && !keyExact &&
      pa.finalVowel === pb.finalVowel && pa.finalOnset === pb.finalOnset;
    if (sameWord) type = 'Identical / repeated';
    else if (suffixMatch && !multiExact) type = kannadaVowelFamily ? 'Vowel-family / ' + kannadaSuffixType(pa.suffix) : kannadaSuffixType(pa.suffix);
    else if (multiExact) type = 'Multisyllabic';
    else if (nucleusExact && (bothCodasEmpty || coda >= 0.8)) type = 'Perfect';
    else if (phonetic >= 0.78 && (bothCodasEmpty || coda >= 0.8)) type = 'Phonetic';
    else if (overall >= 0.50) type = style === 'semantic' && semantic ? 'Semantic' : 'Near / Slant';
    else if (semantic) type = 'Semantic link';

    var subtypes = ['End rhyme'];
    if (sameWord) subtypes.push('Identical');
    if (suffixMatch) subtypes.push(kannadaSuffixType(pa.suffix));
    if (multiExact) subtypes.push('Exact-syllable', 'Multisyllabic');
    if (type === 'Near / Slant') subtypes.push('Near', 'Slant');
    if (phonetic >= 72) subtypes.push('Phonetic');
    if (semantic) subtypes.push('Semantic linking');
    if (language === 'english') {
      subtypes.push('Stress-aware');
      if (nucleusExact) {
        if (pa.syllables === 1 && pb.syllables === 1) subtypes.push('Masculine');
        else subtypes.push('Feminine / multisyllabic');
      }
    }
    if (style === 'rhythmic') subtypes.push('Rhythm rhyme');
    if (style === 'hybrid') subtypes.push('Hybrid');

    return {
      a: a, b: b, language: language,
      phonetic: Math.round(phonetic * 100), ending: Math.round(ending * 100),
      vowel: Math.round(vowel * 100), syllable: Math.round(syl * 100),
      rhythm: Math.round(rhythm * 100), semantic: Math.round(semantic * 100),
      overall: Math.round(overall * 100), type: type, subtypes: subtypes, suffixMatch: suffixMatch,
      exact: nucleusExact && (bothCodasEmpty || coda >= 0.8) && !sameWord, repeated: sameWord,
      first: pa, second: pb
    };
  }

  function countSyllables(text, language) {
    return wordsOf(text).reduce(function (total, word) {
      var lang = /[\u0C80-\u0CFF]/.test(word) ? 'kannada' : (language === 'kannada' ? 'kannada' : 'english');
      return total + analyzeWord(word, lang).syllables;
    }, 0);
  }

  function internalRhyme(text, language, style) {
    var words = wordsOf(text);
    var matches = [];
    var echoes = {};
    words.forEach(function (word, index) {
      var key = cleanText(word).toLowerCase();
      var stop = /^(a|an|and|i|in|is|it|my|of|on|or|our|the|to|we|with|you|your)$/;
      if (!key || (/^[a-z]+$/.test(key) && (key.length < 3 || stop.test(key)))) return;
      if (echoes[key] == null) echoes[key] = index;
      else if (index - echoes[key] > 1) echoes[key] = [echoes[key], index];
    });
    for (var i = 0; i < words.length; i++) {
      for (var j = i + 1; j < words.length; j++) {
        if (cleanText(words[i]).toLowerCase() === cleanText(words[j]).toLowerCase()) continue;
        var c = compareWords(words[i], words[j], { language: language, style: style });
        if (c.overall >= 64) matches.push(c);
      }
    }
    matches.sort(function (a, b) { return b.overall - a.overall; });
    var echoWord = Object.keys(echoes).find(function (key) { return Array.isArray(echoes[key]); });
    if (echoWord) return {
      a: echoWord, b: echoWord, overall: 72, type: 'Echo', internalType: 'Echo',
      matches: matches.slice(0, 3).map(function (match) { return { a: match.a, b: match.b, overall: match.overall, type: match.type }; })
    };
    if (matches.length) {
      var best = matches[0];
      best.matches = matches.slice(0, 4).map(function (match) {
        return { a: match.a, b: match.b, overall: match.overall, type: match.type };
      });
      best.internalType = matches.length > 1 ? 'Double internal' : 'Internal';
      return best;
    }
    return null;
  }

  function resolveScheme(section, mood) {
    var s = String(section || '').toLowerCase();
    var m = String(mood || '').toLowerCase();
    if (/chorus|hook/.test(s)) return (m === 'celebration' || m === 'happy') ? 'AAAA' : 'AABB';
    if (/verse/.test(s)) return (m === 'sad' || m === 'melancholic') ? 'ABCB' : 'ABAB';
    if (/pre/.test(s)) return 'AABA';
    if (/bridge/.test(s)) return 'ABBA';
    if (/intro|outro/.test(s)) return 'AAXA';
    return 'AABB';
  }

  function sectionFromHeading(heading, fallback) {
    var h = String(heading || '').toLowerCase();
    if (/chorus|hook/.test(h)) return 'Chorus/Hook';
    if (/pre/.test(h)) return 'Pre-Chorus';
    if (/bridge/.test(h)) return 'Bridge';
    if (/intro/.test(h)) return 'Intro';
    if (/outro/.test(h)) return 'Outro';
    if (/verse/.test(h)) return 'Verse';
    return fallback || 'Verse';
  }

  function splitSections(text, fallbackSection) {
    var raw = String(text || '').split(/\r?\n/);
    var sections = [];
    var current = { heading: '', section: fallbackSection || 'Verse', lines: [] };
    raw.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      if (/^\[[^\]]+\]$/.test(trimmed)) {
        if (current.lines.length) sections.push(current);
        current = { heading: trimmed, section: sectionFromHeading(trimmed, fallbackSection), lines: [] };
      } else {
        current.lines.push({ text: trimmed, sourceIndex: raw.indexOf(line) });
      }
    });
    if (current.lines.length) sections.push(current);
    return sections;
  }

  function schemeThreshold(style) {
    if (style === 'perfect') return 72;
    if (style === 'near' || style === 'semantic' || style === 'rhythmic') return 46;
    return 53;
  }

  function analyzeLyrics(text, opts) {
    opts = opts || {};
    var language = opts.language || detectLanguage(text, 'english');
    var style = opts.style || 'hybrid';
    var requestedScheme = opts.scheme || 'auto';
    var sections = splitSections(text, opts.section || 'Verse');
    var all = [];
    var comparisons = [];
    var broken = 0, tested = 0;

    sections.forEach(function (section, sectionIndex) {
      var scheme = requestedScheme === 'auto' ? resolveScheme(section.section, opts.mood) : requestedScheme;
      var pattern = (SCHEMES[scheme] || SCHEMES.AABB).pattern;
      var anchors = {};
      var syllables = section.lines.map(function (ln) { return countSyllables(ln.text, language); });
      var sorted = syllables.slice().sort(function (a, b) { return a - b; });
      var median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

      section.lines.forEach(function (raw, i) {
        var label = pattern[i % pattern.length] || 'X';
        var endingWord = lastWord(raw.text);
        var endingLang = /[\u0C80-\u0CFF]/.test(endingWord) ? 'kannada' : 'english';
        var phon = analyzeWord(endingWord, endingLang);
        var target = label !== 'X' ? anchors[label] : null;
        var comparison = target ? compareWords(target.endingWord, endingWord, { language: detectLanguage(target.endingWord + ' ' + endingWord, language), style: style }) : null;
        if (label !== 'X' && !anchors[label]) anchors[label] = { endingWord: endingWord, index: all.length };
        var internal = internalRhyme(raw.text, language, style);
        var rhythm = median ? Math.round(clamp(1 - Math.abs(syllables[i] - median) / Math.max(median, 4), 0, 1) * 100) : 0;
        var warnings = [];
        if (comparison) {
          tested++;
          if (comparison.overall < schemeThreshold(style)) {
            warnings.push('Expected ' + label + ' rhyme is weak'); broken++;
          }
          if (comparison.repeated) warnings.push('Repeated rhyme word');
        }
        if (syllables[i] > 18) warnings.push('Long line — may be harder to sing');
        if (syllables[i] && syllables[i] < 3) warnings.push('Very short line');
        var item = {
          index: all.length,
          sectionIndex: sectionIndex,
          lineIndex: i,
          section: section.section,
          heading: section.heading,
          text: raw.text,
          rhymeLabel: label,
          expectedLabel: label,
          rhymeType: comparison ? comparison.type : (label === 'X' ? 'Open line' : 'Rhyme anchor'),
          rhymeSubtypes: comparison ? comparison.subtypes.slice() : [],
          rhymeTarget: target ? target.endingWord : '',
          endingWord: endingWord,
          phoneticEnding: phon.ending || phon.normalized,
          syllableCount: syllables[i],
          rhythmScore: rhythm,
          semanticScore: 0,
          rhymeScore: comparison ? comparison.overall : null,
          comparison: comparison,
          internalRhyme: internal,
          warnings: warnings,
          scheme: scheme
        };
        if (internal && (style === 'internal' || internal.overall >= 78)) {
          item.rhymeType += ' + ' + (internal.internalType || 'Internal');
        }
        if (comparison) comparisons.push(comparison);
        all.push(item);
      });
    });

    var contentGroups = {};
    var totalWords = 0, repeatedWords = 0;
    var frequencies = {};
    all.forEach(function (line) {
      var groups = {};
      wordsOf(line.text).forEach(function (w) {
        totalWords++;
        var key = cleanText(w).toLowerCase();
        frequencies[key] = (frequencies[key] || 0) + 1;
        semanticGroupsFor(w).forEach(function (g) { groups[g] = true; contentGroups[g] = (contentGroups[g] || 0) + 1; });
      });
      var linked = Object.keys(groups).reduce(function (n, g) { return n + (contentGroups[g] || 0); }, 0);
      line.semanticScore = Math.round(clamp(62 + Object.keys(groups).length * 7 + Math.min(linked, 12), 0, 96));
    });
    Object.keys(frequencies).forEach(function (w) {
      if (w.length > 2 && frequencies[w] > Math.max(2, all.length / 3)) repeatedWords += frequencies[w] - 1;
    });

    var rhymeAvg = comparisons.length ? Math.round(comparisons.reduce(function (n, c) { return n + c.overall; }, 0) / comparisons.length) : 0;
    var syllableValues = all.map(function (x) { return x.syllableCount; }).filter(Boolean);
    var syllableAvg = syllableValues.length ? syllableValues.reduce(function (a, b) { return a + b; }, 0) / syllableValues.length : 0;
    var variance = syllableValues.length ? syllableValues.reduce(function (n, v) { return n + Math.pow(v - syllableAvg, 2); }, 0) / syllableValues.length : 0;
    var syllableConsistency = Math.round(clamp(100 - Math.sqrt(variance) * 13, 0, 100));
    var rhythmAvg = all.length ? Math.round(all.reduce(function (n, x) { return n + x.rhythmScore; }, 0) / all.length) : 0;
    var semanticAvg = all.length ? Math.round(all.reduce(function (n, x) { return n + x.semanticScore; }, 0) / all.length) : 0;
    var natural = Math.round(clamp(91 - broken * 5 - repeatedWords * 3 - all.filter(function (x) { return x.syllableCount > 18 || x.syllableCount < 3; }).length * 5, 30, 96));
    var forced = all.filter(function (x) {
      return x.comparison && x.comparison.suffixMatch && x.comparison.phonetic < 72 && x.semanticScore < 70;
    }).length;
    var hookLines = all.filter(function (x) { return /chorus|hook/i.test(x.section); });
    var hookStrength = hookLines.length ? Math.round(clamp(
      hookLines.reduce(function (n, x) { return n + x.rhythmScore; }, 0) / hookLines.length * 0.45 +
      (rhymeAvg || 60) * 0.35 + Math.min(repeatedWords, 2) * 10, 0, 100
    )) : null;

    return {
      language: language,
      requestedScheme: requestedScheme,
      style: style,
      sections: sections,
      lines: all,
      comparisons: comparisons,
      quality: {
        rhymeConsistency: tested ? Math.round((tested - broken) / tested * 100) : (all.length ? 70 : 0),
        rhymeAverage: rhymeAvg,
        syllableConsistency: syllableConsistency,
        rhythmConsistency: rhythmAvg,
        naturalLanguage: natural,
        semanticCoherence: semanticAvg,
        repetitionCount: repeatedWords,
        forcedRhymeCount: forced,
        schemeBreaks: broken,
        hookStrength: hookStrength
      }
    };
  }

  function labelForScore(score) {
    if (score >= 86) return 'Excellent';
    if (score >= 72) return 'Good';
    return 'Needs refinement';
  }

  function cleanIdea(idea, language) {
    var s = cleanText(idea).replace(/[\r\n]+/g, ' ');
    if (!s) return '';
    var words = wordsOf(s);
    /* Keep a complete short story detail or name phrase whenever practical.
       Long briefs become a singable first-clause seed rather than disappearing. */
    var picked = words.slice(0, 16).join(' ');
    return picked.length > 120 ? picked.slice(0, 120).trim() : picked;
  }

  function headingFor(section, custom) {
    if (section === 'Custom') return '[' + (cleanText(custom) || 'Section') + ']';
    if (section === 'Chorus/Hook') return '[Chorus / Hook]';
    return '[' + (section || 'Verse') + ']';
  }

  function familyLines(language, familyIndex, opts) {
    var banks;
    if (opts.syllables === 'short') {
      banks = language === 'kannada' ? K_SHORT_FAMILIES : EN_SHORT_FAMILIES;
    } else {
      var moodKey = String(opts.mood || '').toLowerCase();
      var moodBanks = language === 'kannada' ? K_MOOD_FAMILIES : EN_MOOD_FAMILIES;
      banks = moodBanks[moodKey] || (language === 'kannada' ? K_FAMILIES : EN_FAMILIES);
    }
    return banks[familyIndex % banks.length];
  }

  function lengthenLine(line, language, preference) {
    if (preference !== 'long') return line;
    return language === 'kannada' ? 'ಈ ದೀರ್ಘ ಪಯಣದಲ್ಲಿ ' + line : 'Across the distance we have travelled, ' + line.charAt(0).toLowerCase() + line.slice(1);
  }

  function applyRegister(line, language, opts, lineIndex) {
    var out = line;
    if (opts.vocabulary === 'simple') {
      out = out.replace(/ಹೊಂಗನಸು/g, 'ಕನಸು').replace(/restless/gi, 'open').replace(/distance/gi, 'road');
    }
    if (opts.vocabulary === 'poetic' && lineIndex === 2) {
      out = language === 'kannada' ? 'ಚಂದ್ರನ ನೆರಳಿನಲ್ಲಿ ' + out : 'Beneath the patient moon, ' + out.charAt(0).toLowerCase() + out.slice(1);
    }
    if (opts.vocabulary === 'literary' && lineIndex === 2) {
      out = language === 'kannada' ? 'ಕಾಲದ ಕಾವ್ಯದಲ್ಲಿ ' + out : 'Within the verse of time, ' + out.charAt(0).toLowerCase() + out.slice(1);
    }
    if (opts.filmMode && language === 'kannada' && lineIndex === 1) {
      out = 'ಬೆಳ್ಳಿತೆರೆಯ ಬೆಳಕಿನಲ್ಲಿ ' + out;
    }
    return out;
  }

  function injectIdea(line, idea, language, lineIndex, section) {
    var theme = cleanIdea(idea, language);
    if (!theme || lineIndex !== 0) return line;
    if (language === 'kannada') {
      if (section === 'Chorus/Hook' && wordsOf(theme).length <= 4) return theme + ' — ' + line;
      return theme + ', ' + line;
    }
    var lead = theme.charAt(0).toUpperCase() + theme.slice(1);
    return lead + ' — ' + line.charAt(0).toLowerCase() + line.slice(1);
  }

  function generateStanza(opts, section, chosenScheme, stanzaIndex) {
    var language = opts.language || 'kannada';
    var scheme = chosenScheme === 'auto' ? resolveScheme(section, opts.mood) : chosenScheme;
    var pattern = (SCHEMES[scheme] || SCHEMES.AABB).pattern;
    var familyFor = {};
    var familyUse = {};
    var nextFamily = (stanzaIndex || 0) % 5;
    var labels = pattern.split('').filter(function (x) { return x !== 'X'; });
    var uniqueLabels = labels.filter(function (x, i, a) { return a.indexOf(x) === i; });
    uniqueLabels.forEach(function (label) { familyFor[label] = nextFamily++ % 5; });
    var lines = [];

    for (var i = 0; i < pattern.length; i++) {
      var label = pattern[i];
      if (label === 'X') {
        var freeLang = language === 'bilingual' ? (i % 2 ? 'english' : 'kannada') : language;
        var free = freeLang === 'kannada' ? (MOOD_FREE_K[opts.mood] || MOOD_FREE_K.Custom) : (MOOD_FREE_E[opts.mood] || MOOD_FREE_E.Custom);
        lines.push(injectIdea(free, opts.idea, freeLang, i, section));
        continue;
      }
      var lineLang = language;
      if (language === 'bilingual') {
        if (uniqueLabels.length > 1) lineLang = uniqueLabels.indexOf(label) % 2 ? 'english' : 'kannada';
        else lineLang = i % 2 ? 'english' : 'kannada';
      }
      var familyIndex = familyFor[label];
      /* A one-family bilingual hook uses Kannada -u and English /uw/ endings. */
      if (language === 'bilingual' && uniqueLabels.length === 1) familyIndex = lineLang === 'kannada' ? 3 : 0;
      var useKey = label + ':' + lineLang;
      var use = familyUse[useKey] || 0;
      familyUse[useKey] = use + 1;
      var bank = (language === 'bilingual' && uniqueLabels.length === 1 && lineLang === 'english')
        ? EN_BILINGUAL_U : familyLines(lineLang, familyIndex, opts);
      var line = lengthenLine(bank[use % bank.length], lineLang, opts.syllables);
      line = applyRegister(line, lineLang, opts, i);
      lines.push(injectIdea(line, opts.idea, lineLang, i, section));
    }
    return { heading: headingFor(section, opts.customSection), section: section, scheme: scheme, lines: lines };
  }

  function generateLyrics(opts) {
    opts = Object.assign({
      language: 'kannada', mood: 'Romantic', section: 'Chorus/Hook', scheme: 'auto',
      style: 'hybrid', idea: '', filmMode: false
    }, opts || {});
    var sections;
    if (opts.section === 'Full Song') {
      sections = ['Verse', 'Pre-Chorus', 'Chorus/Hook', 'Bridge'].map(function (section, i) {
        return generateStanza(opts, section, opts.scheme, i);
      });
    } else {
      sections = [generateStanza(opts, opts.section || 'Verse', opts.scheme, 0)];
    }
    var text = sections.map(function (s) { return s.heading + '\n' + s.lines.join('\n'); }).join('\n\n');
    return {
      text: text,
      language: opts.language,
      mood: opts.mood,
      section: opts.section,
      scheme: opts.scheme,
      style: opts.style,
      sections: sections,
      principles: ['Meaning', 'Emotion', 'Natural language', 'Rhythm', 'Rhyme']
    };
  }

  function suggestRhymes(word, opts) {
    opts = opts || {};
    var language = opts.language || detectLanguage(word, 'english');
    if (language === 'bilingual') language = /[\u0C80-\u0CFF]/.test(word) ? 'kannada' : 'english';
    var lexicon = language === 'kannada' ? K_LEXICON : EN_LEXICON;
    var sound = [], near = [], semantic = [];
    lexicon.forEach(function (candidate) {
      if (cleanText(candidate).toLowerCase() === cleanText(word).toLowerCase()) return;
      var c = compareWords(word, candidate, { language: language, style: opts.style || 'hybrid' });
      var item = { word: candidate, score: c.overall, phonetic: c.phonetic, rhythm: c.rhythm, type: c.type };
      if (c.phonetic >= 90 && c.overall >= 72) sound.push(item);
      else if (c.overall >= 48) near.push(item);
      if (semanticSimilarity(word, candidate) && c.phonetic < 72) semantic.push({ word: candidate, score: 100, type: 'Semantic' });
    });
    function top(arr, n) {
      var seen = {};
      return arr.sort(function (a, b) { return b.score - a.score; }).filter(function (x) {
        if (seen[x.word]) return false; seen[x.word] = true; return true;
      }).slice(0, n || 6);
    }
    return { selected: word, language: language, strong: top(sound), near: top(near), semantic: top(semantic) };
  }

  function replaceWord(line, oldWord, newWord) {
    var idx = line.lastIndexOf(oldWord);
    if (idx < 0) return line;
    return line.slice(0, idx) + newWord + line.slice(idx + oldWord.length);
  }

  function refineLine(line, action, context) {
    context = context || {};
    var language = context.language || detectLanguage(line, 'english');
    var ending = lastWord(line);
    var target = context.targetWord || ending;
    var alternatives = [];
    var suggestions = suggestRhymes(target, { language: language, style: context.style });
    var candidates = suggestions.strong.concat(suggestions.near).slice(0, 3);

    if (action === 'improve-rhyme' || action === 'keep-meaning-change-rhyme') {
      candidates.forEach(function (c) {
        alternatives.push({ text: replaceWord(line, ending, c.word), reason: c.type === 'Perfect' ? 'Phonetic' : c.type, detail: c.score + '% rhyme fit' });
      });
    } else if (action === 'natural' || action === 'simplify-kannada') {
      var natural = cleanText(line)
        .replace(/ತದನಂತರ/g, 'ನಂತರ').replace(/ಹೇತುವಿನಿಂದ/g, 'ಯಾಕೆಂದರೆ')
        .replace(/ಎಂಬುದನು/g, 'ಎಂದು').replace(/ಮನದಾಳದೊಳಗೆ/g, 'ಮನದೊಳಗೆ')
        .replace(/\bvery very\b/gi, 'truly').replace(/\bin order to\b/gi, 'to');
      alternatives.push({ text: natural, reason: 'Natural', detail: 'Simpler spoken phrasing' });
      alternatives.push({ text: language === 'kannada' ? 'ಸರಳವಾಗಿ ಹೇಳಲಿ — ' + natural : 'Let me say it plainly — ' + natural, reason: 'Conversational', detail: 'Keeps the thought direct' });
    } else if (action === 'cinematic') {
      alternatives.push({ text: language === 'kannada' ? 'ಆಕಾಶದ ಅಂಚಿನಲ್ಲಿ ' + line : 'Against the open skyline, ' + line.charAt(0).toLowerCase() + line.slice(1), reason: 'Cinematic', detail: 'Adds one visual frame' });
      alternatives.push({ text: language === 'kannada' ? 'ಮಳೆಯ ಬೆಳಕಿನಲ್ಲಿ ' + line : 'Under the silver rain, ' + line.charAt(0).toLowerCase() + line.slice(1), reason: 'Imagery', detail: 'Uses a singable image' });
    } else if (action === 'poetic') {
      alternatives.push({ text: language === 'kannada' ? 'ಮೌನದ ರಾಗವಾಗಿ ' + line : 'Like an echo in the blue, ' + line.charAt(0).toLowerCase() + line.slice(1), reason: 'Poetic', detail: 'Adds a metaphor without changing the ending' });
    } else if (action === 'emotion') {
      alternatives.push({ text: language === 'kannada' ? 'ನಿಜವಾಗಿ, ' + line : 'I mean it with my whole heart — ' + line, reason: 'Emotion', detail: 'Raises emotional directness' });
      alternatives.push({ text: language === 'kannada' ? 'ಒಮ್ಮೆ ನನ್ನ ಮಾತು ಕೇಳು — ' + line : 'Stay and hear me once — ' + line, reason: 'Intimate', detail: 'Makes the address personal' });
    } else if (action === 'rhythm') {
      var compact = line.replace(/\s*[—–-]\s*/g, ' ').replace(/\b(really|just|very)\b\s*/gi, '').replace(/\s+/g, ' ').trim();
      alternatives.push({ text: compact, reason: 'Rhythm', detail: countSyllables(compact, language) + ' syllables' });
      candidates.slice(0, 2).forEach(function (c) {
        var changed = replaceWord(compact, ending, c.word);
        alternatives.push({ text: changed, reason: 'Hybrid', detail: countSyllables(changed, language) + ' syllables · rhyme-aware' });
      });
    } else if (action === 'keep-rhyme-improve-meaning') {
      alternatives.push({ text: language === 'kannada' ? 'ನಿನ್ನ ನೆನಪನ್ನು ಹೊತ್ತು ' + ending : 'I carry what we promised into ' + ending, reason: 'Semantic', detail: 'Keeps the rhyme word exactly' });
      alternatives.push({ text: language === 'kannada' ? 'ನಮ್ಮ ಕಥೆಗೆ ಅರ್ಥವಾದ ' + ending : 'The truth beneath our story is ' + ending, reason: 'Meaning', detail: 'Keeps the ending, clarifies the idea' });
    } else if (action === 'hook') {
      var key = cleanIdea(context.idea, language) || (wordsOf(line)[0] || ending);
      alternatives.push({ text: key + ', ' + key + ' — ' + line, reason: 'Hook', detail: 'Strategic phrase return' });
      alternatives.push({ text: line + ' — ' + key, reason: 'Echo', detail: 'Short echo at the line ending' });
    }
    if (!alternatives.length) alternatives.push({ text: line, reason: 'Keep', detail: 'The natural line is stronger than a forced rewrite' });
    var unique = {};
    return alternatives.filter(function (x) {
      if (!x.text || unique[x.text]) return false; unique[x.text] = true; return true;
    }).slice(0, 4);
  }

  var API = {
    SCHEMES: SCHEMES,
    WEIGHTS: WEIGHTS,
    cleanText: cleanText,
    detectLanguage: detectLanguage,
    wordsOf: wordsOf,
    lastWord: lastWord,
    parseKannadaWord: parseKannadaWord,
    parseEnglishWord: parseEnglishWord,
    analyzeWord: analyzeWord,
    compareWords: compareWords,
    countSyllables: countSyllables,
    resolveScheme: resolveScheme,
    analyzeLyrics: analyzeLyrics,
    labelForScore: labelForScore,
    generateLyrics: generateLyrics,
    suggestRhymes: suggestRhymes,
    refineLine: refineLine,
    replaceWord: replaceWord
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.LYRICS_ENGINE = API;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
