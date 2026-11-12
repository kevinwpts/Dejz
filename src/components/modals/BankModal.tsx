import React from 'react';
import { X, WarningCircle, LockKey, CaretLeft } from '@phosphor-icons/react';
import { BankAccount, BankConnection } from '../../services/bankService';
import { BottomSheet } from '../ui/BottomSheet';
import { useBankConnection } from './bank/useBankConnection';
import { BankViewList } from './bank/BankViewList';
import { BankViewAuthorizing } from './bank/BankViewAuthorizing';
import { BankViewSelectAccounts } from './bank/BankViewSelectAccounts';

interface BankModalProps {
  isOpen: boolean;
  userEmail: string | null;
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  preselectedBankName?: string | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onBankStateUpdated: (connections: BankConnection[], accounts: BankAccount[]) => void;
}

export const BankModal: React.FC<BankModalProps> = ({
  isOpen,
  userEmail,
  connections,
  bankAccounts,
  preselectedBankName,
  onClose,
  onOpenAuth,
  onBankStateUpdated,
}) => {
  const {
    environment,
    loadBanks,
    loadingBanks,
    filteredBanks,
    search,
    setSearch,
    errorMsg,
    setErrorMsg,
    step,
    setStep,
    selectedBank,
    startingAuth,
    authUrl,
    showManualCallback,
    setShowManualCallback,
    manualCallbackUrl,
    setManualCallbackUrl,
    exchangingCode,
    activeConnection,
    fetchedAccounts,
    selectedAccountIds,
    accountCustomNames,
    setAccountCustomNames,
    savingAccounts,
    handleSelectBank,
    handleExchangeManualCallback,
    toggleAccountSelection,
    handleSaveSelectedAccounts,
    handleOpenExistingAccountSelection,
  } = useBankConnection({
    isOpen,
    userEmail,
    connections,
    bankAccounts,
    preselectedBankName,
    onClose,
    onBankStateUpdated,
  });

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        setStep('list');
        onClose();
      }}
      contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
    >
      {/* Symmetrical Header */}
      <div className="ui-sheet-header">
        {step !== 'list' ? (
          <>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep('list');
              }}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title">
              {step === 'authorizing' ? selectedBank?.name || 'Anslut bank' : 'Välj konton'}
            </span>
          </>
        ) : (
          <span className="ui-sheet-title">
            Anslut bank
          </span>
        )}

        <button
          type="button" aria-label="Stäng"
          onClick={() => {
            setStep('list');
            onClose();
          }}
          className="ui-icon-btn"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4">
        {!userEmail ? (
          <div className="py-4 text-center space-y-4">
            <div className="ui-hero-icon">
              <LockKey size={26} weight="duotone" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-base text-[var(--text-primary)]">
                Logga in först
              </h4>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                Logga in på ditt konto för att ansluta och synka din bank.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="ui-btn-primary"
            >
              Logga in
            </button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-negative-solid/10 border border-negative-solid/20 text-negative text-xs flex items-start gap-2">
                <WarningCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: BANK LIST */}
            {step === 'list' && (
              <BankViewList
                connections={connections}
                search={search}
                setSearch={setSearch}
                loadingBanks={loadingBanks}
                startingAuth={startingAuth}
                selectedBank={selectedBank}
                filteredBanks={filteredBanks}
                onSelectBank={handleSelectBank}
                onOpenExistingAccountSelection={handleOpenExistingAccountSelection}
                onRetryLoad={() => loadBanks(environment)}
              />
            )}

            {/* STEP 2: AUTHORIZING AT ENABLE BANKING */}
            {step === 'authorizing' && authUrl && (
              <BankViewAuthorizing
                authUrl={authUrl}
                selectedBank={selectedBank}
                showManualCallback={showManualCallback}
                setShowManualCallback={setShowManualCallback}
                manualCallbackUrl={manualCallbackUrl}
                setManualCallbackUrl={setManualCallbackUrl}
                exchangingCode={exchangingCode}
                onSubmitManualCallback={handleExchangeManualCallback}
              />
            )}

            {/* STEP 3: SELECT ACCOUNTS & CUSTOM NAMES */}
            {step === 'select-accounts' && (
              <BankViewSelectAccounts
                fetchedAccounts={fetchedAccounts}
                selectedAccountIds={selectedAccountIds}
                accountCustomNames={accountCustomNames}
                setAccountCustomNames={setAccountCustomNames}
                activeConnection={activeConnection}
                toggleAccountSelection={toggleAccountSelection}
                savingAccounts={savingAccounts}
                onSave={handleSaveSelectedAccounts}
              />
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};
