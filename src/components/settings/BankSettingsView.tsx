import { stripRawAccountDigits } from './accountText';
import type { SetStateAction } from 'react';
import React from 'react';
import { Bank, ArrowClockwise, Plus } from '@phosphor-icons/react';
import { BankConnection, BankAccount } from '../../services/bank/types';
import { AccountItem } from '../../app/models';
import { getAccountMetaMap } from '../../utils/cache/itemMeta';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { createBankAccountActions } from './bank/bankAccountActions';
import { BankConnectionsSection } from './bank/BankConnectionsSection';
import { BankAccountsSection } from './bank/BankAccountsSection';
import { BankAccountDetailSheet } from './bank/BankAccountDetailSheet';
import { BankSelectAccountsSheet } from './bank/BankSelectAccountsSheet';


export interface BankSettingsViewProps {
  bankAccounts: BankAccount[];
  connections: BankConnection[];
  connectedBank: string | null;
  accounts: AccountItem[];
  setEditingAccount: (value: SetStateAction<AccountItem | null>) => void;
  setAccountNameInput: (value: SetStateAction<string>) => void;
  setAccountIncludedInput: (value: SetStateAction<boolean>) => void;
  onRefreshBankStatus?: () => void;
  syncingAccountId: string | null;
  setSyncingAccountId: (value: SetStateAction<string | null>) => void;
  onOpenBank: () => void;
  setSelectingAccountsConn: (value: SetStateAction<BankConnection | null>) => void;
  setSelectedConnAccountIds: (value: SetStateAction<string[]>) => void;
  selectingAccountsConn: BankConnection | null;
  setSavingConnAccounts: (value: SetStateAction<boolean>) => void;
  selectedConnAccountIds: string[];
  reconnectingBankId: string | null;
  setReconnectingBankId: (value: SetStateAction<string | null>) => void;
  editingAccount: AccountItem | null;
  setSavingAccountEdit: (value: SetStateAction<boolean>) => void;
  accountNameInput: string;
  accountIncludedInput: boolean;
  hasActiveBank: boolean;
  setDisconnectConfirmConnId: (value: SetStateAction<string | null>) => void;
  onSyncBank: () => void;
  syncingBank: boolean;
  savingAccountEdit: boolean;
  savingConnAccounts: boolean;
  disconnectConfirmConnId: string | null;
  onDisconnectBank: (connectionId?: string) => void;
}

