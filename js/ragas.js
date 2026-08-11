/**
 * ragas.js — Carnatic & Hindustani Raga database, Swara audio synthesizer
 * and virtual acoustic Tanpura drone engine (Web Audio API).
 *
 * Exposes window.RAGAS
 */
'use strict';

(function (root) {
  // ─── Swara frequency ratios relative to tonic Sa (1.0) ───────────────────
  // Just Intonation / 22-Shruti / 12-semitone ratios
  var SWARA_SEMITONES = {
    'S': 0,   // Shadja
    'R1': 1,  // Shuddha Rishabha (Carnatic) / Komal Re (Hindustani)
    'R2': 2,  // Chatushruti Rishabha / Shuddha Re
    'R3': 3,  // Shatshruti Rishabha
    'G1': 2,  // Shuddha Gandhara (Carnatic)
    'G2': 3,  // Sadharana Gandhara / Komal Ga
    'G3': 4,  // Antara Gandhara / Shuddha Ga
    'M1': 5,  // Shuddha Madhyama / Shuddha Ma
    'M2': 6,  // Prati Madhyama / Teevra Ma
    'P': 7,   // Panchama
    'D1': 8,  // Shuddha Dhaivata / Komal Dha
    'D2': 9,  // Chatushruti Dhaivata / Shuddha Dha
    'D3': 10, // Shatshruti Dhaivata
    'N1': 9,  // Shuddha Nishada
    'N2': 10, // Kaishiki Nishada / Komal Ni
    'N3': 11, // Kakali Nishada / Shuddha Ni
    'S^': 12, // Tara Shadja (Higher Sa)
    'S.': -12 // Mandra Shadja (Lower Sa)
  };

  var NOTE_FREQS = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
  };

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // ─── Raga Database ────────────────────────────────────────────────────────
  var RAGA_LIST = [
    {
      id: 'hamsadhwani',
      name: 'Hamsadhwani (ಹಂಸಧ್ವನಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: 'Parent: 29 Shankarabharanam / Bilawal',
      arohana: 'S R2 G3 P N3 S^',
      avarohana: 'S^ N3 P G3 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₃ ಪ ನಿ₃ ಸ',
      westernIntervals: '1, 2, 3, 5, 7 (Pentatonic Major 7th)',
      firstString: 'P',
      rasa: 'Uplifting, Auspicious, Devotional (ಭಕ್ತಿ, ಉತ್ಸಾಹ)',
      time: 'Any time / Evening concert opener',
      songs: 'Vatapi Ganapatim, Vinayaka Ninu, Kannada devotional songs',
      sunoTag: 'raga Hamsadhwani, bright auspicious Carnatic melody, pentatonic flute and violin lead'
    },
    {
      id: 'mohanam',
      name: 'Mohanam / Bhoopali (ಮೋಹನ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: 'Parent: 28 Harikambhoji / Kalyan thaat',
      arohana: 'S R2 G3 P D2 S^',
      avarohana: 'S^ D2 P G3 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₃ ಪ ಧ₂ ಸ',
      westernIntervals: '1, 2, 3, 5, 6 (Major Pentatonic)',
      firstString: 'P',
      rasa: 'Romantic, Soothing, Nostalgic (ಶೃಂಗಾರ, ಶಾಂತ)',
      time: 'Evening / Sunset',
      songs: 'Ninnu Kori (Varnam), Mohana Rama, numerous Kannada Bhavageethe',
      sunoTag: 'raga Mohanam (Bhoopali), warm major pentatonic, evocative acoustic veena and bansuri'
    },
    {
      id: 'kalyani',
      name: 'Kalyani / Yaman (ಕಲ್ಯಾಣಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: '65 Mechakalyani / Kalyan thaat',
      arohana: 'S R2 G3 M2 P D2 N3 S^',
      avarohana: 'S^ N3 D2 P M2 G3 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₃ ಮ₂ ಪ ಧ₂ ನಿ₃ ಸ',
      westernIntervals: '1, 2, 3, #4, 5, 6, 7 (Lydian Mode)',
      firstString: 'P',
      rasa: 'Grand, Auspicious, Joyful (ಕರುಣ, ಭಕ್ತಿ, ಶೃಂಗಾರ)',
      time: 'Evening / First quarter of night',
      songs: 'Nidhi Chala Sukhama, Himadri Suthe, classic Kannada film hits',
      sunoTag: 'raga Kalyani (Yaman), grand Lydian mode, rich Carnatic strings and devotional resonance'
    },
    {
      id: 'shankarabharanam',
      name: 'Shankarabharanam / Bilawal (ಶಂಕರಾಭರಣ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: '29 Dheerasankarabharanam / Bilawal thaat',
      arohana: 'S R2 G3 M1 P D2 N3 S^',
      avarohana: 'S^ N3 D2 P M1 G3 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₃ ಮ₁ ಪ ಧ₂ ನಿ₃ ಸ',
      westernIntervals: '1, 2, 3, 4, 5, 6, 7 (Natural Major / Ionian)',
      firstString: 'P',
      rasa: 'Majestic, Peaceful, Universal (ವೀರ, ಶಾಂತ)',
      time: 'Morning / Day',
      songs: 'Swara Raga Sudharasa, Saroja Dala Netri',
      sunoTag: 'raga Shankarabharanam, majestic natural major, expansive orchestral Indian fusion'
    },
    {
      id: 'mayamalavagowla',
      name: 'Mayamalavagowla / Bhairav (ಮಾಯಾಮಾಳವಗೌಳ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: '15 Mayamalavagowla / Bhairav thaat',
      arohana: 'S R1 G3 M1 P D1 N3 S^',
      avarohana: 'S^ N3 D1 P M1 G3 R1 S',
      swarasKannada: 'ಸ ರಿ₁ ಗ₃ ಮ₁ ಪ ಧ₁ ನಿ₃ ಸ',
      westernIntervals: '1, b2, 3, 4, 5, b6, 7 (Double Harmonic Major)',
      firstString: 'P',
      rasa: 'Devotional, Meditative, Foundation (ಭಕ್ತಿ, ಶಾಂತ)',
      time: 'Early Morning / Dawn (ಬ್ರಾಹ್ಮೀ ಮುಹೂರ್ತ)',
      songs: 'Tulasidala, Carnatic beginner Geethams & Abhyasa Gana',
      sunoTag: 'raga Mayamalavagowla (Bhairav), deep meditative morning drone, double harmonic scale'
    },
    {
      id: 'charukesi',
      name: 'Charukesi (ಚಾರುಕೇಶಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: '26 Charukesi',
      arohana: 'S R2 G3 M1 P D1 N2 S^',
      avarohana: 'S^ N2 D1 P M1 G3 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₃ ಮ₁ ಪ ಧ₁ ನಿ₂ ಸ',
      westernIntervals: '1, 2, 3, 4, 5, b6, b7 (Melodic Major / Mixolydian b6)',
      firstString: 'P',
      rasa: 'Yearning, Pathos, Deep Devotion (ಕರುಣ, ಅನುರಾಗ)',
      time: 'Night / Any time',
      songs: 'Kripaya Palaya, Adamodi Galade, haunting Kannada melody tracks',
      sunoTag: 'raga Charukesi, bittersweet yearning melody, emotional violin solos, expressive vocal dynamics'
    },
    {
      id: 'hindolam',
      name: 'Hindolam / Malkauns (ಹಿಂದೋಳ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: 'Parent: 20 Natabhairavi / Bhairavi thaat',
      arohana: 'S G2 M1 D1 N2 S^',
      avarohana: 'S^ N2 D1 M1 G2 S',
      swarasKannada: 'ಸ ಗ₂ ಮ₁ ಧ₁ ನಿ₂ ಸ',
      westernIntervals: '1, b3, 4, b6, b7 (Minor Pentatonic without 5th)',
      firstString: 'M',
      rasa: 'Deep, Meditative, Mystical (ಭಕ್ತಿ, ಗಂಭೀರ)',
      time: 'Midnight / Late night',
      songs: 'Samaja Vara Gamana, Manasuloni Marmamu',
      sunoTag: 'raga Hindolam (Malkauns), dark hypnotic midnight minor pentatonic, bansuri and mridangam'
    },
    {
      id: 'sindhubhairavi',
      name: 'Sindhu Bhairavi (ಸಿಂಧು ಭೈರವಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: 'Janya of 8 Hanumatodi (all 12 swaras used in sanchara)',
      arohana: 'S R1 G2 M1 P D1 N2 S^',
      avarohana: 'S^ N2 D1 P M1 G2 R1 S',
      swarasKannada: 'ಸ ರಿ₁ ಗ₂ ಮ₁ ಪ ಧ₁ ನಿ₂ ಸ',
      westernIntervals: '1, b2, b3, 4, 5, b6, b7 (Phrygian)',
      firstString: 'P',
      rasa: 'Soulful, Compassionate, Universal (ಕರುಣ, ಭಕ್ತಿ)',
      time: 'Concluding piece / Any time',
      songs: 'Venkatachala Nilayam, Tamburi Meetidava (Purandara Dasa)',
      sunoTag: 'raga Sindhu Bhairavi, soulful Phrygian folk-classical blend, emotive Kannada devotional'
    },
    {
      id: 'madhuvanti',
      name: 'Madhuvanti (ಮಧುವಂತಿ)',
      tradition: 'Hindustani / Adopted into Carnatic',
      melakarta: 'Parent: 59 Dharmavati',
      arohana: 'S G2 M2 P N3 S^',
      avarohana: 'S^ N3 D2 P M2 G2 R2 S',
      swarasKannada: 'ಸ ಗ₂ ಮ₂ ಪ ನಿ₃ ಸ / ಸ ನಿ₃ ಧ₂ ಪ ಮ₂ ಗ₂ ರಿ₂ ಸ',
      westernIntervals: '1, 2, b3, #4, 5, 6, 7 (Hungarian Minor)',
      firstString: 'P',
      rasa: 'Romantic, Yearning, Enchanting (ಶೃಂಗಾರ, ವಿರಹ)',
      time: 'Late afternoon / Pre-sunset',
      songs: 'Popular in contemporary Kannada light music & ghazals',
      sunoTag: 'raga Madhuvanti, romantic Hungarian minor scale, teevra madhyam allure, lush sitar and tabla'
    },
    {
      id: 'shivaranjani',
      name: 'Shivaranjani (ಶಿವರಂಜನಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: 'Parent: 22 Kharaharapriya / Kafi thaat',
      arohana: 'S R2 G2 P D2 S^',
      avarohana: 'S^ D2 P G2 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₂ ಪ ಧ₂ ಸ',
      westernIntervals: '1, 2, b3, 5, 6 (Minor Pentatonic with Major 6th)',
      firstString: 'P',
      rasa: 'Poignant, Sorrowful, Tragic Romance (ವಿರಹ, ಕರುಣ)',
      time: 'Midnight / Evening',
      songs: 'Famous Kannada film heartbreak melodies, Kurigalu Saar Kurigalu hits',
      sunoTag: 'raga Shivaranjani, melancholic weeping bansuri melody, bittersweet Carnatic folk pathos'
    },
    {
      id: 'bilahari',
      name: 'Bilahari (ಬಿಲಹರಿ)',
      tradition: 'Carnatic',
      melakarta: 'Parent: 29 Shankarabharanam',
      arohana: 'S R2 G3 P D2 S^',
      avarohana: 'S^ N3 D2 P M1 G3 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₃ ಪ ಧ₂ ಸ / ಸ ನಿ₃ ಧ₂ ಪ ಮ₁ ಗ₃ ರಿ₂ ಸ',
      westernIntervals: 'Aro: 1, 2, 3, 5, 6; Ava: 1, 7, 6, 5, 4, 3, 2, 1',
      firstString: 'P',
      rasa: 'Joyful, Bright, Energetic (ಉತ್ಸಾಹ, ಆನಂದ)',
      time: 'Morning',
      songs: 'Dorakuna Ituvanti Seva, Paridana Michite',
      sunoTag: 'raga Bilahari, exuberant morning energy, bright acoustic tempo, celebratory Kannada fusion'
    },
    {
      id: 'abhogi',
      name: 'Abhogi (ಆಭೋಗಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: 'Parent: 22 Kharaharapriya',
      arohana: 'S R2 G2 M1 D2 S^',
      avarohana: 'S^ D2 M1 G2 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₂ ಮ₁ ಧ₂ ಸ',
      westernIntervals: '1, 2, b3, 4, 6 (Pentatonic Dorian without 5th)',
      firstString: 'M',
      rasa: 'Pleasing, Tender, Devotional (ಭಕ್ತಿ, ಪ್ರಶಾಂತ)',
      time: 'Night / Any time',
      songs: 'Sabaapthikku, Manasu Nilpa',
      sunoTag: 'raga Abhogi, graceful pentatonic Dorian melody, soft classical female vocals'
    },
    {
      id: 'amritavarshini',
      name: 'Amritavarshini (ಅಮೃತವರ್ಷಿಣಿ)',
      tradition: 'Carnatic',
      melakarta: 'Parent: 66 Chalanata',
      arohana: 'S G3 M2 P N3 S^',
      avarohana: 'S^ N3 P M2 G3 S',
      swarasKannada: 'ಸ ಗ₃ ಮ₂ ಪ ನಿ₃ ಸ',
      westernIntervals: '1, 3, #4, 5, 7 (Lydian Pentatonic)',
      firstString: 'P',
      rasa: 'Invigorating, Rain-bringing, Mystical (ಆನಂದ, ಅದ್ಭುತ)',
      time: 'Rainy season / Any time',
      songs: 'Anandamrutakarshini (Muthuswami Dikshitar - rain song)',
      sunoTag: 'raga Amritavarshini, sparkling rain melody, teevra ma sparkle, tanpura drone, acoustic fusion'
    },
    {
      id: 'revati',
      name: 'Revati / Bairagi (ರೇವತಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: 'Parent: 8 Hanumatodi',
      arohana: 'S R1 M1 P N2 S^',
      avarohana: 'S^ N2 P M1 R1 S',
      swarasKannada: 'ಸ ರಿ₁ ಮ₁ ಪ ನಿ₂ ಸ',
      westernIntervals: '1, b2, 4, 5, b7 (Phrygian Pentatonic)',
      firstString: 'P',
      rasa: 'Severe, Meditative, Renunciation (ವೈರಾಗ್ಯ, ಭಕ್ತಿ, ಗಂಭೀರ)',
      time: 'Early morning / Night',
      songs: 'Bho Shambho Shiva Shambho Swayambho (Dayananda Saraswati)',
      sunoTag: 'raga Revati (Bairagi), intense Shiva trance, meditative Phrygian pentatonic, heavy mridangam'
    },
    {
      id: 'natabhairavi',
      name: 'Natabhairavi / Asavari (ನಟಭೈರವಿ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: '20 Natabhairavi / Asavari thaat',
      arohana: 'S R2 G2 M1 P D1 N2 S^',
      avarohana: 'S^ N2 D1 P M1 G2 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₂ ಮ₁ ಪ ಧ₁ ನಿ₂ ಸ',
      westernIntervals: '1, 2, b3, 4, 5, b6, b7 (Natural Minor / Aeolian)',
      firstString: 'P',
      rasa: 'Solemn, Melancholic, Introspective (ಕರುಣ, ಗಂಭೀರ)',
      time: 'Morning / Late night',
      songs: 'Sri Valli Devasenapathe',
      sunoTag: 'raga Natabhairavi, cinematic natural minor, emotional Kannada indie strings and vocal harmonies'
    },
    {
      id: 'kharaharapriya',
      name: 'Kharaharapriya / Kafi (ಖರಹರಪ್ರಿಯ)',
      tradition: 'Carnatic / Hindustani',
      melakarta: '22 Kharaharapriya / Kafi thaat',
      arohana: 'S R2 G2 M1 P D2 N2 S^',
      avarohana: 'S^ N2 D2 P M1 G2 R2 S',
      swarasKannada: 'ಸ ರಿ₂ ಗ₂ ಮ₁ ಪ ಧ₂ ನಿ₂ ಸ',
      westernIntervals: '1, 2, b3, 4, 5, 6, b7 (Dorian Mode)',
      firstString: 'P',
      rasa: 'Expressive, Versatile, Folk-Fusion (ಶೃಂಗಾರ, ಭಕ್ತಿ)',
      time: 'Afternoon / Evening',
      songs: 'Chakkani Raja, Pakkala Nilabadi',
      sunoTag: 'raga Kharaharapriya (Kafi), groove-oriented Dorian mode, Carnatic rock fusion, heavy percussion'
    }
  ];

  // ─── Swara Pitch Math ────────────────────────────────────────────────────
  function getTonicFrequency(tonicName) {
    tonicName = (tonicName || 'C').toUpperCase();
    return NOTE_FREQS[tonicName] || 261.63;
  }

  function getSwaraFrequency(swara, tonicName) {
    var base = getTonicFrequency(tonicName);
    var semitones = SWARA_SEMITONES[swara];
    if (semitones == null) semitones = 0;
    return base * Math.pow(2, semitones / 12);
  }

  function getWesternNoteName(swara, tonicName) {
    var tonicIdx = NOTE_NAMES.indexOf((tonicName || 'C').toUpperCase());
    if (tonicIdx < 0) tonicIdx = 0;
    var semitones = SWARA_SEMITONES[swara];
    if (semitones == null) semitones = 0;
    var noteIdx = (tonicIdx + semitones) % 12;
    if (noteIdx < 0) noteIdx += 12;
    return NOTE_NAMES[noteIdx];
  }

  function getRagaById(id) {
    return RAGA_LIST.find(function (r) { return r.id === id; }) || RAGA_LIST[0];
  }

  // ─── Web Audio Swara Player ──────────────────────────────────────────────
  var audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function playTone(freq, durationSec, type, gainVal) {
    var ctx = getAudioContext();
    if (!ctx) return;
    durationSec = durationSec || 0.8;
    gainVal = gainVal == null ? 0.25 : gainVal;
    type = type || 'sine';

    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // subtle second harmonic for Indian instrument warmth
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, now);

    // gentle Indian classical envelope with micro-gamaka glide
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(gainVal * 0.4, now + durationSec * 0.6);
    gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + durationSec + 0.1);
    osc2.stop(now + durationSec + 0.1);
  }

  function playSwara(swara, tonicName, duration) {
    var f = getSwaraFrequency(swara, tonicName);
    playTone(f, duration || 0.7, 'sine', 0.28);
  }

  function playScale(ragaId, tonicName, onStep) {
    var r = getRagaById(ragaId);
    var aro = r.arohana.split(' ');
    var ava = r.avarohana.split(' ');
    var sequence = [].concat(aro).concat(ava.slice(1)); // avoid double high Sa

    var stepMs = 500;
    sequence.forEach(function (swara, idx) {
      setTimeout(function () {
        playSwara(swara, tonicName, 0.55);
        if (onStep) onStep(swara, idx, sequence.length);
      }, idx * stepMs);
    });
  }

  // ─── Virtual Acoustic Tanpura Engine ─────────────────────────────────────
  var Tanpura = (function () {
    var isPlaying = false;
    var timer = null;
    var tonic = 'C';
    var firstString = 'P'; // 'P' (Panchama), 'M' (Madhyama), or 'N' (Nishada)
    var tempoBpm = 48;
    var volume = 0.35;
    var stepIndex = 0;

    function pluckString(stringNum) {
      var ctx = getAudioContext();
      if (!ctx || !isPlaying) return;
      var base = getTonicFrequency(tonic);
      var f;

      // 4 Tanpura Strings:
      // 1st String: Panchama (P = 1.5 * Sa) or Madhyama (M1 = 1.333 * Sa) or Nishada (N3 = 1.875 * Sa)
      // 2nd String: Madhya Shadja (Sa)
      // 3rd String: Madhya Shadja (Sa)
      // 4th String: Mandra Shadja (Lower Sa = 0.5 * Sa)
      if (stringNum === 1) {
        if (firstString === 'M') f = base * (4 / 3);
        else if (firstString === 'N') f = base * (15 / 8);
        else f = base * 1.5; // Panchama (P)
      } else if (stringNum === 2 || stringNum === 3) {
        f = base; // Sa (Middle octave)
      } else {
        f = base * 0.5; // Kharja Sa (Lower octave)
      }

      var now = ctx.currentTime;
      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var osc3 = ctx.createOscillator();
      var gain = ctx.createGain();
      var filter = ctx.createBiquadFilter();

      // Jawari buzzing harmonics (combination of fundamental, octave, and 3rd harmonic)
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(f, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(f * 2, now);

      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(f * 3, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(f * 6, now);
      filter.Q.setValueAtTime(2.5, now); // resonance for wooden body tone

      var pluckDur = 2.4;
      var g = volume * 0.35;
      if (stringNum === 4) g *= 1.25; // boost bass string

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(g, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(g * 0.35, now + 0.8);
      gain.gain.linearRampToValueAtTime(0.0001, now + pluckDur);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + pluckDur + 0.1);
      osc2.stop(now + pluckDur + 0.1);
      osc3.stop(now + pluckDur + 0.1);
    }

    function scheduleNext() {
      if (!isPlaying) return;
      var stringOrder = [1, 2, 3, 4];
      var strNum = stringOrder[stepIndex % 4];
      pluckString(strNum);
      stepIndex++;

      var intervalMs = (60 / tempoBpm) * 1000;
      timer = setTimeout(scheduleNext, intervalMs);
    }

    function start(opts) {
      opts = opts || {};
      if (opts.tonic) tonic = opts.tonic;
      if (opts.firstString) firstString = opts.firstString;
      if (opts.tempo) tempoBpm = opts.tempo;
      if (opts.volume != null) volume = opts.volume;

      getAudioContext();
      if (isPlaying) return;
      isPlaying = true;
      stepIndex = 0;
      scheduleNext();
    }

    function stop() {
      isPlaying = false;
      if (timer) { clearTimeout(timer); timer = null; }
    }

    function toggle(opts) {
      if (isPlaying) { stop(); return false; }
      else { start(opts); return true; }
    }

    function setTonic(t) { tonic = t; }
    function setFirstString(s) { firstString = s; }
    function setTempo(bpm) { tempoBpm = bpm; }
    function setVolume(v) { volume = v; }
    function getStatus() {
      return { isPlaying: isPlaying, tonic: tonic, firstString: firstString, tempo: tempoBpm, volume: volume };
    }

    return {
      start: start,
      stop: stop,
      toggle: toggle,
      setTonic: setTonic,
      setFirstString: setFirstString,
      setTempo: setTempo,
      setVolume: setVolume,
      getStatus: getStatus
    };
  })();

  var API = {
    RAGA_LIST: RAGA_LIST,
    NOTE_NAMES: NOTE_NAMES,
    NOTE_FREQS: NOTE_FREQS,
    SWARA_SEMITONES: SWARA_SEMITONES,
    getRagaById: getRagaById,
    getTonicFrequency: getTonicFrequency,
    getSwaraFrequency: getSwaraFrequency,
    getWesternNoteName: getWesternNoteName,
    playSwara: playSwara,
    playScale: playScale,
    Tanpura: Tanpura
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.RAGAS = API;
})(typeof window !== 'undefined' ? window : globalThis);
