/**
 * lyrics-prompt.js — pure songwriting-prompt builder for Lyrics Lab.
 * No lyric generation, scoring or analysis happens in Raaga Studio.
 */
'use strict';

(function (root) {
  var SCHEMES = {
    auto: {
      pattern: 'AUTO',
      en: 'Let the writing AI choose a natural scheme for the section and mood.',
      kn: 'ಭಾವ ಮತ್ತು ಹಾಡಿನ ಭಾಗಕ್ಕೆ ಹೊಂದುವ ಸಹಜ ಪ್ರಾಸ ವಿನ್ಯಾಸವನ್ನು ಬರವಣಿಗೆ AI ಆಯ್ಕೆ ಮಾಡಲಿ.'
    },
    AAAA: {
      pattern: 'AAAA',
      en: 'All four lines return to one rhyme family.',
      kn: 'ನಾಲ್ಕೂ ಸಾಲುಗಳು ಒಂದೇ ಪ್ರಾಸ ಕುಟುಂಬಕ್ಕೆ ಮರಳುತ್ತವೆ.'
    },
    AABB: {
      pattern: 'AABB',
      en: 'Lines 1–2 share one rhyme family; lines 3–4 share another.',
      kn: '1–2ನೇ ಸಾಲುಗಳಿಗೆ ಒಂದು ಪ್ರಾಸ; 3–4ನೇ ಸಾಲುಗಳಿಗೆ ಮತ್ತೊಂದು ಪ್ರಾಸ.'
    },
    ABAB: {
      pattern: 'ABAB',
      en: 'Alternating rhyme families keep the writing moving.',
      kn: 'ಎರಡು ಪ್ರಾಸ ಕುಟುಂಬಗಳು ಒಂದರ ನಂತರ ಒಂದಾಗಿ ಪರ್ಯಾಯವಾಗಿ ಬರುತ್ತವೆ.'
    },
    ABBA: {
      pattern: 'ABBA',
      en: 'The outside lines rhyme and the middle pair rhyme.',
      kn: 'ಹೊರಗಿನ ಎರಡು ಸಾಲುಗಳು ಒಂದೇ ಪ್ರಾಸ; ಮಧ್ಯದ ಜೋಡಿಗೆ ಮತ್ತೊಂದು ಪ್ರಾಸ.'
    },
    ABCB: {
      pattern: 'ABCB',
      en: 'Only lines 2 and 4 resolve together; useful for storytelling.',
      kn: '2 ಮತ್ತು 4ನೇ ಸಾಲುಗಳು ಮಾತ್ರ ಪ್ರಾಸವಾಗುತ್ತವೆ; ಕಥನಕ್ಕೆ ಸೂಕ್ತ.'
    },
    AABA: {
      pattern: 'AABA',
      en: 'Three returns to A with a contrasting third line.',
      kn: 'ಮೂರು ಸಾಲುಗಳು A ಪ್ರಾಸಕ್ಕೆ ಮರಳುತ್ತವೆ; 3ನೇ ಸಾಲು ವಿಭಿನ್ನ.'
    },
    AAAB: {
      pattern: 'AAAB',
      en: 'Three repeated rhymes lead to a contrasting last line.',
      kn: 'ಮೊದಲ ಮೂರು ಸಾಲು ಒಂದೇ ಪ್ರಾಸ; ಕೊನೆಯ ಸಾಲು ವಿಭಿನ್ನ.'
    },
    ABAC: {
      pattern: 'ABAC',
      en: 'Line 3 returns to A while lines 2 and 4 remain different.',
      kn: '3ನೇ ಸಾಲು A ಪ್ರಾಸಕ್ಕೆ ಮರಳುತ್ತದೆ; 2 ಮತ್ತು 4 ವಿಭಿನ್ನವಾಗಿರುತ್ತವೆ.'
    },
    AABC: {
      pattern: 'AABC',
      en: 'An opening rhyming pair is followed by two freer lines.',
      kn: 'ಮೊದಲ ಎರಡು ಸಾಲು ಪ್ರಾಸವಾಗುತ್ತವೆ; ನಂತರದ ಎರಡು ಸಾಲುಗಳು ಮುಕ್ತ.'
    },
    AAXA: {
      pattern: 'AAXA',
      en: 'One intentionally free line sits inside a strong repeated family.',
      kn: 'ಒಂದೇ ಪ್ರಾಸ ಕುಟುಂಬದ ನಡುವೆ ಒಂದು ಸಾಲನ್ನು ಉದ್ದೇಶಪೂರ್ವಕವಾಗಿ ಮುಕ್ತವಾಗಿ ಬಿಡಲಾಗುತ್ತದೆ.'
    }
  };

  var STYLE_INSTRUCTIONS = {
    perfect: 'Use perfect rhyme only where pronunciation genuinely matches. Never treat similar spelling as proof of rhyme.',
    near: 'Prefer natural near or slant rhymes. A close musical relationship is acceptable when an exact rhyme would sound forced.',
    internal: 'Use occasional internal rhyme inside lines, without overcrowding every phrase.',
    multisyllabic: 'Use multisyllabic rhyme where two or more ending syllables can match naturally.',
    phonetic: 'Judge rhyme by spoken pronunciation rather than visible spelling or Unicode endings.',
    suffix: 'Use Kannada-friendly suffix and grammatical-ending rhyme carefully. Shared suffixes must still sound musical and must not create awkward grammar.',
    semantic: 'Use semantic linking: connect images and emotions even when the words do not technically rhyme.',
    rhythmic: 'Prioritize matching rhythmic movement and singable syllable flow over exact ending sounds.',
    hybrid: 'Use Hybrid rhyme: balance pronunciation, rhythm, syllable flow and meaning instead of forcing identical endings.'
  };

  var SECTION_INSTRUCTIONS = {
    'Full Song': 'Write a complete song. Choose a natural song structure that suits the idea, mood and emotional arc; do not force a standard Verse–Chorus template.',
    'Verse': 'Write a verse that develops the story. Meaning and progression matter more than making every line rhyme.',
    'Pre-Chorus': 'Write a pre-chorus that raises emotional or rhythmic tension and leads naturally toward a chorus.',
    'Chorus/Hook': 'Write a memorable chorus or hook. Prefer concise, singable lines and strategic repetition of one strong phrase.',
    'Bridge': 'Write a bridge that introduces a fresh perspective or emotional turn without losing the song’s central idea.',
    'Intro': 'Write a concise lyrical intro that establishes the world or central image of the song.',
    'Outro': 'Write an outro that gives the song a satisfying emotional resolution or memorable final echo.'
  };

  var LANGUAGE_LABELS = {
    kannada: 'Kannada', english: 'English', bilingual: 'Kannada + English bilingual'
  };
  var STYLE_LABELS = {
    perfect: 'Perfect', near: 'Near / Loose', internal: 'Internal', multisyllabic: 'Multisyllabic',
    phonetic: 'Phonetic', suffix: 'Suffix / Kannada', semantic: 'Semantic', rhythmic: 'Rhythmic', hybrid: 'Hybrid'
  };
  var SYLLABLE_LABELS = {
    auto: 'Natural; no fixed syllable target', short: 'Short and singable, roughly 4–7 syllables per line',
    medium: 'Medium, roughly 8–11 syllables per line', long: 'Long and flowing, roughly 12–16 syllables per line'
  };
  var VOCAB_LABELS = {
    spoken: 'Natural spoken language', simple: 'Simple and direct', poetic: 'Poetic imagery', literary: 'Literary vocabulary'
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim();
  }

  function resolveSection(options) {
    if (options.section === 'Custom') return clean(options.customSection) || 'Custom section';
    return options.section || 'Chorus/Hook';
  }

  function resolveMood(options) {
    if (options.mood === 'Custom') return clean(options.customMood) || 'Custom emotional direction';
    return options.mood || 'Romantic';
  }

  function roleFor(options) {
    if (options.language === 'kannada') {
      return options.filmMode
        ? 'Act as an experienced Kannada film-song lyricist who writes natural, contemporary and singable Kannada.'
        : 'Act as an experienced Kannada songwriter who writes natural, contemporary and singable Kannada.';
    }
    if (options.language === 'bilingual') {
      return options.filmMode
        ? 'Act as an experienced Kannada film-song lyricist who can blend Kannada and English naturally.'
        : 'Act as an experienced bilingual Kannada-English songwriter.';
    }
    return 'Act as an experienced English songwriter who values natural, singable language.';
  }

  function languageRules(language) {
    if (language === 'kannada') return [
      'Write the lyrics in Kannada script.',
      'Use natural spoken Kannada and correct Kannada grammar.',
      'Judge rhyme by spoken akshara sound—not merely by matching Unicode letters.',
      'Avoid overly literary, archaic or unnatural words unless the vocabulary direction explicitly requests them.'
    ];
    if (language === 'bilingual') return [
      'Blend Kannada and English only where the switch sounds intentional and musical.',
      'Write Kannada words in Kannada script and English words in Latin script.',
      'Do not translate every Kannada line into English or repeat the same meaning mechanically.',
      'Keep grammar natural in both languages.'
    ];
    return [
      'Write the lyrics in natural English.',
      'Judge rhyme by pronunciation and stress—not by spelling.',
      'Avoid filler phrases added only to complete a rhyme.'
    ];
  }

  function sectionInstruction(section) {
    if (SECTION_INSTRUCTIONS[section]) return SECTION_INSTRUCTIONS[section];
    return 'Write the requested “' + section + '” section and make its purpose clear within the song.';
  }

  function schemeInstruction(scheme, section, mood) {
    if (scheme === 'auto' || !SCHEMES[scheme]) {
      return [
        'Rhyme scheme: Auto / choose naturally.',
        'Choose a rhyme scheme appropriate to this ' + section + ' and its ' + mood + ' mood. Do not force a fixed pattern when a freer line would protect the meaning.'
      ];
    }
    return [
      'Rhyme scheme: ' + scheme + '.',
      SCHEMES[scheme].en
    ];
  }

  function buildPrompt(input) {
    var options = Object.assign({
      language: 'kannada', idea: '', mood: 'Romantic', customMood: '', section: 'Chorus/Hook',
      customSection: '', scheme: 'auto', style: 'hybrid', syllables: 'auto', vocabulary: 'spoken',
      keyPhrases: '', filmMode: false
    }, input || {});

    var idea = clean(options.idea);
    if (!idea) throw new Error('A song idea, emotion or story is required.');
    var section = resolveSection(options);
    var mood = resolveMood(options);
    var language = LANGUAGE_LABELS[options.language] || LANGUAGE_LABELS.kannada;
    var style = STYLE_LABELS[options.style] || STYLE_LABELS.hybrid;
    var schemeLines = schemeInstruction(options.scheme, section, mood);
    var lines = [];

    lines.push(roleFor(options), '');
    lines.push('Write ' + (section === 'Full Song' ? 'a complete song' : 'a ' + section) + ' using the following creative direction.', '');
    lines.push('SONG DIRECTION');
    lines.push('Language: ' + language);
    lines.push('Idea / story: ' + idea);
    lines.push('Mood: ' + mood);
    lines.push('Song section: ' + section);
    lines.push(schemeLines[0]);
    lines.push('Rhyme style: ' + style + '.');
    lines.push('Vocabulary: ' + (VOCAB_LABELS[options.vocabulary] || VOCAB_LABELS.spoken) + '.');
    lines.push('Line length: ' + (SYLLABLE_LABELS[options.syllables] || SYLLABLE_LABELS.auto) + '.');
    if (clean(options.keyPhrases)) lines.push('Names, details and key phrases to preserve exactly: ' + clean(options.keyPhrases));
    if (options.filmMode) lines.push('Mode: Kannada Film Song—cinematic, emotionally immediate and designed to be sung.');

    lines.push('', 'SECTION DIRECTION');
    lines.push(sectionInstruction(section));

    lines.push('', 'RHYME DIRECTION');
    lines.push(schemeLines[1]);
    lines.push(STYLE_INSTRUCTIONS[options.style] || STYLE_INSTRUCTIONS.hybrid);
    lines.push('A strong natural line with a near, semantic or rhythmic relationship is better than an awkward exact rhyme.');

    lines.push('', 'LANGUAGE DIRECTION');
    languageRules(options.language).forEach(function (rule) { lines.push('- ' + rule); });

    if (options.filmMode) {
      lines.push('- Prefer vivid but understandable cinematic images.');
      lines.push('- Use repetition strategically when it strengthens a hook.');
      lines.push('- Keep the syllable movement comfortable for singing.');
    }

    lines.push('', 'WRITING PRIORITIES');
    lines.push('Follow this order: Meaning → Emotion → Natural language → Rhythm → Rhyme.');
    lines.push('- Keep the emotional tone consistent.');
    lines.push('- Preserve all supplied names, events, places and key phrases.');
    lines.push('- Do not distort grammar or sentence order merely to obtain a rhyme.');
    lines.push('- Do not repeat the same rhyme word unnecessarily.');
    lines.push('- Do not use an archaic word solely because it rhymes.');
    lines.push('- If the requested scheme harms the lyric, make the smallest natural deviation and mention it in the rhyme notes.');

    lines.push('', 'OUTPUT');
    lines.push('1. Return the finished lyrics with clear section headings.');
    lines.push('2. After the lyrics, add a short “Rhyme Notes / ಪ್ರಾಸದ ಟಿಪ್ಪಣಿ” section.');
    lines.push('3. Briefly identify the actual rhyme scheme, principal ending families and any intentional loose rhyme.');
    lines.push('4. Keep the notes short and practical.');
    lines.push('5. Do not provide numerical rhyme scores or claim scientific certainty.');

    return lines.join('\n');
  }

  var API = {
    SCHEMES: SCHEMES,
    STYLE_INSTRUCTIONS: STYLE_INSTRUCTIONS,
    SECTION_INSTRUCTIONS: SECTION_INSTRUCTIONS,
    buildPrompt: buildPrompt,
    resolveSection: resolveSection,
    resolveMood: resolveMood
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.LYRICS_PROMPT = API;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
