# 🦘 Aussie Word Challenge

A Wordle-style word guessing game for Australian children aged 9–11, using Australian English spelling and vocabulary.

## How to play

1. Open `index.html` in any modern browser — no server required.
2. Choose your word length: 4, 5, 6 or 7 letters.
3. Guess the hidden word. You get **word length + 1** guesses.
4. After each guess, tiles change colour:
   - 🟩 **Green** — correct letter, correct position
   - 🟨 **Yellow** — correct letter, wrong position
   - ⬜ **Grey** — letter not in the word
5. You have **3 clues** per game (each costs 15 points from your score).

## Scoring

```
Score = 100 − (guesses used − 1) × 10 − clues used × 15
```

A loss scores 0 points.

## File structure

```
/
├── index.html          App shell and all screens
├── style.css           Full styling, animations, responsive layout
├── app.js              Game logic, state management, screen routing
├── words/
│   ├── words-4.js      200+ 4-letter words with metadata
│   ├── words-5.js      300+ 5-letter words
│   ├── words-6.js      250+ 6-letter words
│   └── words-7.js      200+ 7-letter words
└── utils/
    ├── storage.js      localStorage helpers
    ├── scoring.js      Score calculation
    ├── stats.js        Statistics tracking and rendering
    └── speech.js       Web Speech API pronunciation (en-AU)
```

## Word list format

Each word entry looks like:

```js
{
  word: "beach",
  definition: "An area of sand or pebbles beside the sea.",
  pronunciation: "beech",       // phonetic hint shown alongside audio button
  hasRepeatingLetters: false,   // true if any letter appears more than once
  hasRareLetters: false,        // true if word contains Z, Q, X, J, K, V or W
}
```

To add more words, simply append entries to the relevant `words-N.js` file and export array.

## Australian English spellings used

- `-our` not `-or` (colour, honour, favourite)
- `-ise` not `-ize` (realise, organise)
- `-re` not `-er` (centre, theatre)
- `-ence` not `-ense` (defence, licence)

## Browser support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Pronunciation uses the Web Speech API — available in most browsers; gracefully disabled if unsupported.

## Offline support

All assets are local (except Google Fonts and canvas-confetti CDN). The game is fully playable offline after first load if fonts are cached.
