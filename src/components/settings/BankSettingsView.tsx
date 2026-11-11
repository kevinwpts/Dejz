import { stripRawAccountDigits } from './accountText';
import type { SetStateAction } from 'react';
import React from 'react';
import { Bank, ArrowClockwise, CaretRight, Plus, Check } from '@phosphor-icons/react';
import { bankService, BankConnection, BankAccount } from '../../services/bankService';
import { AccountItem } from '../HomeTab';
import { getAccountMetaMap, saveAccountMeta } from '../../utils/appCache';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ItemLogo } from '../ItemLogo';
import { appOrigin } from '../../utils/platform';

export interface BankSettingsViewProps {
  bankAccounts: BankAccount[];
  connections: BankConnection[];
  connectedBank: string;
  accounts: AccountItem[];
  setEditingAccount: (value: SetStateAction<AccountItem>) => void;
  setAccountNameInput: (value: SetStateAction<string>) => void;
  setAccountIncludedInput: (value: SetStateAction<boolean>) => void;
  onRefreshBankStatus: () => void;
  syncingAccountId: string;
  setSyncingAccountId: (value: SetStateAction<string>) => void;
  onOpenBank: () => void;
  setSelectingAccountsConn: (value: SetStateAction<BankConnection>) => void;
  setSelectedConnAccountIds: (value: SetStateAction<string[]>) => void;
  selectingAccountsConn: BankConnection;
  setSavingConnAccounts: (value: SetStateAction<boolean>) => void;
  selectedConnAccountIds: string[];
  reconnectingBankId: string;
  setReconnectingBankId: (value: SetStateAction<string>) => void;
  editingAccount: AccountItem;
  setSavingAccountEdit: (value: SetStateAction<boolean>) => void;
  accountNameInput: string;
  accountIncludedInput: boolean;
  hasActiveBank: boolean;
  setDisconnectConfirmConnId: (value: SetStateAction<string>) => void;
  onSyncBank: () => void;
  syncingBank: boolean;
  savingAccountEdit: boolean;
  savingConnAccounts: boolean;
  disconnectConfirmConnId: string;
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
  const formatKr = (amount: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

  const accountMetaMap = getAccountMetaMap();

  const displayAccountItems: AccountItem[] =
    bankAccounts.length > 0
      ? bankAccounts.map((ba, idx) => {
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
            accountNumber: ba.bban || ba.iban || undefined,
            bankName: bName,
            balance: Number(ba.balance_amount) || 0,
            type: 'checking',
            logo: conn?.aspsp_logo || undefined,
          };
        })
      : accounts;

  const handleOpenAccountDetail = (acc: AccountItem) => {
    const rawBa = bankAccounts.find((b) => b.id === acc.id);
    const meta = accountMetaMap[acc.id];
    setEditingAccount(acc);
    setAccountNameInput(
      meta?.customName?.trim() ||
        rawBa?.custom_name?.trim() ||
        stripRawAccountDigits(acc.name) ||
        'Bankkonto'
    );
    setAccountIncludedInput(rawBa ? rawBa.is_selected !== false : true);
  };

  const handleActivateAndSyncAccount = async (accId: string, customNameOverride?: string) => {
    const rawBa = bankAccounts.find((b) => b.id === accId);
    const cleanName = customNameOverride?.trim();

    bankService.saveAccountOverlay(accId, {
      ...(cleanName ? { custom_name: cleanName } : {}),
      is_selected: true,
      include_in_budget: true,
    });
    saveAccountMeta(accId, {
      ...(cleanName ? { customName: cleanName } : {}),
      excludeFromTotalBalance: false,
    });

    await bankService
      .updateAccountSettings({
        bankAccountId: accId,
        ...(cleanName ? { customName: cleanName } : {}),
        isSelected: true,
        includeInBudget: true,
      })
      .catch(() => {});

    if (rawBa?.connection_id) {
      const connAccs = bankAccounts.filter((b) => b.connection_id === rawBa.connection_id);
      const nextSelectedIds = Array.from(
        new Set([
          ...connAccs.filter((b) => b.is_selected !== false).map((b) => b.id),
          accId,
        ])
      );
      await bankService
        .selectAccounts({
          connectionId: rawBa.connection_id,
          selectedAccountIds: nextSelectedIds,
        })
        .catch(() => {});

      await bankService
        .sync({
          connectionId: rawBa.connection_id,
          bankAccountId: accId,
          fullSync: true,
        })
        .catch(() => {});
    }

    if (onRefreshBankStatus) {
      await Promise.resolve(onRefreshBankStatus());
    }
  };

