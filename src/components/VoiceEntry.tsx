import React, { useEffect, useRef, useState } from 'react';
import { Microphone, ArrowRight } from '@phosphor-icons/react';
import { BottomSheet } from './ui/BottomSheet';
import { parseQuickEntry } from '../utils/quickEntry';

/**
 * Röstinmatning av köp: tryck på mikrofonen, säg "Ica 143 kronor",
 * så öppnas "Nytt köp" med namn, belopp och kategori ifyllt. Inget sparas förrän man trycker Spara.
 * Saknar webbläsaren taligenkänning (t.ex. vissa iPhone-lägen) kan man skriva eller använda
 * tangentbordets mikrofon i samma ruta.
 */

type Result = { title: string; amount?: number };

interface VoiceEntryProps {
  onResult: (result: Result) => void;
}

// Webbläsarens taligenkänning (Chrome/Android/Safari) – finns inte i alla typer
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function toResult(text: string): Result | null {
  const clean = text.trim();
  if (!clean) return null;
  const parsed = parseQuickEntry(clean);
  if (parsed) return { title: parsed.name, amount: parsed.amount };
  const onlyNumber = clean.replace(/\s*(kr|kronor|:-)\.?$/i, '').replace(/\s/g, '');
  if (/^\d+([.,]\d{1,2})?$/.test(onlyNumber)) {
    return { title: '', amount: Math.round(Number(onlyNumber.replace(',', '.'))) };
  }
  return { title: clean.charAt(0).toUpperCase() + clean.slice(1) };
}

export const VoiceEntry: React.FC<VoiceEntryProps> = ({ onResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const finalRef = useRef('');
  const supported = Boolean(getSpeechRecognition());

  const stopListening = () => {
    try {
      recRef.current?.abort();
    } catch {
      // redan stoppad
    }
    recRef.current = null;
    setListening(false);
  };

  const finish = (value: string) => {
    const result = toResult(value);
    if (!result) return;
    stopListening();
    setIsOpen(false);
    setText('');
    onResult(result);
  };

  const startListening = () => {
    const Rec = getSpeechRecognition();
    if (!Rec) return;
    setError(null);
    finalRef.current = '';
    try {
      const rec = new Rec();
      rec.lang = 'sv-SE';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < e.results.length; i++) {
          const chunk = e.results[i][0]?.transcript || '';
          if (e.results[i].isFinal) final += chunk;
          else interim += chunk;
        }
        if (final) finalRef.current = final.trim();
        setText((final || interim).trim());
      };
      rec.onerror = (e: any) => {
        const code = e?.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setError('Mikrofonen är blockerad. Skriv i stället, eller tillåt mikrofonen i webbläsaren.');
        } else if (code === 'no-speech') {
          setError('Jag hörde inget. Tryck på mikrofonen och försök igen.');
        } else if (code !== 'aborted') {
          setError('Röstinmatning fungerar inte här just nu. Skriv i stället.');
        }
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
        // Hörde vi både namn och belopp går vi direkt vidare
        const heard = finalRef.current;
        if (heard && parseQuickEntry(heard)) finish(heard);
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setError('Röstinmatning fungerar inte här just nu. Skriv i stället.');
    }
  };

  const open = () => {
    setText('');
    setError(null);
    setIsOpen(true);
    if (supported) startListening();
  };

  const close = () => {
    stopListening();
    setIsOpen(false);
  };

  useEffect(() => () => stopListening(), []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Lägg till köp med rösten"
        className="fixed z-30 w-14 h-14 rounded-full text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        style={{
          bottom: 'calc(1.5rem + 62px + 14px)',
          right: 'max(1rem, calc((100vw - 24rem) / 2))',
          background: 'linear-gradient(135deg, #7356FF 0%, #5B3DF5 50%, #3F22C9 100%)',
          boxShadow: '0 10px 24px -8px rgba(63, 34, 201, 0.55)',
        }}
      >
        <Microphone size={24} weight="fill" />
      </button>

      <BottomSheet isOpen={isOpen} onClose={close}>
        <div className="space-y-5">
          <div className="ui-sheet-sub-header">
            <span className="ui-sheet-title">Lägg till köp</span>
          </div>

          <div className="flex flex-col items-center text-center gap-4 pt-1">
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={!supported}
              aria-label={listening ? 'Sluta lyssna' : 'Börja lyssna'}
              className="relative w-20 h-20 rounded-full flex items-center justify-center text-white disabled:opacity-40 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #7356FF 0%, #5B3DF5 50%, #3F22C9 100%)',
              }}
            >
              {listening && (
                <span className="absolute inset-0 rounded-full bg-[#5B3DF5]/40 animate-ping" />
              )}
              <Microphone size={32} weight="fill" className="relative" />
            </button>
            <p className="text-sm text-[var(--text-secondary)] min-h-[20px]">
              {error
                ? error
                : listening
                ? 'Lyssnar …'
                : supported
                ? 'Tryck och säg t.ex. ”Ica 143 kronor”'
                : 'Skriv t.ex. ”Ica 143” – eller använd tangentbordets mikrofon'}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              finish(text);
            }}
            className="space-y-3"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => {
                if (listening) stopListening();
                setText(e.target.value);
              }}
              autoFocus={!supported}
              enterKeyHint="done"
              placeholder="T.ex. Ica 143"
              className="w-full h-14 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] font-display font-semibold text-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-35 transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </form>
        </div>
      </BottomSheet>
    </>
  );
};
