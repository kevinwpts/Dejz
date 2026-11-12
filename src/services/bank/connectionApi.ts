// Bankkopplingar: lista banker, logga in mot banken, status, synkning och frånkoppling.
import { supabase } from '../../supabaseClient';
import { appOrigin } from '../../utils/platform';
import type { BankAccount, BankAspsp, BankConnection, BankEnvironment } from './types';
import { SWEDISH_BANKS_CATALOG } from './catalog';
import { mergeAccountWithOverlay, saveAccountOverlay } from './overlays';
import { invokeEnableBanking } from './invoke';

export const bankConnectionApi = {
  /** Sparar egna inställningar för ett konto (namn, med i budget …) */
  saveAccountOverlay,
  async listBanks(country = 'SE', environment: BankEnvironment = 'production'): Promise<BankAspsp[]> {
    if (country === 'SE' && SWEDISH_BANKS_CATALOG.length > 0) {
      // Return full catalog of Swedish banks immediately so UI never spins or waits
      invokeEnableBanking<{ aspsps: BankAspsp[] }>({
        action: 'list-aspsps',
        country,
        environment,
      }, 5000).catch(() => {});
      return SWEDISH_BANKS_CATALOG;
    }
    try {
      const res = await invokeEnableBanking<{ aspsps: BankAspsp[] }>({
        action: 'list-aspsps',
        country,
        environment,
      }, 5000);
      return res.aspsps || SWEDISH_BANKS_CATALOG;
    } catch {
      return SWEDISH_BANKS_CATALOG;
    }
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
        ? `${appOrigin()}/bank/callback`
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
    }, 12000);
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

  async getStatus(): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> {
    if (typeof window !== 'undefined' && localStorage.getItem('dejz_logged_out') === 'true') {
      return { connections: [], accounts: [] };
    }
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.access_token) {
      return { connections: [], accounts: [] };
    }
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
    if (params?.fullSync) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (uid) {
          let resetQuery = supabase
            .from('bank_accounts')
            .update({ last_synced_at: null })
            .eq('user_id', uid);
          if (params.bankAccountId) {
            resetQuery = resetQuery.eq('id', params.bankAccountId);
          } else if (params.connectionId) {
            resetQuery = resetQuery.eq('connection_id', params.connectionId);
          }
          await resetQuery;
        }
      } catch {
        // ignore if RLS blocks direct update
      }
    }
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
    return await invokeEnableBanking(
      {
        action: 'delete-account',
      },
      4000
    );
  },
};
