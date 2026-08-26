/**
 * suno-cheats.js — "Suno Cheat Codes & Meta Tags" reference for Raaga Studio.
 *
 * A searchable, filterable vocabulary for Suno Custom Mode: section tags for
 * the Lyrics field, descriptive words for the Style of Music field, negative
 * wording for the Exclude field, and formatting conventions.
 *
 * Honesty rule: Suno does not publish an exhaustive official tag list, so every
 * item carries a `kind` that says where it belongs (lyrics / style / exclude /
 * meta) and the UI explains that most words influence output probabilistically
 * rather than guaranteeing behaviour.
 */
'use strict';

(function () {
  // ─── Kind badges ─────────────────────────────────────────────────────────
  var KIND = {
    lyrics: {
      label: 'Lyrics tag', cls: 'sc-kind-lyrics',
      hint: 'Bracket marker placed in the Lyrics field — Suno\u2019s documented section format.'
    },
    style: {
      label: 'Style text', cls: 'sc-kind-style',
      hint: 'Descriptive phrase for the Style of Music field — a steering word, not a switch.'
    },
    exclude: {
      label: 'Exclude', cls: 'sc-kind-exclude',
      hint: 'Negative wording — used in Advanced Options \u2192 Exclude, or phrased as \u201cno \u2026\u201d in style text.'
    },
    meta: {
      label: 'Formatting', cls: 'sc-kind-meta',
      hint: 'Convention about how to write the fields — good practice, not a magic tag.'
    }
  };

  var NOTATION = {
    bracket: { label: '[ ]', name: 'Square brackets', hint: 'Best for structural and performance metadata.' },
    paren: { label: '( )', name: 'Parentheses', hint: 'Vocalised / ad-lib material.' },
    brace: { label: '{ }', name: 'Curly braces', hint: 'Experimental instruction notation.' },
    angle: { label: '< >', name: 'Angle brackets', hint: 'Experimental / less reliable notation.' },
    plain: { label: 'plain', name: 'Plain text', hint: 'Style, exclude or formatting language with no special brackets.' }
  };

  var TOC_GROUPS = [
    { id: 'lyrics', label: 'Lyrics tags' },
    { id: 'style', label: 'Style of Music' },
    { id: 'exclude', label: 'Exclude & formatting' }
  ];

  var PAD_SKELETONS = {
    pop: '[Intro]\n(instrumental)\n\n[Verse 1]\n\n\n[Pre-Chorus]\n(rising)\n\n[Chorus]\n\n\n[Verse 2]\n\n\n[Chorus]\n\n\n[Bridge]\n\n\n[Chorus]\n\n\n[Outro]\n(fade out)',
    carnatic: '[Raga Intro]\n[Tanpura Drone]\n\n[Alapana]\n(free tempo)\n\n[Verse 1]\n[Gamaka]\n\n\n[Chorus]\n\n\n[Swara Passage]\nsa ri ga ma pa\n\n[Tani Avartanam]\n(mridangam)\n\n[Outro]\n(tanpura fades)',
    edm: '[Intro]\n[Synth Intro]\n\n[Verse 1]\n\n\n[Build]\n[Riser]\n\n[Drop]\n(instrumental)\n\n[Breakdown]\n\n\n[Build]\n\n[Drop]\n\n[Outro]\n[Fade Out]'
  };

  var LS_PAD = 'raaga.sunoCheatsPad';

  // ─── Reference data ───────────────────────────────────────────────────────
  // kind: lyrics | style | exclude | meta   (see KIND above)
  // code: the exact text to type (or a short rule name for meta items)
  // what: one-sentence explanation of what it does / why it helps
  // ex  : optional short usage example (rendered under the item)
  // example: optional category-level copy-ready block at the end of the card
  var CATEGORIES = [
    {
      id: 'techniques',
      group: 'style',
      icon: '\u270e',
      title: 'Suno prompting technique',
      summary: 'How to assemble Style of Music: layering, length, order and iteration. These are methods, not tags.',
      items: [
        {
          code: 'genre \u2192 subgenre \u2192 mood \u2192 vocal \u2192 instruments \u2192 production \u2192 tempo',
          kind: 'meta',
          what: 'A reliable order for the Style of Music field: lead with identity, end with polish.'
        },
        {
          code: 'Put the 3 most important words first',
          kind: 'meta',
          what: 'Prompt models tend to weight the beginning of a field more heavily, so put genre and mood before details.',
          ex: 'indie folk, warm male vocal, 75 BPM, acoustic guitar, tape warmth'
        },
        {
          code: '2\u20134 genres + 1\u20132 moods + 2\u20133 instruments + 1 vocal + 1 tempo',
          kind: 'meta',
          what: 'A 6\u201310 phrase prompt usually gives the model direction without drowning it.',
          ex: 'dream pop, ethereal female vocal, synth pads, reverb, 100 BPM'
        },
        {
          code: 'Use commas between phrases, not sentences',
          kind: 'meta',
          what: 'Style fields read best as a comma-separated list of descriptors; long instructions add noise.',
          ex: 'filmic, piano and strings, slow build, intimate vocal'
        },
        {
          code: 'Describe what you hear, not what you want done',
          kind: 'style',
          what: '\u201cBreathy, close-miked vocal\u201d names a sound; \u201cmake the vocal airy\u201d is a wish.',
          ex: 'close-miked breathy vocal'
        },
        {
          code: 'Name genres and eras, not artists',
          kind: 'meta',
          what: 'Suno\u2019s guidance is to describe styles and eras; naming living artists is unreliable and against the service\u2019s spirit.',
          ex: '90s Kannada film ballad \u2014 not \u201c[artist name] style\u201d'
        },
        {
          code: 'Change one thing per generation',
          kind: 'meta',
          what: 'Keep a prompt you like, adjust a single word, and compare \u2014 the fastest way to learn what each term does.'
        },
        {
          code: 'Keep a control prompt',
          kind: 'meta',
          what: 'Save a plain version (genre + mood + vocal) to compare against detailed versions; the difference shows which words carried weight.'
        },
        {
          code: 'Watch the live character counter',
          kind: 'meta',
          what: 'Field limits differ by model version \u2014 current models accept far more than earlier ones. Trust the counter in the UI, not fixed numbers.',
          ex: 'Style field: roughly 1,000 characters on current models; much less on older ones.'
        },
        {
          code: 'Reuse the winning first third',
          kind: 'meta',
          what: 'In practice the opening of a style prompt does most of the work \u2014 when a combination lands, keep it for the next song.'
        }
      ]
    },
    {
      id: 'structure',
      group: 'lyrics',
      icon: '\u2317',
      title: 'Song structure tags',
      summary: 'Bracket markers that split the Lyrics field into sections \u2014 the most reliable tags in Suno. Put each on its own line, before the words.',
            items: [
        {
          code: '[Intro]',
          kind: 'lyrics',
          what: 'Opens the song, often instrumentally \u2014 leave the next line blank or write (instrumental).'
        },
        {
          code: '[Verse]',
          kind: 'lyrics',
          what: 'A storytelling section when you do not need verse numbers.'
        },
        {
          code: '[Verse 1]',
          kind: 'lyrics',
          what: 'First verse. Numbering tells the model these are separate verses, not one long block.',
          ex: '[Verse 1]\\nYour first verse here'
        },
        {
          code: '[Verse 2]',
          kind: 'lyrics',
          what: 'Second verse \u2014 new words, usually the same melody as verse 1.',
          ex: '[Verse 2]\\nYour second verse here'
        },
        {
          code: '[Pre-Chorus]',
          kind: 'lyrics',
          what: 'A short lift before the chorus \u2014 builds tension and raises energy.',
          ex: '[Pre-Chorus]\\n(rising)'
        },
        {
          code: '[Chorus]',
          kind: 'lyrics',
          what: 'The hook. Repeat the exact same words every time it appears so the chorus stays consistent.'
        },
        {
          code: '[Post-Chorus]',
          kind: 'lyrics',
          what: 'An extension after the chorus \u2014 la-la tail or a second hook, common in pop.'
        },
        {
          code: '[Bridge]',
          kind: 'lyrics',
          what: 'One-off contrasting section, usually near the end \u2014 new melody or key.'
        },
        {
          code: '[Breakdown]',
          kind: 'lyrics',
          what: 'A quiet or sparse section before energy returns.'
        },
        {
          code: '[Build]',
          kind: 'lyrics',
          what: 'Rising tension before a drop or chorus (electronic and pop).'
        },
        {
          code: '[Drop]',
          kind: 'lyrics',
          what: 'The high-energy dance section \u2014 leave its lyrics empty so nothing gets sung over it.',
          ex: '[Drop]\\n(instrumental)'
        },
        {
          code: '[Interlude]',
          kind: 'lyrics',
          what: 'A transitional moment between two major sections, often instrumental.'
        },
        {
          code: '[Instrumental]',
          kind: 'lyrics',
          what: 'No vocals for this section \u2014 useful for solos, tags and breathing room.'
        },
        {
          code: '[Outro]',
          kind: 'lyrics',
          what: 'Winds the song down; leave it blank for a purely instrumental ending.'
        },
        {
          code: '[Refrain]',
          kind: 'lyrics',
          what: 'A repeated line or couplet inside a verse \u2014 smaller than a full chorus.'
        },
        {
          code: '[Hook]',
          kind: 'lyrics',
          what: 'A short, catchy repeated phrase \u2014 hip-hop\u2019s version of a chorus.'
        },
        {
          code: '[End]',
          kind: 'lyrics',
          what: 'Marks the end of the track \u2014 useful when you want a firm ending instead of a long fade.'
        }
      ],
      example: '[Intro]\n(instrumental)\n\n[Verse 1]\nYour first verse lines\u2026\n\n[Pre-Chorus]\n(rising)\n\n[Chorus]\nYour hook \u2014 repeated verbatim\u2026\n\n[Verse 2]\nYour second verse\u2026\n\n[Chorus]\nSame hook words again\u2026\n\n[Bridge]\nA change of feeling\u2026\n\n[Final Chorus]\nBiggest energy\u2026\n\n[Outro]\n(fade out)'
    },
    {
      id: 'vocals',
      group: 'lyrics',
      icon: '\u266b',
      title: 'Vocal type tags',
      summary: 'Who is singing. Put the tag on its own line, usually just under the section tag and above the words.',
            items: [
        {
          code: '[Male Vocal]',
          kind: 'lyrics',
          what: 'Feature a male lead. Often the fastest fix when the default singer is wrong.',
          ex: '[Verse 1]\\n[Male Vocal]\\nYour lines\u2026'
        },
        {
          code: '[Female Vocal]',
          kind: 'lyrics',
          what: 'Feature a female lead. Place under the section tag, above the words.',
          ex: '[Verse 1]\\n[Female Vocal]\\nYour lines\u2026'
        },
        {
          code: '[Duet]',
          kind: 'lyrics',
          what: 'Splits the parts between two voices.'
        },
        {
          code: '[Choir]',
          kind: 'lyrics',
          what: 'Multiple voices, ensemble feel \u2014 good for devotional or anthemic moments.'
        },
        {
          code: '[Backing Vocals]',
          kind: 'lyrics',
          what: 'Stacked voices behind the lead \u2014 oohs, answers, doubles.'
        },
        {
          code: '[Lead Vocal]',
          kind: 'lyrics',
          what: 'Bring the featured singer forward after a choir, duet or instrumental.'
        },
        {
          code: '[Whispered Vocals]',
          kind: 'lyrics',
          what: 'Quiet, intimate delivery close to the microphone.'
        },
        {
          code: '[Spoken Word]',
          kind: 'lyrics',
          what: 'Talking instead of singing \u2014 intros, dramatic moments, spoken bridges.'
        },
        {
          code: '[Rap]',
          kind: 'lyrics',
          what: 'Rhythmic spoken delivery \u2014 works under a verse tag.',
          ex: '[Verse 1]\\n[Rap]\\nYour bars\u2026'
        },
        {
          code: '[Chant]',
          kind: 'lyrics',
          what: 'Repeated, rhythmic group vocal \u2014 mantras, protests, football-crowd hooks.'
        },
        {
          code: '[Call and Response]',
          kind: 'lyrics',
          what: 'A lead line answered by vocals or instruments \u2014 folk, gospel, bhakti.',
          ex: '[Chorus]\\n[Call and Response]'
        },
        {
          code: '[Harmonies]',
          kind: 'lyrics',
          what: 'Doubled or stacked vocal lines behind the lead.'
        },
        {
          code: '[Ad-lib]',
          kind: 'lyrics',
          what: 'Short background interjections (\u201cyeah\u201d, \u201chey\u201d, \u201coh\u201d) behind the main line.',
          ex: '[Ad-lib]\\n(yeah, come on)'
        }
      ]
    },
    {
      id: 'vocal-expression',
      icon: '\u266A',
      group: 'lyrics',
      title: 'Vocal expression tags',
      summary: 'How the singer delivers the line. Place on its own line under a section tag, or just above the words it should colour.',
      items: [
        { code: '[Emotional]', kind: 'lyrics', what: 'Pushes feeling forward \u2014 aching, open, less reserved.' },
        { code: '[Powerful]', kind: 'lyrics', what: 'Big, projected delivery. Strong on choruses and finales.' },
        { code: '[Soft]', kind: 'lyrics', what: 'Quiet, gentle singing \u2014 verses and intimate moments.' },
        { code: '[Breathy]', kind: 'lyrics', what: 'Air mixed into the tone. Close-mic, late-night feel.', ex: '[Verse 1]\n[Breathy]\nYour quiet lines\u2026' },
        { code: '[Intimate]', kind: 'lyrics', what: 'As if sung right next to the listener. Sparse arrangement helps.' },
        { code: '[Dramatic]', kind: 'lyrics', what: 'Theatrical swell \u2014 useful before a big chorus or bridge.' },
        { code: '[Aggressive]', kind: 'lyrics', what: 'Edgy, forward attack. Rock, rap and defiant hooks.' },
        { code: '[Soulful]', kind: 'lyrics', what: 'Warm, gospel-tinged phrasing with space to bend notes.' },
        { code: '[Melismatic]', kind: 'lyrics', what: 'Several notes on one syllable \u2014 raga runs, gospel, melisma.' },
        { code: '[Falsetto]', kind: 'lyrics', what: 'High, airy head voice. Mark it on the lines that should lift.' },
        { code: '[Sustained Note]', kind: 'lyrics', what: 'Hold a long tone. Pair with an open vowel in the lyric.' },
        { code: '[Vocal Run]', kind: 'lyrics', what: 'A fast ornamental flourish between or on words.' },
        { code: '[Belting]', kind: 'lyrics', what: 'Full-chest power for a peak chorus.' },
        { code: '[Humming]', kind: 'lyrics', what: 'Wordless hum \u2014 intros, outros and quiet hooks.' },
        { code: '[Scatting]', kind: 'lyrics', what: 'Improvised jazz syllables instead of words.' }
      ]
    },
    {
      id: 'carnatic',
      icon: '\u266C',
      group: 'lyrics',
      title: 'Indian / Carnatic tags',
      summary: 'Raga form, gamaka and Carnatic instruments as lyrics-field markers. Pair with a raga name in Style of Music for a stronger result.',
      items: [
        { code: '[Raga Intro]', kind: 'lyrics', what: 'Opens in raga colour before the song form begins.', ex: '[Raga Intro]\n(tanpura drone)' },
        { code: '[Alapana]', kind: 'lyrics', what: 'Unmetered raga exposition \u2014 voice or instrument, no pulse yet.', ex: '[Alapana]\n(free tempo, tanpura)' },
        { code: '[Tanpura Drone]', kind: 'lyrics', what: 'Sustained Sa\u2013Pa drone. The fastest classical cue in a lyrics field.' },
        { code: '[Mridangam]', kind: 'lyrics', what: 'Carnatic barrel drum as a featured part or groove.' },
        { code: '[Ghatam]', kind: 'lyrics', what: 'Clay-pot percussion \u2014 bright slap over mridangam.' },
        { code: '[Kanjira]', kind: 'lyrics', what: 'Tambourine-like frame drum in a Carnatic tala section.' },
        { code: '[Veena]', kind: 'lyrics', what: 'Plucked Carnatic veena \u2014 slow phrases, sliding gamakas.' },
        { code: '[Flute Solo]', kind: 'lyrics', what: 'Bansuri or Carnatic flute as the featured voice.', ex: '[Flute Solo]\n(instrumental)' },
        { code: '[Violin Solo]', kind: 'lyrics', what: 'Carnatic or film-style violin lead. Name it so it is less likely to become a pad.' },
        { code: '[Swara Passage]', kind: 'lyrics', what: 'Solfa (sa ri ga ma) passage \u2014 write the swaras as the lyric lines.', ex: '[Swara Passage]\nsa ri ga ma pa da ni sa' },
        { code: '[Tani Avartanam]', kind: 'lyrics', what: 'Percussion showcase, usually near the end of a Carnatic piece.', ex: '[Tani Avartanam]\n(mridangam)' },
        { code: '[Korvai]', kind: 'lyrics', what: 'A calculated rhythmic cadence that lands on samam (the downbeat).' },
        { code: '[Briga]', kind: 'lyrics', what: 'Fast, dense vocal or instrumental run in the raga.' },
        { code: '[Gamaka]', kind: 'lyrics', what: 'Ornament the following lines with slides, shakes and oscillations.' },
        { code: '[Kampita]', kind: 'lyrics', what: 'A specific oscillating gamaka \u2014 the note is shaken, not held still.' },
        { code: '[Nokku]', kind: 'lyrics', what: 'A light stress/press ornament on a note \u2014 subtle, not a full shake.' }
      ],
      example: '[Raga Intro]\n[Tanpura Drone]\n\n[Alapana]\n(free tempo)\n\n[Verse 1]\n[Gamaka]\nYour first sahitya lines\u2026\n\n[Swara Passage]\nsa ri ga ma pa\n\n[Tani Avartanam]\n(mridangam, ghatam)\n\n[Outro]\n(tanpura fades)'
    },
    {
      id: 'percussion',
      icon: '\u2669',
      group: 'lyrics',
      title: 'Percussion tags',
      summary: 'Featured drums and grooves. Use a section tag plus (instrumental) if you want no singing over the break.',
      items: [
        { code: '[Tabla Solo]', kind: 'lyrics', what: 'Featured tabla \u2014 bols, tihai, conversational phrases.', ex: '[Tabla Solo]\n(instrumental)' },
        { code: '[Tabla Groove]', kind: 'lyrics', what: 'Tabla as the pocket, not a solo \u2014 keeps time under the vocal.' },
        { code: '[Dhol]', kind: 'lyrics', what: 'Big festival barrel drum \u2014 celebration, bhangra, street energy.' },
        { code: '[Dholak]', kind: 'lyrics', what: 'Folk two-headed drum \u2014 lighter than dhol, common in film and folk.' },
        { code: '[Mridangam Solo]', kind: 'lyrics', what: 'Carnatic mridangam as the featured voice.' },
        { code: '[Chenda]', kind: 'lyrics', what: 'Kerala temple/drum-ensemble colour \u2014 loud, processional, outdoor.' },
        { code: '[Frame Drum]', kind: 'lyrics', what: 'Open, hand-played drum \u2014 meditative or tribal pulse.' },
        { code: '[Hand Percussion]', kind: 'lyrics', what: 'Claps, kanjira, shakers, caj\u00f3n \u2014 human, close, un-programmed.' },
        { code: '[Percussion Break]', kind: 'lyrics', what: 'Arrangement drops to drums only for a few bars.', ex: '[Percussion Break]\n(instrumental)' }
      ]
    },
    {
      id: 'electronic',
      icon: '\u26A1',
      group: 'lyrics',
      title: 'Electronic / production tags',
      summary: 'Texture and EDM-style events in the lyrics field. For mix colour (reverb, punch) prefer Style of Music as well.',
      items: [
        { code: '[Synth Intro]', kind: 'lyrics', what: 'Opens on synthesizers rather than acoustic instruments.' },
        { code: '[Ambient Texture]', kind: 'lyrics', what: 'Soft evolving sound-bed \u2014 little rhythm, lots of space.' },
        { code: '[Atmospheric Pad]', kind: 'lyrics', what: 'Held synth or string pad underneath the section.' },
        { code: '[Bass Drop]', kind: 'lyrics', what: 'Low-end hit as the section arrives \u2014 EDM, trap, hybrid.' },
        { code: '[Sub Bass]', kind: 'lyrics', what: 'Felt more than heard \u2014 mark a section that should rumble.' },
        { code: '[Arpeggio]', kind: 'lyrics', what: 'Broken-chord synth or plucked pattern driving the section.' },
        { code: '[Sidechain Pulse]', kind: 'lyrics', what: 'Pumping duck of pads/bass under the kick.' },
        { code: '[Glitch]', kind: 'lyrics', what: 'Stutters, chops and digital artefacts as a feature.' },
        { code: '[Granular Texture]', kind: 'lyrics', what: 'Shimmering, frozen, particle-like sound design.' },
        { code: '[Riser]', kind: 'lyrics', what: 'Rising sweep into the next section or drop.' },
        { code: '[Impact]', kind: 'lyrics', what: 'A single cinematic hit \u2014 trailer, drop, or chorus downbeat.' },
        { code: '[Soundscape]', kind: 'lyrics', what: 'Environment first, music second \u2014 drones, field, atmosphere.' }
      ]
    },
    {
      id: 'solos',
      icon: '\u266B',
      group: 'lyrics',
      title: 'Instrument solo tags',
      summary: 'Name the instrument. Leave the next line blank or write (instrumental) so the model does not sing over it.',
      items: [
        { code: '[Guitar Solo]', kind: 'lyrics', what: 'Generic guitar lead. Prefer electric or acoustic when you know.', ex: '[Guitar Solo]\n(instrumental)' },
        { code: '[Electric Guitar Solo]', kind: 'lyrics', what: 'Amplified lead \u2014 rock, fusion, film-song climax.' },
        { code: '[Acoustic Guitar Solo]', kind: 'lyrics', what: 'Unplugged lead \u2014 folk, bhavageete, intimate bridges.' },
        { code: '[Piano Solo]', kind: 'lyrics', what: 'Featured piano, often a quiet middle-eight or intro.' },
        { code: '[Violin Solo]', kind: 'lyrics', what: 'Featured violin \u2014 Carnatic, film, or Western lyrical.' },
        { code: '[Flute Solo]', kind: 'lyrics', what: 'Bansuri or Western flute as the lead voice.' },
        { code: '[Saxophone Solo]', kind: 'lyrics', what: 'Jazz / 90s-ballad sax lead. Exclude saxophone if you do not want this by default.' },
        { code: '[Sitar Solo]', kind: 'lyrics', what: 'Hindustani sitar as the featured instrument.' },
        { code: '[Veena Solo]', kind: 'lyrics', what: 'Carnatic veena lead \u2014 slower, sliding, raga-true.' },
        { code: '[Cello Solo]', kind: 'lyrics', what: 'Low, lyrical string voice \u2014 ballads and film cues.' }
      ]
    },
    {
      id: 'dynamics',
      icon: '\u2195',
      group: 'lyrics',
      title: 'Dynamics / arrangement tags',
      summary: 'How dense or loud the next section should feel. One tag per section is enough \u2014 stacking several often cancels out.',
      items: [
        { code: '[Minimal]', kind: 'lyrics', what: 'Very few elements. Makes a vocal or a single instrument loud.' },
        { code: '[Sparse]', kind: 'lyrics', what: 'Air and space \u2014 similar to minimal, a little less empty.' },
        { code: '[Full Arrangement]', kind: 'lyrics', what: 'Everything in: stacked vocals, drums, harmony, bass.' },
        { code: '[Gradual Build]', kind: 'lyrics', what: 'Add parts over several bars rather than jumping to full.' },
        { code: '[Crescendo]', kind: 'lyrics', what: 'Get louder / denser through the section.' },
        { code: '[Decrescendo]', kind: 'lyrics', what: 'Get quieter \u2014 useful into a whispered verse or outro.' },
        { code: '[Break]', kind: 'lyrics', what: 'A short hole in the arrangement \u2014 often one or two bars.' },
        { code: '[Silence]', kind: 'lyrics', what: 'A true gap. Easy to overdo; one beat or bar is usually enough.' },
        { code: '[Sudden Stop]', kind: 'lyrics', what: 'Hard cutoff, then the next section hits. Dramatic choruses.' },
        { code: '[Half-Time]', kind: 'lyrics', what: 'Groove feels half as fast \u2014 trap, metal, heavy choruses.' },
        { code: '[Double-Time]', kind: 'lyrics', what: 'Groove feels twice as fast \u2014 rap verses, hardcore lifts.' },
        { code: '[Finale]', kind: 'lyrics', what: 'The last big statement \u2014 often with [Full Arrangement].' }
      ]
    },
    {
      id: 'endings',
      icon: '\u23F9',
      group: 'lyrics',
      title: 'Ending tags',
      summary: 'How the track stops. Pick one. [Outro] plus (fade out) is the most reliable fade; [End] is the most reliable hard stop.',
      items: [
        { code: '[Outro]', kind: 'lyrics', what: 'Winds the song down. Leave blank or write (instrumental) / (fade out).' },
        { code: '[Fade Out]', kind: 'lyrics', what: 'Asks for a tail instead of a button ending.', ex: '[Outro]\n[Fade Out]' },
        { code: '[Slow Fade]', kind: 'lyrics', what: 'A longer, gentler fade \u2014 ballads and ambient pieces.' },
        { code: '[Final Chord]', kind: 'lyrics', what: 'Resolves on a held chord and stops.' },
        { code: '[Final Note]', kind: 'lyrics', what: 'Resolves on a single held note \u2014 voice or instrument.' },
        { code: '[A Cappella Ending]', kind: 'lyrics', what: 'Last lines are voices only, no band.', ex: '[Outro]\n[A Cappella Ending]' },
        { code: '[Instrumental Ending]', kind: 'lyrics', what: 'No more singing after the last chorus.', ex: '[Outro]\n[Instrumental Ending]' },
        { code: '[End]', kind: 'lyrics', what: 'Hard stop. Use when a fade would feel wrong.' }
      ]
    },
    {
      id: 'adlibs',
      icon: '\u266A',
      group: 'lyrics',
      layout: 'chips',
      title: 'Vocal / ad-lib notation ( )',
      summary: 'Parentheses are for things you want treated as vocalised material \u2014 sung, spoken or heard \u2014 not as a section label. Keep them short.',
      items: [
        { code: '(oh...)', kind: 'lyrics', what: 'Soft falling ad-lib. Classic after a chorus line.' },
        { code: '(oh oh)', kind: 'lyrics', what: 'Short stacked \u201coh\u201d hook.' },
        { code: '(mmm...)', kind: 'lyrics', what: 'Closed-mouth hum. Intimate verses and outros.' },
        { code: '(ha ha)', kind: 'lyrics', what: 'A laugh in the performance \u2014 playful, not a sitcom track.' },
        { code: '(la la la)', kind: 'lyrics', what: 'Wordless hook or post-chorus tail.' },
        { code: '(na na na)', kind: 'lyrics', what: 'Same idea as la-la, slightly more percussive.' },
        { code: '(yeah)', kind: 'lyrics', what: 'Background affirmation behind a lead line.' },
        { code: '(hey)', kind: 'lyrics', what: 'Call, clap-along, or crowd-style hit.' },
        { code: '(ooh)', kind: 'lyrics', what: 'Open-vowel ad-lib, often high in the mix.' },
        { code: '(ah...)', kind: 'lyrics', what: 'Open sigh or swell into the next line.' },
        { code: '(whoa)', kind: 'lyrics', what: 'Lift or surprise \u2014 live-band energy.' },
        { code: '(whispered)', kind: 'lyrics', what: 'Cue: sing the following line quietly.' },
        { code: '(building)', kind: 'lyrics', what: 'Cue: raise energy through the next lines.' },
        { code: '(fading)', kind: 'lyrics', what: 'Cue: drop energy or trail off.' },
        { code: '(instrumental)', kind: 'lyrics', what: 'No singing in this section. The most useful parenthesis in the library.' },
        { code: '(pause)', kind: 'lyrics', what: 'A breath or rest before the next line.' },
        { code: '(echo)', kind: 'lyrics', what: 'Repeat / delay the last word as an effect.' },
        { code: '(harmonies)', kind: 'lyrics', what: 'Stack backing voices on the following line.' },
        { code: '(ad-lib)', kind: 'lyrics', what: 'Leave room for a background vocal riff.' },
        { code: '(crowd)', kind: 'lyrics', what: 'Live audience colour on the hook.' },
        { code: '(breath)', kind: 'lyrics', what: 'An audible breath \u2014 close-mic intimacy.' }
      ]
    },
    {
      id: 'experimental',
      icon: '\u2699',
      group: 'lyrics',
      title: 'Experimental notation { } and < >',
      summary: 'Community experiments. Curly braces try to give instructions; angle brackets try to mimic section tags. Both are less reliable than [ ] \u2014 they are often ignored or sung as text. Prefer square brackets.',
      items: [
        { code: '{build energy}', kind: 'lyrics', what: 'Instruction-style aside. Prefer [Build] or (building) first.' },
        { code: '{whisper this line}', kind: 'lyrics', what: 'May colour the next line. [Whispered Vocals] or (whispered) is safer.' },
        { code: '{instrumental only}', kind: 'lyrics', what: 'Prefer [Instrumental] plus (instrumental).' },
        { code: '{more emotion}', kind: 'lyrics', what: 'Vague wish. [Emotional] or a mood word in Style of Music works better.' },
        { code: '{softer delivery}', kind: 'lyrics', what: 'Prefer [Soft] on its own line.' },
        { code: '{bigger final chorus}', kind: 'lyrics', what: 'Prefer [Finale] or [Full Arrangement] under the last [Chorus].' },
        { code: '{slow fade}', kind: 'lyrics', what: 'Prefer [Slow Fade] or [Outro] plus (fading).' },
        { code: '<intro>', kind: 'lyrics', what: 'Less reliable twin of [Intro]. Use square brackets unless experimenting.' },
        { code: '<verse>', kind: 'lyrics', what: 'Less reliable twin of [Verse].' },
        { code: '<chorus>', kind: 'lyrics', what: 'Less reliable twin of [Chorus].' },
        { code: '<bridge>', kind: 'lyrics', what: 'Less reliable twin of [Bridge].' },
        { code: '<outro>', kind: 'lyrics', what: 'Less reliable twin of [Outro].' },
        { code: '<male vocal>', kind: 'lyrics', what: 'Less reliable twin of [Male Vocal].' },
        { code: '<female vocal>', kind: 'lyrics', what: 'Less reliable twin of [Female Vocal].' },
        { code: '<instrumental>', kind: 'lyrics', what: 'Less reliable twin of [Instrumental].' }
      ]
    },
    {
      id: 'genre',
      group: 'style',
      icon: '\u25c8',
      title: 'Genre & subgenre tags',
      summary: 'Where the song lives. One broad genre plus one or two subgenres usually beats a long list. Style text, not switches.',
      items: [
        {
          code: 'indie folk',
          kind: 'style',
          what: 'Acoustic, story-led, gentle arrangements.'
        },
        {
          code: 'bhavageete / sugama sangeetha',
          kind: 'style',
          what: 'Kannada lyric-driven art song \u2014 melodic, intimate, poetry forward.',
          ex: 'Kannada bhavageete, soft acoustic arrangement'
        },
        {
          code: 'Carnatic fusion',
          kind: 'style',
          what: 'Carnatic ragas, swara phrasing and rhythm with modern production \u2014 the Raaga Studio home turf.',
          ex: 'Carnatic fusion, Hamsadhwani feel, mridangam and synth pads'
        },
        {
          code: 'Hindustani classical',
          kind: 'style',
          what: 'Sitar, sarod or santoor with raga forms and a tanpura drone.'
        },
        {
          code: 'devotional / bhajan',
          kind: 'style',
          what: 'Reverent, temple-flavoured \u2014 harmonium, percussion, call-and-response.'
        },
        {
          code: 'dream pop',
          kind: 'style',
          what: 'Washed-out guitars, reverb, soft floating vocals.'
        },
        {
          code: 'synthwave',
          kind: 'style',
          what: 'Retro synthesizers, 80s drums, neon nostalgia.'
        },
        {
          code: 'lo-fi hip hop',
          kind: 'style',
          what: 'Mellow beats, vinyl crackle, dusty samples.'
        },
        {
          code: 'bedroom pop',
          kind: 'style',
          what: 'Intimate, DIY-feeling production with simple arrangements.'
        },
        {
          code: 'alternative rock',
          kind: 'style',
          what: 'Guitar-forward, mid-tempo, builds and releases.'
        },
        {
          code: 'jazz fusion',
          kind: 'style',
          what: 'Electric instruments, improvisation, looser meters.'
        },
        {
          code: 'film score / cinematic orchestral',
          kind: 'style',
          what: 'Thematic string writing \u2014 soundtracks and emotional scenes.'
        },
        {
          code: 'epic trailer music',
          kind: 'style',
          what: 'Brass, choir, percussion and huge crescendos.'
        },
        {
          code: 'trap',
          kind: 'style',
          what: '808 bass, hi-hat rolls, half-time feel.'
        },
        {
          code: 'hyperpop',
          kind: 'style',
          what: 'Extreme, glitchy, pitch-shifted production.'
        },
        {
          code: 'house / EDM',
          kind: 'style',
          what: 'Four-on-the-floor kick with build-and-drop structure.'
        },
        {
          code: 'ambient / meditative',
          kind: 'style',
          what: 'Slow evolving pads, little or no rhythm, space.'
        }
      ]
    },
    {
      id: 'mood',
      group: 'style',
      icon: '\u2661',
      title: 'Mood & emotion tags',
      summary: 'The feeling of the track. Pair one primary mood with one colour word \u2014 two moods is usually enough.',
      items: [
        {
          code: 'melancholic',
          kind: 'style',
          what: 'Gentle sadness \u2014 slower, minor-leaning.'
        },
        {
          code: 'yearning',
          kind: 'style',
          what: 'Longing and reaching \u2014 great for love or distance themes.'
        },
        {
          code: 'bittersweet',
          kind: 'style',
          what: 'Happy and sad at once \u2014 memory songs.'
        },
        {
          code: 'euphoric',
          kind: 'style',
          what: 'Peak joy \u2014 big choruses and drops.'
        },
        {
          code: 'hopeful',
          kind: 'style',
          what: 'Rising optimism \u2014 gentle lift, not full power.'
        },
        {
          code: 'nostalgic',
          kind: 'style',
          what: 'Warm distance, old feelings, tape and reverb colours.',
          ex: 'nostalgic, 90s film-song warmth'
        },
        {
          code: 'dreamy',
          kind: 'style',
          what: 'Hazy, half-awake, soft focus.'
        },
        {
          code: 'romantic',
          kind: 'style',
          what: 'Tender and affectionate \u2014 strings and warm vocals.'
        },
        {
          code: 'devotional',
          kind: 'style',
          what: 'Reverent, prayerful \u2014 harmonium, drone, slow build.'
        },
        {
          code: 'playful',
          kind: 'style',
          what: 'Light, cheeky, bouncy.'
        },
        {
          code: 'defiant',
          kind: 'style',
          what: 'Rebellious edge \u2014 rock or rap energy.'
        },
        {
          code: 'ominous',
          kind: 'style',
          what: 'Foreboding and dark \u2014 low drones, sparse hits.'
        },
        {
          code: 'triumphant',
          kind: 'style',
          what: 'Victory and arrival \u2014 brass, key change, big drums.'
        },
        {
          code: 'intimate',
          kind: 'style',
          what: 'Close and personal \u2014 few instruments, close-miked vocal.'
        },
        {
          code: 'somber',
          kind: 'style',
          what: 'Serious and muted \u2014 low dynamics, slow tempo.'
        },
        {
          code: 'wistful',
          kind: 'style',
          what: 'Soft longing with a smile \u2014 quieter than yearning.'
        },
        {
          code: 'reflective',
          kind: 'style',
          what: 'Inward and thoughtful \u2014 sparse, conversational feel.'
        },
        {
          code: 'warm melancholy',
          kind: 'style',
          what: 'A compound mood: sadness that still feels comforting \u2014 a common, effective pairing.',
          ex: 'warm melancholy, rainy evening'
        }
      ]
    },
    {
      id: 'instruments',
      group: 'style',
      icon: '\u266a',
      title: 'Instrumentation tags',
      summary: 'What is playing. Name the instrument plainly \u2014 these are steering words, not guarantees that a part will appear.',
      items: [
        {
          code: 'grand piano / upright piano',
          kind: 'style',
          what: 'Keyboard colour: grand for size, upright for warmth and intimacy.'
        },
        {
          code: 'strings ensemble / string quartet',
          kind: 'style',
          what: 'Sustained orchestral texture \u2014 lush or tense depending on voicing.'
        },
        {
          code: 'solo violin / cello',
          kind: 'style',
          what: 'A single melodic string voice \u2014 filmic and lyrical.'
        },
        {
          code: 'bansuri flute',
          kind: 'style',
          what: 'Bamboo flute \u2014 instantly Indian-classical, gentle, breathy.'
        },
        {
          code: 'sitar / veena',
          kind: 'style',
          what: 'Plucked classical strings with drone and ornament.'
        },
        {
          code: 'tanpura drone',
          kind: 'style',
          what: 'A sustained tonic drone \u2014 the fastest way to add classical context.',
          ex: 'tanpura drone, slow alapana feel'
        },
        {
          code: 'tabla / mridangam',
          kind: 'style',
          what: 'Indian percussion: tabla for melodic rhythm, mridangam for Carnatic pulse.'
        },
        {
          code: 'harmonium',
          kind: 'style',
          what: 'Reed keyboard \u2014 devotional, folk and bhajan staple.'
        },
        {
          code: 'acoustic guitar (fingerpicked)',
          kind: 'style',
          what: 'Organic, story-led foundation \u2014 articulate fingerpicking or soft strum.'
        },
        {
          code: 'electric guitar (clean / crunch / distorted)',
          kind: 'style',
          what: 'Pick the character explicitly \u2014 clean for air, crunch for rock, distorted for edge.'
        },
        {
          code: 'bass guitar / 808 sub-bass',
          kind: 'style',
          what: 'Low end: bass guitar for musical lines, 808 for modern hip-hop/EDM weight.'
        },
        {
          code: 'synth pads / arpeggio synth',
          kind: 'style',
          what: 'Atmosphere or motion \u2014 pads for space, arpeggios for drive.'
        },
        {
          code: 'brass section / saxophone',
          kind: 'style',
          what: 'Bright, soulful colour \u2014 big statement moments.'
        },
        {
          code: 'orchestral percussion / taiko drums',
          kind: 'style',
          what: 'Cinematic impact \u2014 rolls, hits and drama.'
        },
        {
          code: 'live drums / drum machine',
          kind: 'style',
          what: 'Live drums for human feel; drum machine for programmed precision.'
        },
        {
          code: 'choir',
          kind: 'style',
          what: 'Layered voices for scale \u2014 devotional, epic or gospel colour.'
        },
        {
          code: 'kalimba / music box / celesta',
          kind: 'style',
          what: 'Small, twinkly sounds \u2014 childlike wonder and nostalgia.'
        }
      ]
    },
    {
      id: 'production',
      group: 'style',
      icon: '\u2699',
      title: 'Production & mixing tags',
      summary: 'How it is recorded, mixed and coloured. These words shape texture and space \u2014 strongly, but not predictably.',
      items: [
        {
          code: 'polished studio mix',
          kind: 'style',
          what: 'Clean, balanced, radio-ready presentation.'
        },
        {
          code: 'lo-fi tape hiss',
          kind: 'style',
          what: 'Intentionally rough, warm and nostalgic.'
        },
        {
          code: 'vintage analog warmth',
          kind: 'style',
          what: 'Tape or tube colour \u2014 softer highs, rounder lows.'
        },
        {
          code: 'huge reverb / cathedral reverb',
          kind: 'style',
          what: 'Big space around everything \u2014 epic or ambient.'
        },
        {
          code: 'dry, upfront vocal',
          kind: 'style',
          what: 'Close, present singer with little space \u2014 intimacy and clarity.'
        },
        {
          code: 'wide stereo image',
          kind: 'style',
          what: 'Spread-out arrangement \u2014 modern, cinematic feel.'
        },
        {
          code: 'tight and punchy',
          kind: 'style',
          what: 'Fast attack, controlled low end \u2014 drums-forward energy.'
        },
        {
          code: 'sidechain pumping',
          kind: 'style',
          what: 'The classic EDM ducking effect on pads or bass under the kick.'
        },
        {
          code: 'minimal and sparse',
          kind: 'style',
          what: 'Few elements, lots of air \u2014 makes small moments loud.'
        },
        {
          code: 'layered harmonies',
          kind: 'style',
          what: 'Stacked backing vocals for width and emotion.'
        },
        {
          code: 'autotune / pitch-corrected vocals',
          kind: 'style',
          what: 'Modern vocal colour \u2014 ask for it on purpose if you want it.'
        },
        {
          code: 'live band feel',
          kind: 'style',
          what: 'Roomy, human, slightly imperfect \u2014 musicians in a room.'
        },
        {
          code: '90s film-song nostalgia',
          kind: 'style',
          what: 'An era reference: warm strings, sax, lush pads, dramatic melody.',
          ex: '90s Kannada film-song nostalgia, warm strings and sax'
        },
        {
          code: 'saturated / tape saturation',
          kind: 'style',
          what: 'Added harmonics and grit \u2014 glue and warmth, or intentional dirt.'
        }
      ]
    },
    {
      id: 'tempo',
      group: 'style',
      icon: '\u25f7',
      title: 'Tempo & rhythm tags',
      summary: 'Speed and groove. Exact BPM is a request, not a promise \u2014 Suno may swing a few BPM either way.',
      items: [
        {
          code: 'slow \u2014 60\u201380 BPM',
          kind: 'style',
          what: 'Ballad pace; long notes and space.'
        },
        {
          code: 'mid-tempo \u2014 80\u2013110 BPM',
          kind: 'style',
          what: 'The comfortable default for pop, folk and rock.'
        },
        {
          code: 'upbeat \u2014 110\u2013130 BPM',
          kind: 'style',
          what: 'Bright, driving, dance-adjacent.'
        },
        {
          code: 'fast \u2014 130+ BPM',
          kind: 'style',
          what: 'High-energy \u2014 EDM, pop-punk, uptempo dance.'
        },
        {
          code: '96 BPM / 128 BPM (exact number)',
          kind: 'style',
          what: 'Asks for a specific tempo. Treat the result as an approximation.',
          ex: 'Carnatic fusion, 96 BPM, mridangam'
        },
        {
          code: 'four-on-the-floor',
          kind: 'style',
          what: 'Steady kick on every beat \u2014 house and dance music.'
        },
        {
          code: 'half-time',
          kind: 'style',
          what: 'Slow feel over a fast grid \u2014 trap, metal ballads.'
        },
        {
          code: 'double-time',
          kind: 'style',
          what: 'Twice the perceived speed \u2014 rap and hardcore.'
        },
        {
          code: 'shuffle / swing',
          kind: 'style',
          what: 'Triplet-feel groove \u2014 blues, jazz, laid-back pop.'
        },
        {
          code: 'syncopated',
          kind: 'style',
          what: 'Off-beat accents and unexpected hits.'
        },
        {
          code: 'polyrhythm',
          kind: 'style',
          what: 'Two meters sounding together \u2014 Carnatic and Afro-influenced music. Community-tested; results vary.',
          ex: 'tabla polyrhythm against a 4/4 beat'
        },
        {
          code: '6/8 time',
          kind: 'style',
          what: 'Compound feel, two groups of three \u2014 lullabies, folk, ballads.'
        },
        {
          code: '3/4 waltz',
          kind: 'style',
          what: 'One-two-three pulse \u2014 old-world, danceable, gentle.'
        },
        {
          code: 'driving rock tempo',
          kind: 'style',
          what: 'Steady, urgent mid-fast pulse with forward momentum.'
        },
        {
          code: 'laid-back groove',
          kind: 'style',
          what: 'Relaxed, behind-the-beat feel \u2014 soul, lo-fi, chill.'
        },
        {
          code: 'rubato / free tempo',
          kind: 'style',
          what: 'Expressive push-and-pull timing \u2014 classical and raga openings.',
          ex: 'slow rubato piano, free tempo opening'
        }
      ]
    },
    {
      id: 'atmosphere',
      group: 'style',
      icon: '\u263e',
      title: 'Atmosphere & ambience tags',
      summary: 'Scene-setting words that colour the arrangement \u2014 rain, crackle, space. They can be subtle or dominant; treat them as colour, not a promise.',
      items: [
        {
          code: 'rain and distant thunder',
          kind: 'style',
          what: 'Melancholy weather \u2014 used constantly for moody ballads.'
        },
        {
          code: 'vinyl crackle',
          kind: 'style',
          what: 'Dust and warmth \u2014 lo-fi and nostalgia.'
        },
        {
          code: 'tape hiss',
          kind: 'style',
          what: 'Old-recording texture.'
        },
        {
          code: 'night drive',
          kind: 'style',
          what: 'Motion, city lights, synthwave energy.'
        },
        {
          code: 'campfire ambience',
          kind: 'style',
          what: 'Acoustic warmth, close voices, folk intimacy.'
        },
        {
          code: 'cathedral / concert hall reverb',
          kind: 'style',
          what: 'Huge natural space \u2014 choir, organ, epic strings.'
        },
        {
          code: 'stadium crowd',
          kind: 'style',
          what: 'Live concert scale \u2014 anthemic sections.'
        },
        {
          code: 'ocean waves',
          kind: 'style',
          what: 'Slow, open, meditative.'
        },
        {
          code: 'birdsong at dawn',
          kind: 'style',
          what: 'Morning freshness \u2014 gentle folk or ambient.'
        },
        {
          code: 'crickets',
          kind: 'style',
          what: 'Summer night intimacy \u2014 acoustic and lo-fi moods.'
        },
        {
          code: 'wind chimes',
          kind: 'style',
          what: 'Delicate, meditative sparkle.'
        },
        {
          code: 'distant traffic',
          kind: 'style',
          what: 'Urban melancholy \u2014 bedroom pop and city ballads.'
        },
        {
          code: 'empty warehouse',
          kind: 'style',
          what: 'Cold, vast and industrial.'
        },
        {
          code: 'heartbeat pulse',
          kind: 'style',
          what: 'Low, slow pulse \u2014 tension and intimacy.'
        },
        {
          code: 'radio static / interference',
          kind: 'style',
          what: 'Signal-loss texture \u2014 nostalgia and unease.'
        }
      ]
    },
    {
      id: 'songwriting',
      group: 'style',
      icon: '\u270d',
      title: 'Songwriting & arrangement tags',
      summary: 'How the song moves: hooks, contrasts, dynamics and structure ideas. Most are style text; treated as direction, not guaranteed arrangement.',
      items: [
        {
          code: 'call and response',
          kind: 'style',
          what: 'A lead line answered by vocals or instruments \u2014 folk, gospel, bhakti.'
        },
        {
          code: 'build dynamics',
          kind: 'style',
          what: 'Quiet start, rising intensity, big release.'
        },
        {
          code: 'key change / modulation',
          kind: 'style',
          what: 'A lift near the end. Community practice \u2014 it may or may not land; keep the request simple.',
          ex: 'key change in the final chorus'
        },
        {
          code: 'counter-melody',
          kind: 'style',
          what: 'A second melody against the lead \u2014 depth and motion.'
        },
        {
          code: 'layered harmonies',
          kind: 'style',
          what: 'Stacked backing voices — width and emotion.'
        },
        {
          code: 'instrumental hook',
          kind: 'style',
          what: 'A memorable riff or lick that repeats \u2014 the earworm part.'
        },
        {
          code: 'ostinato',
          kind: 'style',
          what: 'A repeating pattern under everything \u2014 hypnotic, minimal.'
        },
        {
          code: 'pedal tone',
          kind: 'style',
          what: 'One sustained bass note \u2014 tension without movement.'
        },
        {
          code: 'contrasting sections',
          kind: 'style',
          what: 'Verses and chorus clearly different in energy \u2014 pop craft.'
        },
        {
          code: 'climax in the final chorus',
          kind: 'style',
          what: 'Save the biggest arrangement for the last chorus.'
        },
        {
          code: 'reprise',
          kind: 'style',
          what: 'A return of an earlier theme at the end \u2014 closure.'
        },
        {
          code: 'tag ending',
          kind: 'style',
          what: 'A short repeated tail after the last chorus.'
        }
      ]
    },
    {
      id: 'transitions',
      group: 'lyrics',
      icon: '\u21c4',
      title: 'Transition & section tags',
      summary: 'Links between sections \u2014 fills, solos and swells. Bracketed transitions are community-tested; style-side wording is safer for complex moves.',
            items: [
        {
          code: '[Transition]',
          kind: 'lyrics',
          what: 'A generic link between sections when you do not want to name the device.'
        },
        {
          code: '[Build Up]',
          kind: 'lyrics',
          what: 'Rising tension into a drop or chorus. Twin of [Build].'
        },
        {
          code: '[Riser]',
          kind: 'lyrics',
          what: 'A rising sweep of energy before a drop or chorus.'
        },
        {
          code: '[Drum Fill]',
          kind: 'lyrics',
          what: 'A drum flourish into the next section \u2014 also write (drum fill) under a section tag.',
          ex: '[Drum Fill]\\n(instrumental)'
        },
        {
          code: '[Percussion Fill]',
          kind: 'lyrics',
          what: 'Hand percussion or tala flourish rather than a kit fill.'
        },
        {
          code: '[Instrumental Break]',
          kind: 'lyrics',
          what: 'Band continues, singer drops out. Useful between chorus and verse.'
        },
        {
          code: '[Breakdown]',
          kind: 'lyrics',
          what: 'A quiet or sparse section before energy returns.'
        },
        {
          code: '[Reprise]',
          kind: 'lyrics',
          what: 'Return of an earlier theme, usually near the end.'
        },
        {
          code: '[Key Change]',
          kind: 'lyrics',
          what: 'Asks for a lift, usually into the last chorus. Keep it simple; results vary.',
          ex: '[Key Change]\\n[Chorus]'
        },
        {
          code: '[Tempo Change]',
          kind: 'lyrics',
          what: 'Asks the groove to speed up or slow down. Name the direction in the next cue, e.g. (faster).'
        },
        {
          code: '[Fade In]',
          kind: 'lyrics',
          what: 'The section arrives from silence. Common on [Intro].'
        },
        {
          code: '[Spoken Interlude]',
          kind: 'lyrics',
          what: 'A short talking break between sung sections.'
        },
        {
          code: '[A Cappella]',
          kind: 'lyrics',
          what: 'Voices only, no instruments \u2014 dramatic openings and outro moments.'
        },
        {
          code: 'one-bar drum fill into the chorus',
          kind: 'style',
          what: 'A style-side phrasing of the same idea \u2014 often more reliable than a long bracket instruction.'
        },
        {
          code: 'riser into the drop',
          kind: 'style',
          what: 'The EDM standard transition \u2014 ask for it in style text and mark the sections in Lyrics.'
        },
        {
          code: 'string swell before the final chorus',
          kind: 'style',
          what: 'A cinematic ramp \u2014 strings rising into the last hook.'
        }
      ]
    },
    {
      id: 'character',
      group: 'style',
      icon: '\u25ce',
      title: 'Vocal-character tags',
      summary: 'Words for the voice itself \u2014 timbre and weight. All style text: they steer the singer\u2019s sound, they don\u2019t dial it in.',
      items: [
        {
          code: 'warm and round',
          kind: 'style',
          what: 'Soft, dark, comforting tone.'
        },
        {
          code: 'husky / gravelly / raspy',
          kind: 'style',
          what: 'Textured, worn, characterful \u2014 folk, rock, blues.'
        },
        {
          code: 'breathy',
          kind: 'style',
          what: 'Air mixed with tone \u2014 intimate and soft.'
        },
        {
          code: 'airy',
          kind: 'style',
          what: 'Light, floating, lots of air \u2014 dream pop.'
        },
        {
          code: 'smoky / sultry',
          kind: 'style',
          what: 'Dark, sensual, low-key \u2014 jazz and slow pop.'
        },
        {
          code: 'close-miked / intimate',
          kind: 'style',
          what: 'Right up against the microphone \u2014 small, personal, direct.',
          ex: 'close-miked intimate vocal, minimal production'
        },
        {
          code: 'clean and pure',
          kind: 'style',
          what: 'Untextured, youthful, direct.'
        },
        {
          code: 'childlike / innocent',
          kind: 'style',
          what: 'Light and naive \u2014 lullabies, wonder, nostalgia.'
        },
        {
          code: 'aged / weathered',
          kind: 'style',
          what: 'Older-sounding, lived-in \u2014 storytelling and blues.'
        },
        {
          code: 'crooner',
          kind: 'style',
          what: 'Smooth, mid-range, classic pop phrasing.'
        },
        {
          code: 'classical-trained',
          kind: 'style',
          what: 'Supported tone, vibrato, control \u2014 Carnatic or Western classical colour.'
        },
        {
          code: 'gently ornamented with gamakas',
          kind: 'style',
          what: 'Light Carnatic phrasing \u2014 slides and shakes on key notes, without full classical weight.',
          ex: 'Kannada folk vocal, gently ornamented with gamakas'
        },
        {
          code: 'rock grit',
          kind: 'style',
          what: 'Edge and aggression in the tone \u2014 without screaming.'
        },
        {
          code: 'soft-spoken',
          kind: 'style',
          what: 'Quiet, conversational, unhurried.'
        }
      ]
    },
    {
      id: 'negative',
      group: 'exclude',
      icon: '\u2298',
      title: 'Negative & exclusion instructions',
      summary: 'Say what you don\u2019t want. Short word lists work best in Advanced Options \u2192 Exclude; \u201cno \u2026 / avoid \u2026 / without \u2026\u201d phrases work in style text. Exclusions steer \u2014 they never guarantee.',
      items: [
        {
          code: 'no autotune',
          kind: 'exclude',
          what: 'Asks for natural, unprocessed vocal tuning.'
        },
        {
          code: 'no vocals / instrumental only',
          kind: 'exclude',
          what: 'For instrumentals \u2014 also enable the Instrumental toggle in Custom Mode and keep Lyrics empty.'
        },
        {
          code: 'no distortion',
          kind: 'exclude',
          what: 'Keeps guitars and vocals clean.'
        },
        {
          code: 'no saxophone',
          kind: 'exclude',
          what: 'Kills a default 90s-ballad instrument if it keeps appearing.'
        },
        {
          code: 'no choir',
          kind: 'exclude',
          what: 'Prevents unwanted epic backing vocals.'
        },
        {
          code: 'no spoken intro',
          kind: 'exclude',
          what: 'Starts the song singing.'
        },
        {
          code: 'no long intro',
          kind: 'exclude',
          what: 'Gets to the vocal quickly \u2014 useful for radio-length songs.'
        },
        {
          code: 'no fade-out',
          kind: 'exclude',
          what: 'Wants a firm ending instead of a tail.'
        },
        {
          code: 'no EDM drop',
          kind: 'exclude',
          what: 'For non-dance songs that keep drifting electronic.'
        },
        {
          code: 'no 808s',
          kind: 'exclude',
          what: 'Avoids modern hip-hop bass weight.'
        },
        {
          code: 'no heavy reverb',
          kind: 'exclude',
          what: 'Keeps the mix close and dry.'
        },
        {
          code: 'avoid modern production',
          kind: 'exclude',
          what: 'Pushes toward vintage, organic or lo-fi treatment.'
        },
        {
          code: 'avoid vocal effects',
          kind: 'exclude',
          what: 'No doubling, pitch FX or heavily processed voice.'
        },
        {
          code: 'not a ballad',
          kind: 'exclude',
          what: 'Negative phrasing of a tempo request \u2014 pair it with a positive tempo word too.',
          ex: 'not a ballad \u2014 mid-tempo, upbeat'
        },
        {
          code: 'acoustic only',
          kind: 'exclude',
          what: 'Positive framing beats negative: \u201cacoustic only\u201d works better than \u201cno electric guitar\u201d.'
        },
        {
          code: 'no spoken-word outro',
          kind: 'exclude',
          what: 'Ends instrumentally after the last chorus.'
        }
      ],
      example: 'autotune, saxophone, spoken intro, long fade-out, heavy reverb'
    },
    {
      id: 'metadata',
      group: 'exclude',
      icon: '\u00b6',
      title: 'Metadata & formatting conventions',
      summary: 'Where each piece of the prompt lives, and how to format it so tags are read as tags \u2014 not sung as words.',
      items: [
        {
          code: 'Style of Music',
          kind: 'meta',
          what: 'Sound only \u2014 genre, mood, instruments, vocal, production, tempo. No bracket labels such as [Genre: \u2026] here.',
          ex: 'indie folk, warm male vocal, acoustic guitar, 75 BPM, tape warmth'
        },
        {
          code: 'Lyrics',
          kind: 'meta',
          what: 'The words plus section tags \u2014 tags on their own line, blank line between sections.',
          ex: '[Verse 1]\nYour lines\u2026\n\n[Chorus]\nYour hook\u2026'
        },
        {
          code: 'Title',
          kind: 'meta',
          what: 'Display name only \u2014 it does not shape the music. Keep it short; check the field counter in the UI.'
        },
        {
          code: 'Exclude',
          kind: 'meta',
          what: 'Advanced Options \u2192 Exclude: a comma-separated word list. A steering control, not a guarantee.',
          ex: 'autotune, saxophone, spoken intro'
        },
        {
          code: 'One tag per line',
          kind: 'meta',
          what: 'A bracket tag sharing a line with lyrics is far more likely to be sung as text.'
        },
        {
          code: 'Repeat the chorus verbatim',
          kind: 'meta',
          what: 'Same words for every [Chorus] keeps the hook identical between sections.'
        },
        {
          code: 'Avoid (x2) \u2014 write the line twice',
          kind: 'meta',
          what: 'Community consensus: repetition markers are often ignored or sung. Duplicate the line instead.',
          ex: 'na-na na-na (x2) \u2192 write the line twice'
        },
        {
          code: 'Square brackets [ ] for structure',
          kind: 'meta',
          what: 'Best notation for structural, vocal, instrumental, performance and transition metadata. One tag per line.',
          ex: '[Verse 1]\n[Female Vocal]\nYour lines\u2026'
        },
        {
          code: 'Parentheses ( ) for ad-libs',
          kind: 'meta',
          what: 'Use parentheses for material you want treated as vocalised \u2014 (oh...), (mmm...), (ha ha), (la la la) \u2014 not as a section label.',
          ex: '[Chorus]\nYour hook\n(oh...)'
        },
        {
          code: '{ } and < > are experimental',
          kind: 'meta',
          what: 'Curly braces try to give instructions; angle brackets try to mimic tags. Both are less reliable than [ ] and are often ignored or sung as text.'
        },
        {
          code: 'Short parenthetical cues',
          kind: 'meta',
          what: 'One-to-three words in parentheses \u2014 (whispered), (building), (fading) \u2014 are commonly used under a tag. Community practice, not documented.',
          ex: '[Chorus]\n(rising)\nYour hook\u2026'
        },
        {
          code: 'Empty intro / outro lines',
          kind: 'meta',
          what: 'Leave the line under [Intro] or [Outro] blank, or write (instrumental), for wordless sections.'
        },
        {
          code: 'Language hint in style text',
          kind: 'meta',
          what: '\u201cKannada lyrics\u201d in style text can guide pronunciation and accent; the actual words belong in Lyrics.',
          ex: 'Kannada lyrics, romantic folk ballad'
        },
        {
          code: 'No instructions in brackets',
          kind: 'meta',
          what: 'Long sentences like [make this sadder] blur the line between tag and lyric \u2014 put directions in style text instead.'
        },
        {
          code: 'Use the Suno Prompt Builder',
          kind: 'meta',
          what: 'Raaga Studio\u2019s Suno Prompt tab builds Style, Lyrics and Exclude as separate copy-ready fields \u2014 this page is the vocabulary for it.',
          ex: 'Open the Suno Prompt tab \u2192 paste Style text \u2192 copy fields into Custom Mode'
        }
      ],
      example: 'STYLE OF MUSIC \u2192 sound only: genre, mood, instruments, vocal, production, tempo\nLYRICS \u2192 words + [section tags], one tag per line\nTITLE \u2192 display name only\nEXCLUDE (Advanced Options) \u2192 comma-separated things to steer away from'
    }
  ];

  // ─── Copy-ready starter templates ─────────────────────────────────────────
  var TEMPLATES = [
    {
      id: 'kannada-ballad',
      title: 'Kannada bhavageete ballad',
      note: 'Warm, intimate, classical-flavoured. Swap the placeholder lines for your own words.',
      style: 'Kannada bhavageete ballad, gentle acoustic guitar, bansuri flute, tanpura drone, warm male vocal, intimate and nostalgic, 72 BPM, organic production, soft strings',
      lyrics: '[Intro]\n(bansuri, soft tanpura)\n\n[Verse 1]\nತೋಟದ ಹಾದಿಯಲಿ ನಿನ್ನ ನೆನಪು\nಗಾಳಿಯ ಮಾತಿನಲಿ ನಿನ್ನ ನಗುವು\n\n[Chorus]\nಬಾ ಬಾ ಎನ್ನ ಮನದ ಹೂವೇ\nನಿನ್ನ ಕಣ್ಣಲಿ ದೀಪ ಉರಿಯೇ\n\n[Verse 2]\nಸಂಜೆಯ ಮೌನದಲಿ ನಿನ್ನ ಕರೆ\nರಾತ್ರಿಯ ಕನಸಿನಲಿ ನಿನ್ನ ನಗೆ\n\n[Chorus]\nಬಾ ಬಾ ಎನ್ನ ಮನದ ಹೂವೇ\nನಿನ್ನ ಕಣ್ಣಲಿ ದೀಪ ಉರಿಯೇ\n\n[Bridge]\nಹೇಳದ ಮಾತುಗಳು ನನ್ನೊಳಗೆ\nಹಾಡಿನ ಹೆಜ್ಜೆಗಳು ನಿನ್ನೆಡೆಗೆ\n\n[Final Chorus]\nಬಾ ಬಾ ಎನ್ನ ಮನದ ಹೂವೇ\nನಿನ್ನ ಕಣ್ಣಲಿ ದೀಪ ಉರಿಯೇ\n\n[Outro]\n(tanpura fades)'
    },
    {
      id: 'carnatic-fusion',
      title: 'Carnatic fusion devotional',
      note: 'Raga colour + modern arrangement. Swap in your own raga from the Raga Reference tab.',
      style: 'Carnatic fusion, Hamsadhwani raga feel, mridangam, bansuri flute, synth pads, tanpura drone, layered female vocals, devotional and uplifting, 96 BPM, modern yet organic production',
      lyrics: '[Intro]\n(tanpura drone, flute)\n\n[Verse 1]\nಪಾವನ ಮನವೆ ನಿನ್ನ ನಾಮವೆ\nಪ್ರೀತಿಯ ಕಣ್ಣಾಡಿಗೆ ನೀ ಕಾನುವೆ\n\n[Chorus]\nಶರಣು ಶರಣು ಎನ್ನ ಕುಲಿತಾ\nನಿನ್ನ ನಾಮವೆ ದೀಪತ ಇರಿಯು\n\n[Verse 2]\nದಿಂಡಿಮ ಮಿಳುವು ಗಾನಕೆ\nನಿನ್ನ ನೆರಿಯೆ ಎನ್ನ ತೊಳೆಗೆ\n\n[Chorus]\nಶರಣು ಶರಣು ಎನ್ನ ಕುಲಿತಾ\nನಿನ್ನ ನಾಮವೆ ದೀಪತ ಇರಿಯು\n\n[Instrumental Interlude]\n(mridangam and flute)\n\n[Outro]\n(tanpura fades)'
    },
    {
      id: 'modern-pop',
      title: 'Modern pop with a drop',
      note: 'Verse-chorus with an EDM-style build and drop \u2014 useful for any upbeat Kannada or English pop track.',
      style: 'modern pop, uplifting, layered female vocals, piano, synth pads, four-on-the-floor, 118 BPM, polished studio mix, wide stereo, big chorus, tight and punchy',
      lyrics: '[Intro]\n(synth build)\n\n[Verse 1]\nYour opening lines here\nKeep them short and conversational\n\n[Pre-Chorus]\n(rising)\nBuilding to the hook\u2026\n\n[Chorus]\nYour big hook line\nWrite it to be remembered\n\n[Post-Chorus]\nna-na-na, na-na-na\n\n[Verse 2]\nYour second verse here\nA new detail, same energy\n\n[Pre-Chorus]\n(rising)\nBuilding again\u2026\n\n[Chorus]\nYour big hook line\nSame words as the first time\n\n[Bridge]\n(quieter)\nA moment of contrast\u2026\n\n[Final Chorus]\nEverything in\u2026\n\n[Outro]\n(fade out)'
    }
  ];

  // Expose data + kind map for reuse and tests.
  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.SUNO_CHEATS = CATEGORIES;
  window.RaagaStudio.SUNO_CHEATS_KINDS = KIND;
  window.RaagaStudio.SUNO_CHEATS_NOTATION = NOTATION;
  window.RaagaStudio.SUNO_CHEAT_TEMPLATES = TEMPLATES;

  // ─── Page metadata (hash-routed SPA: one URL, one dynamic title) ─────────
  var PAGE_META = {
    title: 'Suno Cheat Codes & Meta Tags \u00b7 Raaga Studio',
    description: 'Searchable Suno prompt reference with a click-to-insert lyrics pad: [ ] structure, vocal, Carnatic, percussion, electronic, solo, dynamics and ending tags; ( ) ad-libs; experimental { } and < > notation; plus Style of Music and Exclude wording.',
    keywords: 'Suno cheat codes, Suno meta tags, Suno prompt tags, Suno style of music, Suno lyrics section tags, AI music prompts, Suno exclude, Suno custom mode, music generation tags'
  };
  var SITE_META = {
    title: 'Raaga Studio \u00b7 Compose \u2192 Mix \u2192 Master',
    description: 'Free in-browser studio for Kannada music: Suno prompt builder, raga reference, vocal EQ cheat sheet, mix and master check, tempo lab and more.',
    keywords: 'Raaga Studio, Kannada music, Suno prompt builder, vocal EQ, mix check, master check, raga reference, tempo lab'
  };

  // ─── State / helpers ──────────────────────────────────────────────────────
  var filter = 'all';
  var notationFilter = 'all';
  var query = '';

  function $(id) { return document.getElementById(id); }

  function inferNotation(code) {
    var s = String(code || '').trim();
    var ch = s.charAt(0);
    if (ch === '[') return 'bracket';
    if (ch === '(') return 'paren';
    if (ch === '{') return 'brace';
    if (ch === '<') return 'angle';
    return 'plain';
  }

  function itemNotation(it) {
    return it.notation || inferNotation(it.code);
  }

  function catGroup(c) {
    if (c.group) return c.group;
    if (c.items && c.items.length && c.items[0].kind === 'lyrics') return 'lyrics';
    if (c.id === 'negative' || c.id === 'metadata') return 'exclude';
    return 'style';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  function kindLabel(k) { return (KIND[k] || KIND.style).label; }

  function itemHaystack(it) {
    return [it.code, it.what, it.ex, kindLabel(it.kind)].join(' ').toLowerCase();
  }

  function matchesItem(it) {
    if (filter !== 'all' && it.kind !== filter) return false;
    if (notationFilter !== 'all' && itemNotation(it) !== notationFilter) return false;
    if (query && itemHaystack(it).indexOf(query) < 0) return false;
    return true;
  }

  function visibleItems(c) {
    if (!query && filter === 'all' && notationFilter === 'all') return c.items;
    return c.items.filter(matchesItem);
  }

  function matchesCategory(c) {
    if (query) {
      var hay = [c.title, c.summary, c.example].join(' ').toLowerCase();
      if (hay.indexOf(query) < 0 && visibleItems(c).length === 0) return false;
    }
    return visibleItems(c).length > 0;
  }

  // ─── Rendering ───────────────────────────────────────────────────────────
  function kindBadge(kind) {
    var k = KIND[kind] || KIND.style;
    return '<span class="sc-kind ' + k.cls + '">' + escapeHtml(k.label) + '</span>';
  }

  function catLink(d) {
    return '<button type="button" class="sc-toc-link" data-target="' + escapeAttr(d.id) + '" ' +
      'aria-label="Jump to ' + escapeAttr(d.title) + '">' +
      '<span class="sc-toc-ico" aria-hidden="true">' + d.icon + '</span>' +
      '<span>' + escapeHtml(d.title) + '</span></button>';
  }

  function itemHtml(it, catIndex, itemIndex) {
    var ex = it.ex
      ? '<p class="sc-item-ex"><span class="sc-ex-label">Example</span><code>' + escapeHtml(it.ex) + '</code></p>'
      : '';
    return '<div class="sc-item">' +
      '<div class="sc-item-head">' +
        '<code class="sc-code" tabindex="0" data-insert="' + escapeAttr(it.code) + '" title="Click to insert into the lyrics pad">' + escapeHtml(it.code) + '</code>' +
        kindBadge(it.kind) +
        '<span class="sc-item-actions">' +
          '<button type="button" class="btn sm sc-insert" data-insert="' + escapeAttr(it.code) + '" ' +
            'aria-label="Insert ' + escapeAttr(it.code) + ' into lyrics pad">Insert</button>' +
          '<button type="button" class="btn sm sc-copy" data-c="' + catIndex + '" data-i="' + itemIndex + '" ' +
            'aria-label="Copy ' + escapeAttr(it.code) + '">Copy</button>' +
        '</span>' +
      '</div>' +
      '<p class="sc-item-what">' + escapeHtml(it.what) + '</p>' +
      ex +
    '</div>';
  }

  function chipHtml(it, catIndex, itemIndex) {
    return '<span class="sc-chip" data-insert="' + escapeAttr(it.code) + '" title="' + escapeAttr(it.what) + '">' +
      '<code>' + escapeHtml(it.code) + '</code>' +
      '<button type="button" class="sc-chip-copy sc-copy" data-c="' + catIndex + '" data-i="' + itemIndex + '" ' +
        'aria-label="Copy ' + escapeAttr(it.code) + '">Copy</button>' +
    '</span>';
  }

  function categoryHtml(c, catIndex) {
    var shown = 0;
    var itemsHtml = '';
    c.items.forEach(function (it, i) {
      if (!matchesItem(it)) return;
      shown++;
      itemsHtml += (c.layout === 'chips' ? chipHtml(it, catIndex, i) : itemHtml(it, catIndex, i));
    });
    if (!shown) return '';

    var example = '';
    if (c.example && (!query || String(c.example).toLowerCase().indexOf(query) >= 0)) {
      example =
        '<div class="sc-cat-example">' +
          '<div class="sc-cat-example-head">' +
            '<span class="sc-ex-label">Example</span>' +
            '<button type="button" class="btn sm" data-copy-example="' + catIndex + '">Copy template</button>' +
          '</div>' +
          '<pre class="sc-block">' + escapeHtml(c.example) + '</pre>' +
        '</div>';
    }

    return '<section class="sc-cat" id="sc-' + escapeAttr(c.id) + '" aria-labelledby="sc-' + escapeAttr(c.id) + '-title">' +
      '<header class="sc-cat-head">' +
        '<span class="sc-cat-ico" aria-hidden="true">' + c.icon + '</span>' +
        '<div class="sc-cat-copy">' +
          '<h3 id="sc-' + escapeAttr(c.id) + '-title">' + escapeHtml(c.title) + '</h3>' +
          '<p>' + escapeHtml(c.summary) + '</p>' +
        '</div>' +
        '<button type="button" class="btn sm sc-cat-copy-all" data-copy-cat="' + catIndex + '">Copy all</button>' +
      '</header>' +
      '<' + (c.layout === 'chips' ? 'div class="sc-chips"' : 'div class="sc-items"') + '>' + itemsHtml + '</div>' +
      example +
    '</section>';
  }

  function templateHtml(t, tIndex) {
    return '<article class="sc-template" id="sc-template-' + escapeAttr(t.id) + '">' +
      '<header class="sc-template-head">' +
        '<div>' +
          '<h4>' + escapeHtml(t.title) + '</h4>' +
          '<p>' + escapeHtml(t.note) + '</p>' +
        '</div>' +
        '<button type="button" class="btn sm" data-copy-template="' + tIndex + '">Copy all fields</button>' +
      '</header>' +
      '<div class="sc-template-fields">' +
        '<div class="sc-template-field">' +
          '<div class="sc-template-field-head"><span class="sc-ex-label">Style of Music</span>' +
            '<button type="button" class="btn sm" data-copy-tfield="' + tIndex + '" data-field="style">Copy</button></div>' +
          '<pre class="sc-block sc-block-style">' + escapeHtml(t.style) + '</pre>' +
        '</div>' +
        '<div class="sc-template-field">' +
          '<div class="sc-template-field-head"><span class="sc-ex-label">Lyrics</span>' +
            '<button type="button" class="btn sm" data-copy-tfield="' + tIndex + '" data-field="lyrics">Copy</button></div>' +
          '<pre class="sc-block sc-block-lyrics">' + escapeHtml(t.lyrics) + '</pre>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderToc(list) {
    var toc = $('sc-toc');
    if (!toc) return;
    if (!list.length) { toc.innerHTML = ''; return; }
    var html = '<span class="sc-toc-label" id="sc-toc-label">Jump to a category</span>';
    TOC_GROUPS.forEach(function (g) {
      var inGroup = list.filter(function (c) { return catGroup(c) === g.id; });
      if (!inGroup.length) return;
      html += '<span class="sc-toc-group">';
      html += '<span class="sc-toc-group-label">' + escapeHtml(g.label) + '</span>';
      html += inGroup.map(catLink).join('');
      html += '</span>';
    });
    // Any category without a recognised group still appears.
    var leftover = list.filter(function (c) {
      return !TOC_GROUPS.some(function (g) { return catGroup(c) === g.id; });
    });
    if (leftover.length) html += leftover.map(catLink).join('');
    toc.innerHTML = html;
    toc.querySelectorAll('.sc-toc-link').forEach(function (b) {
      b.addEventListener('click', function () {
        var target = $('sc-' + b.getAttribute('data-target'));
        if (target && target.scrollIntoView) {
          try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          catch (e) { target.scrollIntoView(true); }
        }
      });
    });
  }

  function render() {
    var wrap = $('sc-categories');
    var count = $('sc-count');
    if (!wrap) return;

    var visible = CATEGORIES.filter(matchesCategory);
    var tagTotal = 0;
    visible.forEach(function (c) { tagTotal += visibleItems(c).length; });

    wrap.innerHTML = visible.length
      ? visible.map(function (c) { return categoryHtml(c, CATEGORIES.indexOf(c)); }).join('')
      : '<div class="panel sc-empty"><h3>No tags found</h3>' +
        '<p>Try a keyword like \u201cbreathy\u201d, \u201cchorus\u201d, \u201cno autotune\u201d, or clear the search.</p></div>';

    if (count) {
      count.textContent = visible.length
        ? tagTotal + ' tag' + (tagTotal === 1 ? '' : 's') + ' \u00b7 ' +
          visible.length + ' categor' + (visible.length === 1 ? 'y' : 'ies') + ' shown'
        : '';
    }

    renderToc(visible);
    bindCopies(wrap);
  }

  function bindCopies(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.sc-copy').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        var c = CATEGORIES[Number(b.getAttribute('data-c'))];
        var it = c && c.items[Number(b.getAttribute('data-i'))];
        if (it) copyText(it.code, '\u201c' + it.code + '\u201d copied.');
      });
    });
    root.querySelectorAll('[data-copy-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = CATEGORIES[Number(b.getAttribute('data-copy-cat'))];
        if (!c) return;
        copyText(visibleItems(c).map(function (it) { return it.code; }).join('\n'),
          c.title + ' tags copied.');
      });
    });
    root.querySelectorAll('[data-copy-example]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = CATEGORIES[Number(b.getAttribute('data-copy-example'))];
        if (c && c.example) copyText(c.example, c.title + ' example copied.');
      });
    });
    root.querySelectorAll('[data-insert]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        if (ev && ev.target && ev.target.closest && ev.target.closest('.sc-copy')) return;
        var value = b.getAttribute('data-insert');
        if (value) insertIntoPad(value);
      });
    });
  }

  function renderTemplates() {
    var wrap = $('sc-templates');
    if (!wrap) return;
    wrap.innerHTML =
      '<header class="sc-templates-head">' +
        '<span class="sc-cat-ico" aria-hidden="true">\u2605</span>' +
        '<div><h3>Starter templates \u2014 copy, tweak, generate</h3>' +
        '<p>Three complete examples that combine this page\u2019s tags into ready-to-paste Suno fields.</p></div>' +
      '</header>' +
      TEMPLATES.map(function (t, i) { return templateHtml(t, i); }).join('');
    wrap.querySelectorAll('[data-copy-tfield]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = TEMPLATES[Number(b.getAttribute('data-copy-tfield'))];
        if (!t) return;
        var field = b.getAttribute('data-field');
        copyText(t[field], (field === 'style' ? 'Style of Music' : 'Lyrics') + ' copied from \u201c' + t.title + '\u201d.');
      });
    });
    wrap.querySelectorAll('[data-copy-template]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = TEMPLATES[Number(b.getAttribute('data-copy-template'))];
        if (!t) return;
        copyText('STYLE OF MUSIC\n' + t.style + '\n\nLYRICS\n' + t.lyrics,
          '\u201c' + t.title + '\u201d fields copied.');
      });
    });
  }

  // ─── Lyrics pad ──────────────────────────────────────────────────────────
  function padEl() { return $('sc-pad-text'); }

  function updatePadMeta() {
    var el = padEl();
    var meta = $('sc-pad-meta');
    if (!el || !meta) return;
    var raw = String(el.value || '');
    var lines = raw ? raw.split('\n').length : 0;
    var chars = raw.length;
    meta.textContent = raw.trim() ? (lines + ' line' + (lines === 1 ? '' : 's') + ' \u00b7 ' + chars + ' chars') : 'Empty';
  }

  function savePad() {
    var el = padEl();
    if (!el) return;
    try { localStorage.setItem(LS_PAD, el.value); } catch (e) {}
    updatePadMeta();
  }

  function loadPad() {
    var el = padEl();
    if (!el) return;
    try {
      var saved = localStorage.getItem(LS_PAD);
      if (saved) el.value = saved;
    } catch (e) {}
    updatePadMeta();
  }

  function insertIntoPad(value) {
    var el = padEl();
    if (!el) {
      copyText(value, '\u201c' + value + '\u201d copied.');
      return;
    }
    var current = el.value || '';
    var start = typeof el.selectionStart === 'number' ? el.selectionStart : current.length;
    var end = typeof el.selectionEnd === 'number' ? el.selectionEnd : start;
    var before = current.slice(0, start);
    var after = current.slice(end);
    var prefix = '';
    if (before && !/\n$/.test(before)) prefix = '\n';
    var next = before + prefix + value + '\n' + after.replace(/^\n/, '');
    el.value = next;
    var caret = (before + prefix + value + '\n').length;
    if (typeof el.setSelectionRange === 'function') {
      try { el.setSelectionRange(caret, caret); } catch (e) {}
    }
    if (typeof el.focus === 'function') {
      try { el.focus(); } catch (e2) {}
    }
    savePad();
    flash('\u201c' + value + '\u201d inserted.');
  }

  function sendPadToSuno() {
    var el = padEl();
    var lyrics = el ? String(el.value || '').trim() : '';
    if (!lyrics) { flash('Write or insert some lyrics first.'); return; }
    if (window.SUNO_PROMPTS && typeof window.SUNO_PROMPTS.getState === 'function' &&
        typeof window.SUNO_PROMPTS.loadState === 'function') {
      var state = window.SUNO_PROMPTS.getState();
      state.lyrics = lyrics;
      window.SUNO_PROMPTS.loadState(state);
    } else {
      var target = $('sp-lyrics');
      if (target) target.value = lyrics;
    }
    if (window.RaagaStudio && window.RaagaStudio.switchTo) {
      window.RaagaStudio.switchTo('suno', true);
    }
    flash('Lyrics sent to the Suno Prompt tab.');
  }

  function setNotationFilter(value) {
    notationFilter = value || 'all';
    var wrap = $('sc-notation-filters');
    if (wrap && wrap.querySelectorAll) {
      wrap.querySelectorAll('[data-notation]').forEach(function (b) {
        var on = b.getAttribute('data-notation') === notationFilter;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    render();
  }

  // ─── Clipboard + toast ───────────────────────────────────────────────────
  function copyText(text, message) {
    if (!String(text || '').trim()) { flash('Nothing to copy yet.'); return; }
    function success() { flash(message); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        if (ok) success();
        else flash('Copy failed \u2014 select the text and copy it manually.');
      } catch (e) { flash('Copy failed \u2014 select the text and copy it manually.'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(success).catch(fallback);
    } else {
      fallback();
    }
  }

  function flash(message) {
    var el = $('sc-flash');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ─── Page metadata on tab activation (hash-routed SPA) ───────────────────
  function applyMeta(onThisPage) {
    try {
      document.title = onThisPage ? PAGE_META.title : SITE_META.title;
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute('content', onThisPage ? PAGE_META.description : SITE_META.description);
      var mk = document.querySelector('meta[name="keywords"]');
      if (mk) mk.setAttribute('content', onThisPage ? PAGE_META.keywords : SITE_META.keywords);
    } catch (e) { /* title/meta are enhancements only */ }
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  function init() {
    var search = $('sc-search');
    if (search) {
      search.addEventListener('input', function () {
        query = search.value.trim().toLowerCase();
        render();
      });
    }

    var filters = $('sc-filters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-filter]');
        if (!btn) return;
        filter = btn.getAttribute('data-filter');
        filters.querySelectorAll('[data-filter]').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        render();
      });
    }

    var notationFilters = $('sc-notation-filters');
    if (notationFilters) {
      notationFilters.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-notation]');
        if (!btn) return;
        setNotationFilter(btn.getAttribute('data-notation'));
      });
    }

    document.querySelectorAll('[data-notation-jump]').forEach(function (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-insert]')) return;
        setNotationFilter(card.getAttribute('data-notation-jump'));
        var toc = $('sc-toc');
        if (toc && toc.scrollIntoView) {
          try { toc.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          catch (err) { toc.scrollIntoView(true); }
        }
      });
    });

    document.querySelectorAll('.sc-mini-tag[data-insert]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        insertIntoPad(b.getAttribute('data-insert'));
      });
    });

    var pad = padEl();
    if (pad) {
      loadPad();
      pad.addEventListener('input', savePad);
    }
    var padCopy = $('sc-pad-copy');
    if (padCopy) padCopy.addEventListener('click', function () {
      var el = padEl();
      copyText(el ? el.value : '', 'Lyrics pad copied.');
    });
    var padSuno = $('sc-pad-suno');
    if (padSuno) padSuno.addEventListener('click', sendPadToSuno);
    var padClear = $('sc-pad-clear');
    if (padClear) padClear.addEventListener('click', function () {
      var el = padEl();
      if (!el) return;
      if (el.value && typeof confirm === 'function' && !confirm('Clear the lyrics pad?')) return;
      el.value = '';
      savePad();
      flash('Lyrics pad cleared.');
    });
    document.querySelectorAll('[data-skeleton]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-skeleton');
        var skel = PAD_SKELETONS[key];
        var el = padEl();
        if (!skel || !el) return;
        if (el.value.trim() && typeof confirm === 'function' &&
            !confirm('Replace the lyrics pad with the ' + key + ' skeleton?')) return;
        el.value = skel;
        savePad();
        flash('Skeleton inserted — write lyrics under each tag.');
      });
    });

    // Cross-tab jump (same pattern as Raga Reference's "Use in Suno prompt").
    var jump = document.querySelector('[data-jump-tab]');
    if (jump) {
      jump.addEventListener('click', function () {
        if (window.RaagaStudio && window.RaagaStudio.switchTo) {
          window.RaagaStudio.switchTo(jump.getAttribute('data-jump-tab'), true);
        }
      });
    }

    // nav.js dispatches 'raaga:tab' on window, so listen there.
    if (window.addEventListener) {
      window.addEventListener('raaga:tab', function (ev) {
        applyMeta(ev && ev.detail === 'suno-cheats');
      });
    }
    // If this page is already the active tab (deep link) when scripts load.
    if (window.location && String(window.location.hash || '').indexOf('suno-cheats') >= 0) {
      applyMeta(true);
    }

    render();
    renderTemplates();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
