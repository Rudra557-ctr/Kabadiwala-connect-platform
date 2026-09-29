/**
 * Spoken output — "Bolo Bhav".
 *
 * PS 26229 asks for "spoken price information" and a usable interface for
 * low-literacy users. For a collector who cannot read, speech is not an
 * accessibility nicety; it is the primary output channel.
 *
 * ---------------------------------------------------------------------------
 * THE MARATHI PROBLEM — the single biggest device-fragmentation risk
 * ---------------------------------------------------------------------------
 * `speechSynthesis` reliably ships an `hi-IN` voice on Android Chrome. An
 * `mr-IN` voice is frequently ABSENT on entry-level devices — which are
 * precisely the devices our users have.
 *
 * If you call speak() with mr-IN on a phone with no Marathi voice, browsers
 * behave inconsistently: some silently substitute a default (often English,
 * which reads Devanagari as gibberish), some emit nothing at all. Both are
 * worse than a considered fallback.
 *
 * So the chain is explicit:
 *   1. exact locale voice (mr-IN)
 *   2. same-script sibling (hi-IN) — Devanagari, mutually intelligible enough
 *      for numbers and material names, which is most of what we speak
 *   3. any Indian-English voice
 *   4. report failure so the UI can fall back to a pre-recorded clip
 *
 * `capabilities()` lets a screen check support BEFORE promising audio, and the
 * settings page surfaces it so you find out in testing, not on stage.
 * ---------------------------------------------------------------------------
 */

import { SPEECH_LANG, type Locale } from './i18n';

let cachedVoices: SpeechSynthesisVoice[] = [];

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Voices load asynchronously and the first getVoices() call usually returns []
 * — a classic source of "it works on my laptop but not on the phone".
 */
export function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);

  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length) {
    cachedVoices = immediate;
    return Promise.resolve(immediate);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = null;
      resolve(cachedVoices);
    };
    window.speechSynthesis.onvoiceschanged = done;
    setTimeout(done, timeoutMs);
  });
}

export interface SpeechCapability {
  supported: boolean;
  /** Locale has a true native voice. */
  native: boolean;
  /** Tag we will actually use after falling back. */
  effectiveLang: string;
  /** True when we degraded away from the requested locale. */
  degraded: boolean;
  voiceName?: string;
}

function pickVoice(locale: Locale): { voice?: SpeechSynthesisVoice; lang: string; native: boolean } {
  const want = SPEECH_LANG[locale];
  const voices = cachedVoices;

  const exact = voices.find((v) => v.lang.replace('_', '-') === want);
  if (exact) return { voice: exact, lang: want, native: true };

  // Same language, different region (e.g. 'mr' without region).
  const base = want.split('-')[0];
  const sameLang = voices.find((v) => v.lang.replace('_', '-').startsWith(base + '-') || v.lang === base);
  if (sameLang) return { voice: sameLang, lang: sameLang.lang, native: true };

  // Devanagari sibling: Marathi -> Hindi. Not perfect, but for numbers and
  // material names it is far closer than English.
  if (locale === 'mr') {
    const hindi = voices.find((v) => v.lang.replace('_', '-').startsWith('hi'));
    if (hindi) return { voice: hindi, lang: hindi.lang, native: false };
  }

  const indianEnglish = voices.find((v) => v.lang.replace('_', '-') === 'en-IN');
  if (indianEnglish) return { voice: indianEnglish, lang: 'en-IN', native: false };

  const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  if (anyEnglish) return { voice: anyEnglish, lang: anyEnglish.lang, native: false };

  return { voice: undefined, lang: want, native: false };
}

export async function capabilities(locale: Locale): Promise<SpeechCapability> {
  if (!isSpeechSupported()) {
    return { supported: false, native: false, effectiveLang: SPEECH_LANG[locale], degraded: true };
  }
  await loadVoices();
  const { voice, lang, native } = pickVoice(locale);
  return {
    supported: true,
    native,
    effectiveLang: lang,
    degraded: !native,
    voiceName: voice?.name,
  };
}

export interface SpeakOptions {
  /** Slower than default: these are unfamiliar words for many listeners. */
  rate?: number;
  pitch?: number;
  /** Cancel anything already speaking. Default true — overlapping speech is unusable. */
  interrupt?: boolean;
}

/** Returns false if nothing was spoken, so the caller can play a recorded clip. */
export async function speak(
  text: string,
  locale: Locale,
  opts: SpeakOptions = {},
): Promise<boolean> {
  if (!isSpeechSupported() || !text.trim()) return false;
  await loadVoices();

  const { interrupt = true, rate = 0.9, pitch = 1 } = opts;
  if (interrupt) window.speechSynthesis.cancel();

  const { voice, lang } = pickVoice(locale);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  if (voice) u.voice = voice;

  return new Promise((resolve) => {
    let settled = false;
    u.onend = () => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    };
    u.onerror = () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    };
    try {
      window.speechSynthesis.speak(u);
    } catch {
      resolve(false);
      return;
    }
    // Some Android builds fire neither event. Resolve optimistically so the UI
    // never hangs on a promise that will not settle.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    }, 8000);
  });
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/**
 * Speak a price the way a person would say it, not the way a screen shows it.
 * "₹52/kg" read literally by TTS is unintelligible; "बावन्न रुपये किलो" is not.
 */
export function priceSentence(amount: number, locale: Locale, perKg = true): string {
  const n = Math.round(amount);
  if (locale === 'mr') return perKg ? `${n} रुपये किलो` : `${n} रुपये`;
  if (locale === 'hi') return perKg ? `${n} रुपये किलो` : `${n} रुपये`;
  return perKg ? `${n} rupees per kilo` : `${n} rupees`;
}

export function rangeSentence(low: number, high: number, locale: Locale): string {
  const a = Math.round(low);
  const b = Math.round(high);
  if (locale === 'mr') return `${a} ते ${b} रुपये किलो`;
  if (locale === 'hi') return `${a} से ${b} रुपये किलो`;
  return `${a} to ${b} rupees per kilo`;
}
