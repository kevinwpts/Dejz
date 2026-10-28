import { supabase } from '../supabaseClient';

export type BankEnvironment = 'production' | 'sandbox';

export type BankReconciliationStatus =
  | 'unprocessed'
  | 'imported_as_purchase'
  | 'matched_manual_tx'
  | 'confirmed_fixed_expense'
  | 'confirmed_income'
  | 'confirmed_saving'
  | 'internal_transfer'
  | 'refund_linked'
  | 'needs_review'
  | 'excluded'
  | 'reserved_pending'
  | 'reserved_replaced';

export interface BankAspsp {
  name: string;
  country: string;
  logo: string | null;
  bic: string | null;
  maximumConsentValidity?: number;
}

export interface BankConnection {
  id: string;
  user_id: string;
  aspsp_name: string;
  aspsp_country: string;
  aspsp_logo: string | null;
  environment: BankEnvironment;
  status: 'active' | 'expired' | 'revoked' | 'error';
  valid_until: string | null;
  days_until_expiry?: number | null;
  expiring_soon?: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  connection_id: string;
  user_id: string;
  provider_account_uid: string;
  name: string;
  custom_name?: string | null;
  product: string | null;
  iban: string | null;
  bban: string | null;
  currency: string;
  is_selected: boolean;
  include_in_budget?: boolean;
  import_start_date?: string | null;
  reconciliation_completed_at?: string | null;
  ongoing_import_enabled?: boolean;
  has_incomplete_history?: boolean;
  stable_account_key?: string | null;
  balance_amount: number | null;
  balance_currency: string | null;
  balance_type: string | null;
  balance_label: string | null;
  balances_json: any[];
  continuation_key: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransactionItem {
  id: string;
  user_id: string;
  connection_id: string;
  bank_account_id: string;
  external_key: string;
  entry_reference: string | null;
  transaction_id: string | null;
  booking_status: 'BOOK' | 'PDNG' | 'HOLD' | 'SCHD' | 'CNCL' | 'RJCT' | 'OTHR';
  booking_date: string | null;
  value_date: string | null;
  transaction_date: string | null;
  amount: number;
  currency: string;
  credit_debit_indicator: 'CRDT' | 'DBIT' | null;
  description: string;
  counterparty_name: string | null;
  raw_json?: any;
  reconciliation_status?: BankReconciliationStatus;
  linked_transaction_id?: string | null;
  linked_fixed_expense_id?: string | null;
  linked_income_id?: string | null;
  linked_saving_id?: string | null;
  linked_period_key?: string | null;
  planned_amount_at_match?: number | null;
  linked_transfer_bank_tx_id?: string | null;
  linked_refund_transaction_id?: string | null;
  replaced_by_bank_tx_id?: string | null;
  reservation_disappeared_at?: string | null;
  review_reason?: string | null;
  user_decision_at?: string | null;
  previous_reconciliation_state?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_ACCOUNT_OVERLAY_KEY = 'dejz_bank_accounts_overlay_v1';
const LOCAL_TX_RECONCILIATION_OVERLAY_KEY = 'dejz_bank_tx_reconciliation_overlay_v1';

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export function getAccountOverlayMap(): Record<string, Partial<BankAccount>> {
  return readJsonStorage<Record<string, Partial<BankAccount>>>(LOCAL_ACCOUNT_OVERLAY_KEY, {});
}

export function saveAccountOverlay(accountId: string, patch: Partial<BankAccount>): void {
  const map = getAccountOverlayMap();
  map[accountId] = { ...(map[accountId] || {}), ...patch };
  writeJsonStorage(LOCAL_ACCOUNT_OVERLAY_KEY, map);
}

export function mergeAccountWithOverlay(acc: BankAccount): BankAccount {
  const overlay = getAccountOverlayMap()[acc.id];
  const merged = overlay ? { ...acc, ...overlay } : { ...acc };
  if (merged.include_in_budget === undefined) {
    merged.include_in_budget = Boolean(merged.is_selected);
  }
  if (merged.has_incomplete_history === undefined) {
    merged.has_incomplete_history = Boolean(merged.continuation_key);
  }
  return merged;
}

export function getTxReconciliationOverlayMap(): Record<string, Partial<BankTransactionItem>> {
  return readJsonStorage<Record<string, Partial<BankTransactionItem>>>(
    LOCAL_TX_RECONCILIATION_OVERLAY_KEY,
    {}
  );
}

export function saveTxReconciliationOverlay(
  bankTxId: string,
  patch: Partial<BankTransactionItem>
): void {
  const map = getTxReconciliationOverlayMap();
  map[bankTxId] = { ...(map[bankTxId] || {}), ...patch };
  writeJsonStorage(LOCAL_TX_RECONCILIATION_OVERLAY_KEY, map);
}

export function compactBankTxRawJson(raw: any): any {
  if (!raw || typeof raw !== 'object') return undefined;
  const compact: Record<string, any> = {};
  if (raw.balance_after_transaction?.amount !== undefined) {
    compact.balance_after_transaction = {
      amount: raw.balance_after_transaction.amount,
    };
  }
  if (raw.card_transaction && typeof raw.card_transaction === 'object') {
    compact.card_transaction = {
      authorized_date: raw.card_transaction.authorized_date,
      transaction_date_time: raw.card_transaction.transaction_date_time,
      transaction_date: raw.card_transaction.transaction_date,
      time: raw.card_transaction.time,
    };
  }
  if (raw.remittance_information !== undefined) {
    compact.remittance_information = raw.remittance_information;
  }
  const currencyFields = [
    'exchange_rate',
    'instructed_amount',
    'transaction_amount',
    'currency_exchange',
  ];
  for (const key of currencyFields) {
    if (raw[key] !== undefined && raw[key] !== null) {
      compact[key] = raw[key];
    }
  }
  const timeFields = [
    'transaction_date_time',
    'execution_date_time',
    'acceptance_date_time',
    'origination_date_time',
    'origination_date',
    'transaction_time',
    'time',
    'execution_time',
    'timestamp',
    'transaction_date',
    'value_date',
    'booking_date',
  ];
  for (const key of timeFields) {
    if (raw[key] !== undefined && raw[key] !== null) {
      compact[key] = raw[key];
    }
  }
  return Object.keys(compact).length > 0 ? compact : undefined;
}

export function mergeTxWithReconciliationOverlay(tx: BankTransactionItem): BankTransactionItem {
  const compactedTx = tx.raw_json ? { ...tx, raw_json: compactBankTxRawJson(tx.raw_json) } : tx;
  const overlay = getTxReconciliationOverlayMap()[compactedTx.id];
  if (!overlay) return compactedTx;
  // Prefer DB reconciliation_status if it's already non-unprocessed and newer, otherwise merge overlay
  if (
    compactedTx.reconciliation_status &&
    compactedTx.reconciliation_status !== 'unprocessed' &&
    compactedTx.user_decision_at &&
    overlay.user_decision_at &&
    compactedTx.user_decision_at >= overlay.user_decision_at
  ) {
    return compactedTx;
  }
  return { ...compactedTx, ...overlay };
}

async function invokeEnableBanking<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('enable-banking', {
    body: payload,
  });

  if (error) {
    let message = error.message || 'Kunde inte kommunicera med banktjänsten.';
    try {
      if ('context' in error && (error as any).context) {
        const errBody = await (error as any).context.json();
        if (errBody?.error) {
          message = errBody.error;
        }
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export function deduplicateBankSyncRows(rows: BankTransactionItem[]): BankTransactionItem[] {
  if (!Array.isArray(rows) || rows.length <= 1) return rows || [];

  const chosenByCompositeKey = new Map<string, BankTransactionItem>();
  const batchOccurrenceCounts = new Map<string, number>();

  // Sortera med äldsta skapandedatum först så att stabil ordning bevaras
  const sorted = [...rows].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (tA !== tB) return tA - tB;
    return (a.id || '').localeCompare(b.id || '');
  });

  // Identifiera synkbatcher (inom 30 sekunder från varandra)
  const rowBatchMap = new Map<string, number>();
  let currentBatchId = 0;
  let lastCreatedMs = -Infinity;

  for (const r of sorted) {
    const createdMs = r.created_at ? new Date(r.created_at).getTime() : 0;
    if (Math.abs(createdMs - lastCreatedMs) > 30_000) {
      currentBatchId += 1;
    }
    lastCreatedMs = createdMs;
    rowBatchMap.set(r.id, currentBatchId);
  }

  for (const r of sorted) {
    const rawBal = r.raw_json?.balance_after_transaction?.amount;
    const parsedBal =
      rawBal !== undefined && rawBal !== null && String(rawBal).trim() !== ''
        ? Number(String(rawBal).replace(/\s/g, '').replace(',', '.'))
        : NaN;
    const hasBalance = Number.isFinite(parsedBal);
    const balanceAfterStr = hasBalance ? parsedBal.toFixed(2) : '';

    // Normalisera beskrivning och telefonnummer
    const descRaw = (r.description || '').trim().toLowerCase();
    const phoneMatch = descRaw.replace(/[\s()-]/g, '').match(/(467\d{8}|07\d{8}|123\d{7})/);
    const normDesc = phoneMatch
      ? (phoneMatch[1].startsWith('467') ? '07' + phoneMatch[1].slice(3) : phoneMatch[1])
      : descRaw.replace(/\s+/g, ' ');

    const dateAnchor = r.booking_date || r.value_date || r.transaction_date || '';
    const valAnchor = r.value_date || '';
    const numAmt = Number(r.amount || 0).toFixed(2);
    const curr = (r.currency || 'SEK').toUpperCase();

    let compKey: string;
    if (hasBalance) {
      // När saldot efter transaktionen finns (som hos SEB) är kombinationen av
      // bokföringsstatus, datum, belopp, valuta, beskrivning och saldo unikt per fysiskt köp.
      // Då bevaras ALLA verkliga upprepade transaktioner när man swishar samma belopp flera gånger samma dag
      // (de har olika saldo efter köpet), medan identiska dubblettrader från upprepade synkningar
      // (som har exakt samma saldo) slås ihop till en enda post.
      compKey = `${r.booking_status || 'BOOK'}|${dateAnchor}|${valAnchor}|${numAmt}|${curr}|${normDesc}|${balanceAfterStr}`;
    } else {
      // Om saldot saknas, använd batch-scoped förekomstnummer så att upprepade transaktioner
      // i samma synkkörning bevaras som #1, #2, men matchas mot motsvarande i andra synkkörningar
      const baseKey = `${r.booking_status || 'BOOK'}|${dateAnchor}|${valAnchor}|${numAmt}|${curr}|${normDesc}`;
      const batchId = rowBatchMap.get(r.id) || 0;
      const batchKey = `${batchId}::${baseKey}`;
      const occurrence = (batchOccurrenceCounts.get(batchKey) || 0) + 1;
      batchOccurrenceCounts.set(batchKey, occurrence);
      compKey = `${baseKey}#${occurrence}`;
    }

    const existing = chosenByCompositeKey.get(compKey);
    if (!existing) {
      chosenByCompositeKey.set(compKey, r);
    } else {
      // Föredra transaktion som har en användardecision/reconciliation
      const existingHasDecision =
        existing.reconciliation_status && existing.reconciliation_status !== 'unprocessed';
      const currentHasDecision =
        r.reconciliation_status && r.reconciliation_status !== 'unprocessed';
      if (!existingHasDecision && currentHasDecision) {
        chosenByCompositeKey.set(compKey, r);
      }
    }
  }

  return Array.from(chosenByCompositeKey.values());
}

export const bankService = {
  async listBanks(country = 'SE', environment: BankEnvironment = 'production'): Promise<BankAspsp[]> {
    const res = await invokeEnableBanking<{ aspsps: BankAspsp[] }>({
      action: 'list-aspsps',
      country,
      environment,
    });
    return res.aspsps || [];
  },

  async startAuth(params: {
    aspspName: string;
    aspspCountry?: string;
    aspspLogo?: string | null;
    originContext: 'onboarding' | 'settings';
    returnStep?: string | null;
    environment?: BankEnvironment;
    reconnectConnectionId?: string | null;
    redirectUrl?: string | null;
  }): Promise<{
    url: string;
    state: string;
    originContext: 'onboarding' | 'settings';
    returnStep?: string | null;
    redirectUrlUsed?: string;
  }> {
    const defaultRedirectUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/bank/callback`
        : null;

    return await invokeEnableBanking({
      action: 'start-auth',
      aspspName: params.aspspName,
      aspspCountry: params.aspspCountry || 'SE',
      aspspLogo: params.aspspLogo || null,
      originContext: params.originContext,
      returnStep: params.returnStep || null,
      environment: params.environment || 'production',
      reconnectConnectionId: params.reconnectConnectionId || null,
      redirectUrl: params.redirectUrl || defaultRedirectUrl,
    });
  },

  async exchangeCode(params: {
    code: string;
    state: string;
  }): Promise<{
    alreadyProcessed?: boolean;
    connection: BankConnection;
    accounts: BankAccount[];
    originContext: 'onboarding' | 'settings';
    returnStep?: string | null;
  }> {
    const res = await invokeEnableBanking<{
      alreadyProcessed?: boolean;
      connection: BankConnection;
      accounts: BankAccount[];
      originContext: 'onboarding' | 'settings';
      returnStep?: string | null;
    }>({
      action: 'exchange-code',
      code: params.code,
      state: params.state,
    });
    return {
      ...res,
      accounts: (res.accounts || []).map(mergeAccountWithOverlay),
    };
  },

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
    const res = await invokeEnableBanking<{
      success: boolean;
      accounts: BankAccount[];
    }>({
      action: 'select-accounts',
      connectionId: params.connectionId,
      selectedAccountIds: params.selectedAccountIds,
    });
    for (const acc of res.accounts || []) {
      if (!selectedSet.has(acc.id)) {
        saveAccountOverlay(acc.id, { is_selected: false, include_in_budget: false });
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
          .select('*')
          .maybeSingle();
        if (data) return mergeAccountWithOverlay(data as BankAccount);
      } catch {
        // Local overlay already saved
      }
    }
    return null;
  },

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
      await supabase
        .from('bank_transactions')
        .update({
          ...withTimestamp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bankTxId);
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

  async getStatus(): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> {
    const res = await invokeEnableBanking<{
      connections: BankConnection[];
      accounts: BankAccount[];
    }>({
      action: 'status',
    });
    return {
      connections: res.connections || [],
      accounts: (res.accounts || []).map(mergeAccountWithOverlay),
    };
  },

  async sync(params?: {
    connectionId?: string;
    bankAccountId?: string;
    loadMore?: boolean;
    fullSync?: boolean;
  }): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
    syncErrors: string[];
  }> {
    const res = await invokeEnableBanking<{
      connections: BankConnection[];
      accounts: BankAccount[];
      syncErrors: string[];
    }>({
      action: 'sync',
      connectionId: params?.connectionId,
      bankAccountId: params?.bankAccountId,
      loadMore: params?.loadMore || false,
      fullSync: params?.fullSync || false,
    });
    return {
      connections: res.connections || [],
      accounts: (res.accounts || []).map(mergeAccountWithOverlay),
      syncErrors: res.syncErrors || [],
    };
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
    bankAccountIdOrLimit?: string | number | null
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

      // First get selected bank account IDs to avoid loading dead/unselected accounts
      const { data: selectedAccs } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('user_id', currentUid)
        .in('connection_id', activeConnIds)
        .eq('is_selected', true);
      const selectedIds = (selectedAccs || []).map((a) => a.id);

      if (!bankAccountId && selectedIds.length === 0) {
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
        query = query.in('bank_account_id', selectedIds);
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

  async disconnect(connectionId: string): Promise<{
    success: boolean;
    providerRevoked: boolean;
  }> {
    return await invokeEnableBanking({
      action: 'disconnect',
      connectionId,
    });
  },

  async deleteAccount(): Promise<{
    success: boolean;
  }> {
    return await invokeEnableBanking({
      action: 'delete-account',
    });
  },
};
