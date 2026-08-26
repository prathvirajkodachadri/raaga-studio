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

  // ─── Reference data ───────────────────────────────────────────────────────
  // kind: lyrics | style | exclude | meta   (see KIND above)
  // code: the exact text to type (or a short rule name for meta items)
  // what: one-sentence explanation of what it does / why it helps
  // ex  : optional short usage example (rendered under the item)
  // example: optional category-level copy-ready block at the end of the card
  var CATEGORIES = [
    {
      id: 'techniques',
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
          code: '[Verse 1] / [Verse 2]',
          kind: 'lyrics',
          what: 'Storytelling sections. Numbering tells the model these are separate verses, not one long block.',
          ex: '[Verse 2]\nYour second verse here'
        },
        {
          code: '[Pre-Chorus]',
          kind: 'lyrics',
          what: 'A short lift before the chorus \u2014 builds tension and raises energy.',
          ex: '[Pre-Chorus]\n(rising)'
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
          code: '[Hook]',
          kind: 'lyrics',
          what: 'A short, catchy repeated phrase \u2014 hip-hop\u2019s version of a chorus.'
        },
        {
          code: '[Refrain]',
          kind: 'lyrics',
          what: 'A repeated line or couplet inside a verse \u2014 smaller than a full chorus.'
        },
        {
          code: '[Bridge]',
          kind: 'lyrics',
          what: 'One-off contrasting section, usually near the end \u2014 new melody or key.'
        },
        {
          code: '[Interlude] / [Instrumental Interlude]',
          kind: 'lyrics',
          what: 'A transitional instrumental moment between two major sections.'
        },
        {
          code: '[Instrumental] / [Instrumental Break]',
          kind: 'lyrics',
          what: 'No vocals for this section \u2014 useful for solos, tags and breathing room.'
        },
        {
          code: '[Break]',
          kind: 'lyrics',
          what: 'A short gap; the arrangement often strips back for a beat or two.'
        },
        {
          code: '[Build] / [Build-Up]',
          kind: 'lyrics',
          what: 'Rising tension before a drop (electronic genres).'
        },
        {
          code: '[Drop]',
          kind: 'lyrics',
          what: 'The high-energy dance section \u2014 leave its lyrics empty so nothing gets sung over it.',
          ex: '[Drop]\n(instrumental)'
        },
        {
          code: '[Breakdown]',
          kind: 'lyrics',
          what: 'A quiet or sparse section before energy returns.'
        },
        {
          code: '[Solo] / [Guitar Solo]',
          kind: 'lyrics',
          what: 'An instrumental solo moment \u2014 naming the instrument helps it show up.',
          ex: '[Sax Solo]\n(instrumental)'
        },
        {
          code: '[Outro]',
          kind: 'lyrics',
          what: 'Winds the song down; leave it blank for a purely instrumental ending.'
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
      icon: '\u266b',
      title: 'Vocal & performance tags',
      summary: 'Who sings, how they sing, and what happens between the lines \u2014 bracket markers for the Lyrics field.',
      items: [
        {
          code: '[Female Vocals] / [Male Vocals]',
          kind: 'lyrics',
          what: 'Sets the featured voice \u2014 often the fastest fix when the default singer is wrong.',
          ex: '[Verse 1]\n[Female Vocals]\nYour lines\u2026'
        },
        {
          code: '[Duet] / [Male & Female Vocals]',
          kind: 'lyrics',
          what: 'Splits the parts between two voices.'
        },
        {
          code: '[Choir] / [Group Vocals]',
          kind: 'lyrics',
          what: 'Multiple voices, ensemble feel \u2014 good for devotional or anthemic moments.'
        },
        {
          code: '[Falsetto]',
          kind: 'lyrics',
          what: 'High, airy head-voice singing.'
        },
        {
          code: '[Belting]',
          kind: 'lyrics',
          what: 'Powerful, full-chest singing for a big chorus.'
        },
        {
          code: '[Whisper] / [Whispered]',
          kind: 'lyrics',
          what: 'Quiet, intimate delivery close to the microphone.'
        },
        {
          code: '[Spoken Word]',
          kind: 'lyrics',
          what: 'Talking instead of singing \u2014 intros, dramatic moments, spoken bridges.'
        },
        {
          code: '[Rapping]',
          kind: 'lyrics',
          what: 'Rhythmic spoken delivery \u2014 works under a verse tag.',
          ex: '[Verse 1]\n[Rapping]\nYour bars\u2026'
        },
        {
          code: '[Harmonies] / [Layered Vocals]',
          kind: 'lyrics',
          what: 'Doubled or stacked vocal lines behind the lead.'
        },
        {
          code: '[Ad-lib]',
          kind: 'lyrics',
          what: 'Short background interjections (\u201cyeah\u201d, \u201chey\u201d, \u201coh\u201d) behind the main line.',
          ex: '[Ad-lib]\n(yeah, come on)'
        },
        {
          code: '[Screaming] / [Growl]',
          kind: 'lyrics',
          what: 'Distorted, aggressive delivery for rock or metal moments.'
        },
        {
          code: '[Operatic]',
          kind: 'lyrics',
          what: 'Classically trained, full-vibrato singing.'
        },
        {
          code: '[Scatting]',
          kind: 'lyrics',
          what: 'Improvised wordless syllables in a jazz style.'
        },
        {
          code: '[Humming]',
          kind: 'lyrics',
          what: 'Wordless humming \u2014 pretty for intros, outros and quiet hooks.'
        }
      ]
    },
    {
      id: 'genre',
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
      icon: '\u21c4',
      title: 'Transition & section tags',
      summary: 'Links between sections \u2014 fills, solos and swells. Bracketed transitions are community-tested; style-side wording is safer for complex moves.',
      items: [
        {
          code: '[Drum Fill]',
          kind: 'lyrics',
          what: 'A drum flourish into the next section \u2014 also write (drum fill) under a section tag.',
          ex: '[Drum Fill]\n(instrumental)'
        },
        {
          code: '[Riser]',
          kind: 'lyrics',
          what: 'A rising sweep of energy before a drop or chorus.'
        },
        {
          code: '[Fade In] / [Fade Out]',
          kind: 'lyrics',
          what: 'Bookends the fade. For a fade-out, [Outro] + (fade out) is a common alternative.'
        },
        {
          code: '[Guitar Solo] / [Sax Solo] / [Violin Solo]',
          kind: 'lyrics',
          what: 'A named instrumental solo \u2014 the instrument word helps it materialise.',
          ex: '[Guitar Solo]\n(16 bars, building)'
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
  window.RaagaStudio.SUNO_CHEAT_TEMPLATES = TEMPLATES;

  // ─── Page metadata (hash-routed SPA: one URL, one dynamic title) ─────────
  var PAGE_META = {
    title: 'Suno Cheat Codes & Meta Tags \u00b7 Raaga Studio',
    description: 'Searchable Suno prompt reference: song structure tags, vocal and genre tags, mood, instrumentation, production, tempo, atmosphere, negative instructions and formatting conventions for Suno Custom Mode.',
    keywords: 'Suno cheat codes, Suno meta tags, Suno prompt tags, Suno style of music, Suno lyrics section tags, AI music prompts, Suno exclude, Suno custom mode, music generation tags'
  };
  var SITE_META = {
    title: 'Raaga Studio \u00b7 Compose \u2192 Mix \u2192 Master',
    description: 'Free in-browser studio for Kannada music: Suno prompt builder, raga reference, vocal EQ cheat sheet, mix and master check, tempo lab and more.',
    keywords: 'Raaga Studio, Kannada music, Suno prompt builder, vocal EQ, mix check, master check, raga reference, tempo lab'
  };

  // ─── State / helpers ──────────────────────────────────────────────────────
  var filter = 'all';
  var query = '';

  function $(id) { return document.getElementById(id); }

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
    if (query && itemHaystack(it).indexOf(query) < 0) return false;
    return true;
  }

  function visibleItems(c) {
    if (!query && filter === 'all') return c.items;
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
        '<code class="sc-code" tabindex="0">' + escapeHtml(it.code) + '</code>' +
        kindBadge(it.kind) +
        '<button type="button" class="btn sm sc-copy" data-c="' + catIndex + '" data-i="' + itemIndex + '" ' +
          'aria-label="Copy ' + escapeAttr(it.code) + '">Copy</button>' +
      '</div>' +
      '<p class="sc-item-what">' + escapeHtml(it.what) + '</p>' +
      ex +
    '</div>';
  }

  function categoryHtml(c, catIndex) {
    var shown = 0;
    var itemsHtml = '';
    c.items.forEach(function (it, i) {
      if (!matchesItem(it)) return;
      shown++;
      itemsHtml += itemHtml(it, catIndex, i); // original index, so copy buttons stay correct
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
      '<div class="sc-items">' + itemsHtml + '</div>' +
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
    toc.innerHTML = list.length
      ? '<span class="sc-toc-label" id="sc-toc-label">Jump to a category</span>' +
        list.map(catLink).join('')
      : '';
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
      b.addEventListener('click', function () {
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
