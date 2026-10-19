import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Plus, Check, ArrowDownLeft, ArrowUpRight, Trash2, CheckCircle2, HandCoins, X, User } from 'lucide-react';
import { Config, Debt } from '../types';
import { formatAmount, parseAmount } from '../utils/format';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { formatShortDate } from '../utils/date';
import { Card, Button, IconButton, FilterButtonGroup, EmptyState } from './ui';
import { ConfirmModal } from './ConfirmModal';
import { feedback } from '../utils/feedback';

interface DebtsViewProps {
  onBack: () => void;
  config: Config;
  setConfig: (config: Config) => void;
}

export function DebtsView({ config, setConfig }: DebtsViewProps) {
  const curr = config.currency || 'kr';
  const isEn = config.language === 'en';
  const dragControls = useDragControls();

  const [activeTab, setActiveTab] = useState<'all' | 'owe_me' | 'i_owe' | 'settled'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  // Form State
  const [debtType, setDebtType] = useState<'owe_me' | 'i_owe'>('owe_me');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);
  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const debts: Debt[] = config.debts || [];

  // Totals for active unsettled debts
  const totalOweMe = debts
    .filter((d) => d.type === 'owe_me' && !d.isSettled)
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const totalIOwe = debts
    .filter((d) => d.type === 'i_owe' && !d.isSettled)
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const filteredDebts = debts.filter((d) => {
    if (activeTab === 'settled') return d.isSettled;
    if (d.isSettled) return false;
    if (activeTab === 'owe_me') return d.type === 'owe_me';
    if (activeTab === 'i_owe') return d.type === 'i_owe';
    return true;
  });

  const openAddModal = () => {
    setEditingDebt(null);
    setDebtType('owe_me');
    setPersonName('');
    setAmount('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtType(debt.type);
    setPersonName(debt.personName);
    setAmount(formatAmount(debt.amount, config.language));
    setDescription(debt.description || '');
    setIsModalOpen(true);
  };

  const handleSaveDebt = () => {
    const parsedAmount = parseAmount(amount);
    if (!personName.trim() || parsedAmount <= 0) return;

    if (editingDebt) {
      const updated = debts.map((d) =>
        d.id === editingDebt.id
          ? {
              ...d,
              type: debtType,
              personName: personName.trim(),
              amount: parsedAmount,
              description: description.trim() || undefined,
            }
          : d
      );
      setConfig({ ...config, debts: updated });
    } else {
      const newDebt: Debt = {
        id: 'debt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: debtType,
        personName: personName.trim(),
        amount: parsedAmount,
        description: description.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        isSettled: false,
      };
      const updated = [newDebt, ...debts];
      setConfig({ ...config, debts: updated });
    }

    setPersonName('');
    setAmount('');
    setDescription('');
    setEditingDebt(null);
    setIsModalOpen(false);
  };

  const handleToggleSettle = (id: string) => {
    if (typeof feedback?.light === 'function') feedback.light();
    const updated = debts.map((d) => {
      if (d.id === id) {
        return {
          ...d,
          isSettled: !d.isSettled,
          settledAt: !d.isSettled ? Date.now() : undefined,
        };
      }
      return d;
    });
    setConfig({ ...config, debts: updated });
  };

  const handleDeleteDebt = (id: string) => {
    const updated = debts.filter((d) => d.id !== id);
    setConfig({ ...config, debts: updated });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-[var(--menu-content-gap)] pb-24 page-max mx-auto w-full min-w-0 font-sans"
    >
      {/* 1. Header Summary Cards matching Analysis & Budget summary style */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Att få tillbaka (Skyldig mig) */}
        <Card variant="default" padding="md" className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <ArrowDownLeft size={14} className="text-[var(--success-color)] shrink-0" strokeWidth={2.5} />
            <span className="text-label font-medium truncate">
              {isEn ? 'To receive' : 'Att få tillbaka'}
            </span>
          </div>
          <span className="text-large-amount font-amount font-bold text-[var(--success-color)] tracking-tight tabular-nums block truncate">
            +{formatAmount(totalOweMe, config.language)} {curr}
          </span>
        </Card>

        {/* Att betala (Jag är skyldig) */}
        <Card variant="default" padding="md" className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <ArrowUpRight size={14} className="text-[var(--danger-color)] shrink-0" strokeWidth={2.5} />
            <span className="text-label font-medium truncate">
              {isEn ? 'To pay' : 'Att betala'}
            </span>
          </div>
          <span className="text-large-amount font-amount font-bold text-[var(--text-primary)] tracking-tight tabular-nums block truncate">
            −{formatAmount(totalIOwe, config.language)} {curr}
          </span>
        </Card>
      </div>

      {/* 2. Global Filter Pills & Add Button */}
      <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
        <div className="flex-1 min-w-0">
          <FilterButtonGroup
            options={[
              { id: 'all', label: isEn ? 'All' : 'Alla' },
              { id: 'owe_me', label: isEn ? 'Owes me' : 'Skyldig mig' },
              { id: 'i_owe', label: isEn ? 'I owe' : 'Jag är skyldig' },
              { id: 'settled', label: isEn ? 'Settled' : 'Kvitterade' },
            ]}
            selectedId={activeTab}
            onSelect={(id) => setActiveTab(id as any)}
            ariaLabel={isEn ? 'Filter debts' : 'Filtrera skulder'}
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openAddModal}
          icon={<Plus size={14} strokeWidth={2.5} />}
          className="shrink-0 rounded-full"
        >
          {isEn ? 'Add' : 'Lägg till'}
        </Button>
      </div>

      {/* 3. Debt List */}
      <div className="space-y-[var(--card-gap)]">
        <AnimatePresence mode="popLayout">
          {filteredDebts.length > 0 ? (
            filteredDebts.map((item) => {
              const isOweMe = item.type === 'owe_me';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`transition-all ${item.isSettled ? 'opacity-60' : ''}`}
                >
                  <Card
                    variant="default"
                    padding="sm"
                    isInteractive
                    onClick={() => openEditModal(item)}
                    className="flex items-center justify-between gap-3 min-w-0 w-full overflow-hidden cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                      {/* Avatar initial */}
                      <div
                        className={`w-[42px] h-[42px] rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                          item.isSettled
                            ? 'bg-black/5 dark:bg-white/5 text-[var(--text-tertiary)]'
                            : isOweMe
                            ? 'bg-[var(--success-container)] text-[var(--success-color)]'
                            : 'bg-[var(--danger-container)] text-[var(--danger-color)]'
                        }`}
                      >
                        {item.personName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <span className="text-body-medium font-medium text-[var(--text-primary)] truncate block leading-snug">
                          {item.personName}
                        </span>

                        <div className="flex items-center gap-1.5 text-secondary text-[var(--text-secondary)] min-w-0 mt-0.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isOweMe ? 'bg-[var(--success-color)]' : 'bg-[var(--danger-color)]'}`} />
                          <span className="shrink-0">
                            {isOweMe ? (isEn ? 'Owes you' : 'Skyldig dig') : (isEn ? 'You owe' : 'Du är skyldig')}
                          </span>
                          {item.description && (
                            <>
                              <span className="shrink-0 text-[var(--text-tertiary)]">·</span>
                              <span className="truncate text-[var(--text-tertiary)]">{item.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Settle Check button */}
                    <div className="flex items-center gap-2.5 shrink-0 text-right ml-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-list-amount font-amount font-semibold tabular-nums whitespace-nowrap block shrink-0 ${
                            item.isSettled
                              ? 'line-through text-[var(--text-tertiary)]'
                              : isOweMe
                              ? 'text-[var(--success-color)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {isOweMe ? '+' : '−'}{formatAmount(item.amount, config.language)} {curr}
                        </span>
                        {item.date && (
                          <span className="text-secondary text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                            {formatShortDate(item.date, config.language || 'sv')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <IconButton
                          icon={item.isSettled ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                          onClick={() => handleToggleSettle(item.id)}
                          size="sm"
                          variant={item.isSettled ? 'primary' : 'muted'}
                          className={item.isSettled ? 'bg-[var(--success-color)] text-white' : ''}
                          title={item.isSettled ? (isEn ? 'Mark as unsettled' : 'Ångra klarmarkering') : (isEn ? 'Mark as settled' : 'Klarmarkera / Fått betalt')}
                          aria-label={item.isSettled ? (isEn ? 'Mark as unsettled' : 'Ångra klarmarkering') : (isEn ? 'Mark as settled' : 'Klarmarkera')}
                        />

                        <IconButton
                          icon={<Trash2 size={14} strokeWidth={2} />}
                          onClick={() => setDebtToDelete(item)}
                          size="sm"
                          variant="ghost"
                          className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                          title={isEn ? 'Delete' : 'Ta bort'}
                          aria-label={isEn ? 'Delete' : 'Ta bort'}
                        />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <EmptyState
              icon={HandCoins}
              title={isEn ? 'No debts registered yet' : 'Inga skulder eller utlägg registrerade'}
              description={
                isEn
                  ? 'Keep track of money you lent or borrowed from friends and family.'
                  : 'Håll enkelt koll på pengar du lånat ut till vänner eller är skyldig andra.'
              }
              actionLabel={activeTab === 'all' ? (isEn ? 'Add debt' : 'Lägg till skuld') : undefined}
              onAction={activeTab === 'all' ? openAddModal : undefined}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Add / Edit Debt Modal (Unified Dejz Modal Structure) */}
      {isModalOpen && typeof document !== 'undefined' && document.body && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onMouseDown={(e) => {
            backdropMouseDownTarget.current = e.target;
          }}
          onClick={(e) => {
            if (backdropMouseDownTarget.current === e.target && e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.75 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 70 || info.velocity.y > 350) {
                setIsModalOpen(false);
              }
            }}
            className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[var(--radius-modal,24px)] sm:rounded-[var(--radius-modal,24px)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-modal h-auto font-sans border-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle on Mobile */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => setIsModalOpen(false)}
              className="w-full pt-3 pb-1.5 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0 relative z-20"
            >
              <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full transition-colors" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 w-full">
              {/* Top Bar with Title & Close */}
              <div className="flex items-center justify-between pb-1 px-1">
                <h2 className="text-section-title text-[var(--text-primary)] tracking-tight">
                  {editingDebt
                    ? (isEn ? 'Edit debt / expense' : 'Redigera skuld / utlägg')
                    : (isEn ? 'New debt / expense' : 'Ny skuld / utlägg')}
                </h2>
                <IconButton
                  icon={<X size={15} strokeWidth={2.5} />}
                  onClick={() => setIsModalOpen(false)}
                  variant="muted"
                  size="md"
                  title={isEn ? 'Close' : 'Stäng'}
                  aria-label={isEn ? 'Close' : 'Stäng'}
                />
              </div>

              {/* Type Segmented Control */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--surface-muted)] rounded-card-nested">
                <button
                  type="button"
                  onClick={() => setDebtType('owe_me')}
                  className={`py-2 rounded-[var(--radius-button-sm,10px)] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    debtType === 'owe_me'
                      ? 'bg-[var(--surface-color)] text-[var(--success-color)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ArrowDownLeft size={14} strokeWidth={2.5} />
                  <span>{isEn ? 'Owes me' : 'Skyldig mig'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('i_owe')}
                  className={`py-2 rounded-[var(--radius-button-sm,10px)] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    debtType === 'i_owe'
                      ? 'bg-[var(--surface-color)] text-[var(--danger-color)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                  <span>{isEn ? 'I owe' : 'Jag är skyldig'}</span>
                </button>
              </div>

              {/* 1. First Group: Person Name & Amount */}
              <div className="p-4 sm:p-5 rounded-card bg-[var(--surface-color)] border border-subtle space-y-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                      debtType === 'owe_me'
                        ? 'bg-[var(--success-container)] text-[var(--success-color)]'
                        : 'bg-[var(--danger-container)] text-[var(--danger-color)]'
                    }`}
                  >
                    {personName.trim() ? personName.trim().charAt(0).toUpperCase() : <User size={22} strokeWidth={2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-label font-medium text-[var(--text-tertiary)] block mb-0.5">
                      {isEn ? 'Name' : 'Namn'}
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder={isEn ? 'e.g. Rasmus' : 'Personens namn'}
                      className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-snug bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-subtle flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-label font-medium text-[var(--text-tertiary)] block mb-0.5">
                      {isEn ? 'Amount' : 'Belopp'}
                    </label>
                    <div
                      onClick={() => amountInputRef.current?.focus()}
                      className="flex items-baseline gap-1.5 font-amount cursor-text w-full"
                    >
                      <input
                        ref={amountInputRef}
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(formatAmount(e.target.value))}
                        onBlur={() => setAmount(evaluateAndFormatAmount(amount))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setAmount(evaluateAndFormatAmount(amount));
                          }
                        }}
                        placeholder="0"
                        className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] text-[30px] sm:text-[36px] placeholder:font-normal placeholder:text-[var(--text-tertiary)] w-full leading-none shrink min-w-[60px]"
                      />
                      <span className="text-secondary font-medium text-[var(--text-tertiary)] tracking-tight select-none shrink-0 font-sans ml-1 pb-1">
                        {curr}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Second Group: Note / Description */}
              <div className="rounded-card bg-[var(--surface-color)] overflow-hidden border border-subtle divide-y divide-subtle">
                <div className="p-4 flex items-center justify-between min-h-[58px] gap-3">
                  <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                    {isEn ? 'Note' : 'Egen notering'}
                  </span>
                  <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={isEn ? 'e.g. Dinner, tickets...' : 'Vad gäller det? (valfritt)'}
                      className="text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none w-full max-w-[220px] placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
                    />
                    {description && (
                      <button
                        type="button"
                        onClick={() => setDescription('')}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-[var(--bg-color)] flex items-center gap-2.5 relative z-10 w-full">
              <Button
                type="button"
                variant="accent"
                size="lg"
                disabled={!personName.trim() || parseAmount(amount) <= 0}
                className="flex-1 rounded-[var(--radius-button,12px)] text-body-medium font-semibold"
                onClick={handleSaveDebt}
                icon={<Check size={16} strokeWidth={2.5} />}
              >
                {editingDebt
                  ? (isEn ? 'Save changes' : 'Spara ändringar')
                  : (isEn ? 'Save' : 'Spara')}
              </Button>

              {editingDebt && (
                <IconButton
                  icon={<Trash2 size={16} strokeWidth={2} />}
                  onClick={() => {
                    setIsModalOpen(false);
                    setDebtToDelete(editingDebt);
                  }}
                  variant="danger"
                  size="xl"
                  shape="button"
                  title={isEn ? 'Delete' : 'Ta bort'}
                  aria-label={isEn ? 'Delete' : 'Ta bort'}
                />
              )}
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {debtToDelete && (
        <ConfirmModal
          isOpen={Boolean(debtToDelete)}
          title={isEn ? 'Delete debt?' : 'Radera skuld / utlägg?'}
          message={
            isEn
              ? `Do you want to delete ${debtToDelete.personName} (${formatAmount(debtToDelete.amount, config.language)} ${curr})?`
              : `Vill du radera ${debtToDelete.personName} (${formatAmount(debtToDelete.amount, config.language)} ${curr})?`
          }
          confirmText={isEn ? 'Delete' : 'Radera'}
          cancelText={isEn ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={() => {
            handleDeleteDebt(debtToDelete.id);
            setDebtToDelete(null);
          }}
          onCancel={() => setDebtToDelete(null)}
        />
      )}
    </motion.div>
  );
}

