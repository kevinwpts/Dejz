import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Card, Button, ListRow, Modal } from './ui';
import {
  bankService,
  BankConnection,
  BankAccount,
  BankTransactionItem,
} from '../services/bankService';
import { BankConnectFlowModal } from './BankConnectFlowModal';
import { formatCurrency } from '../utils/format';
import { Config } from '../types';

interface BankConnectionViewProps {
  config: Config;
  initialSubView?: 'connections' | 'transactions';
  onSubViewChange?: (subView: 'connections' | 'transactions') => void;
  pendingCallbackData?: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  } | null;
  onClearPendingCallback?: () => void;
  addToast?: (message: string, type: 'success' | 'error') => void;
}

function formatDateTimeSv(isoString: string | null | undefined): string {
  if (!isoString) return 'Aldrig';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Okänt datum';
  }
}

export function BankConnectionView({
  config,
  initialSubView = 'connections',
  onSubViewChange,
  pendingCallbackData = null,
  onClearPendingCallback,
  addToast,
}: BankConnectionViewProps) {
  const [subView, setSubView] = useState<'connections' | 'transactions'>(initialSubView);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Connect / Reconnect modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [reconnectTarget, setReconnectTarget] = useState<BankConnection | null>(null);
  const [activeCallbackData, setActiveCallbackData] = useState<typeof pendingCallbackData>(null);

  // Edit accounts modal for existing connection
  const [editingAccountsConn, setEditingAccountsConn] = useState<BankConnection | null>(null);
  const [editingAccountIds, setEditingAccountIds] = useState<string[]>([]);
  const [isSavingAccountSelection, setIsSavingAccountSelection] = useState(false);

  // Disconnect confirmation modal
  const [disconnectTarget, setDisconnectTarget] = useState<BankConnection | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Transactions view state
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'booked' | 'reserved'>('all');
  const [txAccountFilter, setTxAccountFilter] = useState<string>('all');
  const [txPage, setTxPage] = useState(1);
  const [txTotalCount, setTxTotalCount] = useState(0);
  const [txBookedCount, setTxBookedCount] = useState(0);
  const [txReservedCount, setTxReservedCount] = useState(0);
  const [txHasMorePages, setTxHasMorePages] = useState(false);
  const [accountsWithMoreHistory, setAccountsWithMoreHistory] = useState<string[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingMoreFromBank, setIsLoadingMoreFromBank] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const lang = config.language || 'sv';

  useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  const handleSwitchSubView = (next: 'connections' | 'transactions') => {
    setSubView(next);
    if (onSubViewChange) onSubViewChange(next);
  };

  const loadBankStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await bankService.getStatus();
      setConnections(res.connections || []);
      setAccounts(res.accounts || []);
    } catch (err: any) {
      setStatusError(err?.message || 'Kunde inte hämta dina bankkopplingar.');
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadBankStatus();
  }, [loadBankStatus]);

  // Open callback flow automatically if redirected back to Settings with pending callback
  useEffect(() => {
    if (pendingCallbackData && (pendingCallbackData.code || pendingCallbackData.error)) {
      setActiveCallbackData(pendingCallbackData);
      setIsConnectModalOpen(true);
      if (onClearPendingCallback) {
        onClearPendingCallback();
      }
    }
  }, [pendingCallbackData, onClearPendingCallback]);

  const loadTransactions = useCallback(
    async (pageToLoad = 1) => {
      setIsLoadingTransactions(true);
      setTxError(null);
      try {
        const res = await bankService.listTransactions({
          bankAccountId: txAccountFilter === 'all' ? null : txAccountFilter,
          statusFilter: txStatusFilter,
          page: pageToLoad,
          pageSize: 30,
        });
        setTransactions(res.transactions || []);
        setTxTotalCount(res.totalCount || 0);
        setTxBookedCount(res.bookedCount || 0);
        setTxReservedCount(res.reservedCount || 0);
        setTxPage(res.page || pageToLoad);
        setTxHasMorePages(Boolean(res.hasMorePages));
        setAccountsWithMoreHistory(res.accountsWithMoreHistory || []);
      } catch (err: any) {
        setTxError(err?.message || 'Kunde inte hämta banktransaktioner.');
      } finally {
        setIsLoadingTransactions(false);
      }
    },
    [txAccountFilter, txStatusFilter]
  );

  useEffect(() => {
    if (subView === 'transactions') {
      loadTransactions(1);
    }
  }, [subView, txAccountFilter, txStatusFilter, loadTransactions]);

  const handleSyncAll = async (connectionId?: string) => {
    setIsSyncing(true);
    setStatusError(null);
    try {
      const res = await bankService.sync({ connectionId });
      setConnections(res.connections || []);
      setAccounts(res.accounts || []);

      if (res.syncErrors && res.syncErrors.length > 0) {
        setStatusError(res.syncErrors.join(' • '));
        if (addToast) addToast(res.syncErrors[0], 'error');
      } else {
        if (addToast) addToast('Bankuppgifter uppdaterade', 'success');
      }

      if (subView === 'transactions') {
        await loadTransactions(1);
      }
    } catch (err: any) {
      const msg = err?.message || 'Kunde inte uppdatera från banken.';
      setStatusError(msg);
      if (addToast) addToast(msg, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadOlderFromBank = async () => {
    if (accountsWithMoreHistory.length === 0) return;
    setIsLoadingMoreFromBank(true);
    setTxError(null);
    try {
      await bankService.sync({
        bankAccountId: accountsWithMoreHistory[0],
        loadMore: true,
      });
      await loadTransactions(txPage);
      if (addToast) addToast('Äldre transaktioner hämtades från banken', 'success');
    } catch (err: any) {
      setTxError(err?.message || 'Kunde inte hämta fler transaktioner från banken.');
    } finally {
      setIsLoadingMoreFromBank(false);
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectTarget) return;
    setIsDisconnecting(true);
    try {
      await bankService.disconnect(disconnectTarget.id);
      setDisconnectTarget(null);
      await loadBankStatus();
      if (addToast) {
        addToast(
          `${disconnectTarget.aspsp_name} har kopplats från och åtkomsten har återkallats.`,
          'success'
        );
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err?.message || 'Kunde inte koppla från banken.', 'error');
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSaveEditedAccounts = async () => {
    if (!editingAccountsConn) return;
    setIsSavingAccountSelection(true);
    try {
      await bankService.selectAccounts({
        connectionId: editingAccountsConn.id,
        selectedAccountIds: editingAccountIds,
      });
      setEditingAccountsConn(null);
      await loadBankStatus();
      if (addToast) addToast('Valda konton uppdaterades', 'success');
    } catch (err: any) {
      if (addToast) addToast(err?.message || 'Kunde inte spara kontoval', 'error');
    } finally {
      setIsSavingAccountSelection(false);
    }
  };

  const selectedAccounts = accounts.filter((a) => a.is_selected);

  // ---------------------------------------------------------------------------
  // SUBVIEW: BANKTRANSAKTIONER
  // ---------------------------------------------------------------------------
  if (subView === 'transactions') {
    return (
      <div className="space-y-4 w-full pb-10 font-sans">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleSwitchSubView('connections')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer py-1"
          >
            <ChevronLeft size={16} />
            <span>Tillbaka till Bankkoppling</span>
          </button>

          <Button
            variant="tonal"
            size="sm"
            onClick={() => handleSyncAll()}
            disabled={isSyncing || selectedAccounts.length === 0}
            icon={
              <RefreshCw
                size={14}
                className={isSyncing ? 'animate-spin' : ''}
              />
            }
          >
            {isSyncing ? 'Uppdaterar...' : 'Uppdatera'}
          </Button>
        </div>

        {/* Isolation Notice */}
        <Card variant="default" padding="md" className="bg-[var(--surface-color)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-[var(--text-primary)]">
                Separat vy för banktransaktioner
              </p>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Transaktioner här hämtas direkt från dina valda bankkonton och påverkar inte din manuella budget eller ”Kvar att spendera”.
              </p>
            </div>
          </div>
        </Card>

        {/* Account Filter & Status Tabs (Bokförda vs Reserverade) */}
        <div className="space-y-2.5">
          {selectedAccounts.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => {
                  setTxAccountFilter('all');
                  setTxPage(1);
                }}
                className={`px-3 py-1.5 rounded-btn-sm text-xs font-bold shrink-0 border transition-colors cursor-pointer ${
                  txAccountFilter === 'all'
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)]'
                    : 'bg-[var(--surface-color)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}
              >
                Alla valda konton ({selectedAccounts.length})
              </button>
              {selectedAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setTxAccountFilter(acc.id);
                    setTxPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-btn-sm text-xs font-bold shrink-0 border transition-colors cursor-pointer ${
                    txAccountFilter === acc.id
                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)]'
                      : 'bg-[var(--surface-color)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-color)] rounded-card border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                setTxStatusFilter('all');
                setTxPage(1);
              }}
              className={`py-2 px-2 rounded-btn-sm text-xs font-bold transition-all cursor-pointer ${
                txStatusFilter === 'all'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Alla ({txBookedCount + txReservedCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setTxStatusFilter('booked');
                setTxPage(1);
              }}
              className={`py-2 px-2 rounded-btn-sm text-xs font-bold transition-all cursor-pointer ${
                txStatusFilter === 'booked'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Bokförda ({txBookedCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setTxStatusFilter('reserved');
                setTxPage(1);
              }}
              className={`py-2 px-2 rounded-btn-sm text-xs font-bold transition-all cursor-pointer ${
                txStatusFilter === 'reserved'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Reserverade ({txReservedCount})
            </button>
          </div>
        </div>

        {/* Error State */}
        {txError && (
          <Card
            variant="default"
            padding="md"
            className="border border-[var(--danger-color)]/30 bg-[var(--danger-container)]/20"
          >
            <div className="flex items-start gap-2.5 text-xs text-[var(--danger-color)]">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p className="font-bold">Kunde inte ladda banktransaktioner</p>
                <p>{txError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadTransactions(txPage)}
                >
                  Försök igen
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoadingTransactions ? (
          <Card variant="default" padding="lg" className="py-12">
            <div className="flex flex-col items-center justify-center gap-2.5 text-[var(--text-secondary)]">
              <Loader2 size={22} className="animate-spin text-[var(--accent-color)]" />
              <span className="text-xs font-medium">Laddar banktransaktioner...</span>
            </div>
          </Card>
        ) : selectedAccounts.length === 0 ? (
          <Card variant="default" padding="lg" className="py-10 text-center space-y-3">
            <SlidersHorizontal size={24} className="mx-auto text-[var(--text-tertiary)]" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Inga valda bankkonton
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                Koppla en bank och välj minst ett konto under Bankkoppling för att se dina banktransaktioner.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSwitchSubView('connections')}
            >
              Gå till Bankkoppling
            </Button>
          </Card>
        ) : transactions.length === 0 ? (
          /* Empty State */
          <Card variant="default" padding="lg" className="py-10 text-center space-y-2">
            <Clock size={22} className="mx-auto text-[var(--text-tertiary)]" />
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Inga transaktioner att visa
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              {txStatusFilter === 'reserved'
                ? 'Det finns inga reserverade (pågående) transaktioner för tillfället.'
                : txStatusFilter === 'booked'
                ? 'Inga bokförda transaktioner hittades för det valda filtret.'
                : 'Inga banktransaktioner har hämtats ännu. Tryck på Uppdatera för att synkronisera.'}
            </p>
          </Card>
        ) : (
          /* Transactions List */
          <Card variant="default" padding="none" className="divide-y divide-menu">
            {transactions.map((tx) => {
              const isReserved =
                tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD';
              const accountObj = accounts.find((a) => a.id === tx.bank_account_id);
              const displayDate =
                tx.booking_date ||
                tx.transaction_date ||
                tx.value_date ||
                tx.created_at.split('T')[0];
              const isPositive = Number(tx.amount) > 0;

              return (
                <div
                  key={tx.id}
                  className="p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {tx.description}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                          isReserved
                            ? 'bg-[var(--warning-color)]/15 text-[var(--warning-color)]'
                            : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {isReserved ? 'Reserverad' : 'Bokförd'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span>{displayDate}</span>
                      {accountObj && (
                        <>
                          <span>•</span>
                          <span className="truncate">{accountObj.name}</span>
                        </>
                      )}
                      {tx.counterparty_name &&
                        tx.counterparty_name !== tx.description && (
                          <>
                            <span>•</span>
                            <span className="truncate">{tx.counterparty_name}</span>
                          </>
                        )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-extrabold font-amount tabular-nums ${
                        isPositive
                          ? 'text-[var(--success-color)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatCurrency(
                        Number(tx.amount),
                        tx.currency || config.currency || 'SEK',
                        lang
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {/* Pagination Controls */}
        {(txPage > 1 || txHasMorePages || accountsWithMoreHistory.length > 0) && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <Button
                variant="secondary"
                size="sm"
                disabled={txPage <= 1 || isLoadingTransactions}
                onClick={() => loadTransactions(txPage - 1)}
                icon={<ChevronLeft size={14} />}
              >
                Föregående
              </Button>
              <span className="text-xs font-semibold text-[var(--text-secondary)] px-2">
                Sida {txPage} ({txTotalCount} st)
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!txHasMorePages || isLoadingTransactions}
                onClick={() => loadTransactions(txPage + 1)}
              >
                Nästa
              </Button>
            </div>

            {accountsWithMoreHistory.length > 0 && (
              <Button
                variant="tonal"
                size="sm"
                disabled={isLoadingMoreFromBank}
                onClick={handleLoadOlderFromBank}
                icon={
                  isLoadingMoreFromBank ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )
                }
              >
                {isLoadingMoreFromBank
                  ? 'Hämtar från bank...'
                  : 'Hämta äldre från banken'}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SUBVIEW: BANKKOPPLING (MAIN SETTINGS VIEW)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-5 w-full pb-12 font-sans">
      {/* Header Action Card */}
      <Card variant="default" padding="md" className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-card-title font-bold text-[var(--text-primary)]">
                Anslutna banker & konton
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                Restricted
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Hämta konton, saldon och transaktioner via Enable Banking. Bankens saldo ersätter inte ”Kvar att spendera”.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setReconnectTarget(null);
              setActiveCallbackData(null);
              setIsConnectModalOpen(true);
            }}
            icon={<Plus size={15} />}
          >
            Koppla bank
          </Button>

          {connections.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isSyncing}
              onClick={() => handleSyncAll()}
              icon={
                <RefreshCw
                  size={14}
                  className={isSyncing ? 'animate-spin' : ''}
                />
              }
            >
              {isSyncing ? 'Uppdaterar...' : 'Uppdatera'}
            </Button>
          )}

          {selectedAccounts.length > 0 && (
            <Button
              variant="tonal"
              size="sm"
              onClick={() => handleSwitchSubView('transactions')}
              icon={<ArrowRight size={14} />}
            >
              Banktransaktioner
            </Button>
          )}
        </div>
      </Card>

      {statusError && (
        <Card
          variant="default"
          padding="md"
          className="border border-[var(--danger-color)]/30 bg-[var(--danger-container)]/20"
        >
          <div className="flex items-start gap-2.5 text-xs text-[var(--danger-color)]">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold">Meddelande vid synkronisering</p>
              <p>{statusError}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Connections List */}
      {isLoadingStatus ? (
        <Card variant="default" padding="lg" className="py-12">
          <div className="flex flex-col items-center justify-center gap-2.5 text-[var(--text-secondary)]">
            <Loader2 size={22} className="animate-spin text-[var(--accent-color)]" />
            <span className="text-xs font-medium">Läser in bankkopplingar...</span>
          </div>
        </Card>
      ) : connections.length === 0 ? (
        <Card variant="default" padding="lg" className="py-10 text-center space-y-3">
          <div className="w-11 h-11 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] flex items-center justify-center mx-auto">
            <Building2 size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Ingen bank kopplad ännu
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Koppla din bank för att se dina konton, saldon och bokförda samt reserverade transaktioner direkt i Dejz.
            </p>
          </div>
          <div className="pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setReconnectTarget(null);
                setActiveCallbackData(null);
                setIsConnectModalOpen(true);
              }}
              icon={<Plus size={15} />}
            >
              Koppla bank
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => {
            const connAccounts = accounts.filter(
              (a) => a.connection_id === conn.id
            );
            const chosenAccounts = connAccounts.filter((a) => a.is_selected);
            const isExpired =
              conn.status === 'expired' ||
              (conn.valid_until &&
                new Date(conn.valid_until).getTime() <= Date.now());

            return (
              <Card
                key={conn.id}
                variant="default"
                padding="none"
                className="overflow-hidden divide-y divide-menu"
              >
                {/* Bank Connection Header */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden shrink-0">
                      {conn.aspsp_logo ? (
                        <img
                          src={conn.aspsp_logo}
                          alt={conn.aspsp_name}
                          className="w-6 h-6 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Building2 size={18} className="text-[var(--text-secondary)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          {conn.aspsp_name}
                        </h4>
                        {conn.environment === 'sandbox' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                            Sandbox
                          </span>
                        )}
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--warning-color)]/15 text-[var(--warning-color)]">
                            <AlertCircle size={11} />
                            Samtycke utgånget
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--success-container)] text-[var(--success-color)]">
                            <CheckCircle2 size={11} />
                            Aktiv
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Senast hämtat: {formatDateTimeSv(conn.last_synced_at)}
                      </p>
                      {conn.valid_until && (
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          Samtycke giltigt till:{' '}
                          {new Date(conn.valid_until).toLocaleDateString('sv-SE')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSyncAll(conn.id)}
                      disabled={isSyncing || isExpired}
                      title="Uppdatera"
                    >
                      <RefreshCw
                        size={15}
                        className={isSyncing ? 'animate-spin' : ''}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDisconnectTarget(conn)}
                      className="text-[var(--danger-color)]"
                      title="Koppla från"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                {/* Expired Consent Call-To-Action */}
                {(isExpired || conn.last_error) && (
                  <div className="p-3.5 bg-[var(--warning-color)]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2 text-xs text-[var(--text-primary)]">
                      <AlertCircle
                        size={16}
                        className="text-[var(--warning-color)] shrink-0 mt-0.5"
                      />
                      <span>
                        {conn.last_error ||
                          'Samtycket för bankåtkomst har gått ut. Förnya åtkomsten för att fortsätta hämta saldon och transaktioner.'}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setReconnectTarget(conn);
                        setActiveCallbackData(null);
                        setIsConnectModalOpen(true);
                      }}
                    >
                      Förnya åtkomst
                    </Button>
                  </div>
                )}

                {/* Selected Accounts List */}
                {chosenAccounts.length === 0 ? (
                  <div className="p-4 text-xs text-[var(--text-secondary)] flex items-center justify-between">
                    <span>Inga konton valda för denna bankkoppling.</span>
                    {connAccounts.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingAccountsConn(conn);
                          setEditingAccountIds(
                            connAccounts.filter((a) => a.is_selected).map((a) => a.id)
                          );
                        }}
                      >
                        Välj konton ({connAccounts.length})
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-subtle">
                    {chosenAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                            <Wallet size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {acc.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] font-mono truncate">
                              {acc.bban || acc.iban || acc.provider_account_uid}
                            </p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              Senast hämtat: {formatDateTimeSv(acc.last_synced_at)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
                            {acc.balance_amount !== null
                              ? formatCurrency(
                                  Number(acc.balance_amount),
                                  acc.balance_currency || acc.currency || 'SEK',
                                  lang
                                )
                              : '—'}
                          </p>
                          <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                            {acc.balance_label || 'Bokfört saldo'}{' '}
                            {acc.balance_currency || acc.currency
                              ? `(${acc.balance_currency || acc.currency})`
                              : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connection Footer Actions */}
                <div className="px-4 py-2.5 bg-[var(--surface-muted)]/50 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccountsConn(conn);
                      setEditingAccountIds(
                        connAccounts.filter((a) => a.is_selected).map((a) => a.id)
                      );
                    }}
                    className="font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Hantera valda konton ({chosenAccounts.length}/{connAccounts.length})
                  </button>

                  <div className="flex items-center gap-3">
                    {!isExpired && (
                      <button
                        type="button"
                        onClick={() => {
                          setReconnectTarget(conn);
                          setActiveCallbackData(null);
                          setIsConnectModalOpen(true);
                        }}
                        className="font-semibold text-[var(--accent-color)] hover:underline cursor-pointer"
                      >
                        Förnya åtkomst
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDisconnectTarget(conn)}
                      className="font-semibold text-[var(--danger-color)] hover:underline cursor-pointer"
                    >
                      Koppla från
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Entry row to Banktransaktioner */}
          <Card variant="default" padding="none">
            <ListRow
              variant="grouped"
              showChevron
              icon={<Clock size={18} strokeWidth={2} />}
              title="Banktransaktioner"
              subtitle="Visa bokförda och reserverade transaktioner från dina valda konton"
              onClick={() => handleSwitchSubView('transactions')}
            />
          </Card>
        </div>
      )}

      {/* Connect / Reconnect Flow Modal */}
      <BankConnectFlowModal
        isOpen={isConnectModalOpen}
        onClose={() => {
          setIsConnectModalOpen(false);
          setReconnectTarget(null);
          setActiveCallbackData(null);
        }}
        originContext="settings"
        initialCallbackData={activeCallbackData}
        reconnectConnection={reconnectTarget}
        language={lang}
        onCompleted={async () => {
          setIsConnectModalOpen(false);
          setReconnectTarget(null);
          setActiveCallbackData(null);
          await loadBankStatus();
          if (addToast) {
            addToast('Bankkonton kopplade och uppdaterade', 'success');
          }
        }}
      />

      {/* Manage Selected Accounts Modal */}
      {editingAccountsConn && (
        <Modal
          isOpen={Boolean(editingAccountsConn)}
          onClose={() => setEditingAccountsConn(null)}
          title={`Välj konton (${editingAccountsConn.aspsp_name})`}
          size="sm"
          bodyClassName="p-4 space-y-4"
        >
          <div className="divide-y divide-subtle border border-[var(--border-color)] rounded-card bg-[var(--surface-color)] max-h-[280px] overflow-y-auto">
            {accounts
              .filter((a) => a.connection_id === editingAccountsConn.id)
              .map((acc) => {
                const isChecked = editingAccountIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() =>
                      setEditingAccountIds((prev) =>
                        prev.includes(acc.id)
                          ? prev.filter((id) => id !== acc.id)
                          : [...prev, acc.id]
                      )
                    }
                    className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-muted)] cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {acc.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono truncate">
                        {acc.bban || acc.iban || acc.provider_account_uid}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="h-4 w-4 accent-[var(--accent-color)]"
                    />
                  </button>
                );
              })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setEditingAccountsConn(null)}
            >
              Avbryt
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={isSavingAccountSelection}
              onClick={handleSaveEditedAccounts}
            >
              {isSavingAccountSelection ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectTarget && (
        <Modal
          isOpen={Boolean(disconnectTarget)}
          onClose={() => setDisconnectTarget(null)}
          title={`Koppla från ${disconnectTarget.aspsp_name}?`}
          size="sm"
          center
          bodyClassName="p-5 space-y-4"
        >
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            När du kopplar från {disconnectTarget.aspsp_name} återkallas samtycket hos Enable Banking, framtida synkronisering stoppas och hämtade bankkonton samt banktransaktioner tas bort från Dejz. Din vanliga budget påverkas inte.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="danger"
              fullWidth
              disabled={isDisconnecting}
              onClick={handleDisconnectConfirm}
            >
              {isDisconnecting ? 'Kopplar från...' : 'Koppla från bank'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              disabled={isDisconnecting}
              onClick={() => setDisconnectTarget(null)}
            >
              Avbryt
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