  const handleQuickSyncAccount = async (e: React.MouseEvent, acc: AccountItem) => {
    e.stopPropagation();
    if (syncingAccountId) return;
    setSyncingAccountId(acc.id);
    try {
      await handleActivateAndSyncAccount(acc.id);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleOpenSelectConnAccounts = (conn?: BankConnection) => {
    const targetConn = conn || connections[0] || null;
    if (!targetConn) {
      onOpenBank();
      return;
    }
    const connAccs = bankAccounts.filter((b) => b.connection_id === targetConn.id);
    const listToUse = connAccs.length > 0 ? connAccs : bankAccounts;
    setSelectingAccountsConn(targetConn);
    setSelectedConnAccountIds(
      listToUse.filter((b) => b.is_selected !== false).map((b) => b.id)
    );
  };

  const handleToggleConnAccountSelection = (accId: string) => {
    setSelectedConnAccountIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  const handleSaveConnAccountSelection = async () => {
    if (!selectingAccountsConn) return;
    setSavingConnAccounts(true);
    try {
      const connAccs = bankAccounts.filter((b) => b.connection_id === selectingAccountsConn.id);
      const listToUse = connAccs.length > 0 ? connAccs : bankAccounts;
      const selectedSet = new Set(selectedConnAccountIds);
      const newlySelectedIds = listToUse
        .filter((b) => selectedSet.has(b.id) && (b.is_selected === false || !b.last_synced_at))
        .map((b) => b.id);

      for (const ba of listToUse) {
        const isSel = selectedSet.has(ba.id);
        bankService.saveAccountOverlay(ba.id, {
          is_selected: isSel,
          include_in_budget: isSel,
        });
        saveAccountMeta(ba.id, {
          excludeFromTotalBalance: !isSel,
        });
      }

      await bankService
        .selectAccounts({
          connectionId: selectingAccountsConn.id,
          selectedAccountIds: selectedConnAccountIds,
        })
        .catch(() => {});

      for (const accId of newlySelectedIds) {
        await bankService
          .sync({
            connectionId: selectingAccountsConn.id,
            bankAccountId: accId,
            fullSync: true,
          })
          .catch(() => {});
      }

      if (onRefreshBankStatus) {
        await Promise.resolve(onRefreshBankStatus());
      }
      setSelectingAccountsConn(null);
    } finally {
      setSavingConnAccounts(false);
    }
  };

  const handleReconnectBankForMoreAccounts = async (conn: BankConnection) => {
    if (reconnectingBankId) return;
    setReconnectingBankId(conn.id);
    try {
      const redirectUrl = `${appOrigin()}/bank/callback`;
      const res = await bankService.startAuth({
        aspspName: conn.aspsp_name,
        aspspCountry: conn.aspsp_country || 'SE',
        aspspLogo: conn.aspsp_logo || null,
        originContext: 'settings',
        environment: 'production',
        reconnectConnectionId: conn.id,
        redirectUrl,
      });
      if (res?.url) {
        window.location.assign(res.url);
      }
    } catch {
      setSelectingAccountsConn(null);
      onOpenBank();
    } finally {
      setReconnectingBankId(null);
    }
  };

  const handleSaveAccountDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setSavingAccountEdit(true);
    try {
      const cleanName = accountNameInput.trim() || 'Bankkonto';
      const rawBa = bankAccounts.find((b) => b.id === editingAccount.id);
      const wasUnselected = rawBa ? rawBa.is_selected === false : false;

      if (accountIncludedInput) {
        if (wasUnselected || !rawBa?.last_synced_at) {
          await handleActivateAndSyncAccount(editingAccount.id, cleanName);
        } else {
          bankService.saveAccountOverlay(editingAccount.id, {
            custom_name: cleanName,
            is_selected: true,
            include_in_budget: true,
          });
          saveAccountMeta(editingAccount.id, {
            customName: cleanName,
            excludeFromTotalBalance: false,
          });
          await bankService
            .updateAccountSettings({
              bankAccountId: editingAccount.id,
              customName: cleanName,
              isSelected: true,
              includeInBudget: true,
            })
            .catch(() => {});
          if (onRefreshBankStatus) {
            await Promise.resolve(onRefreshBankStatus());
          }
        }
      } else {
        bankService.saveAccountOverlay(editingAccount.id, {
          custom_name: cleanName,
          is_selected: false,
          include_in_budget: false,
        });
        saveAccountMeta(editingAccount.id, {
          customName: cleanName,
          excludeFromTotalBalance: true,
        });
        await bankService
          .updateAccountSettings({
            bankAccountId: editingAccount.id,
            customName: cleanName,
            isSelected: false,
            includeInBudget: false,
          })
          .catch(() => {});

        if (rawBa?.connection_id) {
          const connAccs = bankAccounts.filter((b) => b.connection_id === rawBa.connection_id);
          const nextSelectedIds = connAccs
            .filter((b) => (b.id === editingAccount.id ? false : b.is_selected !== false))
            .map((b) => b.id);
          await bankService
            .selectAccounts({
              connectionId: rawBa.connection_id,
              selectedAccountIds: nextSelectedIds,
            })
            .catch(() => {});
        }
        if (onRefreshBankStatus) {
          await Promise.resolve(onRefreshBankStatus());
        }
      }
    } finally {
      setSavingAccountEdit(false);
      setEditingAccount(null);
    }
  };

  return (
    <div className="ui-page animate-slide-in-right">
      {hasActiveBank ? (
        <>
          {/* Anslutna banker */}
          <div className="space-y-1.5">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              Ansluten bank
            </span>
            <div className="ui-group-card">
              {connections.length > 0 ? (
                connections.map((conn) => {
                  const validMs = conn.valid_until ? new Date(conn.valid_until).getTime() : NaN;
                  const computedDaysLeft =
                    conn.days_until_expiry !== undefined && conn.days_until_expiry !== null
                      ? conn.days_until_expiry
                      : !Number.isNaN(validMs)
                      ? Math.ceil((validMs - Date.now()) / (24 * 60 * 60 * 1000))
                      : null;
                  const isExpired =
                    conn.status === 'expired' ||
                    (computedDaysLeft !== null && computedDaysLeft <= 0);
                  const isExpiringSoon =
                    !isExpired &&
                    (Boolean(conn.expiring_soon) ||
                      (computedDaysLeft !== null && computedDaysLeft <= 14));

                  return (
                    <div key={conn.id} className="ui-row">
                      <div className="flex items-center gap-3 min-w-0">
                        <ItemLogo
                          name={conn.aspsp_name}
                          logoUrl={conn.aspsp_logo || undefined}
                          size="md"
                        />
                        <div className="min-w-0">
                          <span className="ui-row-title">{conn.aspsp_name}</span>
                          {isExpired ? (
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium block">
                              Samtycket har gått ut · Förnya åtkomst
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">
                              Samtycke går ut om {computedDaysLeft}{' '}
                              {computedDaysLeft === 1 ? 'dag' : 'dagar'}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                              Ansluten
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(isExpired || isExpiringSoon) ? (
                          <button
                            type="button"
                            onClick={() => handleReconnectBankForMoreAccounts(conn)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Förnya
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenSelectConnAccounts(conn)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                          >
                            Välj konton
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDisconnectConfirmConnId(conn.id)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                        >
                          Koppla från
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="ui-row">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemLogo name={connectedBank || 'Bank'} size="md" />
                    <div className="min-w-0">
                      <span className="ui-row-title">{connectedBank}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                        Ansluten
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDisconnectConfirmConnId('__default__')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                  >
                    Koppla från
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Kontolista där varje konto öppnar kontoinställningar/detaljer */}
          {displayAccountItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Konton
                </span>
                {connections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenSelectConnAccounts(connections[0])}
                    className="text-xs font-semibold text-[var(--accent-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    Välj konton att synka
                  </button>
                )}
              </div>
              <div className="ui-group-card">
                {displayAccountItems.map((acc) => {
                  const cleanName = stripRawAccountDigits(acc.name) || 'Bankkonto';
                  const cleanBank = stripRawAccountDigits(
                    acc.bankName || acc.bank || connectedBank || 'Bank'
                  );
                  const rawBa = bankAccounts.find((b) => b.id === acc.id);
                  const isHidden = Boolean(rawBa && rawBa.is_selected === false);
                  const isSyncingThis = syncingAccountId === acc.id;

                  return (
                    <div key={acc.id} className="ui-row">
                      <button
                        type="button"
                        onClick={() => handleOpenAccountDetail(acc)}
                        className={`flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer ${
                          isHidden ? 'opacity-65' : ''
                        }`}
                      >
                        <ItemLogo name={cleanBank} logoUrl={acc.logo} size="md" />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title">{cleanName}</span>
                          <span className="ui-row-subtitle">
                            {cleanBank}
                            {isHidden ? ' · Ej synkat' : ''}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {isHidden ? (
                          <button
                            type="button"
                            onClick={(e) => handleQuickSyncAccount(e, acc)}
                            disabled={isSyncingThis}
                            className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-1.5"
                          >
                            <ArrowClockwise
                              size={13}
                              weight="bold"
                              className={isSyncingThis ? 'animate-spin' : ''}
                            />
                            <span>{isSyncingThis ? 'Synkar...' : 'Synka'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAccountDetail(acc)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span className="ui-row-amount">{formatKr(acc.balance)}</span>
                            <CaretRight size={14} className="text-[var(--text-muted)]" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
          <BottomSheet
            isOpen={editingAccount !== null}
            onClose={() => setEditingAccount(null)}
            title="Kontoinställningar"
          >
            {editingAccount && (
              <form onSubmit={handleSaveAccountDetail} className="space-y-4">
                <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
                  <label className="flex items-center gap-3.5 cursor-text">
                    <ItemLogo
                      name={editingAccount.bankName || editingAccount.bank || connectedBank || 'Bank'}
                      logoUrl={editingAccount.logo}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                        Kontonamn
                      </span>
                      <input
                        type="text"
                        value={accountNameInput}
                        onChange={(e) => setAccountNameInput(e.target.value)}
                        placeholder="Kontonamn"
                        required
                        className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                      />
                    </div>
                  </label>

                  <div className="border-t border-[var(--border-subtle)] pt-3.5 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Saldo
                    </span>
                    <span className="font-display font-bold text-xl text-[var(--text-primary)] tabular-nums">
                      {formatKr(editingAccount.balance)}
                    </span>
                  </div>
                </div>

                <div className="ui-sheet-group">

                  <div className="ui-row">
                    <span className="text-[var(--text-muted)] shrink-0">Bank</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {editingAccount.bankName || editingAccount.bank || connectedBank || 'Bank'}
                    </span>
                  </div>

                  {editingAccount.accountNumber && (
                    <div className="ui-row">
                      <span className="text-[var(--text-muted)] shrink-0">Kontonummer</span>
                      <span className="font-display font-medium text-xs text-[var(--text-secondary)] tabular-nums">
                        {editingAccount.accountNumber}
                      </span>
                    </div>
                  )}

                  <div className="ui-row">
                    <div className="min-w-0 pr-3">
                      <span className="text-[var(--text-primary)] font-medium block">
                        Synka och visa i översikten
                      </span>
                      <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                        Räkna med saldo och händelser från detta konto
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={accountIncludedInput}
                      onClick={() => setAccountIncludedInput((prev) => !prev)}
                      className={`ui-switch ${
                        accountIncludedInput ? 'ui-switch-on' : 'ui-switch-off'
                      }`}
                    >
                      <span
                        className={`ui-switch-thumb ${
                          accountIncludedInput ? 'ui-switch-thumb-on' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={savingAccountEdit}
                    onClick={async () => {
                      if (!editingAccount) return;
                      setSavingAccountEdit(true);
                      try {
                        const cleanName = accountNameInput.trim() || 'Bankkonto';
                        setAccountIncludedInput(true);
                        await handleActivateAndSyncAccount(editingAccount.id, cleanName);
                      } finally {
                        setSavingAccountEdit(false);
                        setEditingAccount(null);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <ArrowClockwise size={14} className={savingAccountEdit ? 'animate-spin' : ''} />
                    <span>{savingAccountEdit ? 'Synkar konto...' : 'Synka detta konto nu'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingAccountEdit || !accountNameInput.trim()}
                    className="ui-btn-primary"
                  >
                    <Check size={14} weight="bold" />
                    <span>{savingAccountEdit ? 'Sparar...' : 'Spara'}</span>
                  </button>
                </div>
              </form>
            )}
          </BottomSheet>

          {/* Välj vilka konton som ska synkas */}
          <BottomSheet
            isOpen={selectingAccountsConn !== null}
            onClose={() => setSelectingAccountsConn(null)}
            title="Välj konton att synka"
          >
            {selectingAccountsConn && (
              <div className="space-y-4">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                  {(bankAccounts.filter((b) => b.connection_id === selectingAccountsConn.id).length > 0
                    ? bankAccounts.filter((b) => b.connection_id === selectingAccountsConn.id)
                    : bankAccounts
                  ).map((ba, idx) => {
                    const isChecked = selectedConnAccountIds.includes(ba.id);
                    const meta = accountMetaMap[ba.id];
                    const accTitle =
                      meta?.customName?.trim() ||
                      ba.custom_name?.trim() ||
                      stripRawAccountDigits(ba.product || ba.name || '') ||
                      (idx === 0 ? 'Lönekonto' : 'Sparkonto');
                    const rawNum = (ba.bban || ba.iban || '').trim();
                    const formattedNum =
                      rawNum.length === 11 && /^\d+$/.test(rawNum)
                        ? `${rawNum.slice(0, 4)}-${rawNum.slice(4)}`
                        : rawNum || selectingAccountsConn.aspsp_name;

                    return (
                      <button
                        key={ba.id}
                        type="button"
                        onClick={() => handleToggleConnAccountSelection(ba.id)}
                        className={`w-full p-3.5 rounded-2xl border flex items-center gap-3.5 text-left transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[var(--bg-color)] border-[var(--border-subtle)]'
                            : 'bg-[var(--bg-color)]/50 border-[var(--border-subtle)] opacity-60'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                              : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                          }`}
                        >
                          {isChecked && <Check size={12} weight="bold" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                            {accTitle}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] block tabular-nums mt-0.5">
                            {formattedNum}
                          </span>
                        </div>
                        {ba.balance_amount !== null && ba.balance_amount !== undefined && (
                          <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                            {formatKr(Number(ba.balance_amount) || 0)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={savingConnAccounts || selectedConnAccountIds.length === 0}
                    onClick={handleSaveConnAccountSelection}
                    className="ui-btn-primary"
                  >
                    <Check size={14} weight="bold" />
                    <span>{savingConnAccounts ? 'Synkar valda konton...' : 'Spara och synka'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={reconnectingBankId === selectingAccountsConn.id}
                    onClick={() => handleReconnectBankForMoreAccounts(selectingAccountsConn)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    {reconnectingBankId === selectingAccountsConn.id
                      ? `Öppnar ${selectingAccountsConn.aspsp_name}...`
                      : `Saknas ett konto? Välj fler hos ${selectingAccountsConn.aspsp_name}`}
                  </button>
                </div>
              </div>
            )}
          </BottomSheet>

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
