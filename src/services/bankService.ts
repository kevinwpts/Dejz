import { supabase } from '../supabaseClient';

export type BankEnvironment = 'production' | 'sandbox';

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
  product: string | null;
  iban: string | null;
  bban: string | null;
  currency: string;
  is_selected: boolean;
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
  booking_status: 'BOOK' | 'PDNG' | 'HOLD' | 'OTHR';
  booking_date: string | null;
  value_date: string | null;
  transaction_date: string | null;
  amount: number;
  currency: string;
  credit_debit_indicator: 'CRDT' | 'DBIT' | null;
  description: string;
  counterparty_name: string | null;
  created_at: string;
  updated_at: string;
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
    return await invokeEnableBanking({
      action: 'exchange-code',
      code: params.code,
      state: params.state,
    });
  },

  async selectAccounts(params: {
    connectionId: string;
    selectedAccountIds: string[];
  }): Promise<{
    success: boolean;
    accounts: BankAccount[];
  }> {
    return await invokeEnableBanking({
      action: 'select-accounts',
      connectionId: params.connectionId,
      selectedAccountIds: params.selectedAccountIds,
    });
  },

  async getStatus(): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> {
    return await invokeEnableBanking({
      action: 'status',
    });
  },

  async sync(params?: {
    connectionId?: string;
    bankAccountId?: string;
    loadMore?: boolean;
  }): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
    syncErrors: string[];
  }> {
    return await invokeEnableBanking({
      action: 'sync',
      connectionId: params?.connectionId,
      bankAccountId: params?.bankAccountId,
      loadMore: params?.loadMore || false,
    });
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
    return await invokeEnableBanking({
      action: 'list-transactions',
      bankAccountId: params.bankAccountId || null,
      statusFilter: params.statusFilter || 'all',
      page: params.page || 1,
      pageSize: params.pageSize || 30,
    });
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
};
