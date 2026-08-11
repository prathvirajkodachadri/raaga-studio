# Raaga Studio · ಛಂದಸ್ಸು (ಮಾತ್ರೆ-ಲಘು-ಗುರು)

A single-page, zero-dependency Kannada **prosody scanner** implementing the rules of the
ಕನ್ನಡ ದೀವಿಗೆ article
[_ಮಾತ್ರೆ-ಲಘು-ಗುರು_](https://kannadadeevige.blogspot.com/2013/11/blog-post_8282.html).
Type (or paste) Kannada text and it instantly marks every syllable as
**ಲಘು (U, 1 ಮಾತ್ರೆ)**, **ಗುರು (—, 2 ಮಾತ್ರೆ)**, or **ಪ್ಲುತ (3, 3 ಮಾತ್ರೆ)**,
with per-line mātra totals.

## Features

- **Live scanner** — every syllable is colour-marked (ಲಘು green, ಗುರು gold,
  ಪ್ಲುತ purple) with a mātra badge; the symbols-only string and mātra total
  are shown per line.
- **ಷಟ್ಪದಿ toggle** — in the 3rd and 6th lines of a poem the final syllable
  counts as ಗುರು even if it is ಲಘು.
- **Preloaded examples** — the full example table from the article, plus a
  sample Kannada stanza.
- **Rules reference** — an accordion summarising all six rules from the article.

## Rules implemented (from the article)

1. **ಲಘು** — short vowels (ಅ ಇ ಉ ಋ ಎ ಒ) and syllables built on them
   (ಕ ಕಿ ಕು ಚ ಟ ತ ಕೆ ಕೊ ಸು ಸೊ ಸೃ ಕೃ).
2. **ಗುರು** — long vowels (ಆ ಈ ಊ ೠ ಏ ಐ ಓ ಔ) and long-vowel syllables
   (ಕಾ ಕೀ ಚೇ ಚೈ ಸೈ ನಾ ರೋ ಸೌ; clusters ಕ್ಕಾ ಸ್ನೇ ತ್ರೇ ಪ್ರೈ ಕ್ರೋ ಧ್ಯಾ ಲೋ).
3. **ಗುರು** — a syllable with ಅನುಸ್ವಾರ (ಂ) or ವಿಸರ್ಗ (ಃ).
4. **ಗುರು** — the syllable before a ಒತ್ತಕ್ಷರ (geminate): ಕಲ್ಲು → —U.
5. **ಗುರು** — the syllable before a closing (halant) consonant: ಕಲ್ → —;
   the closing consonant itself gets no symbol.
6. **ಒಂದೇ ಗುರು** even with multiple reasons (ಶಾಸ್ತ್ರ → —U); **ಪ್ಲುತ** (3)
   for long vowel + ವಿಸರ್ಗ (ಆಃ).

### Orthography notes baked into the parser

- A consonant with no vowel sign and no virama carries the inherent short
  ಅ (`ಕ` alone is `ka` → ಲಘು).
- A ್-cluster is one akshara (ತ್ತ, ಸ್ತ್ರ, ಕ್ಕಾ).
- The closed-syllable rule fires **only** when the next akshara is a geminate
  (≥2 consonants) or a single halant consonant — not merely when the next
  akshara starts with a consonant.

## Structure

```
raaga-studio/
├── index.html            # scanner UI
├── css/style.css         # dark studio theme
├── js/
│   ├── prosody.js        # the scanner engine (CommonJS + browser-global)
│   └── app.js            # UI controller
└── test/
    └── prosody_test.js   # Node test suite (33 checks)
```

`prosody.js` ends with both a CommonJS export and a `window.PROSODY` global,
so the same engine runs in Node tests and in the browser.

## Run

Serve from any static server (no build step, no dependencies):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

```bash
node test/prosody_test.js
```

All 33 checks pass, covering the full example table from the article, mātra
totals, ಷಟ್ಪದಿ promotion, punctuation handling, and API surface.

## License

MIT.
