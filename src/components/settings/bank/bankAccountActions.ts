// Bankinställningarnas handlingar: välja/synka konton, spara kontoinställningar och förnya bankkopplingen
import type React from 'react';
import type { SetStateAction } from 'react';
import { stripRawAccountDigits } from '../accountText';
import { bankService, BankConnection, BankAccount } from '../../../services/bankService';
import type { AccountItem } from '../../../app/models';
import { getAccountMetaMap, saveAccountMeta } from '../../../utils/appCache';
import { appOrigin } from '../../../utils/platform';

export interface BankAccountActionDeps {
  bankAccounts: BankAccount[];
  connections: BankConnection[];
  accountMetaMap: ReturnType<typeof getAccountMetaMap>;
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
}

export function createBankAccountActions({
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
}: BankAccountActionDeps) {
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

  /** "Synka detta konto nu" i kontoinställningarna */
  const handleSyncEditingAccountNow = async () => {
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
  };

  return {
    handleOpenAccountDetail,
    handleQuickSyncAccount,
    handleOpenSelectConnAccounts,
    handleToggleConnAccountSelection,
    handleSaveConnAccountSelection,
    handleReconnectBankForMoreAccounts,
    handleSaveAccountDetail,
    handleSyncEditingAccountNow,
  };
}
