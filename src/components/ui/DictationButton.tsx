import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface DictationButtonProps {
  targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  maxLength?: number;
  className?: string;
  lang?: string;
}

export const DictationButton: React.FC<DictationButtonProps> = ({
  targetRef,
  value,
  onChange,
  maxLength,
  className = '',
  lang,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Synchronously detect Web Speech API support
  const isSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const sessionIdRef = useRef<string>(
    `dict_${Math.random().toString(36).substring(2, 9)}`
  );
  const dictationModuleRef = useRef<any>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Cleanup on unmount
  useEffect(() => {
    const sid = sessionIdRef.current;
    return () => {
      if (dictationModuleRef.current) {
        dictationModuleRef.current.stopDictationSession(sid);
      }
    };
  }, []);

  // Stop handler
  const handleStop = useCallback(() => {
    if (dictationModuleRef.current) {
      dictationModuleRef.current.stopDictationSession(sessionIdRef.current);
    }
    setIsListening(false);
    setInterimText('');
    setAnnouncement('Dictation stopped');
  }, []);

  // Stop on Escape key
  useEffect(() => {
    if (!isListening) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, handleStop]);

  // Stop on tab hidden
  useEffect(() => {
    if (!isListening) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleStop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isListening, handleStop]);

  // Stop on target field blur
  useEffect(() => {
    if (!isListening || !targetRef.current) return;
    const el = targetRef.current;
    const handleBlur = () => {
      setTimeout(() => {
        if (document.activeElement !== el && isListening) {
          handleStop();
        }
      }, 150);
    };
    el.addEventListener('blur', handleBlur);
    return () => el.removeEventListener('blur', handleBlur);
  }, [isListening, targetRef, handleStop]);

  // Handle click on Dictate / Stop dictation button
  const handleToggle = async () => {
    setError(null);

    // If currently listening, stop
    if (isListening) {
      handleStop();
      return;
    }

    // Check first-time disclaimer
    try {
      const seen = localStorage.getItem('cms_dictation_disclaimer_seen');
      if (seen !== 'true') {
        setShowDisclaimer(true);
        localStorage.setItem('cms_dictation_disclaimer_seen', 'true');
      }
    } catch {
      // Ignore localStorage errors
    }

    // Lazy load dictation.ts on first click
    try {
      if (!dictationModuleRef.current) {
        dictationModuleRef.current = await import('@/lib/dictation');
      }
    } catch {
      setError('Dictation is not supported in this browser.');
      return;
    }

    const {
      startDictationSession,
      formatDictatedText,
      getDefaultDictationLanguage,
    } = dictationModuleRef.current;

    const started = startDictationSession({
      sessionId: sessionIdRef.current,
      lang: lang || getDefaultDictationLanguage(),
      onListeningChange: (listening: boolean) => {
        setIsListening(listening);
        if (!listening) {
          setInterimText('');
        }
      },
      onError: (errMsg: string) => {
        setError(errMsg);
      },
      onText: (textChunk: string, isFinal: boolean) => {
        if (!isFinal) {
          setInterimText(textChunk);
          return;
        }

        // Final chunk: insert at cursor into target input/textarea
        setInterimText('');
        const target = targetRef.current;
        const currentVal = target?.value ?? valueRef.current ?? '';
        const start = target?.selectionStart ?? currentVal.length;
        const end = target?.selectionEnd ?? currentVal.length;

        const before = currentVal.slice(0, start);
        const after = currentVal.slice(end);

        let formatted = formatDictatedText(textChunk);

        // Check if leading space is needed
        let needsLeadingSpace = false;
        if (before.length > 0 && !/\s$/.test(before) && !/^[.,?!]/.test(formatted)) {
          needsLeadingSpace = true;
        }

        // Capitalize first character if preceded by sentence end or start
        if (
          before.length === 0 ||
          /[.?!]\s*$/.test(before) ||
          /\n\s*$/.test(before)
        ) {
          formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        const toInsert = (needsLeadingSpace ? ' ' : '') + formatted;
        let nextValue = before + toInsert + after;

        if (typeof maxLength === 'number' && maxLength > 0) {
          if (nextValue.length > maxLength) {
            const allowed = Math.max(0, maxLength - (before.length + after.length));
            nextValue = before + toInsert.slice(0, allowed) + after;
          }
        }

        onChange(nextValue);

        // Advance cursor position
        requestAnimationFrame(() => {
          if (target && typeof target.setSelectionRange === 'function') {
            const newPos = Math.min(before.length + toInsert.length, nextValue.length);
            target.setSelectionRange(newPos, newPos);
            target.focus();
          }
        });
      },
    });

    if (started) {
      setAnnouncement('Dictation started');
    }
  };

  // If unsupported: button hidden, plain muted text
  if (!isSupported) {
    return (
      <div className={`mt-1.5 text-right ${className}`}>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Dictation is not supported in this browser.
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-end mt-1.5 ${className}`}>
      {/* Polite live region for screen readers announcing start/stop (never reads interim text) */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="flex items-center gap-2 justify-end w-full">
        {/* Muted interim text at end of field */}
        {isListening && interimText && (
          <span
            className="text-xs text-slate-400 dark:text-slate-500 italic max-w-xs truncate"
            title={interimText}
            aria-hidden="true"
          >
            {interimText}
          </span>
        )}

        {/* Plain Listening text beside button */}
        {isListening && (
          <span className="text-xs text-slate-600 dark:text-slate-300 select-none">
            Listening
          </span>
        )}

        {/* Outline Dictate button, min-h-[44px] on touch */}
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={isListening}
          className="min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          {isListening ? 'Stop dictation' : 'Dictate'}
        </button>
      </div>

      {/* Errors in plain text under the field */}
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 w-full text-right" role="alert">
          {error}
        </p>
      )}

      {/* First-time disclaimer shown once per browser */}
      {showDisclaimer && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 w-full text-left">
          Dictation uses your browser's speech service, which may send audio to the browser vendor. This is a demo: do not dictate real patient data.
        </p>
      )}
    </div>
  );
};

