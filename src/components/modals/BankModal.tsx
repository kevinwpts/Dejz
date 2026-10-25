import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bank,
  MagnifyingGlass,
  SpinnerGap,
  ArrowSquareOut,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Check,
  LockKey
} from '@phosphor-icons/react';
import {
  bankService,
  BankAspsp,
  BankEnvironment,
  BankAccount,
  BankConnection
} from '../../services/bankService';

interface BankModalProps {
  isOpen: boolean;
  userEmail: string | null;
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  onClose: () => void;
  onOpenAuth: () => void;
  onBankStateUpdated: (connections: BankConnection[], accounts: BankAccount[]) => void;
}

export const BankModal: React.FC<BankModalProps> = ({
  isOpen,
  userEmail,
  connections,
  bankAccounts,
  onClose,
  onOpenAuth,
  onBankStateUpdated,
}) => {
  const [environment, setEnvironment] = useState<BankEnvironment>('production');
  const [banks, setBanks] = useState<BankAspsp[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Flow steps: 'list' | 'authorizing' | 'select-accounts'
  const [step, setStep] = useState<'list' | 'authorizing' | 'select-accounts'>('list');
  const [selectedBank, setSelectedBank] = useState<BankAspsp | null>(null);
  const [startingAuth, setStartingAuth] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authState, setAuthState] = useState<string | null>(null);
  const [manualCallbackUrl, setManualCallbackUrl] = useState('');
  const [exchangingCode, setExchangingCode] = useState(false);

  // Account selection after connection
  const [activeConnection, setActiveConnection] = useState<BankConnection | null>(null);
  const [fetchedAccounts, setFetchedAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [savingAccounts, setSavingAccounts] = useState(false);

  const loadBanks = useCallback(async (env: BankEnvironment) => {
    setLoadingBanks(true);
    setErrorMsg(null);
    try {
      const list = await bankService.listBanks('SE', env);
      setBanks(list);
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte hämta banklistan från Enable Banking.');
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userEmail && step === 'list') {
      loadBanks(environment);
    }
  }, [isOpen, userEmail, environment, step, loadBanks]);

  // Poll status when window regains focus during 'authorizing' step
  useEffect(() => {
    if (!isOpen || step !== 'authorizing') return;
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
              setSelectedAccountIds(
                connAccounts.filter((a) => a.is_selected).map((a) => a.id).length > 0
                  ? connAccounts.filter((a) => a.is_selected).map((a) => a.id)
                  : connAccounts.map((a) => a.id)
              );
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
  }, [isOpen, step, connections.length, onBankStateUpdated]);

  if (!isOpen) return null;

  const handleSelectBank = async (bank: BankAspsp) => {
    setSelectedBank(bank);
    setStartingAuth(true);
    setErrorMsg(null);

    try {
      const redirectUrl = `${window.location.origin}/bank/callback`;
      const res = await bankService.startAuth({
        aspspName: bank.name,
        aspspCountry: bank.country || 'SE',
        aspspLogo: bank.logo,
        originContext: 'settings',
        environment,
        redirectUrl,
      });

      setAuthUrl(res.url);
      setAuthState(res.state);
      setStep('authorizing');

      // Check if we are in an iframe (like AI Studio preview) or top window
      const isInIframe = window.self !== window.top;
      if (!isInIframe) {
        window.location.assign(res.url);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte starta autentisering mot banken.');
    } finally {
      setStartingAuth(false);
    }
  };

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
        throw new Error('Kunde inte hitta code eller state i länken.');
      }

      const res = await bankService.exchangeCode({ code, state });
      setActiveConnection(res.connection);
      setFetchedAccounts(res.accounts || []);
      setSelectedAccountIds((res.accounts || []).map((a) => a.id));
      setStep('select-accounts');

      const status = await bankService.getStatus();
      onBankStateUpdated(status.connections, status.accounts);
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte slutföra bankkopplingen.');
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
      await bankService.selectAccounts({
        connectionId: activeConnection.id,
        selectedAccountIds,
      });
      const synced = await bankService.sync({ connectionId: activeConnection.id });
      onBankStateUpdated(synced.connections, synced.accounts);
      setStep('list');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte spara kontoval.');
    } finally {
      setSavingAccounts(false);
    }
  };

  const handleOpenExistingAccountSelection = (conn: BankConnection) => {
    const connAccs = bankAccounts.filter((a) => a.connection_id === conn.id);
    setActiveConnection(conn);
    setFetchedAccounts(connAccs);
    setSelectedAccountIds(connAccs.filter((a) => a.is_selected).map((a) => a.id));
    setStep('select-accounts');
  };

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatKr = (amount: number | null | undefined, currency = 'SEK') => {
    if (amount === null || amount === undefined) return '–';
    return `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} ${currency === 'SEK' ? 'kr' : currency}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl border border-[var(--border-subtle)] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Bank size={20} className="text-[var(--text-primary)]" weight="duotone" />
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Enable Banking
            </h3>
          </div>
          <button
            onClick={() => {
              setStep('list');
              onClose();
            }}
            className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!userEmail ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-primary)]">
                <LockKey size={24} weight="duotone" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[var(--text-primary)]">
                  Logga in för att koppla bank
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  Enable Banking kräver att du är inloggad med ditt Supabase-konto så att dina bankkonton kan sparas säkert.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90"
              >
                Logga in med Supabase
              </button>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                  <WarningCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: BANK LIST */}
              {step === 'list' && (
                <div className="space-y-4">
                  {/* Already connected banks */}
                  {connections.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
                        Anslutna banker
                      </span>
                      {connections.map((conn) => (
                        <div
                          key={conn.id}
                          className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {conn.aspsp_logo ? (
                              <img
                                src={conn.aspsp_logo}
                                alt={conn.aspsp_name}
                                className="w-6 h-6 rounded-md object-contain bg-white p-0.5"
                              />
                            ) : (
                              <Bank size={18} className="text-[var(--text-primary)]" />
                            )}
                            <div>
                              <span className="font-bold text-[var(--text-primary)] block">
                                {conn.aspsp_name}
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {conn.status === 'active' ? 'Aktiv anslutning' : conn.status}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenExistingAccountSelection(conn)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                          >
                            Välj konton
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Environment switcher (Production / Sandbox) */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      Välj svensk bank (PSD2 / BankID)
                    </span>
                    <div className="flex rounded-lg bg-[var(--surface-raised)] p-0.5 border border-[var(--border-subtle)] text-[11px]">
                      <button
                        type="button"
                        onClick={() => setEnvironment('production')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                          environment === 'production'
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        Live
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnvironment('sandbox')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                          environment === 'sandbox'
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        Sandbox
                      </button>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <MagnifyingGlass
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Sök bank (Swedbank, SEB, Nordea, Handelsbanken...)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                    />
                  </div>

                  {/* Bank list */}
                  {loadingBanks || startingAuth ? (
                    <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                      <SpinnerGap size={28} className="animate-spin text-[var(--text-primary)]" />
                      <span>
                        {startingAuth
                          ? `Startar säker anslutning mot ${selectedBank?.name}...`
                          : 'Hämtar banker från Enable Banking...'}
                      </span>
                    </div>
                  ) : filteredBanks.length > 0 ? (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {filteredBanks.map((bank) => (
                        <button
                          key={bank.name}
                          onClick={() => handleSelectBank(bank)}
                          className="w-full p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--text-primary)] flex items-center justify-between transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            {bank.logo ? (
                              <img
                                src={bank.logo}
                                alt={bank.name}
                                className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 border border-black/5"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-[var(--surface-color)] flex items-center justify-center">
                                <Bank size={16} className="text-[var(--text-secondary)]" />
                              </div>
                            )}
                            <span className="font-semibold text-sm text-[var(--text-primary)]">
                              {bank.name}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] font-medium">
                            Anslut →
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-xs text-[var(--text-muted)]">
                        Inga banker hittades.
                      </p>
                      <button
                        onClick={() => loadBanks(environment)}
                        className="text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1 underline"
                      >
                        <ArrowClockwise size={14} />
                        <span>Försök igen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: AUTHORIZING AT ENABLE BANKING */}
              {step === 'authorizing' && authUrl && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-center space-y-3">
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">
                      Identifiera dig hos {selectedBank?.name}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Klicka på knappen nedan för att öppna Enable Banking och legitimera dig med Mobilt BankID.
                    </p>

                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90"
                    >
                      <span>Öppna {selectedBank?.name} (BankID)</span>
                      <ArrowSquareOut size={16} weight="bold" />
                    </a>
                  </div>

                  {/* Manual callback URL paste fallback (for preview environment when redirect goes to dejz.se/bank/callback) */}
                  <form onSubmit={handleExchangeManualCallback} className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                      Slutförde du inloggningen i en annan flik (t.ex. dejz.se/bank/callback)?
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Om du skickades till en annan adress efter BankID kan du klistra in hela callback-URL:en här för att slutföra direkt:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCallbackUrl}
                        onChange={(e) => setManualCallbackUrl(e.target.value)}
                        placeholder="https://dejz.se/bank/callback?code=..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                      />
                      <button
                        type="submit"
                        disabled={exchangingCode || !manualCallbackUrl.trim()}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {exchangingCode ? 'Verifierar...' : 'Slutför'}
                      </button>
                    </div>
                  </form>

                  <button
                    type="button"
                    onClick={() => setStep('list')}
                    className="w-full py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    ← Tillbaka till banklistan
                  </button>
                </div>
              )}

              {/* STEP 3: SELECT ACCOUNTS */}
              {step === 'select-accounts' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={20} weight="fill" />
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">
                      Välj konton att inkludera
                    </h4>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    Välj vilka bankkonton från {activeConnection?.aspsp_name} som ska visas i din översikt.
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {fetchedAccounts.map((acc) => {
                      const isChecked = selectedAccountIds.includes(acc.id);
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => toggleAccountSelection(acc.id)}
                          className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                            isChecked
                              ? 'bg-[var(--surface-raised)] border-[var(--text-primary)]'
                              : 'bg-[var(--surface-color)] border-[var(--border-subtle)] opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                isChecked
                                  ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                                  : 'border-[var(--border-subtle)]'
                              }`}
                            >
                              {isChecked && <Check size={12} weight="bold" />}
                            </div>
                            <div>
                              <span className="font-bold text-sm text-[var(--text-primary)] block">
                                {acc.custom_name || acc.name}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {acc.bban || acc.iban || acc.product || 'Bankkonto'}
                              </span>
                            </div>
                          </div>

                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {formatKr(acc.balance_amount, acc.balance_currency || acc.currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSelectedAccounts}
                    disabled={savingAccounts || selectedAccountIds.length === 0}
                    className="w-full py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingAccounts && <SpinnerGap size={16} className="animate-spin" />}
                    <span>Spara konton & synka</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
