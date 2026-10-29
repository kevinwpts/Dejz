import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bank,
  MagnifyingGlass,
  SpinnerGap,
  ArrowSquareOut,
  WarningCircle,
  ArrowClockwise,
  Check,
  LockKey,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import {
  bankService,
  BankAspsp,
  BankEnvironment,
  BankAccount,
  BankConnection,
} from '../../services/bankService';
import { BottomSheet } from '../ui/BottomSheet';
import { ItemLogo } from '../ItemLogo';

interface BankModalProps {
  isOpen: boolean;
  userEmail: string | null;
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  preselectedBankName?: string | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onBankStateUpdated: (connections: BankConnection[], accounts: BankAccount[]) => void;
}

function getCleanAccountTypeLabel(acc: BankAccount, index: number): string {
  const raw = (acc.product || acc.name || '').trim();
  const stripped = raw
    .replace(/\b\d[\d\s-]{3,}\d\b/g, '')
    .replace(/[·•\-–—]\s*\d{2,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (stripped && !/^\d+$/.test(stripped)) {
    return stripped;
  }
  return index === 0 ? 'Lönekonto' : 'Sparkonto';
}

export const BankModal: React.FC<BankModalProps> = ({
  isOpen,
  userEmail,
  connections,
  bankAccounts,
  preselectedBankName,
  onClose,
  onOpenAuth,
  onBankStateUpdated,
}) => {
  const [environment] = useState<BankEnvironment>('production');
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte hämta banklistan.');
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userEmail && step === 'list') {
      loadBanks(environment);
    }
  }, [isOpen, userEmail, environment, step, loadBanks]);

  useEffect(() => {
    if (!isOpen) {
      setStep('list');
      setSelectedBank(null);
      setAuthUrl(null);
      setAuthState(null);
      setErrorMsg(null);
      return;
    }

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
  }, [isOpen, preselectedBankName, banks, step, startingAuth]);

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
              const nameMap: Record<string, string> = {};
              connAccounts.forEach((a, idx) => {
                nameMap[a.id] = a.custom_name || getCleanAccountTypeLabel(a, idx);
              });
              setAccountCustomNames(nameMap);
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

  const handleSelectBank = async (bank: BankAspsp, reconnectConnectionId?: string | null) => {
    setSelectedBank(bank);
    setStartingAuth(true);
    setErrorMsg(null);
    setShowManualCallback(false);

    try {
      const redirectUrl = `${window.location.origin}/bank/callback`;
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
        throw new Error('Kunde inte hitta verifieringskod i länken.');
      }

      const res = await bankService.exchangeCode({ code, state });
      setActiveConnection(res.connection);
      const accs = res.accounts || [];
      setFetchedAccounts(accs);
      setSelectedAccountIds(accs.map((a) => a.id));
      const nameMap: Record<string, string> = {};
      accs.forEach((a, idx) => {
        nameMap[a.id] = a.custom_name || getCleanAccountTypeLabel(a, idx);
      });
      setAccountCustomNames(nameMap);
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
    const nameMap: Record<string, string> = {};
    connAccs.forEach((a, idx) => {
      nameMap[a.id] = a.custom_name || getCleanAccountTypeLabel(a, idx);
    });
    setAccountCustomNames(nameMap);
    setStep('select-accounts');
  };

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatKr = (amount: number | null | undefined, currency = 'SEK') => {
    if (amount === null || amount === undefined) return '–';
    return `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} ${
      currency === 'SEK' ? 'kr' : currency
    }`;
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        setStep('list');
        onClose();
      }}
      contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
    >
      {/* Symmetrical Header */}
      <div className="ui-sheet-header">
        {step !== 'list' ? (
          <>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep('list');
              }}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title">
              {step === 'authorizing' ? selectedBank?.name || 'Anslut bank' : 'Välj konton'}
            </span>
          </>
        ) : (
          <span className="ui-sheet-title">
            Anslut bank
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setStep('list');
            onClose();
          }}
          className="ui-icon-btn"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4">
        {!userEmail ? (
          <div className="py-4 text-center space-y-4">
            <div className="ui-hero-icon">
              <LockKey size={26} weight="duotone" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-base text-[var(--text-primary)]">
                Logga in först
              </h4>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                Logga in på ditt konto för att ansluta och synka din bank.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="ui-btn-primary"
            >
              Logga in
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
                {connections.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="px-1 text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                      Anslutna banker
                    </span>
                    <div className="ui-sheet-group">
                      {connections.map((conn) => {
                        const validMs = conn.valid_until ? new Date(conn.valid_until).getTime() : NaN;
                        const daysLeft =
                          conn.days_until_expiry !== undefined && conn.days_until_expiry !== null
                            ? conn.days_until_expiry
                            : !Number.isNaN(validMs)
                            ? Math.ceil((validMs - Date.now()) / (24 * 60 * 60 * 1000))
                            : null;
                        const isExpired =
                          conn.status === 'expired' || (daysLeft !== null && daysLeft <= 0);
                        const isExpiringSoon =
                          !isExpired &&
                          (Boolean(conn.expiring_soon) || (daysLeft !== null && daysLeft <= 14));

                        return (
                          <div key={conn.id} className="ui-row">
                            <button
                              type="button"
                              onClick={() => handleOpenExistingAccountSelection(conn)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <ItemLogo
                                name={conn.aspsp_name}
                                logoUrl={conn.aspsp_logo || undefined}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <span className="ui-row-title">
                                  {conn.aspsp_name}
                                </span>
                                {isExpired ? (
                                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium block">
                                    Samtycket har gått ut
                                  </span>
                                ) : isExpiringSoon ? (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">
                                    Går ut om {daysLeft} d
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">
                                    Ansluten
                                  </span>
                                )}
                              </div>
                            </button>

                            <div className="flex items-center gap-2 shrink-0">
                              {(isExpired || isExpiringSoon) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSelectBank(
                                      {
                                        name: conn.aspsp_name,
                                        country: conn.aspsp_country || 'SE',
                                        logo: conn.aspsp_logo,
                                        bic: null,
                                      },
                                      conn.id
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                  Förnya
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenExistingAccountSelection(conn)}
                                className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                              >
                                <span>Konton</span>
                                <CaretRight size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search bar */}
                <div className="relative">
                  <MagnifyingGlass
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Sök bank..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
                  />
                </div>

                {/* Bank list */}
                {loadingBanks || startingAuth ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <SpinnerGap size={24} className="animate-spin text-[var(--text-primary)]" />
                    <span>
                      {startingAuth
                        ? `Ansluter till ${selectedBank?.name}...`
                        : 'Hämtar banker...'}
                    </span>
                  </div>
                ) : filteredBanks.length > 0 ? (
                  <div className="ui-sheet-group max-h-72 overflow-y-auto overflow-x-hidden">
                    {filteredBanks.map((bank) => (
                      <button
                        key={bank.name}
                        type="button"
                        onClick={() => handleSelectBank(bank)}
                        className="ui-row-btn"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {bank.logo ? (
                            <img
                              src={bank.logo}
                              alt={bank.name}
                              className="w-8 h-8 rounded-xl object-contain bg-white p-1 border border-black/5 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                              <Bank size={16} className="text-[var(--text-secondary)]" />
                            </div>
                          )}
                          <span className="ui-row-title">
                            {bank.name}
                          </span>
                        </div>
                        <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-[var(--text-muted)]">Inga banker hittades.</p>
                    <button
                      type="button"
                      onClick={() => loadBanks(environment)}
                      className="text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1 underline cursor-pointer"
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
              <div className="space-y-4">
                <div className="text-center pb-2">
                  <div className="flex justify-center mb-3.5">
                    <ItemLogo
                      name={selectedBank?.name || 'Bank'}
                      logoUrl={selectedBank?.logo}
                      size="xl"
                    />
                  </div>
                  <h4 className="font-display font-bold text-lg text-[var(--text-primary)]">
                    {selectedBank?.name}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Legitimera dig med Mobilt BankID för att hämta dina konton.
                  </p>
                </div>

                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn-primary"
                >
                  <span>Öppna {selectedBank?.name}</span>
                  <ArrowSquareOut size={15} weight="bold" />
                </a>

                {!showManualCallback ? (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualCallback(true)}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      Öppnades inloggningen i en annan flik?
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleExchangeManualCallback}
                    className="pt-3 border-t border-[var(--border-subtle)] space-y-2 animate-fade-in"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCallbackUrl}
                        onChange={(e) => setManualCallbackUrl(e.target.value)}
                        placeholder="Klistra in återkopplingslänk..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                      />
                      <button
                        type="submit"
                        disabled={exchangingCode || !manualCallbackUrl.trim()}
                        className="ui-btn-sm-primary"
                      >
                        {exchangingCode ? 'Verifierar...' : 'Slutför'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* STEP 3: SELECT ACCOUNTS & CUSTOM NAMES */}
            {step === 'select-accounts' && (
              <div className="space-y-4">
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
                  {fetchedAccounts.map((acc, idx) => {
                    const isChecked = selectedAccountIds.includes(acc.id);
                    const fallbackLabel = getCleanAccountTypeLabel(acc, idx);
                    const currentCustomName =
                      accountCustomNames[acc.id] !== undefined
                        ? accountCustomNames[acc.id]
                        : acc.custom_name || fallbackLabel;
                    const bankLabel = acc.bankName || activeConnection?.aspsp_name || 'Bank';

                    return (
                      <div
                        key={acc.id}
                        className={`rounded-2xl border overflow-hidden transition-all ${
                          isChecked
                            ? 'bg-[var(--bg-color)] border-[var(--border-subtle)]'
                            : 'bg-[var(--bg-color)]/50 border-[var(--border-subtle)] opacity-60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAccountSelection(acc.id)}
                          className="ui-row cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
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
                              <span className="ui-row-title">
                                {currentCustomName || fallbackLabel}
                              </span>
                              <span className="ui-row-subtitle">
                                {bankLabel}
                              </span>
                            </div>
                          </div>
                          <span className="ui-row-amount text-sm shrink-0">
                            {formatKr(acc.balance_amount, acc.balance_currency || acc.currency)}
                          </span>
                        </button>

                        {isChecked && (
                          <label className="ui-input-row border-t border-[var(--border-subtle)]">
                            <span className="text-[var(--text-muted)] shrink-0">Kontonamn</span>
                            <input
                              type="text"
                              value={currentCustomName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAccountCustomNames((prev) => ({ ...prev, [acc.id]: val }));
                              }}
                              placeholder={fallbackLabel}
                              className="ui-inline-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleSaveSelectedAccounts}
                  disabled={savingAccounts || selectedAccountIds.length === 0}
                  className="ui-btn-primary"
                >
                  {savingAccounts && <SpinnerGap size={15} className="animate-spin" />}
                  <span>Spara</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};
