import React, { useEffect, useRef, useState } from 'react';
import { Microphone, Keyboard } from '@phosphor-icons/react';
import { BottomSheet } from './ui/BottomSheet';
import { parseQuickEntry } from '../utils/quickEntry';
import { SheetHeader } from './ui/SheetHeader';

/**
 * "Lägg till köp" från menyns plusknapp: prata in ("Ica 143 kronor") eller fyll i manuellt.
 * Rösten öppnar "Nytt köp" med namn, belopp och kategori ifyllt – inget sparas förrän man trycker Spara.
 */

type VoiceResult = { title: string; amount?: number };

interface AddEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (result: VoiceResult) => void;
  onManual: () => void;
}

// Webbläsarens taligenkänning (Chrome/Android/Safari) – finns inte i alla typer
type SpeechRecResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};
type SpeechRecErrorEvent = { error?: string };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecResultEvent) => void) | null;
  onerror: ((e: SpeechRecErrorEvent) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Finns taligenkänning i den här webbläsaren? Annars går plusknappen direkt till manuell inmatning. */
export function isVoiceEntrySupported(): boolean {
  return Boolean(getSpeechRecognition());
}

function toResult(text: string): VoiceResult | null {
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

export const AddEntrySheet: React.FC<AddEntrySheetProps> = ({
  isOpen,
  onClose,
  onResult,
  onManual,
}) => {
  const [heard, setHeard] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const finalRef = useRef('');
  // Senaste text som syntes på skärmen – iPhone markerar ofta aldrig resultatet som "klart"
  const lastHeardRef = useRef('');
  // true när lyssnandet avbryts (t.ex. bladet stängs) – då ska inget köp skapas
  const cancelledRef = useRef(false);

  /** Stäng av mikrofonen utan att skapa något köp (rör bara taligenkänningen, inte state). */
  const abortRecognition = () => {
    cancelledRef.current = true;
    try {
      recRef.current?.abort();
    } catch {
      // redan stoppad
    }
    recRef.current = null;
  };

  /** Avbryt utan att skapa något (används när bladet stängs eller man väljer manuellt). */
  const stopListening = () => {
    abortRecognition();
    setListening(false);
  };

  /** Användaren trycker för att bli klar: avsluta mjukt så att det som sagts tas med. */
  const finishListening = () => {
    try {
      if (recRef.current) {
        recRef.current.stop();
        return; // onend skapar köpet
      }
    } catch {
      // ignore
    }
    setListening(false);
  };

  // Bladet stängs: nollställ det som visas (justeras direkt under render) …
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setListening(false);
      setHeard('');
      setError(null);
    }
  }

  // … och stäng av mikrofonen (sidoeffekt → i en effekt). Även när komponenten försvinner.
  useEffect(() => {
    if (!isOpen) abortRecognition();
  }, [isOpen]);

  useEffect(() => () => abortRecognition(), []);

  const startListening = () => {
    const Rec = getSpeechRecognition();
    if (!Rec) return;
    setError(null);
    setHeard('');
    finalRef.current = '';
    lastHeardRef.current = '';
    cancelledRef.current = false;
    try {
      const rec = new Rec();
      rec.lang = 'sv-SE';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < e.results.length; i++) {
          const chunk = e.results[i][0]?.transcript || '';
          if (e.results[i].isFinal) final += chunk;
          else interim += chunk;
        }
        if (final) finalRef.current = final.trim();
        const shown = (final || interim).trim();
        if (shown) lastHeardRef.current = shown;
        setHeard(shown);
      };
      rec.onerror = (e) => {
        const code = e?.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setError('Mikrofonen är blockerad. Tillåt den i webbläsaren, eller fyll i manuellt.');
        } else if (code === 'no-speech') {
          setError('Jag hörde inget. Tryck och försök igen.');
        } else if (code !== 'aborted') {
          setError('Rösten fungerar inte här just nu. Fyll i manuellt.');
        }
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
        if (cancelledRef.current) return;
        const result = toResult(finalRef.current || lastHeardRef.current);
        if (result) onResult(result);
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setError('Rösten fungerar inte här just nu. Fyll i manuellt.');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        <SheetHeader title="Lägg till köp" onClose={onClose} flush />

        <div className="flex flex-col items-center text-center gap-4">
          <button
            type="button"
            onClick={listening ? finishListening : startListening}
            aria-label={listening ? 'Sluta lyssna' : 'Prata in köpet'}
            className="ui-fab relative w-24 h-24"
          >
            {listening && (
              <span className="absolute inset-0 rounded-full bg-brand/40 animate-ping" />
            )}
            <Microphone size={38} weight="fill" className="relative" />
          </button>

          <div className="min-h-[52px] flex flex-col items-center justify-center gap-1">
            {heard ? (
              <p className="font-display font-semibold text-xl text-[var(--text-primary)]">{heard}</p>
            ) : (
              <p className="font-display font-semibold text-base text-[var(--text-primary)]">
                {listening ? 'Lyssnar …' : 'Tryck och prata'}
              </p>
            )}
            <p className="text-sm text-[var(--text-secondary)]">
              {error || 'Säg t.ex. ”Ica 143 kronor”'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            stopListening();
            onManual();
          }}
          className="w-full py-3.5 rounded-2xl bg-[var(--fill-grouped)] hover:opacity-90 text-sm font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Keyboard size={18} />
          <span>Fyll i manuellt</span>
        </button>
      </div>
    </BottomSheet>
  );
};
