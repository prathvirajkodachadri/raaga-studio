/**
 * tracks-compose-data.js — the track library behind the Tracks Compose page.
 *
 * FAMILIES  → arrangement order + badge colour for each folder family.
 * TRACKS    → the library itself, in recommended arrangement order.
 *
 * Track names are generated (FAMILY_INSTRUMENT_ROLE_PLUGIN_01), so an
 * INSTRUMENT or PLUGIN edit on the page renames the row instantly.
 * Replace these two lists with your own studio standard — nothing else on
 * the page needs to change.
 */
'use strict';

window.TRACKS_COMPOSE_FAMILIES = [
  { name: 'DRONE', color: '#D9EAD3', note: 'Tanpura / sruti — tune and print last' },
  { name: 'PERCUSSION', color: '#FCE5CD', note: 'Mridangam, ghatam, kanjira, tabla, dholak' },
  { name: 'DRUMS', color: '#FFE8B5', note: 'Kit and program loops for film / fusion' },
  { name: 'BASS', color: '#CFE2F3', note: 'Bass guitar and synth sub' },
  { name: 'RHYTHMIC', color: '#FFF2CC', note: 'Rhythm guitar, mandolin, ukulele, veena rhythm' },
  { name: 'HARMONY', color: '#D9D2E9', note: 'Piano, harmonium, pads, beds' },
  { name: 'MELODY', color: '#C9DAF8', note: 'Lead instruments — flute, veena, sitar, violin' },
  { name: 'STRINGS', color: '#EADCF8', note: 'Violin sections, viola, cello, contrabass' },
  { name: 'WIND', color: '#B6D7A8', note: 'Bansuri, nadaswaram, shehnai, clarinet' },
  { name: 'SYNTHS', color: '#D0E0E3', note: 'Synth leads, arps, plucks, atmos' },
  { name: 'VOCALS', color: '#F4CCCC', note: 'Lead vocals and doubles' },
  { name: 'BACKING_VOCALS', color: '#F9CB9C', note: 'Harmony stack, chorus, group rows' },
  { name: 'FOLK', color: '#E6D0A8', note: 'Dollu, chande, yakshagana, bhajan' },
  { name: 'FX', color: '#CCCCCC', note: 'Risers, impacts, ambience, transitions' }
];

