// speech.js — Web Speech API pronunciation wrapper

/**
 * Speak a word using the Web Speech API with Australian English preference.
 * Falls back to en-GB then en-US if en-AU is unavailable.
 */
export function pronounceWord(word) {
  if (!window.speechSynthesis) {
    console.warn('Web Speech API not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel(); // stop any current speech

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.85;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const auVoice = voices.find(v => v.lang === 'en-AU');
  const gbVoice = voices.find(v => v.lang === 'en-GB');
  const usVoice = voices.find(v => v.lang.startsWith('en-'));

  if (auVoice) {
    utterance.voice = auVoice;
    utterance.lang = 'en-AU';
  } else if (gbVoice) {
    utterance.voice = gbVoice;
    utterance.lang = 'en-GB';
  } else if (usVoice) {
    utterance.voice = usVoice;
    utterance.lang = usVoice.lang;
  } else {
    utterance.lang = 'en-AU';
  }

  window.speechSynthesis.speak(utterance);
}

// Voices may not be loaded immediately — call this on page load
export function loadVoices() {
  return new Promise(resolve => {
    if (!window.speechSynthesis) { resolve([]); return; }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      const timeout = setTimeout(() => resolve([]), 2000); // never hang
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        clearTimeout(timeout);
        resolve(window.speechSynthesis.getVoices());
      }, { once: true });
    }
  });
}

export function isSpeechSupported() {
  return 'speechSynthesis' in window;
}
