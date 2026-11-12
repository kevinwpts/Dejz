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
import { CaretLeft, X } from '@phosphor-icons/react';

export interface GoalCreateWizardProps {
  isCreateWizardOpen: boolean;
  goalArtworkId: string;
  slideDir: "forward" | "back";
  wizardStep: 2 | 1 | 3 | 4 | 5 | 6;
  /** Finns det något att välja i steg 4 (konton/saldo)? Annars hoppas steget över. */
  hasTrackingChoice: boolean;
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

/** En kort rad under varje rubrik – samma mönster i alla steg. */
const STEP_SUBTITLES: Record<CreateWizardStep, string> = {
  1: 'Ge målet ett namn, t.ex. en resa eller en buffert.',
  2: 'Bilden syns på målet. Du kan byta när du vill.',
  3: 'Hela beloppet du vill nå. Går att ändra senare.',
  4: 'Välj ett konto så följer målet saldot automatiskt.',
  5: 'Har du inget sparat än hoppar du bara över.',
  6: 'Dras automatiskt från det du har kvar varje lönedag.',
};


/** Guiden "Nytt sparmål" – skalet (ark, rubrik, tillbaka/hoppa över). Varje steg ligger i ./wizard/. */
export const GoalCreateWizard: React.FC<GoalCreateWizardProps> = ({
  isCreateWizardOpen,
  goalArtworkId,
  slideDir,
  wizardStep,
  hasTrackingChoice,
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

  // Stegmätaren räknar bara de steg som faktiskt visas
  const visibleSteps: CreateWizardStep[] = hasTrackingChoice ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 5, 6];
  const totalSteps = visibleSteps.length;
  const stepNumber = Math.max(1, visibleSteps.indexOf(wizardStep) + 1);

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

  const subtitle = STEP_SUBTITLES[wizardStep];
  const canSkip = wizardStep === 5 || wizardStep === 6;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-fade-in"
      onClick={() => setIsCreateWizardOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-wizard-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto h-[92dvh] max-h-[92dvh] rounded-t-sheet bg-[var(--bg-color)] text-[var(--text-primary)] shadow-modal flex flex-col px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] font-sans overflow-hidden select-none animate-slide-up"
      >
        {/* Rad med tillbaka · steg-mätare · hoppa över / stäng */}
        <header className="shrink-0 flex items-center gap-3 h-9">
          {wizardStep > 1 ? (
            <button
              type="button"
              onClick={handleBackNavigation}
              aria-label="Tillbaka"
              title="Tillbaka"
              className="ui-icon-btn-surface"
            >
              <CaretLeft size={15} />
            </button>
          ) : null}
          <div
            className="flex-1 flex items-center gap-1"
            role="progressbar"
            aria-label={`Steg ${stepNumber} av ${totalSteps}`}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuenow={stepNumber}
          >
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i < stepNumber ? 'bg-[var(--cta-bg)]' : 'bg-[var(--segment-track)]'
                }`}
              />
            ))}
          </div>
          {canSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="h-8 px-1 text-subhead font-medium text-[var(--accent-color)] active:opacity-60 cursor-pointer shrink-0"
            >
              Hoppa över
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCreateWizardOpen(false)}
            aria-label="Stäng"
            className="ui-icon-btn-surface"
          >
            <X size={14} />
          </button>
        </header>

        <div className="shrink-0 pt-6 pb-2">
          <h2 id="goal-wizard-title" className="ui-step-title">
            {STEP_HEADINGS[wizardStep]}
          </h2>
          <p className="mt-2 text-subhead leading-snug text-[var(--text-secondary)]">{subtitle}</p>
        </div>

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
