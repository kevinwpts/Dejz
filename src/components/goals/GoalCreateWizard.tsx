import type { RefObject, SetStateAction } from 'react';
import { CreateWizardStep, inferArtworkFromGoalName } from './goalHelpers';
import type { GoalArtworkTheme } from '../ui/VisualArtwork';
import React from 'react';
import { createPortal } from 'react-dom';
import { AccountItem } from '../../app/models';
import { StepName } from './wizard/StepName';
import { StepArtwork } from './wizard/StepArtwork';
import { StepAccountLink } from './wizard/StepAccountLink';
import { StepTargetAmount, StepCurrentAmount, StepMonthlyAmount } from './wizard/AmountSteps';
import { SheetHeader } from '../ui/SheetHeader';

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
  galleryInputRef: RefObject<HTMLInputElement | null>;
  filteredArtworks: GoalArtworkTheme[];
  setGoalCustomImage: (value: SetStateAction<string | undefined>) => void;
  setHasManuallyPickedArtwork: (value: SetStateAction<boolean>) => void;
  setGoalLinkedAccountId: (value: SetStateAction<string | undefined>) => void;
  goalLinkedAccountId: string | undefined;
  accounts: AccountItem[];
  effectiveTotalBalance: number;
  formatKr: (amount: number) => string;
}

const STEP_HEADINGS: Record<CreateWizardStep, string> = {
  1: 'Vad sparar du till?',
  2: 'Välj bild till ditt mål',
  3: 'Hur mycket behöver du spara?',
  4: 'Hur vill du följa sparandet?',
  5: 'Hur mycket har du sparat hittills?',
  6: 'Hur mycket sparar du varje månad?',
};

/** Guiden "Nytt sparmål" – skalet (ark, rubrik, tillbaka/hoppa över). Varje steg ligger i ./wizard/. */
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

  const pageAnimClass =
    slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';
  // Namn och målbelopp måste finnas innan målet kan sparas
  const canSave = Boolean(goalNameInput.trim()) && Number(goalTargetInput) > 0;

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

  const handleSkip = () => {
    if (wizardStep === 5) {
      setGoalCurrentInput('0');
      navigateWizardStep(6, 'forward');
    } else {
      setGoalMonthlyInput('');
      handleSaveGoal(undefined, 0);
    }
  };

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
        role="dialog"
        aria-modal="true"
        aria-label="Nytt sparmål"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto h-[89dvh] max-h-[89dvh] rounded-t-sheet bg-[var(--bg-color)] text-[var(--text-primary)] shadow-modal flex flex-col justify-between px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] font-sans overflow-hidden select-none animate-slide-up"
      >
        {/* 1. TOP HEADER (Circular Back button + optional Hoppa över pill + Centered Question) */}
        <header className="shrink-0">
          <SheetHeader
            title={STEP_HEADINGS[wizardStep]}
            onBack={handleBackNavigation}
            flush
            className="!static !mx-0 !px-0 !bg-transparent"
            actions={
              wizardStep === 5 || wizardStep === 6 ? (
                <button type="button" onClick={handleSkip} className="ui-pill-btn">
                  Hoppa över
                </button>
              ) : undefined
            }
          />
        </header>

        {wizardStep === 1 && (
          <StepName
            key="goal-step-1"
            animClass={pageAnimClass}
            goalNameInput={goalNameInput}
            setGoalNameInput={setGoalNameInput}
            onContinue={() => {
              if (!hasManuallyPickedArtwork && !goalCustomImage) {
                setGoalArtworkId(inferArtworkFromGoalName(goalNameInput));
              }
              navigateWizardStep(2, 'forward');
            }}
          />
        )}

        {wizardStep === 2 && (
          <StepArtwork
            key="goal-step-2"
            animClass={pageAnimClass}
            goalNameInput={goalNameInput}
            goalArtworkId={goalArtworkId}
            goalCustomImage={goalCustomImage}
            artworkSearch={artworkSearch}
            setArtworkSearch={setArtworkSearch}
            galleryInputRef={galleryInputRef}
            filteredArtworks={filteredArtworks}
            onPickArtwork={(artworkId) => {
              setGoalCustomImage(undefined);
              setGoalArtworkId(artworkId);
              setHasManuallyPickedArtwork(true);
            }}
            onContinue={() => navigateWizardStep(3, 'forward')}
          />
        )}

        {wizardStep === 3 && (
          <StepTargetAmount
            key="goal-step-3"
            animClass={pageAnimClass}
            value={goalTargetInput}
            onChange={setGoalTargetInput}
            onContinue={() => navigateWizardStep(4, 'forward')}
          />
        )}

        {wizardStep === 4 && (
          <StepAccountLink
            key="goal-step-4"
            animClass={pageAnimClass}
            goalLinkedAccountId={goalLinkedAccountId}
            accounts={accounts}
            effectiveTotalBalance={effectiveTotalBalance}
            formatKr={formatKr}
            onUnlink={() => setGoalLinkedAccountId(undefined)}
            onLinkAccount={(accountId, balance) => {
              setGoalLinkedAccountId(accountId);
              setGoalCurrentInput(String(balance));
            }}
            canSave={canSave}
            onContinue={() => navigateWizardStep(5, 'forward')}
            onSave={() => handleSaveGoal()}
          />
        )}

        {wizardStep === 5 && (
          <StepCurrentAmount
            key="goal-step-5"
            animClass={pageAnimClass}
            value={goalCurrentInput}
            onChange={setGoalCurrentInput}
            canSave={canSave}
            onContinue={() => navigateWizardStep(6, 'forward')}
          />
        )}

        {wizardStep === 6 && (
          <StepMonthlyAmount
            key="goal-step-6"
            animClass={pageAnimClass}
            value={goalMonthlyInput}
            onChange={setGoalMonthlyInput}
            canSave={canSave}
            goalTargetInput={goalTargetInput}
            goalCurrentInput={goalCurrentInput}
            onSave={() => handleSaveGoal()}
          />
        )}
      </div>
    </div>,
    document.body
  );
};
