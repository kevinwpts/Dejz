import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, ArrowDownLeft, ArrowUpRight, Trash2, CheckCircle2 } from 'lucide-react';
import { Config, Debt } from '../types';
import { formatAmount } from '../utils/format';
import { Modal, Card, Button, IconButton, Input, FilterButtonGroup, EmptyState } from './ui';

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
      className="space-y-[var(--menu-content-gap)] pb-20 page-max mx-auto w-full font-sans"
    >
      {/* 1. Header Summary Cards matching Analysis summary style */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Att få (Skyldig mig) */}
        <Card variant="default" padding="lg" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro-label font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
              <ArrowDownLeft size={13} className="text-[var(--success-color)] shrink-0" strokeWidth={2.5} />
              <span>{isEn ? 'To receive' : 'Att få tillbaka'}</span>
            </span>
          </div>
          <div>
            <span className="text-large-amount font-extrabold text-[var(--text-primary)] tracking-tight tabular-nums block truncate">
              +{formatAmount(totalOweMe, config.language)} {curr}
            </span>
          </div>
        </Card>

        {/* Att betala (Jag är skyldig) */}
        <Card variant="default" padding="lg" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro-label font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
              <ArrowUpRight size={13} className="text-[var(--danger-color)] shrink-0" strokeWidth={2.5} />
              <span>{isEn ? 'To pay' : 'Att betala'}</span>
            </span>
          </div>
          <div>
            <span className="text-large-amount font-extrabold text-[var(--text-primary)] tracking-tight tabular-nums block truncate">
              −{formatAmount(totalIOwe, config.language)} {curr}
            </span>
          </div>
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
          onClick={() => setIsAddModalOpen(true)}
          icon={<Plus size={14} strokeWidth={2.5} />}
          className="shrink-0 h-[36px] sm:h-[38px] px-3.5 sm:px-4 rounded-full text-xs sm:text-[13px] font-bold"
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`transition-all ${item.isSettled ? 'opacity-50' : ''}`}
                >
                  <Card variant="default" padding="md" className="flex items-center justify-between gap-2.5 sm:gap-3 min-w-0 w-full overflow-hidden">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                      {/* Avatar initial */}
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--radius-card-nested,10px)] flex items-center justify-center font-bold text-sm shrink-0 ${
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-body-medium font-bold text-[var(--text-primary)] truncate block">
                            {item.personName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-micro-label text-[var(--text-secondary)] opacity-75 min-w-0 mt-0.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isOweMe ? 'bg-[var(--success-color)]' : 'bg-[var(--danger-color)]'}`} />
                          <span className="font-semibold shrink-0">
                            {isOweMe ? (isEn ? 'Owes you' : 'Skyldig dig') : (isEn ? 'You owe' : 'Du är skyldig')}
                          </span>
                          {item.description && (
                            <>
                              <span className="shrink-0">•</span>
                              <span className="truncate">{item.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Settle Check button */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-right ml-auto">
                      <div>
                        <span
                          className={`text-body-medium font-bold font-amount tabular-nums whitespace-nowrap block shrink-0 ${
                            item.isSettled
                              ? 'line-through text-[var(--text-tertiary)]'
                              : isOweMe
                              ? 'text-[var(--success-color)]'
                              : 'text-[var(--danger-color)]'
                          }`}
                        >
                          {isOweMe ? '+' : '−'}{formatAmount(item.amount, config.language)} {curr}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <IconButton
                          icon={item.isSettled ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                          onClick={() => handleToggleSettle(item.id)}
                          size="sm"
                          variant={item.isSettled ? 'primary' : 'muted'}
                          className={item.isSettled ? 'bg-[var(--success-color)] text-white hover:bg-emerald-600' : 'hover:bg-[var(--success-container)] hover:text-[var(--success-color)]'}
                          title={item.isSettled ? (isEn ? 'Mark as unsettled' : 'Ångra klarmarkering') : (isEn ? 'Mark as settled' : 'Klarmarkera / Fått betalt')}
                          aria-label={item.isSettled ? (isEn ? 'Mark as unsettled' : 'Ångra klarmarkering') : (isEn ? 'Mark as settled' : 'Klarmarkera')}
                        />

                        <IconButton
                          icon={<Trash2 size={13} strokeWidth={2} />}
                          onClick={() => handleDeleteDebt(item.id)}
                          size="sm"
                          variant="ghost"
                          className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)] hover:bg-[var(--danger-container)]"
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
              title={isEn ? 'No debts registered yet' : 'Inga skulder eller utlägg registrerade'}
              description={
                isEn
                  ? 'Keep track of money you lent or borrowed from friends and family.'
                  : 'Håll enkelt koll på pengar du lånat ut till vänner eller är skyldig andra.'
              }
            />
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
        bodyClassName="p-5 space-y-[var(--card-gap)]"
      >
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-[var(--radius-card-nested,10px)]">
          <button
            type="button"
            onClick={() => setDebtType('owe_me')}
            className={`py-2 px-3 rounded-[var(--radius-btn,8px)] text-label font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              debtType === 'owe_me'
                ? 'bg-[var(--success-color)] text-white shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <ArrowDownLeft size={14} strokeWidth={2.5} />
            <span>{isEn ? 'Owes me' : 'Skyldig mig'}</span>
          </button>
          <button
            type="button"
            onClick={() => setDebtType('i_owe')}
            className={`py-2 px-3 rounded-[var(--radius-btn,8px)] text-label font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              debtType === 'i_owe'
                ? 'bg-[var(--danger-color)] text-white shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <ArrowUpRight size={14} strokeWidth={2.5} />
            <span>{isEn ? 'I owe' : 'Jag är skyldig'}</span>
          </button>
        </div>

        {/* Person name */}
        <Input
          label={isEn ? 'Person name' : 'Personens namn'}
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder={isEn ? 'e.g. Rasmus' : 't.ex. Rasmus eller Pia'}
        />

        {/* Amount */}
        <Input
          label={isEn ? 'Amount' : 'Belopp'}
          variant="amount"
          currency={curr}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          inputMode="numeric"
        />

        {/* Description / Note */}
        <Input
          label={isEn ? 'What is it for? (optional)' : 'Vad gäller det? (valfritt)'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isEn ? 'e.g. Dinner, concert ticket' : 't.ex. Middag, biobiljett, bensin'}
        />

        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={handleSaveDebt}
          disabled={!personName.trim() || !amount}
          icon={<Check size={18} strokeWidth={2} />}
        >
          {isEn ? 'Save' : 'Spara'}
        </Button>
      </Modal>
    </motion.div>
  );
}
