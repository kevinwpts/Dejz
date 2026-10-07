import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, ArrowDownLeft, ArrowUpRight, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Config, Debt } from '../types';
import { formatAmount } from '../utils/format';
import { Button, Modal } from './ui';

interface DebtsViewProps {
  onBack: () => void;
  config: Config;
  setConfig: (config: Config) => void;
}

export function DebtsView({ config, setConfig }: DebtsViewProps) {
  const curr = config.currency || 'kr';
  const isEn = config.language === 'en';

  const [activeTab, setActiveTab] = useState<'all' | 'owe_me' | 'i_owe' | 'settled'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [debtType, setDebtType] = useState<'owe_me' | 'i_owe'>('owe_me');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const debts: Debt[] = config.debts || [
    {
      id: 'demo-1',
      type: 'owe_me',
      personName: 'Rasmus',
      amount: 1000,
      description: 'Padel & lunch',
      date: new Date().toISOString().split('T')[0],
      isSettled: false,
    },
    {
      id: 'demo-2',
      type: 'i_owe',
      personName: 'Pia',
      amount: 500,
      description: 'Present till mamma',
      date: new Date().toISOString().split('T')[0],
      isSettled: false,
    }
  ];

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

  const handleSaveDebt = () => {
    if (!personName.trim() || !amount || Number(amount) <= 0) return;

    const newDebt: Debt = {
      id: 'debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: debtType,
      personName: personName.trim(),
      amount: Number(amount),
      description: description.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      isSettled: false,
    };

    const updated = [newDebt, ...(config.debts || debts.filter(d => !d.id.startsWith('demo-')))];
    setConfig({ ...config, debts: updated });

    // Reset & close
    setPersonName('');
    setAmount('');
    setDescription('');
    setIsAddModalOpen(false);
  };

  const handleToggleSettle = (id: string) => {
    const currentList = config.debts || debts;
    const updated = currentList.map((d) => {
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
    const currentList = config.debts || debts;
    const updated = currentList.filter((d) => d.id !== id);
    setConfig({ ...config, debts: updated });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 pb-20 max-w-md mx-auto font-sans"
    >
      {/* 1. Header Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Att få (Skyldig mig) */}
        <div className="p-4 rounded-[20px] bg-[var(--surface-color)] border-none space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft size={14} strokeWidth={2.5} />
            <span>{isEn ? 'To receive' : 'Att få tillbaka'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-amount tabular-nums tracking-tight">
            +{formatAmount(totalOweMe, config.language)} {curr}
          </div>
        </div>

        {/* Att betala (Jag är skyldig) */}
        <div className="p-4 rounded-[20px] bg-[var(--surface-color)] border-none space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 dark:text-rose-400">
            <ArrowUpRight size={14} strokeWidth={2.5} />
            <span>{isEn ? 'To pay' : 'Att betala'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-amount tabular-nums tracking-tight">
            -{formatAmount(totalIOwe, config.language)} {curr}
          </div>
        </div>
      </div>

      {/* 2. Filter tabs & Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-[14px]">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isEn ? 'All' : 'Alla'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('owe_me')}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'owe_me'
                ? 'bg-[var(--surface-color)] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isEn ? 'Owes me' : 'Skyldig mig'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('i_owe')}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'i_owe'
                ? 'bg-[var(--surface-color)] text-rose-500 dark:text-rose-400 shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isEn ? 'I owe' : 'Jag är skyldig'}
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} strokeWidth={2.5} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          {isEn ? 'Add' : 'Lägg till'}
        </Button>
      </div>

      {/* 3. Debt List */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {filteredDebts.length > 0 ? (
            filteredDebts.map((item) => {
              const isOweMe = item.type === 'owe_me';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-[20px] bg-[var(--surface-color)] border border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between gap-3 transition-all ${
                    item.isSettled ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar initial */}
                    <div
                      className={`w-10 h-10 rounded-[14px] flex items-center justify-center font-bold text-sm shrink-0 ${
                        item.isSettled
                          ? 'bg-black/5 dark:bg-white/5 text-[var(--text-tertiary)]'
                          : isOweMe
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.personName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {item.personName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                            isOweMe
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-500 dark:text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {isOweMe ? (isEn ? 'Owes you' : 'Skyldig dig') : (isEn ? 'You owe' : 'Du är skyldig')}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5 font-medium">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Settle Check button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-sm sm:text-base font-bold font-amount tabular-nums block ${
                          item.isSettled
                            ? 'line-through text-[var(--text-tertiary)]'
                            : isOweMe
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isOweMe ? '+' : '-'}{formatAmount(item.amount, config.language)} {curr}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSettle(item.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                        item.isSettled
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:bg-emerald-500/15 hover:text-emerald-600'
                      }`}
                      title={item.isSettled ? (isEn ? 'Mark as unsettled' : 'Ångra klarmarkering') : (isEn ? 'Mark as settled' : 'Klarmarkera / Fått betalt')}
                    >
                      {item.isSettled ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDebt(item.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title={isEn ? 'Delete' : 'Ta bort'}
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="p-8 text-center rounded-[22px] bg-[var(--surface-color)] space-y-2">
              <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto text-[var(--text-secondary)]">
                <Clock size={18} strokeWidth={2} />
              </div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                {isEn ? 'No debts registered yet' : 'Inga skulder eller utlägg registrerade'}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-xs mx-auto">
                {isEn
                  ? 'Keep track of money you lent or borrowed from friends and family.'
                  : 'Håll enkelt koll på pengar du lånat ut till vänner eller är skyldig andra.'}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Debt Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isEn ? 'New debt / expense' : 'Ny skuld / utlägg'}
        size="xs"
        showCloseButton={true}
        bodyClassName="p-5 space-y-4"
      >
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-[14px]">
          <button
            type="button"
            onClick={() => setDebtType('owe_me')}
            className={`py-2 px-3 rounded-[10px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              debtType === 'owe_me'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <ArrowDownLeft size={14} strokeWidth={2.5} />
            <span>{isEn ? 'Owes me' : 'Skyldig mig'}</span>
          </button>
          <button
            type="button"
            onClick={() => setDebtType('i_owe')}
            className={`py-2 px-3 rounded-[10px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              debtType === 'i_owe'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <ArrowUpRight size={14} strokeWidth={2.5} />
            <span>{isEn ? 'I owe' : 'Jag är skyldig'}</span>
          </button>
        </div>

        {/* Person name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
            {isEn ? 'Person name' : 'Personens namn'}
          </label>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder={isEn ? 'e.g. Rasmus' : 't.ex. Rasmus eller Pia'}
            className="w-full h-11 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-3.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
          />
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
            {isEn ? 'Amount' : 'Belopp'}
          </label>
          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-3.5 h-11 focus-within:border-[var(--accent-color)]">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-full bg-transparent border-none text-sm font-bold text-[var(--text-primary)] outline-none font-amount tabular-nums"
            />
            <span className="text-xs font-bold text-[var(--text-secondary)] pl-2 select-none">
              {curr}
            </span>
          </div>
        </div>

        {/* Description / Note */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
            {isEn ? 'What is it for? (optional)' : 'Vad gäller det? (valfritt)'}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isEn ? 'e.g. Dinner, concert ticket' : 't.ex. Middag, biobiljett, bensin'}
            className="w-full h-11 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-3.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveDebt}
          disabled={!personName.trim() || !amount}
          className="w-full h-12 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-none"
        >
          <Check size={18} strokeWidth={2} />
          <span>{isEn ? 'Save' : 'Spara'}</span>
        </button>
      </Modal>
    </motion.div>
  );
}
