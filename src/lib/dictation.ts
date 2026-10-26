/**
 * Browser Web Speech API singleton manager and utilities for Dictation.
 */

// Minimal TypeScript types for Web Speech API
export interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): ISpeechRecognitionAlternative;
  [index: number]: ISpeechRecognitionAlternative;
}

export interface ISpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface ISpeechRecognitionResultList {
  readonly length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}

export interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: ISpeechRecognitionResultList;
}

export interface ISpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface ISpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onaudioend: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onend: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onerror: ((this: ISpeechRecognitionInstance, ev: ISpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognitionInstance, ev: ISpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onsoundend: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onspeechstart: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onspeechend: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
  onstart: ((this: ISpeechRecognitionInstance, ev: Event) => any) | null;
}

// Storage keys
export const DICTATION_LANG_KEY = 'cms_dictation_lang';
export const DICTATION_DISCLAIMER_KEY = 'cms_dictation_disclaimer_seen';

export interface DictationLanguageOption {
  value: string;
  label: string;
}

export const DICTATION_LANGUAGES: DictationLanguageOption[] = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'ta-IN', label: 'Tamil' },
];

export function getDefaultDictationLanguage(): string {
  try {
    const saved = localStorage.getItem(DICTATION_LANG_KEY);
    if (saved && DICTATION_LANGUAGES.some((opt) => opt.value === saved)) {
      return saved;
    }
  } catch {
    // Ignore localStorage access errors
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('en-in')) return 'en-IN';
    if (nav.startsWith('en-gb')) return 'en-GB';
    if (nav.startsWith('en')) return 'en-US';
    if (nav.startsWith('hi')) return 'hi-IN';
    if (nav.startsWith('ta')) return 'ta-IN';
  }

  return 'en-US';
}

export function saveDictationLanguage(lang: string): void {
  try {
    localStorage.setItem(DICTATION_LANG_KEY, lang);
  } catch {
    // Ignore localStorage access errors
  }
}

