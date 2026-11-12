// Flödet för att ansluta en bank: hämta banker, starta inloggning, ta emot konton och spara kontoval.
import React, { useState, useEffect, useCallback } from 'react';
import {
  bankService,
  BankAspsp,
  BankEnvironment,
  BankAccount,
  BankConnection,
} from '../../../services/bankService';
import { appOrigin } from '../../../utils/platform';
import { BankStep, buildAccountNameMap } from './shared';

interface UseBankConnectionArgs {
  isOpen: boolean;
  userEmail: string | null;
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  preselectedBankName?: string | null;
  onClose: () => void;
  onBankStateUpdated: (connections: BankConnection[], accounts: BankAccount[]) => void;
}

export function useBankConnection({
  isOpen,
  userEmail,
  connections,
  bankAccounts,
  preselectedBankName,
  onClose,
  onBankStateUpdated,
}: UseBankConnectionArgs) {
  const [environment] = useState<BankEnvironment>('production');
  const [banks, setBanks] = useState<BankAspsp[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Flow steps: 'list' | 'authorizing' | 'select-accounts'
  const [step, setStep] = useState<BankStep>('list');
  const [selectedBank, setSelectedBank] = useState<BankAspsp | null>(null);
  const [startingAuth, setStartingAuth] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authState, setAuthState] = useState<string | null>(null);
  const [showManualCallback, setShowManualCallback] = useState(false);
  const [manualCallbackUrl, setManualCallbackUrl] = useState('');
  const [exchangingCode, setExchangingCode] = useState(false);

  // Account selection after connection
  const [activeConnection, setActiveConnection] = useState<BankConnection | null>(null);
  const [fetchedAccounts, setFetchedAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accountCustomNames, setAccountCustomNames] = useState<Record<string, string>>({});
  const [savingAccounts, setSavingAccounts] = useState(false);

  const loadBanks = useCallback(async (env: BankEnvironment) => {
    setLoadingBanks(true);
    setErrorMsg(null);
    try {
      const list = await bankService.listBanks('SE', env);
      setBanks(list);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Kunde inte hämta banklistan.');
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userEmail && step === 'list') {
      loadBanks(environment);
    }
  }, [isOpen, userEmail, environment, step, loadBanks]);

  const handleSelectBank = useCallback(async (bank: BankAspsp, reconnectConnectionId?: string | null) => {
    setSelectedBank(bank);
    setStartingAuth(true);
    setErrorMsg(null);
    setShowManualCallback(false);

    try {
      const redirectUrl = `${appOrigin()}/bank/callback`;
      const res = await bankService.startAuth({
        aspspName: bank.name,
        aspspCountry: bank.country || 'SE',
        aspspLogo: bank.logo,
        originContext: 'settings',
        environment,
        reconnectConnectionId: reconnectConnectionId || null,
        redirectUrl,
      });

      setAuthUrl(res.url);
      setAuthState(res.state);

      const isInIframe = window.self !== window.top;
      if (!isInIframe) {
        window.location.assign(res.url);
      } else {
        setStep('authorizing');
      }
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Kunde inte starta autentisering mot banken.');
    } finally {
      setStartingAuth(false);
    }
  }, [environment]);

  // När rutan är stängd: nollställ flödet. Görs under render i stället för i en
  // effekt; villkoret gör att det bara sker när något faktiskt behöver nollställas.
  if (
    !isOpen &&
    (step !== 'list' ||
      selectedBank !== null ||
      authUrl !== null ||
      authState !== null ||
      errorMsg !== null)
  ) {
    setStep('list');
    setSelectedBank(null);
    setAuthUrl(null);
    setAuthState(null);
    setErrorMsg(null);
  }

  useEffect(() => {
    if (!isOpen) return;

    if (preselectedBankName && step === 'list' && !startingAuth) {
      const cleanTarget = preselectedBankName.trim().toLowerCase();
      const existingMatch = banks.find((b) => {
        const bn = b.name.toLowerCase();
        return bn === cleanTarget || bn.includes(cleanTarget) || cleanTarget.includes(bn);
      });
      handleSelectBank(
        existingMatch || {
          name: preselectedBankName,
          country: 'SE',
          logo: null,
          bic: null,
        }
      );
    }
  }, [isOpen, preselectedBankName, banks, step, startingAuth, handleSelectBank]);

  // Poll status when window regains focus after bank auth
  useEffect(() => {
    if (!isOpen) return;
    const handleFocus = async () => {
      try {
        const status = await bankService.getStatus();
        if (status.connections.length > connections.length || status.accounts.length > 0) {
          onBankStateUpdated(status.connections, status.accounts);
          const newestConn = status.connections[0];
          if (newestConn) {
            const connAccounts = status.accounts.filter((a) => a.connection_id === newestConn.id);
            if (connAccounts.length > 0) {
              setActiveConnection(newestConn);
              setFetchedAccounts(connAccounts);
              const selIds = connAccounts.filter((a) => a.is_selected).map((a) => a.id);
              setSelectedAccountIds(selIds.length > 0 ? selIds : connAccounts.map((a) => a.id));
              setAccountCustomNames(buildAccountNameMap(connAccounts));
              setStep('select-accounts');
            }
          }
        }
      } catch {
        // ignore poll error
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, connections.length, onBankStateUpdated]);

  const handleExchangeManualCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCallbackUrl.trim()) return;
    setExchangingCode(true);
    setErrorMsg(null);

    try {
      let code = '';
      let state = authState || '';

      if (manualCallbackUrl.includes('code=')) {
        const urlObj = new URL(
          manualCallbackUrl.startsWith('http')
            ? manualCallbackUrl.trim()
            : `https://dejz.se/bank/callback?${manualCallbackUrl.trim()}`
        );
        code = urlObj.searchParams.get('code') || '';
        state = urlObj.searchParams.get('state') || state;
      } else {
        code = manualCallbackUrl.trim();
      }

      if (!code || !state) {
        throw new Error('Kunde inte hitta verifieringskod i länken.');
      }

      const res = await bankService.exchangeCode({ code, state });
      setActiveConnection(res.connection);
      const accs = res.accounts || [];
      setFetchedAccounts(accs);
      setSelectedAccountIds(accs.map((a) => a.id));
      setAccountCustomNames(buildAccountNameMap(accs));
      setStep('select-accounts');

      const status = await bankService.getStatus();
      onBankStateUpdated(status.connections, status.accounts);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Kunde inte slutföra bankkopplingen.');
    } finally {
      setExchangingCode(false);
    }
  };

  const toggleAccountSelection = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveSelectedAccounts = async () => {
    if (!activeConnection) {
      onClose();
      return;
    }
    setSavingAccounts(true);
    setErrorMsg(null);
    try {
      const newlySelectedAccountIds = fetchedAccounts
        .filter((acc) => selectedAccountIds.includes(acc.id) && (acc.is_selected === false || !acc.last_synced_at))
        .map((acc) => acc.id);

      for (const acc of fetchedAccounts) {
        const customName = accountCustomNames[acc.id]?.trim();
        if (customName !== undefined) {
          bankService.saveAccountOverlay(acc.id, { custom_name: customName });
        }
      }

      await bankService.selectAccounts({
        connectionId: activeConnection.id,
        selectedAccountIds,
      });

      if (newlySelectedAccountIds.length > 0) {
        for (const accId of newlySelectedAccountIds) {
          await bankService
            .sync({
              connectionId: activeConnection.id,
              bankAccountId: accId,
              fullSync: true,
            })
            .catch(() => {});
        }
      }

      const synced = await bankService.sync({ connectionId: activeConnection.id });
      onBankStateUpdated(synced.connections, synced.accounts);
      setStep('list');
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Kunde inte spara kontoval.');
    } finally {
      setSavingAccounts(false);
    }
  };

  const handleOpenExistingAccountSelection = (conn: BankConnection) => {
    const connAccs = bankAccounts.filter((a) => a.connection_id === conn.id);
    setActiveConnection(conn);
    setFetchedAccounts(connAccs);
    setSelectedAccountIds(connAccs.filter((a) => a.is_selected !== false).map((a) => a.id));
    setAccountCustomNames(buildAccountNameMap(connAccs));
    setStep('select-accounts');
  };

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return {
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
  };
}
