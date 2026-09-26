import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, Plus, Sparkles, AlertCircle, Mic, Square, Loader2, Volume2 } from 'lucide-react';
import { Config, Transaction } from '../types';
import { parseQuickExpense } from '../utils/expenseAiParser';
import { feedback } from '../utils/feedback';

interface QuickExpenseWidgetProps {
  config: Config;
  selectedDate: Date;
  allTransactions?: Transaction[];
  onAddExpense: (amount: number, note?: string, category?: string) => Promise<void> | void;
  onAddIncome?: (date?: Date) => void;
  onOpenFullExpenseForm?: (date?: Date) => void;
  onRemove?: () => void;
  isCustomizing?: boolean;
}

export function QuickExpenseWidget({
  config,
  selectedDate,
  allTransactions = [],
  onAddExpense,
  onAddIncome,
  onOpenFullExpenseForm,
  onRemove,
  isCustomizing,
}: QuickExpenseWidgetProps) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioTranscribing, setIsAudioTranscribing] = useState(false);
  const [recordingStatusText, setRecordingStatusText] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ amount: number; merchant: string; category: string; transcript?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  const lang = config.language || 'sv';
  const isEn = lang === 'en';
  const defaultCategory = isEn ? 'Uncategorized' : 'Okategoriserat';

  const isToday = useMemo(() => {
    return new Date(selectedDate).toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const formattedDateStr = useMemo(() => {
    if (isToday) return null;
    return selectedDate.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
      day: 'numeric',
      month: 'short',
    });
  }, [isToday, selectedDate, isEn]);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setRecordingStatusText(isEn ? 'Listening... Speak now' : 'Lyssnar... Prata in köpet');
    audioChunksRef.current = [];
    let startedAny = false;

    // 1. Try WebSpeech API for real-time live visual transcript
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = isEn ? 'en-US' : 'sv-SE';

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim()) {
            setInputText(currentText);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
        startedAny = true;
      } catch (err) {
        console.warn('SpeechRecognition init error:', err);
      }
    }

    // 2. Try MediaRecorder for high-fidelity audio AI processing
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const supportedMime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : MediaRecorder.isTypeSupported('audio/ogg')
            ? 'audio/ogg'
            : 'audio/wav';

      mimeTypeRef.current = supportedMime;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMime });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      startedAny = true;
      feedback.tap();
    } catch (err: any) {
      console.warn('MediaRecorder error / permission:', err);
      if (!startedAny) {
        setRecordingStatusText(null);
        setErrorMessage(
          isEn
            ? 'Microphone access denied or not supported in browser.'
            : 'Kunde inte starta mikrofonen. Tillåt mikrofonen i din webbläsare.'
        );
        return;
      } else {
        setIsRecording(true);
        feedback.tap();
      }
    }
  };

  const handleStopRecordingAndProcess = async () => {
    feedback.tap();
    setIsRecording(false);
    setRecordingStatusText(isEn ? 'Analyzing voice with AI...' : 'Analyserar röst med AI...');
    setIsAudioTranscribing(true);

    // Stop WebSpeech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    let audioBlob: Blob | null = null;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      if (audioChunksRef.current.length > 0) {
        audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
      }
    }

    stopMediaTracks();

    // 3. Process with backend AI audio parser if audio blob exists
    if (audioBlob && audioBlob.size > 500) {
      try {
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob!);
        });

        const res = await fetch('/api/parse-audio-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: mimeTypeRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.amount > 0) {
            // Auto add expense
            await onAddExpense(data.amount, data.name || 'Röstinlägg', data.category || defaultCategory);
            feedback.success();

            setSuccessInfo({
              amount: data.amount,
              merchant: data.name || 'Röstinlägg',
              category: data.category || defaultCategory,
              transcript: data.transcript,
            });

            setInputText('');
            setRecordingStatusText(null);
            setIsAudioTranscribing(false);

            setTimeout(() => {
              setSuccessInfo(null);
            }, 3500);

            return;
          } else if (data && data.transcript) {
            setInputText(data.transcript);
          }
        }
      } catch (err) {
        console.warn('Backend audio AI processing failed, falling back to text parser:', err);
      }
    }

    // Fallback: If text was populated via WebSpeech or user input
    setIsAudioTranscribing(false);
    setRecordingStatusText(null);

    const currentText = inputText.trim();
    if (currentText) {
      // Auto submit text parser
      handleSubmit();
    } else {
      setErrorMessage(isEn ? 'Could not hear anything clearly. Try again.' : 'Hörde inget ljud. Försök igen!');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      handleStopRecordingAndProcess();
    } else {
      handleStartRecording();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isProcessing || isAudioTranscribing) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Parse with Swedish brand base -> user history -> Google AI Edge function -> fallback
      const parsed = await parseQuickExpense(
        clean,
        config.categories || [],
        allTransactions,
        defaultCategory
      );

      if (!parsed.amount || parsed.amount <= 0) {
        setErrorMessage(isEn ? 'Please specify an amount (e.g. 300kr Coop)' : 'Ange ett belopp (t.ex. 300kr Coop)');
        setIsProcessing(false);
        inputRef.current?.focus();
        return;
      }

      // Add expense
      await onAddExpense(parsed.amount, parsed.merchant, parsed.category);
      feedback.success();

      // Show temporary feedback toast
      setSuccessInfo({
        amount: parsed.amount,
        merchant: parsed.merchant,
        category: parsed.category,
      });
      setInputText('');

      setTimeout(() => {
        setSuccessInfo(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to quick-add expense:', err);
      setErrorMessage(isEn ? 'Could not save expense' : 'Kunde inte spara utgiften');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-[20px] p-3.5 sm:p-4 shadow-2xs transition-all relative"
      id="quick_expense_widget"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Zap size={14} strokeWidth={2.2} />
          </div>
          <h4 className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Quick expense' : 'Snabb utgift'}
          </h4>

          {/* Date context if not today */}
          {formattedDateStr && (
            <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">
              {isEn ? `For ${formattedDateStr}` : `På ${formattedDateStr}`}
            </span>
          )}
        </div>

        {/* Discrete Secondary Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isCustomizing && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="px-2 py-0.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition-all cursor-pointer"
            >
              {isEn ? 'Remove' : 'Ta bort'}
            </button>
          ) : (
            <>
              {onAddIncome && (
                <button
                  type="button"
                  onClick={() => onAddIncome(selectedDate)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                  title={isEn ? 'Add income' : 'Lägg till inkomst'}
                >
                  <Plus size={12} strokeWidth={2.8} />
                  <span>{isEn ? 'Income' : 'Inkomst'}</span>
                </button>
              )}
              {onOpenFullExpenseForm && (
                <button
                  type="button"
                  onClick={() => onOpenFullExpenseForm(selectedDate)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)]/80 hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/60 active:scale-95 transition-all cursor-pointer"
                  title={isEn ? 'Detailed form' : 'Detaljerat formulär'}
                >
                  <span>{isEn ? 'More' : 'Fler val'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Single Input Field Bar with Microphone Integration */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex items-center bg-[var(--surface-muted)]/70 dark:bg-white/5 border rounded-xl transition-all pl-2 pr-1.5 py-1.5 min-h-[46px] ${
            isRecording
              ? 'border-rose-500/80 ring-2 ring-rose-500/25 bg-rose-500/5'
              : 'border-[var(--border-color)]/70 hover:border-[var(--border-color)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15'
          }`}
        >
          {/* Microphone Button on the LEFT */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isProcessing || isAudioTranscribing}
            aria-label={isRecording ? (isEn ? 'Stop listening' : 'Stoppa inspelning') : isEn ? 'Speak expense' : 'Prata in utgift'}
            title={isRecording ? (isEn ? 'Stop listening' : 'Stoppa inspelning') : isEn ? 'Speak expense' : 'Prata in utgift'}
            className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-bold flex items-center justify-center transition-all select-none cursor-pointer shrink-0 mr-1.5 ${
              isRecording
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105 animate-pulse'
                : isAudioTranscribing
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 active:scale-95'
            }`}
            id="quick_expense_mic_btn"
          >
            {isAudioTranscribing ? (
              <Loader2 size={16} className="animate-spin text-rose-500" />
            ) : isRecording ? (
              <Square size={14} className="fill-current" />
            ) : (
              <Mic size={17} strokeWidth={2.3} />
            )}
          </button>

          {/* Text Input in the middle */}
          <input
            ref={inputRef}
            type="text"
            placeholder={
              isRecording
                ? isEn
                  ? 'Speak now, e.g. "300 kr Coop"...'
                  : 'Prata nu, t.ex. "300 kr Coop"...'
                : isEn
                  ? 'e.g. 300kr Coop, or tap mic...'
                  : 't.ex. 300kr Coop, eller tryck micken...'
            }
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[var(--text-primary)] text-sm sm:text-[14.5px] font-medium outline-none placeholder:text-[var(--text-secondary)]/45 pr-2"
            id="quick_expense_smart_input"
            autoComplete="off"
            disabled={isProcessing || isAudioTranscribing}
          />

          {/* Submit Action Button on the RIGHT */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing || isAudioTranscribing || isRecording}
            aria-label={isEn ? 'Add' : 'Lägg till'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-bold flex items-center justify-center shrink-0 transition-all select-none ${
              inputText.trim() && !isProcessing && !isAudioTranscribing && !isRecording
                ? 'bg-accent text-white shadow-xs hover:opacity-90 active:scale-95 cursor-pointer'
                : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]/30 cursor-not-allowed border border-[var(--border-color)]/40'
            }`}
            id="quick_expense_submit_btn"
          >
            {isProcessing ? (
              <Sparkles size={15} className="animate-spin text-white" />
            ) : (
              <Plus size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </form>

      {/* Live Voice Status Indicator */}
      <AnimatePresence>
        {(recordingStatusText || isRecording || isAudioTranscribing) && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold"
          >
            {isRecording ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            ) : (
              <Volume2 size={14} className="shrink-0 animate-pulse text-rose-500" />
            )}
            <span className="truncate flex-1">{recordingStatusText}</span>
            {isRecording && (
              <button
                type="button"
                onClick={handleStopRecordingAndProcess}
                className="text-[11px] underline font-bold hover:text-rose-700 cursor-pointer"
              >
                {isEn ? 'Done' : 'Klar'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instant Success Feedback Toast */}
      <AnimatePresence>
        {successInfo && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"
          >
            <Check size={14} strokeWidth={2.5} className="shrink-0" />
            <div className="truncate flex-1">
              <span>
                {isEn ? 'Added' : 'Lade till'}{' '}
                <strong className="font-bold">
                  {successInfo.amount} {config.currency || 'kr'}
                </strong>{' '}
                {successInfo.merchant !== 'Snabb utgift' && <>({successInfo.merchant}) </>}
                {successInfo.category && <span className="opacity-80 font-normal">under {successInfo.category}</span>} ✨
              </span>
              {successInfo.transcript && (
                <p className="text-[11px] opacity-75 italic mt-0.5 truncate">
                  ”{successInfo.transcript}”
                </p>
              )}
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
