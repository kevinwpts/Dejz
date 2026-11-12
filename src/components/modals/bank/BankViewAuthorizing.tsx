// "Anslut bank" steg 2: öppna bankens inloggning (BankID), eller klistra in återkopplingslänken.
import React from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import type { BankAspsp } from '../../../services/bank/types';
import { BankLogo } from '../../BankLogo';

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
    <div className="text-center pb-2 pt-2">
      <div className="flex justify-center mb-3.5">
        <BankLogo name={selectedBank?.name || 'Bank'} size="xl" />
      </div>
      <h4 className="font-display font-semibold text-xl tracking-[-0.02em] text-[var(--text-primary)]">
        {selectedBank?.name}
      </h4>
      <p className="text-subhead leading-snug text-[var(--text-secondary)] mt-1.5 max-w-[280px] mx-auto">
        Logga in med BankID så hämtar vi dina konton. Vi kan bara läsa – aldrig flytta pengar.
      </p>
    </div>

    <a
      href={authUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="ui-btn-primary"
    >
      <span>Öppna {selectedBank?.name}</span>
      <ArrowSquareOut size={15} />
    </a>

    {!showManualCallback ? (
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => setShowManualCallback(true)}
          className="h-10 px-3 text-footnote font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Öppnades inloggningen i en annan flik?
        </button>
      </div>
    ) : (
      <form
        onSubmit={onSubmitManualCallback}
        className="pt-3 border-t border-[var(--separator)] space-y-2 animate-fade-in"
      >
        <div className="flex gap-2">
          <input
            aria-label="Återkopplingslänk"
            type="text"
            value={manualCallbackUrl}
            onChange={(e) => setManualCallbackUrl(e.target.value)}
            placeholder="Klistra in länken från banken"
            className="ui-box-input flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={exchangingCode || !manualCallbackUrl.trim()}
            className="ui-btn-sm-primary !h-[50px] px-4"
          >
            {exchangingCode ? 'Verifierar...' : 'Slutför'}
          </button>
        </div>
      </form>
    )}
  </div>
);
