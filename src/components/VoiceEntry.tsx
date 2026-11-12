import React, { useEffect, useRef, useState } from 'react';
import { Microphone, Keyboard } from '@phosphor-icons/react';
import { BottomSheet } from './ui/BottomSheet';
import { parseQuickEntry } from '../utils/quickEntry';
import { applyKnownBrandCasing } from '../utils/bankAnalysis/merchantRules';
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
const VOICE_UNAVAILABLE = { title: 'Rösten fungerar inte här', hint: 'Fyll i köpet manuellt i stället.' };

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
  return { title: applyKnownBrandCasing(clean.charAt(0).toUpperCase() + clean.slice(1)) };
}

export const AddEntrySheet: React.FC<AddEntrySheetProps> = ({
  isOpen,
  onClose,
  onResult,
  onManual,
}) => {
  const [heard, setHeard] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<{ title: string; hint: string } | null>(null);
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
          setError({ title: 'Mikrofonen är blockerad', hint: 'Tillåt mikrofonen i webbläsarens inställningar.' });
        } else if (code === 'no-speech') {
          setError({ title: 'Jag hörde inget', hint: 'Tryck på mikrofonen och försök igen.' });
        } else if (code !== 'aborted') {
          setError(VOICE_UNAVAILABLE);
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
      setError(VOICE_UNAVAILABLE);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        <SheetHeader title="Lägg till köp" onClose={onClose} flush />

        <div className="flex flex-col items-center text-center gap-5 pt-2">
          <button
            type="button"
            onClick={listening ? finishListening : startListening}
            aria-label={listening ? 'Sluta lyssna' : 'Prata in köpet'}
            className="ui-fab relative w-24 h-24"
          >
            {listening && (
              <span className="ui-mic-pulse" aria-hidden="true" />
            )}
            <Microphone size={38} weight="fill" className="relative" />
          </button>

          <div className="min-h-[56px] flex flex-col items-center justify-center gap-1" aria-live="polite">
            {heard ? (
              <p className="font-display font-semibold text-[22px] tracking-[-0.02em] text-[var(--text-primary)]">
                ”{heard}”
              </p>
            ) : (
              <p className="font-display font-semibold text-[17px] tracking-[-0.015em] text-[var(--text-primary)]">
                {error ? error.title : listening ? 'Lyssnar …' : 'Tryck och prata'}
              </p>
            )}
            <p className="text-callout text-[var(--text-secondary)] max-w-[280px] text-pretty">
              {error ? error.hint : heard ? 'Tryck på mikrofonen när du är klar' : 'Säg t.ex. ”Ica 143 kronor”'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            stopListening();
            onManual();
          }}
          className="ui-btn-secondary"
        >
          <Keyboard size={20} />
          <span>Fyll i manuellt</span>
        </button>
      </div>
    </BottomSheet>
  );
};
