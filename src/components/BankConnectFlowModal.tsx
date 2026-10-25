import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Check, AlertCircle, Loader2, RefreshCw, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { Modal, Button, Input } from './ui';
import {
  bankService,
  BankAspsp,
  BankAccount,
  BankConnection,
  BankEnvironment,
} from '../services/bankService';
import { formatCurrency } from '../utils/format';
import { saveBankRedirectOrigin } from '../utils/bankFeatureFlag';
import {
  getBankAccountTitle,
  formatBankAccountNumber,
  formatCleanBalanceLabel,
  isLikelySavingsAccount,
} from '../utils/bankHistoryAnalyzer';

interface BankConnectFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  originContext: 'onboarding' | 'settings';
  returnStep?: string | null;
  onBeforeRedirect?: () => void;
  onCompleted: (accounts: BankAccount[], connection?: BankConnection) => void;
  onSkipOrContinueWithoutBank?: () => void;
  initialCallbackData?: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  } | null;
  reconnectConnection?: BankConnection | null;
  language?: string;
}

type FlowStage =
  | 'pick-bank'
  | 'redirecting'
  | 'exchanging-callback'
  | 'pick-accounts'
  | 'error';

export function BankConnectFlowModal({
  isOpen,
  onClose,
  originContext,
  returnStep = null,
  onBeforeRedirect,
  onCompleted,
  onSkipOrContinueWithoutBank,
  initialCallbackData = null,
  reconnectConnection = null,
  language = 'sv',
}: BankConnectFlowModalProps) {
  const [stage, setStage] = useState<FlowStage>('pick-bank');
  const [environment, setEnvironment] = useState<BankEnvironment>(
    reconnectConnection?.environment || 'production'
  );
  const [banks, setBanks] = useState<BankAspsp[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankAspsp | null>(null);

  const [connection, setConnection] = useState<BankConnection | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isSavingAccounts, setIsSavingAccounts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCallbackUrl, setManualCallbackUrl] = useState('');
  const [showManualCallbackInput, setShowManualCallbackInput] = useState(false);

  const executeCodeExchange = (code: string, state: string) => {
    setStage('exchanging-callback');
    setErrorMessage(null);

    bankService
      .exchangeCode({ code, state })
      .then((res) => {
        setConnection(res.connection);
        const accs = res.accounts || [];
        setAvailableAccounts(accs);
        const nonSavings = accs.filter((a) => !isLikelySavingsAccount(a)).map((a) => a.id);
        setSelectedAccountIds(
          nonSavings.length > 0 ? nonSavings : accs.map((a) => a.id)
        );
        setStage('pick-accounts');
      })
      .catch((err: any) => {
        setErrorMessage(
          err?.message ||
            'Kunde inte slutföra bankanslutningen. Försök igen eller fortsätt utan bank.'
        );
        setStage('error');
      });
  };

  const handleManualCallbackSubmit = () => {
    const raw = manualCallbackUrl.trim();
    if (!raw) return;
    try {
      const urlObj = raw.startsWith('http')
        ? new URL(raw)
        : new URL(raw.startsWith('?') ? `https://dejz.se/bank/callback${raw}` : `https://dejz.se/${raw}`);
      const code = urlObj.searchParams.get('code')?.trim();
      const state = urlObj.searchParams.get('state')?.trim();
      const errParam = urlObj.searchParams.get('error')?.trim();
      const errDesc = urlObj.searchParams.get('error_description')?.trim();

      if (errParam) {
        setErrorMessage(errDesc || `Banken rapporterade ett fel (${errParam}).`);
        setStage('error');
        return;
      }

      if (!code || !state) {
        setErrorMessage('Adressen saknar "code=" eller "state=". Kopiera hela adressen från webbläsarens adressfält efter BankID-inloggningen.');
        return;
      }

      setManualCallbackUrl('');
      setShowManualCallbackInput(false);
      executeCodeExchange(code, state);
    } catch {
      setErrorMessage('Ogiltig adress. Kopiera hela URL:en som börjar med https://dejz.se/bank/callback?...');
    }
  };

  // Handle callback exchange if opened from /bank/callback
  useEffect(() => {
    if (!isOpen) return;

    if (initialCallbackData) {
      if (initialCallbackData.error) {
        const desc =
          initialCallbackData.errorDescription ||
          (initialCallbackData.error === 'access_denied'
            ? 'Bankinloggningen avbröts eller nekades hos banken.'
            : `Banken rapporterade ett fel (${initialCallbackData.error}).`);
        setErrorMessage(desc);
        setStage('error');
        return;
      }

      if (initialCallbackData.code && initialCallbackData.state) {
        executeCodeExchange(initialCallbackData.code, initialCallbackData.state);
        return;
      }
    }

    // If reconnecting an existing bank connection directly
    if (reconnectConnection) {
      setEnvironment(reconnectConnection.environment || 'production');
      setSelectedBank({
        name: reconnectConnection.aspsp_name,
        country: reconnectConnection.aspsp_country || 'SE',
        logo: reconnectConnection.aspsp_logo,
        bic: null,
      });
    }

    setStage('pick-bank');
  }, [isOpen, initialCallbackData, reconnectConnection]);

  // Fetch list of banks when in pick-bank stage
  useEffect(() => {
    if (!isOpen || stage !== 'pick-bank') return;

    let cancelled = false;
    setIsLoadingBanks(true);
    setErrorMessage(null);

    bankService
      .listBanks('SE', environment)
      .then((list) => {
        if (cancelled) return;
        setBanks(list);
        if (reconnectConnection) {
          const match = list.find(
            (b) =>
              b.name.toLowerCase() ===
              reconnectConnection.aspsp_name.toLowerCase()
          );
          if (match) setSelectedBank(match);
        } else if (!selectedBank && list.length > 0) {
          const seb = list.find((b) => b.name.toLowerCase().includes('seb'));
          if (seb) setSelectedBank(seb);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setErrorMessage(
          err?.message || 'Kunde inte hämta banklistan från Enable Banking.'
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBanks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, stage, environment]);

  const filteredBanks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, searchQuery]);

  const handleStartBankRedirect = async (bankToUse?: BankAspsp) => {
    const targetBank = bankToUse || selectedBank;
    if (!targetBank) return;

    try {
      setStage('redirecting');
      setErrorMessage(null);

      // Save onboarding progress or origin metadata before redirecting away
      if (onBeforeRedirect) {
        onBeforeRedirect();
      }
      saveBankRedirectOrigin({
        originContext,
        returnStep,
        aspspName: targetBank.name,
        startedAt: Date.now(),
      });

      const authRes = await bankService.startAuth({
        aspspName: targetBank.name,
        aspspCountry: targetBank.country || 'SE',
        aspspLogo: targetBank.logo,
        originContext,
        returnStep,
        environment,
        reconnectConnectionId: reconnectConnection?.id || null,
      });

      // Redirect browser to bank authentication flow
      window.location.assign(authRes.url);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Kunde inte starta autentisering mot banken.'
      );
      setStage('error');
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleConfirmAccounts = async () => {
    if (!connection) return;
    if (selectedAccountIds.length === 0) {
      setErrorMessage('Välj minst ett konto att koppla.');
      return;
    }

    try {
      setIsSavingAccounts(true);
      setErrorMessage(null);
      const res = await bankService.selectAccounts({
        connectionId: connection.id,
        selectedAccountIds,
      });
      onCompleted(res.accounts || [], connection);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Kunde inte spara dina valda konton. Försök igen.'
      );
    } finally {
      setIsSavingAccounts(false);
    }
  };

  const modalTitle =
    stage === 'pick-accounts'
      ? 'Välj konton att koppla'
      : stage === 'exchanging-callback'
      ? 'Verifierar bankkoppling'
      : stage === 'redirecting'
      ? 'Öppnar din bank'
      : stage === 'error'
      ? 'Anslutningen avbröts'
      : reconnectConnection
      ? `Förnya åtkomst (${reconnectConnection.aspsp_name})`
      : 'Välj din bank';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="md"
      showCloseButton={stage !== 'redirecting' && stage !== 'exchanging-callback'}
      bodyClassName="p-4 sm:p-5 space-y-4"
    >
      {/* STAGE 1: PICK BANK */}
      {stage === 'pick-bank' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-muted)] px-3 py-2 rounded-card-nested">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-[var(--accent-color)] shrink-0" />
              <span>Säker anslutning via Enable Banking (PSD2)</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  environment === 'production'
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Produktion
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('sandbox')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  environment === 'sandbox'
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Sandbox
              </button>
            </div>
          </div>

          <Input
            variant="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Sök bank (t.ex. SEB)"
          />

          {errorMessage && (
            <div className="p-3 rounded-card-nested bg-[var(--danger-container)]/50 border border-[var(--danger-color)]/30 text-xs text-[var(--danger-color)] flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="font-medium">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    setStage('pick-bank');
                    setIsLoadingBanks(true);
                    bankService
                      .listBanks('SE', environment)
                      .then(setBanks)
                      .catch((e) => setErrorMessage(e?.message || 'Fel vid hämtning'))
                      .finally(() => setIsLoadingBanks(false));
                  }}
                  className="inline-flex items-center gap-1 font-bold underline cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Försök hämta banklistan igen</span>
                </button>
              </div>
            </div>
          )}

          {isLoadingBanks ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-[var(--text-secondary)]">
              <Loader2 size={22} className="animate-spin text-[var(--accent-color)]" />
              <span className="text-xs font-medium">Hämtar tillgängliga banker...</span>
            </div>
          ) : filteredBanks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-muted)] rounded-card-nested">
              Inga banker matchade din sökning.
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto divide-y divide-subtle border border-[var(--border-color)] rounded-card bg-[var(--surface-color)]">
              {filteredBanks.map((bank) => {
                const isSelected = selectedBank?.name === bank.name;
                return (
                  <button
                    key={`${bank.country}_${bank.name}`}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-color)]/8'
                        : 'hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden shrink-0">
                        {bank.logo ? (
                          <img
                            src={bank.logo}
                            alt={bank.name}
                            className="w-5 h-5 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Building2 size={15} className="text-[var(--text-secondary)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {bank.name}
                        </p>
                        {bank.bic && (
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {bank.bic}
                          </p>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--text-on-accent)]'
                          : 'border-[var(--border-color)]'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={2.5} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="primary"
              fullWidth
              disabled={!selectedBank || isLoadingBanks}
              onClick={() => handleStartBankRedirect()}
              icon={<ExternalLink size={15} />}
            >
              {selectedBank
                ? `Fortsätt till ${selectedBank.name}`
                : 'Välj en bank ovan'}
            </Button>

            {onSkipOrContinueWithoutBank && (
              <Button
                variant="ghost"
                fullWidth
                onClick={onSkipOrContinueWithoutBank}
              >
                Fortsätt utan bank
              </Button>
            )}
          </div>

          {/* Helper for test environment when Enable Banking redirects to dejz.se/bank/callback */}
          <div className="pt-2 border-t border-[var(--border-color)]/60">
            {!showManualCallbackInput ? (
              <button
                type="button"
                onClick={() => setShowManualCallbackInput(true)}
                className="w-full text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-center cursor-pointer py-1"
              >
                Hamnade du på dejz.se/bank/callback efter BankID? Klistra in länken här
              </button>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Om du testkör i förhandsgranskningen och skickades till{' '}
                  <span className="font-mono text-[var(--text-primary)]">dejz.se/bank/callback?code=...</span>, kopiera adressen från webbläsarens adressfält och klistra in nedan:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualCallbackUrl}
                    onChange={(e) => setManualCallbackUrl(e.target.value)}
                    placeholder="https://dejz.se/bank/callback?code=..."
                    className="flex-1 bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-input px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!manualCallbackUrl.trim()}
                    onClick={handleManualCallbackSubmit}
                  >
                    Slutför
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: REDIRECTING TO BANK */}
      {stage === 'redirecting' && (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[var(--accent-color)]" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Omdirigerar till {selectedBank?.name || 'din bank'}...
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              Godkänn åtkomsten i bankens autentiseringsflöde. Du skickas automatiskt tillbaka till Dejz efteråt.
            </p>
          </div>
        </div>
      )}

      {/* STAGE 3: EXCHANGING CALLBACK CODE */}
      {stage === 'exchanging-callback' && (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[var(--accent-color)]" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Hämtar dina konton från banken...
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              Verifierar säkerhetstillstånd och läser in tillgängliga konton och saldon.
            </p>
          </div>
        </div>
      )}

      {/* STAGE 4: PICK ACCOUNTS */}
      {stage === 'pick-accounts' && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Välj vilka av dina tillgängliga konton hos{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {connection?.aspsp_name || 'banken'}
            </span>{' '}
            som ska visas i Dejz. Ditt ”Kvar att spendera” ändras inte automatiskt.
          </p>

          {errorMessage && (
            <div className="p-3 rounded-card-nested bg-[var(--danger-container)]/50 border border-[var(--danger-color)]/30 text-xs text-[var(--danger-color)] flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {availableAccounts.length === 0 ? (
            <div className="p-6 text-center rounded-card-nested bg-[var(--surface-muted)] text-xs text-[var(--text-secondary)]">
              Banken returnerade inga tillgängliga konton för denna anslutning.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto divide-y divide-subtle border border-[var(--border-color)] rounded-card bg-[var(--surface-color)]">
              {availableAccounts.map((acc) => {
                const isSelected = selectedAccountIds.includes(acc.id);
                const isSavings = isLikelySavingsAccount(acc);
                const accountTitle = getBankAccountTitle(acc);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => toggleAccountSelection(acc.id)}
                    className={`w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-color)]/8'
                        : 'hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {accountTitle}
                        </p>
                        {isSavings && (
                          <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                            · Sparkonto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-mono truncate">
                        {formatBankAccountNumber(acc.bban || acc.iban || acc.provider_account_uid)}
                      </p>
                      {acc.balance_amount !== null && (
                        <p className="text-xs font-semibold text-[var(--text-primary)] pt-0.5">
                          {formatCurrency(
                            acc.balance_amount,
                            acc.balance_currency || acc.currency || 'SEK',
                            language
                          )}{' '}
                          <span className="text-[11px] font-normal text-[var(--text-secondary)]">
                            · {formatCleanBalanceLabel(acc.balance_label)}
                          </span>
                        </p>
                      )}
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--text-on-accent)]'
                          : 'border-[var(--border-color)]'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={2.5} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="primary"
              fullWidth
              disabled={isSavingAccounts || availableAccounts.length === 0}
              onClick={handleConfirmAccounts}
              icon={
                isSavingAccounts ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ArrowRight size={15} />
                )
              }
            >
              {isSavingAccounts
                ? 'Sparar och synkroniserar...'
                : `Spara valda konton (${selectedAccountIds.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 5: ERROR / CANCELLED */}
      {stage === 'error' && (
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-card bg-[var(--surface-muted)] border border-[var(--border-color)] space-y-2 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--danger-container)]/60 text-[var(--danger-color)] flex items-center justify-center mx-auto">
              <AlertCircle size={20} />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Kunde inte slutföra bankkopplingen
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {errorMessage ||
                'Bankautentiseringen avbröts eller misslyckades. Du kan försöka igen eller fortsätta utan bank.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setErrorMessage(null);
                setStage('pick-bank');
              }}
              icon={<RefreshCw size={15} />}
            >
              Försök igen
            </Button>

            {onSkipOrContinueWithoutBank ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={onSkipOrContinueWithoutBank}
              >
                Fortsätt utan bank
              </Button>
            ) : (
              <Button variant="ghost" fullWidth onClick={onClose}>
                Stäng
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
