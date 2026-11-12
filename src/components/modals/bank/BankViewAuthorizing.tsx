// "Anslut bank" steg 2: öppna bankens inloggning (BankID), eller klistra in återkopplingslänken.
import React from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import type { BankAspsp } from '../../../services/bankService';
import { ItemLogo } from '../../ItemLogo';

export interface BankViewAuthorizingProps {
  authUrl: string;
  selectedBank: BankAspsp | null;
  showManualCallback: boolean;
  setShowManualCallback: (value: SetStateAction<boolean>) => void;
  manualCallbackUrl: string;
  setManualCallbackUrl: (value: SetStateAction<string>) => void;
  exchangingCode: boolean;
  onSubmitManualCallback: (e: React.FormEvent) => void;
}

export const BankViewAuthorizing: React.FC<BankViewAuthorizingProps> = ({
  authUrl,
  selectedBank,
  showManualCallback,
  setShowManualCallback,
  manualCallbackUrl,
  setManualCallbackUrl,
  exchangingCode,
  onSubmitManualCallback,
}) => (
  <div className="space-y-4">
    <div className="text-center pb-2">
      <div className="flex justify-center mb-3.5">
        <ItemLogo
          name={selectedBank?.name || 'Bank'}
          logoUrl={selectedBank?.logo ?? undefined}
          size="xl"
        />
      </div>
      <h4 className="font-display font-bold text-lg text-[var(--text-primary)]">
        {selectedBank?.name}
      </h4>
      <p className="text-xs text-[var(--text-muted)] mt-1">
        Legitimera dig med Mobilt BankID för att hämta dina konton.
      </p>
    </div>

    <a
      href={authUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="ui-btn-primary"
    >
      <span>Öppna {selectedBank?.name}</span>
      <ArrowSquareOut size={15} weight="bold" />
    </a>

    {!showManualCallback ? (
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => setShowManualCallback(true)}
          className="text-caption font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Öppnades inloggningen i en annan flik?
        </button>
      </div>
    ) : (
      <form
        onSubmit={onSubmitManualCallback}
        className="pt-3 border-t border-[var(--border-subtle)] space-y-2 animate-fade-in"
      >
        <div className="flex gap-2">
          <input
            aria-label="Återkopplingslänk"
            type="text"
            value={manualCallbackUrl}
            onChange={(e) => setManualCallbackUrl(e.target.value)}
            placeholder="Klistra in återkopplingslänk..."
            className="flex-1 px-3.5 py-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-base font-normal text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
          />
          <button
            type="submit"
            disabled={exchangingCode || !manualCallbackUrl.trim()}
            className="ui-btn-sm-primary px-4"
          >
            {exchangingCode ? 'Verifierar...' : 'Slutför'}
          </button>
        </div>
      </form>
    )}
  </div>
);
