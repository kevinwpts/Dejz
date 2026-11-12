import type { RefObject, SetStateAction } from 'react';
import { CreateWizardStep, inferArtworkFromGoalName, formatInputThousands } from './goalHelpers';
import type { GoalArtworkTheme } from '../ui/VisualArtwork';
import React from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  CaretLeft,
  MagnifyingGlass,
  ImageSquare,
  X,
  Bank,
} from '@phosphor-icons/react';


import {
  getGoalArtworkTheme,
  GoalArtworkIllustration,
} from '../ui/VisualArtwork';
import { AccountItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';

export interface GoalCreateWizardProps {
  isCreateWizardOpen: boolean;
  goalArtworkId: string;
  slideDir: "forward" | "back";
  wizardStep: 2 | 1 | 3 | 4 | 5 | 6;
  navigateWizardStep: (next: CreateWizardStep, dir: "forward" | "back") => void;
  setIsCreateWizardOpen: (value: SetStateAction<boolean>) => void;
  goalTargetInput: string;
  goalMonthlyInput: string;
  goalCurrentInput: string;
  setGoalTargetInput: (value: SetStateAction<string>) => void;
  setGoalMonthlyInput: (value: SetStateAction<string>) => void;
  setGoalCurrentInput: (value: SetStateAction<string>) => void;
  handleSaveGoal: (overrideCurrentAmount?: number, overrideMonthly?: number) => void;
  goalNameInput: string;
  hasManuallyPickedArtwork: boolean;
  goalCustomImage: string | undefined;
  setGoalArtworkId: (value: SetStateAction<string>) => void;
  setGoalNameInput: (value: SetStateAction<string>) => void;
  artworkSearch: string;
  setArtworkSearch: (value: SetStateAction<string>) => void;
  galleryInputRef: RefObject<HTMLInputElement>;
  filteredArtworks: GoalArtworkTheme[];
  setGoalCustomImage: (value: SetStateAction<string | undefined>) => void;
  setHasManuallyPickedArtwork: (value: SetStateAction<boolean>) => void;
  setGoalLinkedAccountId: (value: SetStateAction<string | undefined>) => void;
  goalLinkedAccountId: string | undefined;
  accounts: AccountItem[];
  effectiveTotalBalance: number;
  formatKr: (amount: number) => string;
}

export const GoalCreateWizard: React.FC<GoalCreateWizardProps> = ({
  isCreateWizardOpen,
  goalArtworkId,
  slideDir,
  wizardStep,
  navigateWizardStep,
  setIsCreateWizardOpen,
  goalTargetInput,
  goalMonthlyInput,
  goalCurrentInput,
  setGoalTargetInput,
  setGoalMonthlyInput,
  setGoalCurrentInput,
  handleSaveGoal,
  goalNameInput,
  hasManuallyPickedArtwork,
  goalCustomImage,
  setGoalArtworkId,
  setGoalNameInput,
  artworkSearch,
  setArtworkSearch,
  galleryInputRef,
  filteredArtworks,
  setGoalCustomImage,
  setHasManuallyPickedArtwork,
  setGoalLinkedAccountId,
  goalLinkedAccountId,
  accounts,
  effectiveTotalBalance,
  formatKr,
}) => {
  if (!isCreateWizardOpen || typeof document === 'undefined') return null;

  const activeTheme = getGoalArtworkTheme(goalArtworkId);
  const pageAnimClass =
    slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

  const handleBackNavigation = () => {
    if (wizardStep === 6) {
      navigateWizardStep(5, 'back');
    } else if (wizardStep === 5) {
      navigateWizardStep(4, 'back');
    } else if (wizardStep > 1) {
      navigateWizardStep((wizardStep - 1) as CreateWizardStep, 'back');
    } else {
      setIsCreateWizardOpen(false);
    }
  };

  const appendDigit = (digit: string, isTarget: boolean) => {
    const isMonthly = wizardStep === 6;
    const current = isTarget ? goalTargetInput : isMonthly ? goalMonthlyInput : goalCurrentInput;
    const setFn = isTarget ? setGoalTargetInput : isMonthly ? setGoalMonthlyInput : setGoalCurrentInput;
    const next = (current + digit).replace(/^0+/, '');
    if (next.length <= 9) {
      setFn(next);
    }
  };

  const removeLastDigit = (isTarget: boolean) => {
    const isMonthly = wizardStep === 6;
    const current = isTarget ? goalTargetInput : isMonthly ? goalMonthlyInput : goalCurrentInput;
    const setFn = isTarget ? setGoalTargetInput : isMonthly ? setGoalMonthlyInput : setGoalCurrentInput;
    setFn(current.slice(0, -1));
  };

  const renderNumpad = (isTarget: boolean) => {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return (
      <div className="grid grid-cols-3 gap-y-1 gap-x-4 pb-3 select-none">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => appendDigit(d, isTarget)}
            className="h-14 rounded-2xl font-display font-semibold text-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
          >
            {d}
          </button>
        ))}

        <button
          type="button"
          onClick={() => appendDigit('00', isTarget)}
          className="h-14 rounded-2xl font-display font-semibold text-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
        >
          ,
        </button>

        <button
          type="button"
          onClick={() => appendDigit('0', isTarget)}
          className="h-14 rounded-2xl font-display font-semibold text-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
        >
          0
        </button>

        <button
          type="button"
          onClick={() => removeLastDigit(isTarget)}
          aria-label="Sudda"
          className="h-14 rounded-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>
    );
  };

  const stepHeading =
    wizardStep === 1
      ? 'Vad sparar du till?'
      : wizardStep === 2
      ? 'Välj bild till ditt mål'
      : wizardStep === 3
      ? 'Hur mycket behöver du spara?'
      : wizardStep === 4
      ? 'Hur vill du följa sparandet?'
      : wizardStep === 5
      ? 'Hur mycket har du sparat hittills?'
      : 'Hur mycket sparar du varje månad?';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-fade-in"
      onClick={() => setIsCreateWizardOpen(false)}
    >
      {/* Subtle stacked card edge behind the sheet (matches Lunar modal stack) */}
      <div
        className="w-[92%] max-w-[416px] mx-auto h-3 rounded-t-3xl bg-[var(--surface-color)]/60 border-t border-x border-[var(--border-subtle)]/60 -mb-1 pointer-events-none"
        aria-hidden="true"
      />

      {/* Sheet Container (Does NOT cover the whole screen) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto h-[89dvh] max-h-[89dvh] rounded-t-3xl bg-[var(--bg-color)] text-[var(--text-primary)] border-t border-[var(--border-subtle)] shadow-[0_-16px_48px_rgba(0,0,0,0.45)] flex flex-col justify-between px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] font-sans overflow-hidden select-none animate-slide-up"
      >
        {/* 1. TOP HEADER (Circular Back button + optional Hoppa över pill + Centered Question) */}
        <header className="shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackNavigation}
              className="w-11 h-11 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
              aria-label="Tillbaka"
            >
              <CaretLeft size={18} weight="bold" />
            </button>

            {wizardStep === 5 || wizardStep === 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (wizardStep === 5) {
                    setGoalCurrentInput('0');
                    navigateWizardStep(6, 'forward');
                  } else {
                    setGoalMonthlyInput('');
                    handleSaveGoal(undefined, 0);
                  }
                }}
                className="px-4 py-2 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
              >
                Hoppa över
              </button>
            ) : (
              <div className="w-11" />
            )}
          </div>

          <h2 className="text-subhead sm:text-base font-medium text-center text-[var(--text-primary)] tracking-[-0.01em]">
            {stepHeading}
          </h2>
        </header>

        {/* ============================================================== */}
        {/* STEG 1: VAD SPARAR DU TILL?                                    */}
        {/* ============================================================== */}
        {wizardStep === 1 && (
          <form
            key="goal-step-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!goalNameInput.trim()) return;
              if (!hasManuallyPickedArtwork && !goalCustomImage) {
                setGoalArtworkId(inferArtworkFromGoalName(goalNameInput));
              }
              navigateWizardStep(2, 'forward');
            }}
            className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
          >
            <div className="my-auto py-6 flex flex-col items-center justify-center">
              <input
                type="text"
                autoFocus
                required
                placeholder="t.ex. Buffert eller Resa"
                value={goalNameInput}
                onChange={(e) => setGoalNameInput(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-center font-display font-bold text-3xl sm:text-4xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/35 tracking-tight focus:outline-none"
              />
            </div>

            <div className="shrink-0 pt-3">
              <button
                type="submit"
                disabled={!goalNameInput.trim()}
                className={`w-full py-4 rounded-full font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  goalNameInput.trim()
                    ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] hover:opacity-90 active:scale-[0.99] cursor-pointer'
                    : 'bg-[var(--surface-color)] text-[var(--text-muted)] cursor-not-allowed'
                }`}
              >
                <span>Fortsätt</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* STEG 2: VÄLJ BILD TILL DITT MÅL (Live-kort + Sök + 3x3 grid)   */}
        {/* ============================================================== */}
        {wizardStep === 2 && (
          <div
            key="goal-step-2"
            className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-3 ${pageAnimClass}`}
          >
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 py-1 pr-0.5">
              <div
                className="relative rounded-2xl overflow-hidden px-4 py-4 min-h-[76px] flex items-center justify-between text-white shadow-sm transition-colors duration-200"
                style={{
                  background: goalCustomImage ? '#111827' : activeTheme.heroBg,
                }}
              >
                {goalCustomImage ? (
                  <>
                    <img
                      src={goalCustomImage}
                      alt={goalNameInput}
                      className="absolute inset-0 w-full h-full object-cover opacity-55"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/20" />
                  </>
                ) : (
                  <div
                    className="absolute -right-5 -top-2 w-24 h-24 pointer-events-none select-none opacity-95"
                    aria-hidden="true"
                  >
                    <GoalArtworkIllustration artworkId={goalArtworkId} />
                  </div>
                )}

                <div className="relative z-10 min-w-0 max-w-[68%]">
                  <span className="font-display font-bold text-base sm:text-lg text-white block truncate">
                    {goalNameInput.trim() || 'Nytt sparmål'}
                  </span>
                </div>
              </div>

              <div className="relative shrink-0">
                <MagnifyingGlass
                  size={15}
                  className="ui-input-icon"
                />
                <input
                  type="text"
                  value={artworkSearch}
                  onChange={(e) => setArtworkSearch(e.target.value)}
                  placeholder="Sök bild..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
                {artworkSearch.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setArtworkSearch('')}
                    aria-label="Rensa sökning"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5 content-start">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className={`aspect-square rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden ${
                    goalCustomImage
                      ? 'ring-2 ring-[var(--text-primary)]'
                      : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {goalCustomImage ? (
                    <>
                      <img
                        src={goalCustomImage}
                        alt="Uppladdad"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center p-2">
                        <ImageSquare size={22} weight="bold" className="text-white mb-1" />
                        <span className="text-caption font-medium text-white leading-tight">
                          Byt bild
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageSquare
                        size={22}
                        weight="regular"
                        className="text-[var(--text-primary)] mb-1.5"
                      />
                      <span className="text-caption font-medium text-[var(--text-primary)] leading-tight">
                        Egen bild
                      </span>
                    </>
                  )}
                </button>

                {filteredArtworks.map((art) => {
                  const isSelected = !goalCustomImage && goalArtworkId === art.id;
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => {
                        setGoalCustomImage(undefined);
                        setGoalArtworkId(art.id);
                        setHasManuallyPickedArtwork(true);
                      }}
                      title={art.label}
                      style={{ backgroundColor: art.tileBg }}
                      className={`aspect-square rounded-2xl p-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'ring-[2.5px] ring-[var(--text-primary)] scale-[0.98]'
                          : 'opacity-90 hover:opacity-100'
                      }`}
                    >
                      <GoalArtworkIllustration artworkId={art.id} className="w-full h-full" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shadow-sm">
                          <Check size={11} weight="bold" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 pt-3">
              <button
                type="button"
                onClick={() => navigateWizardStep(3, 'forward')}
                className="w-full py-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Fortsätt</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEG 3: HUR MYCKET BEHÖVER DU SPARA? (Stora siffror + Numpad)  */}
        {/* ============================================================== */}
        {wizardStep === 3 && (
          <div
            key="goal-step-3"
            className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
          >
            <div className="my-auto py-4 flex items-center justify-center">
              <div className="flex items-baseline justify-center gap-2.5 font-display font-bold text-5xl sm:text-6xl tracking-tight tabular-nums">
                <span
                  className={
                    Number(goalTargetInput) > 0
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]/40'
                  }
                >
                  {Number(goalTargetInput) > 0
                    ? formatInputThousands(goalTargetInput)
                    : '0'}
                </span>
                <span className="text-[var(--text-primary)]">kr</span>
              </div>
            </div>

            <div className="shrink-0">
              {renderNumpad(true)}

              <button
                type="button"
                disabled={!(Number(goalTargetInput) > 0)}
                onClick={() => navigateWizardStep(4, 'forward')}
                className={`w-full py-4 rounded-full font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  Number(goalTargetInput) > 0
                    ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] hover:opacity-90 active:scale-[0.99] cursor-pointer'
                    : 'bg-[var(--surface-color)] text-[var(--text-muted)] cursor-not-allowed'
                }`}
              >
                <span>Fortsätt</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEG 4: HUR VILL DU FÖLJA SPARANDET? (Rena valkort)            */}
        {/* ============================================================== */}
        {wizardStep === 4 && (
          <div
            key="goal-step-4"
            className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-4 ${pageAnimClass}`}
          >
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
              <button
                type="button"
                onClick={() => setGoalLinkedAccountId(undefined)}
                className={`ui-option-card ${
                  !goalLinkedAccountId
                    ? 'bg-[var(--surface-color)] border-[var(--text-primary)]/40'
                    : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-65'
                }`}
              >
                <div
                  className={`ui-checkbox ${
                    !goalLinkedAccountId
                      ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                  }`}
                >
                  {!goalLinkedAccountId && <Check size={12} weight="bold" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="ui-option-title">
                    Eget valt belopp
                  </span>
                  <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                    Välj startbelopp i nästa steg och uppdatera själv
                  </span>
                </div>
              </button>

              {(accounts.length > 0 || effectiveTotalBalance > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setGoalLinkedAccountId('__TOTAL__');
                    setGoalCurrentInput(String(effectiveTotalBalance));
                  }}
                  className={`ui-option-card ${
                    goalLinkedAccountId === '__TOTAL__'
                      ? 'bg-[var(--surface-color)] border-[var(--text-primary)]/40'
                      : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-65'
                  }`}
                >
                  <div
                    className={`ui-checkbox ${
                      goalLinkedAccountId === '__TOTAL__'
                        ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                    }`}
                  >
                    {goalLinkedAccountId === '__TOTAL__' && (
                      <Check size={12} weight="bold" />
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                    <Bank size={15} weight="regular" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="ui-option-title">
                      Totalsaldo
                    </span>
                    <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                      Alla konton · Synkas automatiskt
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                    {formatKr(effectiveTotalBalance)}
                  </span>
                </button>
              )}

              {accounts.map((acc) => {
                const isSelected = goalLinkedAccountId === acc.id;
                const accBal = Math.max(0, Math.round(Number(acc.balance) || 0));
                const hasDuplicateName =
                  accounts.filter(
                    (other) =>
                      other.name.trim().toLowerCase() === acc.name.trim().toLowerCase()
                  ).length > 1;
                const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
                const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';
                const showBankSub =
                  Boolean(acc.bankName) &&
                  !acc.name.toLowerCase().includes((acc.bankName || '').toLowerCase());

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setGoalLinkedAccountId(acc.id);
                      setGoalCurrentInput(String(accBal));
                    }}
                    className={`ui-option-card ${
                      isSelected
                        ? 'bg-[var(--surface-color)] border-[var(--text-primary)]/40'
                        : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-65'
                    }`}
                  >
                    <div
                      className={`ui-checkbox ${
                        isSelected
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {isSelected && <Check size={12} weight="bold" />}
                    </div>
                    <ItemLogo
                      name={acc.bankName || acc.name}
                      category="Bank"
                      logoUrl={acc.logo}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-option-title">
                        {acc.name}
                      </span>
                      {(showBankSub || (hasDuplicateName && last4)) && (
                        <span className="text-xs text-[var(--text-muted)] block tabular-nums mt-0.5 truncate">
                          {showBankSub ? acc.bankName : ''}
                          {showBankSub && hasDuplicateName && last4 ? ' · ' : ''}
                          {hasDuplicateName && last4 ? `•••• ${last4}` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                      {formatKr(accBal)}
                    </span>
                  </button>
                );
              })}

            </div>

            <div className="shrink-0 pt-3">
              {!goalLinkedAccountId ? (
                <button
                  type="button"
                  onClick={() => navigateWizardStep(5, 'forward')}
                  className="w-full py-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
                  onClick={() => handleSaveGoal()}
                  className="w-full py-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
                >
                  <span>Skapa sparmål</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEG 5: HUR MYCKET HAR DU SPARAT HITTILLS? (Stora siffror)     */}
        {/* ============================================================== */}
        {wizardStep === 5 && (
          <div
            key="goal-step-5"
            className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
          >
            <div className="my-auto py-4 flex items-center justify-center">
              <div className="flex items-baseline justify-center gap-2.5 font-display font-bold text-5xl sm:text-6xl tracking-tight tabular-nums">
                <span
                  className={
                    Number(goalCurrentInput) > 0
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]/40'
                  }
                >
                  {Number(goalCurrentInput) > 0
                    ? formatInputThousands(goalCurrentInput)
                    : '0'}
                </span>
                <span className="text-[var(--text-primary)]">kr</span>
              </div>
            </div>

            <div className="shrink-0">
              {renderNumpad(false)}

              <button
                type="button"
                disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
                onClick={() => navigateWizardStep(6, 'forward')}
                className="w-full py-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
              >
                <span>Fortsätt</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEG 6: MÅNADSSPARANDE – dras av från "kvar att spendera"       */}
        {/* ============================================================== */}
        {wizardStep === 6 && (
          <div
            key="goal-step-6"
            className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
          >
            <p className="pt-1 text-sm text-[var(--text-secondary)] leading-[1.45] text-center max-w-xs mx-auto">
              Dras av från det du har kvar att spendera varje lönedag och läggs till i målet automatiskt.
              Du kan hoppa över och sätta in pengar själv när du vill.
            </p>
            <div className="my-auto py-4 flex flex-col items-center justify-center gap-2">
              <div className="flex items-baseline justify-center gap-2.5 font-display font-bold text-5xl sm:text-6xl tracking-tight tabular-nums">
                <span
                  className={
                    Number(goalMonthlyInput) > 0
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]/40'
                  }
                >
                  {Number(goalMonthlyInput) > 0 ? formatInputThousands(goalMonthlyInput) : '0'}
                </span>
                <span className="text-[var(--text-primary)]">kr</span>
              </div>
              {Number(goalMonthlyInput) > 0 && Number(goalTargetInput) > 0 && (
                <span className="text-sm text-[var(--text-secondary)]">
                  {(() => {
                    const left = Math.max(
                      0,
                      Number(goalTargetInput) - (Number(goalCurrentInput) || 0)
                    );
                    const months = Math.ceil(left / Number(goalMonthlyInput));
                    return left === 0
                      ? 'Du har redan nått målet 🎉'
                      : months === 1
                      ? 'Du når målet om 1 månad'
                      : `Du når målet om ${months} månader`;
                  })()}
                </span>
              )}
            </div>

            <div className="shrink-0">
              {renderNumpad(false)}

              <button
                type="button"
                disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
                onClick={() => handleSaveGoal()}
                className="w-full py-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
              >
                <span>Skapa sparmål</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
