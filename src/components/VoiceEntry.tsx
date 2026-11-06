import React, { useEffect, useRef, useState } from 'react';
import { Microphone, Keyboard } from '@phosphor-icons/react';
import { BottomSheet } from './ui/BottomSheet';
import { parseQuickEntry } from '../utils/quickEntry';

/**
 * "Lägg till köp" från menyns plusknapp: prata in ("Ica 143 kronor") eller fyll i manuellt.
 * Rösten öppnar "Nytt köp" med namn, belopp och kategori ifyllt – inget sparas förrän man trycker Spara.
 */

export type VoiceResult = { title: string; amount?: number };

interface AddEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (result: VoiceResult) => void;
  onManual: () => void;
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

  const stopListening = () => {
    try {
      recRef.current?.abort();
    } catch {
      // redan stoppad
    }
    recRef.current = null;
    setListening(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setHeard('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => () => stopListening(), []);

  const startListening = () => {
    const Rec = getSpeechRecognition();
    if (!Rec) return;
    setError(null);
    setHeard('');
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
        setHeard((final || interim).trim());
      };
      rec.onerror = (e: any) => {
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
        const result = toResult(finalRef.current);
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
        <div className="ui-sheet-sub-header">
          <span className="ui-sheet-title">Lägg till köp</span>
        </div>

        <div className="flex flex-col items-center text-center gap-4">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            aria-label={listening ? 'Sluta lyssna' : 'Prata in köpet'}
            className="relative w-24 h-24 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #7356FF 0%, #5B3DF5 50%, #3F22C9 100%)',
              boxShadow: '0 14px 30px -10px rgba(63, 34, 201, 0.55)',
            }}
          >
            {listening && (
              <span className="absolute inset-0 rounded-full bg-[#5B3DF5]/40 animate-ping" />
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
          className="w-full py-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-sm font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Keyboard size={18} />
          <span>Fyll i manuellt</span>
        </button>
      </div>
    </BottomSheet>
  );
};
