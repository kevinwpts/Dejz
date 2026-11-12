// Bankkonton: välja vilka konton som ska användas och ändra kontots inställningar.
import { supabase } from '../../supabaseClient';
import type { BankAccount } from './types';
import { mergeAccountWithOverlay, saveAccountOverlay } from './overlays';
import { invokeEnableBanking } from './invoke';

export const bankAccountsApi = {
  async selectAccounts(params: {
    connectionId: string;
    selectedAccountIds: string[];
  }): Promise<{
    success: boolean;
    accounts: BankAccount[];
  }> {
    const selectedSet = new Set(params.selectedAccountIds);
    for (const id of params.selectedAccountIds) {
      saveAccountOverlay(id, { is_selected: true, include_in_budget: true });
    }

    let uid: string | undefined;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      uid = sessionData?.session?.user?.id;
      if (uid) {
        const { data: dbAccs } = await supabase
          .from('bank_accounts')
          .select('id, is_selected, last_synced_at')
          .eq('user_id', uid)
          .eq('connection_id', params.connectionId);
        const existingAccounts = (dbAccs || []) as Array<{
          id: string;
          is_selected: boolean | null;
          last_synced_at: string | null;
        }>;

        const nowIso = new Date().toISOString();
        const newlySelectedIds = existingAccounts
          .filter((a) => selectedSet.has(a.id) && a.is_selected === false)
          .map((a) => a.id);
        const alreadySelectedIds = existingAccounts
          .filter((a) => selectedSet.has(a.id) && a.is_selected !== false)
          .map((a) => a.id);
        const directUnselectedIds = existingAccounts
          .filter((a) => !selectedSet.has(a.id))
          .map((a) => a.id);

        if (newlySelectedIds.length > 0) {
          await supabase
            .from('bank_accounts')
            .update({ is_selected: true, last_synced_at: null, updated_at: nowIso })
            .eq('user_id', uid)
            .in('id', newlySelectedIds);
        }
        if (alreadySelectedIds.length > 0) {
          await supabase
            .from('bank_accounts')
            .update({ is_selected: true, updated_at: nowIso })
            .eq('user_id', uid)
            .in('id', alreadySelectedIds);
        }
        if (directUnselectedIds.length > 0) {
          for (const id of directUnselectedIds) {
            saveAccountOverlay(id, { is_selected: false, include_in_budget: false });
          }
          await supabase
            .from('bank_accounts')
            .update({ is_selected: false, updated_at: nowIso })
            .eq('user_id', uid)
            .in('id', directUnselectedIds);
        }
      }
    } catch {
      // Fallback to Edge Function update
    }

    let res: { success: boolean; accounts: BankAccount[] } = {
      success: true,
      accounts: [],
    };
    try {
      res = await invokeEnableBanking<{
        success: boolean;
        accounts: BankAccount[];
      }>({
        action: 'select-accounts',
        connectionId: params.connectionId,
        selectedAccountIds: params.selectedAccountIds,
      });
    } catch {
      if (uid) {
        const { data: fallbackAccs } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', uid)
          .eq('connection_id', params.connectionId)
          .order('created_at', { ascending: true });
        res = {
          success: true,
          accounts: (fallbackAccs || []) as BankAccount[],
        };
      }
    }

    const unselectedIds: string[] = [];
    for (const acc of res.accounts || []) {
      if (!selectedSet.has(acc.id)) {
        saveAccountOverlay(acc.id, { is_selected: false, include_in_budget: false });
        unselectedIds.push(acc.id);
      }
    }
    if (unselectedIds.length > 0) {
      try {
        const targetUid = uid || (await supabase.auth.getSession()).data?.session?.user?.id;
        if (targetUid) {
          await supabase
            .from('bank_transactions')
            .delete()
            .eq('user_id', targetUid)
            .in('bank_account_id', unselectedIds);
        }
      } catch {
        // ignore
      }
    }
    return {
      ...res,
      accounts: (res.accounts || []).map(mergeAccountWithOverlay),
    };
  },

  async updateAccountSettings(params: {
    bankAccountId: string;
    customName?: string | null;
    includeInBudget?: boolean;
    isSelected?: boolean;
    importStartDate?: string | null;
    reconciliationCompletedAt?: string | null;
    ongoingImportEnabled?: boolean;
  }): Promise<BankAccount | null> {
    const overlayPatch: Partial<BankAccount> = {};
    if (params.customName !== undefined) overlayPatch.custom_name = params.customName ? params.customName.trim() : null;
    if (params.includeInBudget !== undefined) overlayPatch.include_in_budget = Boolean(params.includeInBudget);
    if (params.isSelected !== undefined) overlayPatch.is_selected = Boolean(params.isSelected);
    if (params.importStartDate !== undefined) overlayPatch.import_start_date = params.importStartDate || null;
    if (params.reconciliationCompletedAt !== undefined) {
      overlayPatch.reconciliation_completed_at = params.reconciliationCompletedAt || null;
    }
    if (params.ongoingImportEnabled !== undefined) {
      overlayPatch.ongoing_import_enabled = Boolean(params.ongoingImportEnabled);
    }

    saveAccountOverlay(params.bankAccountId, overlayPatch);

    // Ensure core is_selected column is persisted directly in Supabase even if optional columns are not migrated
    if (params.isSelected !== undefined) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (uid) {
          await supabase
            .from('bank_accounts')
            .update({
              is_selected: Boolean(params.isSelected),
              updated_at: new Date().toISOString(),
            })
            .eq('id', params.bankAccountId)
            .eq('user_id', uid);
        }
      } catch {
        // ignore
      }
    }

    try {
      const res = await invokeEnableBanking<{ success: boolean; account: BankAccount }>({
        action: 'update-account-settings',
        ...params,
      });
      if (res?.account) {
        return mergeAccountWithOverlay(res.account);
      }
    } catch {
      // Fallback to direct Supabase table update if the Edge Function hasn't been redeployed yet
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (!uid) return null;

        const dbPatch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (params.isSelected !== undefined) dbPatch.is_selected = Boolean(params.isSelected);
        if (params.customName !== undefined) dbPatch.custom_name = overlayPatch.custom_name;
        if (params.includeInBudget !== undefined) dbPatch.include_in_budget = overlayPatch.include_in_budget;
        if (params.importStartDate !== undefined) dbPatch.import_start_date = overlayPatch.import_start_date;
        if (params.reconciliationCompletedAt !== undefined) {
          dbPatch.reconciliation_completed_at = overlayPatch.reconciliation_completed_at;
        }
        if (params.ongoingImportEnabled !== undefined) {
          dbPatch.ongoing_import_enabled = overlayPatch.ongoing_import_enabled;
        }

        const { data } = await supabase
          .from('bank_accounts')
          .update(dbPatch)
          .eq('id', params.bankAccountId)
          .eq('user_id', uid)
          .select('*')
          .maybeSingle();
        if (data) return mergeAccountWithOverlay(data as BankAccount);
      } catch {
        // Local overlay already saved
      }
    }
    return null;
  },
};
