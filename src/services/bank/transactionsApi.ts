// Banktransaktioner: hämta dem och spara hur de stämts av mot budgeten.
import { supabase } from '../../supabaseClient';
import type { BankAccount, BankTransactionItem } from './types';
import { mergeAccountWithOverlay, mergeTxWithReconciliationOverlay, saveTxReconciliationOverlay } from './overlays';
import { deduplicateBankSyncRows } from './dedupe';
import { invokeEnableBanking } from './invoke';

export const bankTransactionsApi = {
  async updateTransactionReconciliation(
    bankTxId: string,
    patch: Partial<
      Pick<
        BankTransactionItem,
        | 'reconciliation_status'
        | 'linked_transaction_id'
        | 'linked_fixed_expense_id'
        | 'linked_income_id'
        | 'linked_saving_id'
        | 'linked_period_key'
        | 'planned_amount_at_match'
        | 'linked_transfer_bank_tx_id'
        | 'linked_refund_transaction_id'
        | 'replaced_by_bank_tx_id'
        | 'reservation_disappeared_at'
        | 'review_reason'
        | 'user_decision_at'
        | 'previous_reconciliation_state'
      >
    >
  ): Promise<void> {
    const withTimestamp = {
      ...patch,
      user_decision_at: patch.user_decision_at ?? new Date().toISOString(),
    };
    saveTxReconciliationOverlay(bankTxId, withTimestamp);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) return;
      await supabase
        .from('bank_transactions')
        .update({
          ...withTimestamp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bankTxId)
        .eq('user_id', uid);
    } catch {
      // If migration 20261025_bank_budget_integration.sql has not been applied yet, local overlay still persists it
    }
  },

  async bulkUpdateTransactionReconciliation(
    updates: Array<{
      bankTxId: string;
      patch: Partial<
        Pick<
          BankTransactionItem,
          | 'reconciliation_status'
          | 'linked_transaction_id'
          | 'linked_fixed_expense_id'
          | 'linked_income_id'
          | 'linked_saving_id'
          | 'linked_period_key'
          | 'planned_amount_at_match'
          | 'linked_transfer_bank_tx_id'
          | 'linked_refund_transaction_id'
          | 'replaced_by_bank_tx_id'
          | 'reservation_disappeared_at'
          | 'review_reason'
          | 'user_decision_at'
          | 'previous_reconciliation_state'
        >
      >;
    }>
  ): Promise<void> {
    await Promise.all(
      updates.map((u) => this.updateTransactionReconciliation(u.bankTxId, u.patch))
    );
  },

  async listTransactions(params: {
    bankAccountId?: string | null;
    statusFilter?: 'all' | 'booked' | 'reserved';
    page?: number;
    pageSize?: number;
  }): Promise<{
    transactions: BankTransactionItem[];
    totalCount: number;
    bookedCount: number;
    reservedCount: number;
    page: number;
    pageSize: number;
    hasMorePages: boolean;
    accountsWithMoreHistory: string[];
  }> {
    const res = await invokeEnableBanking<{
      transactions: BankTransactionItem[];
      totalCount: number;
      bookedCount: number;
      reservedCount: number;
      page: number;
      pageSize: number;
      hasMorePages: boolean;
      accountsWithMoreHistory: string[];
    }>({
      action: 'list-transactions',
      bankAccountId: params.bankAccountId || null,
      statusFilter: params.statusFilter || 'all',
      page: params.page || 1,
      pageSize: params.pageSize || 30,
    });
    return {
      ...res,
      transactions: deduplicateBankSyncRows((res.transactions || []).map(mergeTxWithReconciliationOverlay)),
    };
  },

  async listAllTransactionsForReconciliation(
    bankAccountIdOrLimit?: string | number | null,
    includeAllConnectedAccounts = false
  ): Promise<BankTransactionItem[]> {
    const bankAccountId =
      typeof bankAccountIdOrLimit === 'string' && bankAccountIdOrLimit.trim().length > 0
        ? bankAccountIdOrLimit.trim()
        : null;
    const maxRows =
      typeof bankAccountIdOrLimit === 'number' && bankAccountIdOrLimit > 0
        ? bankAccountIdOrLimit
        : 5000;

    // First try direct query on public.bank_transactions for speed and full fields
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUid = sessionData?.session?.user?.id;
      if (!currentUid) {
        return [];
      }

      const { data: activeConns } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('user_id', currentUid)
        .neq('status', 'revoked');
      const activeConnIds = (activeConns || []).map((c) => c.id);
      if (activeConnIds.length === 0) {
        return [];
      }

      const { data: allConnAccs } = await supabase
        .from('bank_accounts')
        .select('id, is_selected')
        .eq('user_id', currentUid)
        .in('connection_id', activeConnIds);

      const mergedConnAccs = ((allConnAccs || []) as BankAccount[]).map(mergeAccountWithOverlay);
      const allAccIds = mergedConnAccs.map((a) => a.id);
      const selectedIds = mergedConnAccs
        .filter((a) => a.is_selected !== false)
        .map((a) => a.id);

      const targetAccountIds = includeAllConnectedAccounts
        ? allAccIds
        : selectedIds.length > 0
        ? selectedIds
        : allAccIds;

      if (!bankAccountId && targetAccountIds.length === 0) {
        return [];
      }

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('user_id', currentUid)
        .order('booking_date', { ascending: false, nullsFirst: true })
        .order('created_at', { ascending: false })
        .limit(maxRows);

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      } else {
        query = query.in('bank_account_id', targetAccountIds);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return deduplicateBankSyncRows(
          (data as BankTransactionItem[]).map(mergeTxWithReconciliationOverlay)
        );
      }
    } catch {
      // Fallback to Edge Function pagination below
    }

    const all: BankTransactionItem[] = [];
    let page = 1;
    let hasMore = true;
    const maxPages = Math.max(1, Math.ceil(maxRows / 100));
    while (hasMore && page <= maxPages) {
      const res = await this.listTransactions({
        bankAccountId,
        statusFilter: 'all',
        page,
        pageSize: 100,
      });
      all.push(...(res.transactions || []));
      hasMore = Boolean(res.hasMorePages);
      page += 1;
    }
    return deduplicateBankSyncRows(all);
  },
};