window.TRACKS_COMPOSE_TRACKS = [
  /* ---- DRONE ---- */
  { FAMILY: 'DRONE', INSTRUMENT: 'Tanpura', ROLE: 'DRONE', PLUGIN: 'Kontakt', NOTES: 'Sa–Pa tuned to the song key' },
  { FAMILY: 'DRONE', INSTRUMENT: 'Sruti Box', ROLE: 'DRONE', PLUGIN: 'Analog Lab' },
  { FAMILY: 'DRONE', INSTRUMENT: 'Tanpura Pad', ROLE: 'BED', PLUGIN: 'Omnisphere' },

  /* ---- PERCUSSION ---- */
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Mridangam', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Mridangam Thoppi', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Ghatam', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Kanjira', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Tabla Dayan', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Tabla Bayan', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Dholak', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Morsing', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Jalra', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'PERCUSSION', INSTRUMENT: 'Thavil', ROLE: 'PERC', PLUGIN: 'Kontakt' },

  /* ---- DRUMS ---- */
  { FAMILY: 'DRUMS', INSTRUMENT: 'Kick', ROLE: 'PERC', PLUGIN: 'Kick 2', NOTES: 'Sidechain source for bass' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Snare Top', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Snare Bottom', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Hi Hats', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Rack Tom', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Floor Tom', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Overheads', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Crash', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Ride', ROLE: 'PERC', PLUGIN: 'Superior Drummer' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Shaker', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'DRUMS', INSTRUMENT: 'Claps', ROLE: 'PERC', PLUGIN: 'KSHMR' },

  /* ---- BASS ---- */
  { FAMILY: 'BASS', INSTRUMENT: 'Bass Guitar', ROLE: 'SUB', PLUGIN: 'Ampeg SVX', NOTES: 'DI + amp for film mixes' },
  { FAMILY: 'BASS', INSTRUMENT: 'Sub Bass', ROLE: 'SUB', PLUGIN: 'Serum' },
  { FAMILY: 'BASS', INSTRUMENT: 'Bass Growl', ROLE: 'SUB', PLUGIN: 'Trilian' },

  /* ---- RHYTHMIC ---- */
  { FAMILY: 'RHYTHMIC', INSTRUMENT: 'Acoustic Guitar', ROLE: 'RHYTHM', PLUGIN: 'Kontakt' },
  { FAMILY: 'RHYTHMIC', INSTRUMENT: 'Electric Guitar', ROLE: 'RHYTHM', PLUGIN: 'Amplitube' },
  { FAMILY: 'RHYTHMIC', INSTRUMENT: 'Mandolin', ROLE: 'RHYTHM', PLUGIN: 'Kontakt' },
  { FAMILY: 'RHYTHMIC', INSTRUMENT: 'Ukulele', ROLE: 'RHYTHM', PLUGIN: 'Kontakt' },
  { FAMILY: 'RHYTHMIC', INSTRUMENT: 'Veena Rhythm', ROLE: 'RHYTHM', PLUGIN: 'Kontakt' },

  /* ---- HARMONY ---- */
  { FAMILY: 'HARMONY', INSTRUMENT: 'Piano', ROLE: 'BED', PLUGIN: 'Pianoteq' },
  { FAMILY: 'HARMONY', INSTRUMENT: 'Harmonium', ROLE: 'BED', PLUGIN: 'Kontakt' },
  { FAMILY: 'HARMONY', INSTRUMENT: 'Rhodes', ROLE: 'BED', PLUGIN: 'Keyscape' },
  { FAMILY: 'HARMONY', INSTRUMENT: 'Warm Pad', ROLE: 'PAD', PLUGIN: 'Omnisphere' },
  { FAMILY: 'HARMONY', INSTRUMENT: 'Ambient Guitar', ROLE: 'PAD', PLUGIN: 'Omnisphere' },

  /* ---- MELODY ---- */
  { FAMILY: 'MELODY', INSTRUMENT: 'Bansuri', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Saraswati Veena', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Sitar', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Santoor', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Sarangi', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Chitraveena', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Violin Solo', ROLE: 'LEAD', PLUGIN: 'SWAM' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Alto Sax', ROLE: 'LEAD', PLUGIN: 'SWAM' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Harmonica', ROLE: 'LEAD', PLUGIN: 'Kontakt' },

  /* ---- STRINGS ---- */
  { FAMILY: 'STRINGS', INSTRUMENT: 'Violin Section', ROLE: 'ENS', PLUGIN: 'EastWest' },
  { FAMILY: 'STRINGS', INSTRUMENT: 'Viola', ROLE: 'ENS', PLUGIN: 'EastWest' },
  { FAMILY: 'STRINGS', INSTRUMENT: 'Cello', ROLE: 'ENS', PLUGIN: 'EastWest' },
  { FAMILY: 'STRINGS', INSTRUMENT: 'Contrabass', ROLE: 'ENS', PLUGIN: 'EastWest' },

  /* ---- WIND ---- */
  { FAMILY: 'WIND', INSTRUMENT: 'Nadaswaram', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'WIND', INSTRUMENT: 'Shehnai', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'WIND', INSTRUMENT: 'Clarinet', ROLE: 'ENS', PLUGIN: 'Kontakt' },
  { FAMILY: 'WIND', INSTRUMENT: 'Flute Section', ROLE: 'ENS', PLUGIN: 'Kontakt' },

  /* ---- SYNTHS ---- */
  { FAMILY: 'SYNTHS', INSTRUMENT: 'Synth Lead', ROLE: 'LEAD', PLUGIN: 'Serum' },
  { FAMILY: 'SYNTHS', INSTRUMENT: 'Arp Pluck', ROLE: 'ARP', PLUGIN: 'Serum' },
  { FAMILY: 'SYNTHS', INSTRUMENT: 'Pluck Melody', ROLE: 'LEAD', PLUGIN: 'Sylenth1' },

  /* ---- VOCALS ---- */
  { FAMILY: 'VOCALS', INSTRUMENT: 'Male Lead', ROLE: 'LEAD', PLUGIN: 'Auto-Tune', NOTES: 'Tuning first in the chain' },
  { FAMILY: 'VOCALS', INSTRUMENT: 'Female Lead', ROLE: 'LEAD', PLUGIN: 'Melodyne' },
  { FAMILY: 'VOCALS', INSTRUMENT: 'Male Lead Double', ROLE: 'DBL', PLUGIN: 'Auto-Tune' },
  { FAMILY: 'VOCALS', INSTRUMENT: 'Adlibs', ROLE: 'ADLIB', PLUGIN: '' },
  { FAMILY: 'VOCALS', INSTRUMENT: 'Humming', ROLE: 'BED', PLUGIN: '' },

  /* ---- BACKING VOCALS ---- */
  { FAMILY: 'BACKING_VOCALS', INSTRUMENT: 'Harmony Stack', ROLE: 'HARM', PLUGIN: '' },
  { FAMILY: 'BACKING_VOCALS', INSTRUMENT: 'Chorus Group', ROLE: 'CHORUS', PLUGIN: '' },
  { FAMILY: 'BACKING_VOCALS', INSTRUMENT: 'Bhajan Group', ROLE: 'CHORUS', PLUGIN: '' },

  /* ---- FOLK ---- */
  { FAMILY: 'FOLK', INSTRUMENT: 'Dollu', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'FOLK', INSTRUMENT: 'Chande', ROLE: 'PERC', PLUGIN: 'Kontakt' },
  { FAMILY: 'FOLK', INSTRUMENT: 'Yakshagana Voice', ROLE: 'LEAD', PLUGIN: '' },
  { FAMILY: 'FOLK', INSTRUMENT: 'Gumte', ROLE: 'PERC', PLUGIN: 'Kontakt' },

  /* ---- FX ---- */
  { FAMILY: 'FX', INSTRUMENT: 'Riser', ROLE: 'FX', PLUGIN: '' },
  { FAMILY: 'FX', INSTRUMENT: 'Impact', ROLE: 'FX', PLUGIN: '' },
  { FAMILY: 'FX', INSTRUMENT: 'Reverse Cymbal', ROLE: 'FX', PLUGIN: '' },
  { FAMILY: 'FX', INSTRUMENT: 'Temple Ambience', ROLE: 'BED', PLUGIN: 'Omnisphere' },
  { FAMILY: 'FX', INSTRUMENT: 'Conch Shell', ROLE: 'FX', PLUGIN: 'Kontakt' }
];