export function hasSeenDictationDisclaimer(): boolean {
  try {
    return localStorage.getItem(DICTATION_DISCLAIMER_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markDictationDisclaimerSeen(): void {
  try {
    localStorage.setItem(DICTATION_DISCLAIMER_KEY, 'true');
  } catch {
    // Ignore localStorage access errors
  }
}

// Check Web Speech API support
let isSupportedCached: boolean | null = null;

export function isDictationSupported(): boolean {
  if (isSupportedCached !== null) return isSupportedCached;
  if (typeof window === 'undefined') {
    isSupportedCached = false;
    return false;
  }
  const hasAPI = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  isSupportedCached = hasAPI;
  return hasAPI;
}

// Format spoken commands:
// "full stop" -> "."
// "comma" -> ","
// "question mark" -> "?"
// "new line" -> "\n"
// "new paragraph" -> "\n\n"
// Capitalize the first letter of each sentence.
export function formatDictatedText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText
    .replace(/\bfull\s+stop\b/gi, '.')
    .replace(/\bcomma\b/gi, ',')
    .replace(/\bquestion\s+mark\b/gi, '?')
    .replace(/\bnew\s+line\b/gi, '\n')
    .replace(/\bnew\s+paragraph\b/gi, '\n\n');

  // Remove spaces before punctuation marks
  text = text.replace(/\s+([.,?])/g, '$1');

  // Capitalize first letter of each sentence:
  // (start of string, or after [.?!] followed by spaces, or after \n)
  text = text.replace(/(^|[.?!]\s+|\n+)([a-z])/g, (_match, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  return text;
}

// Shared Recognizer Singleton State
let sharedRecognizer: ISpeechRecognitionInstance | null = null;
let activeSessionId: string | null = null;
let maxSessionTimer: any = null;
let intentionalStop = false;
let currentOnText: ((text: string, isFinal: boolean) => void) | null = null;
let currentOnError: ((errorMsg: string) => void) | null = null;
let currentOnListeningChange: ((listening: boolean) => void) | null = null;

function getOrCreateRecognizer(): ISpeechRecognitionInstance | null {
  if (sharedRecognizer) return sharedRecognizer;
  if (!isDictationSupported()) return null;

  const SpeechConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechConstructor) return null;

  const recognizer = new SpeechConstructor() as ISpeechRecognitionInstance;
  recognizer.continuous = true;
  recognizer.interimResults = true;

  recognizer.onresult = (event: ISpeechRecognitionEvent) => {
    let interim = '';
    let finalChunk = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const res = event.results[i];
      const transcript = res[0]?.transcript || '';
      if (res.isFinal) {
        finalChunk += transcript;
      } else {
        interim += transcript;
      }
    }
    if (finalChunk && currentOnText) {
      currentOnText(finalChunk, true);
    }
    if (interim && currentOnText) {
      currentOnText(interim, false);
    }
  };

  recognizer.onerror = (event: ISpeechRecognitionErrorEvent) => {
    let msg = 'Dictation error';
    let fatal = false;

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      msg = 'Microphone blocked';
      fatal = true;
    } else if (event.error === 'no-speech') {
      msg = 'No speech heard';
      fatal = false;
    } else if (event.error === 'network') {
      msg = 'Network error';
      fatal = true;
    }

    if (currentOnError) {
      currentOnError(msg);
    }

    if (fatal) {
      stopDictationSession();
    }
  };

  recognizer.onend = () => {
    // If not intentional stop and still have an active session, auto-restart
    if (!intentionalStop && activeSessionId) {
      try {
        recognizer.start();
      } catch {
        // If restart fails, end cleanly
        stopDictationSession();
      }
    } else {
      if (currentOnListeningChange) {
        currentOnListeningChange(false);
      }
      activeSessionId = null;
    }
  };

  sharedRecognizer = recognizer;
  return sharedRecognizer;
}

export interface StartDictationParams {
  sessionId: string;
  onText: (text: string, isFinal: boolean) => void;
  onError: (errorMsg: string) => void;
  onListeningChange: (listening: boolean) => void;
  lang?: string;
}

export function startDictationSession({
  sessionId,
  onText,
  onError,
  onListeningChange,
  lang,
}: StartDictationParams): boolean {
  // If already running another session, stop it first
  if (activeSessionId && activeSessionId !== sessionId) {
    stopDictationSession();
  }

  const recognizer = getOrCreateRecognizer();
  if (!recognizer) {
    onError('Dictation is not supported in this browser.');
    return false;
  }

  intentionalStop = false;
  activeSessionId = sessionId;
  currentOnText = onText;
  currentOnError = onError;
  currentOnListeningChange = onListeningChange;

  recognizer.lang = lang || getDefaultDictationLanguage();

  try {
    recognizer.start();
    onListeningChange(true);
  } catch (err: any) {
    // If recognizer was already starting/running, update lang
    try {
      recognizer.abort();
      recognizer.start();
      onListeningChange(true);
    } catch {
      onError('Microphone blocked');
      onListeningChange(false);
      activeSessionId = null;
      return false;
    }
  }

  // 2 minutes maximum session limit
  if (maxSessionTimer) clearTimeout(maxSessionTimer);
  maxSessionTimer = setTimeout(() => {
    stopDictationSession(sessionId);
  }, 120000);

  return true;
}

export function stopDictationSession(sessionId?: string): void {
  if (sessionId && activeSessionId !== sessionId) return;

  intentionalStop = true;
  if (maxSessionTimer) {
    clearTimeout(maxSessionTimer);
    maxSessionTimer = null;
  }

  if (sharedRecognizer) {
    try {
      sharedRecognizer.stop();
    } catch {
      // Ignore stop exceptions
    }
  }

  if (currentOnListeningChange) {
    currentOnListeningChange(false);
  }

  activeSessionId = null;
  currentOnText = null;
  currentOnError = null;
  currentOnListeningChange = null;
}

export function getActiveDictationSessionId(): string | null {
  return activeSessionId;
}

/**
 * useDictation hook:
 * Handles lifecycle: stops on blur, Escape, modal close, page change, hidden tab, unmount.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseDictationOptions {
  sessionId?: string;
  targetRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  lang?: string;
}

export function useDictation(
  onText: (text: string, isFinal: boolean) => void,
  options: UseDictationOptions = {}
) {
  const sessionIdRef = useRef<string>(
    options.sessionId || `dictation_${Math.random().toString(36).substring(2, 9)}`
  );
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    stopDictationSession(sessionIdRef.current);
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    setError(null);
    const ok = startDictationSession({
      sessionId: sessionIdRef.current,
      onText,
      onError: (err) => setError(err),
      onListeningChange: (listening) => setIsListening(listening),
      lang: options.lang || getDefaultDictationLanguage(),
    });
    if (!ok) {
      setIsListening(false);
    }
  }, [onText, options.lang]);

  // Stop on Escape key
  useEffect(() => {
    if (!isListening) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, stop]);

  // Stop on hidden tab (visibilitychange)
  useEffect(() => {
    if (!isListening) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isListening, stop]);

  // Stop on blur of targetRef
  useEffect(() => {
    if (!isListening || !options.targetRef?.current) return;
    const el = options.targetRef.current;
    const handleBlur = () => {
      // Delay slightly to let click on stop button register without race condition
      setTimeout(() => {
        if (document.activeElement !== el && activeSessionId === sessionIdRef.current) {
          stop();
        }
      }, 150);
    };
    el.addEventListener('blur', handleBlur);
    return () => el.removeEventListener('blur', handleBlur);
  }, [isListening, options.targetRef, stop]);

  // Stop on unmount / page change / modal close
  useEffect(() => {
    const id = sessionIdRef.current;
    return () => {
      stopDictationSession(id);
    };
  }, []);

  return {
    isListening,
    error,
    start,
    stop,
    toggle: isListening ? stop : start,
  };
}