export const BankSettingsView: React.FC<BankSettingsViewProps> = ({
  bankAccounts,
  connections,
  connectedBank,
  accounts,
  setEditingAccount,
  setAccountNameInput,
  setAccountIncludedInput,
  onRefreshBankStatus,
  syncingAccountId,
  setSyncingAccountId,
  onOpenBank,
  setSelectingAccountsConn,
  setSelectedConnAccountIds,
  selectingAccountsConn,
  setSavingConnAccounts,
  selectedConnAccountIds,
  reconnectingBankId,
  setReconnectingBankId,
  editingAccount,
  setSavingAccountEdit,
  accountNameInput,
  accountIncludedInput,
  hasActiveBank,
  setDisconnectConfirmConnId,
  onSyncBank,
  syncingBank,
  savingAccountEdit,
  savingConnAccounts,
  disconnectConfirmConnId,
  onDisconnectBank,
}) => {
  const accountMetaMap = getAccountMetaMap();

  const displayAccountItems: AccountItem[] =
    bankAccounts.length > 0
      ? bankAccounts.map((ba, idx): AccountItem => {
          const conn = connections.find((c) => c.id === ba.connection_id);
          const bName = conn?.aspsp_name || connectedBank || 'Bank';
          const meta = accountMetaMap[ba.id];
          const cleanName =
            meta?.customName?.trim() ||
            ba.custom_name?.trim() ||
            stripRawAccountDigits(ba.product || ba.name || '') ||
            (idx === 0 ? 'Lönekonto' : 'Sparkonto');
          return {
            id: ba.id,
            name: cleanName,
            accountNumber: ba.bban || ba.iban || '',
            bankName: bName,
            balance: Number(ba.balance_amount) || 0,
            type: 'checking',
            logo: conn?.aspsp_logo || undefined,
          };
        })
      : accounts;

  // Alla knapphandlingar (välja/synka konton, spara, förnya) – se bank/bankAccountActions.ts
  const {
    handleOpenAccountDetail,
    handleQuickSyncAccount,
    handleOpenSelectConnAccounts,
    handleToggleConnAccountSelection,
    handleSaveConnAccountSelection,
    handleReconnectBankForMoreAccounts,
    handleSaveAccountDetail,
    handleSyncEditingAccountNow,
  } = createBankAccountActions({
    bankAccounts,
    connections,
    accountMetaMap,
    setEditingAccount,
    setAccountNameInput,
    setAccountIncludedInput,
    onRefreshBankStatus,
    syncingAccountId,
    setSyncingAccountId,
    onOpenBank,
    setSelectingAccountsConn,
    setSelectedConnAccountIds,
    selectingAccountsConn,
    setSavingConnAccounts,
    selectedConnAccountIds,
    reconnectingBankId,
    setReconnectingBankId,
    editingAccount,
    setSavingAccountEdit,
    accountNameInput,
    accountIncludedInput,
  });

  return (
    <div className="ui-page animate-slide-in-right">
      {hasActiveBank ? (
        <>
          {/* Anslutna banker */}
          <BankConnectionsSection
            connections={connections}
            connectedBank={connectedBank}
            onReconnect={handleReconnectBankForMoreAccounts}
            onSelectAccounts={handleOpenSelectConnAccounts}
            onDisconnect={setDisconnectConfirmConnId}
          />

          {/* Kontolista där varje konto öppnar kontoinställningar/detaljer */}
          {displayAccountItems.length > 0 && (
            <BankAccountsSection
              displayAccountItems={displayAccountItems}
              bankAccounts={bankAccounts}
              connectedBank={connectedBank}
              hasConnections={connections.length > 0}
              syncingAccountId={syncingAccountId}
              onOpenSelectAccounts={() => handleOpenSelectConnAccounts(connections[0])}
              onOpenAccountDetail={handleOpenAccountDetail}
              onQuickSyncAccount={handleQuickSyncAccount}
            />
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSyncBank}
              disabled={syncingBank}
              className="py-3 px-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <ArrowClockwise size={14} className={syncingBank ? 'animate-spin' : ''} />
              <span>{syncingBank ? 'Synkar...' : 'Synka nu'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenBank}
              className="ui-btn-primary"
            >
              <Plus size={15} weight="bold" />
              <span>Lägg till bank</span>
            </button>
          </div>

          {/* Kontodetaljer / Redigera konto */}
          <BankAccountDetailSheet
            editingAccount={editingAccount}
            connectedBank={connectedBank}
            accountNameInput={accountNameInput}
            setAccountNameInput={setAccountNameInput}
            accountIncludedInput={accountIncludedInput}
            setAccountIncludedInput={setAccountIncludedInput}
            savingAccountEdit={savingAccountEdit}
            onClose={() => setEditingAccount(null)}
            onSubmit={handleSaveAccountDetail}
            onSyncNow={handleSyncEditingAccountNow}
          />

          {/* Välj vilka konton som ska synkas */}
          <BankSelectAccountsSheet
            selectingAccountsConn={selectingAccountsConn}
            bankAccounts={bankAccounts}
            accountMetaMap={accountMetaMap}
            selectedConnAccountIds={selectedConnAccountIds}
            savingConnAccounts={savingConnAccounts}
            reconnectingBankId={reconnectingBankId}
            onClose={() => setSelectingAccountsConn(null)}
            onToggleAccount={handleToggleConnAccountSelection}
            onSave={handleSaveConnAccountSelection}
            onReconnect={handleReconnectBankForMoreAccounts}
          />

          <ConfirmDialog
            isOpen={disconnectConfirmConnId !== null}
            title="Koppla från bank?"
            description="Konton slutar synkas tills du ansluter igen."
            confirmLabel="Koppla från"
            onConfirm={() => {
              const id = disconnectConfirmConnId;
              setDisconnectConfirmConnId(null);
              if (id === '__default__') {
                onDisconnectBank();
              } else if (id) {
                onDisconnectBank(id);
              }
            }}
            onCancel={() => setDisconnectConfirmConnId(null)}
          />
        </>
      ) : (
        <section className="ui-empty-state-page">
          <Bank size={52} weight="light" className="ui-empty-icon" />
          <h3 className="ui-empty-title">Ingen bank ansluten</h3>
          <p className="ui-empty-sub mb-6">
            Anslut din bank med Mobilt BankID för att hämta konton och köp automatiskt.
          </p>
          <button
            type="button"
            onClick={onOpenBank}
            className="w-full max-w-xs ui-btn-primary"
          >
            <Bank size={15} />
            <span>Anslut bank</span>
          </button>
        </section>
      )}
    </div>
  );
};
