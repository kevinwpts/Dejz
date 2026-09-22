import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Plus, Wallet, Trash2, X } from 'lucide-react';
import { Account } from '../types';
import { dataService } from '../services/dataService';

interface AccountsViewProps {
  onBack: () => void;
  userId: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function AccountsView({ onBack, userId, addToast }: AccountsViewProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Account | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getAccounts(userId);
      setAccounts(data);
    } catch (_error) {
      console.error('Failed to load accounts:', error);
      addToast('Kunde inte ladda konton', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [userId]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('Ange ett kontonamn', 'error');
      return;
    }

    const payload: Account = {
      id: isEditing ? isEditing.id : `acc_${Date.now()}`,
      name: name.trim(),
      initialBalance: Number(initialBalance) || 0,
      currentBalance: Number(initialBalance) || 0, // In this simple version we set both.
      currency: 'kr'
    };

    try {
      await dataService.saveAccount(userId, payload);
      setAccounts(prev => {
        if (isEditing) {
          return prev.map(a => a.id === payload.id ? payload : a);
        }
        return [...prev, payload];
      });
      addToast(isEditing ? 'Kontot uppdaterades' : 'Kontot har lagts till', 'success');
      handleCloseModal();
    } catch (_error) {
      console.error('Error saving account:', error);
      addToast('Kunde inte spara kontot', 'error');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Är du säker på att du vill radera detta konto? Alla transaktioner kopplade till det kan påverkas.')) {
      return;
    }
    
    try {
      await dataService.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      addToast('Kontot har raderats', 'success');
    } catch (_error) {
      console.error('Error deleting account:', error);
      addToast('Kunde inte radera kontot', 'error');
    }
  };

  const handleOpenEdit = (account: Account) => {
    setIsEditing(account);
    setName(account.name);
    setInitialBalance(account.initialBalance.toString());
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditing(null);
    setName('');
    setInitialBalance('');
    setIsAddModalOpen(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || acc.initialBalance), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className=""
    >
      <div className="flex items-center justify-between px-2 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-secondary)] py-2 hover:text-[var(--text-primary)] transition-colors shrink-0">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Tillbaka</span>
        </button>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 bg-accent/10 text-accent h-7 px-2.5 rounded-full text-[11px] font-semibold hover:bg-accent/20 transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
          Lägg till konto
        </button>
      </div>

      <div className="px-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Mina Konton</h2>
          <p className="text-[var(--text-tertiary)] mt-2">Hantera dina saldon t.ex. på SEB, Swedbank, etc.</p>
        </div>

        {/* Total Balance Card */}
        <div className="bg-[var(--surface-color)] rounded-[26px] p-6 relative overflow-hidden shadow-xs border border-[var(--border-color)]">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Wallet size={120} />
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Totalt saldo</p>
          <div className="text-4xl font-semibold font-amount text-[var(--text-primary)]">
            {totalBalance.toLocaleString('sv-SE')} <span className="text-xl text-[var(--text-tertiary)]">kr</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-[var(--surface-color)] rounded-[16px] p-8 flex flex-col items-center justify-center text-center shadow-xs border border-[var(--border-color)]">
            <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-4">
              <Wallet size={28} />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Inga konton än</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">Lägg till ditt första konto för att börja hålla koll på ditt saldo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map(account => (
              <div 
                key={account.id}
                onClick={() => handleOpenEdit(account)}
                className="bg-[var(--surface-color)] rounded-[16px] p-4 sm:p-5 transition-all cursor-pointer group flex items-center justify-between shadow-xs border border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)]">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{account.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
                      <span className="font-amount">{account.initialBalance.toLocaleString('sv-SE')}</span> <span className="font-sans text-[10px] opacity-50">kr</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleDelete(account.id, e)}
                    className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={15} />
                  </button>
                  <ChevronLeft className="text-[var(--text-tertiary)] rotate-180" size={18} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-[var(--bg-color)] sm:rounded-[24px] rounded-t-[28px] rounded-b-none overflow-hidden shadow-2xl flex flex-col border-t sm:border border-[var(--border-color)]"
              style={{ maxHeight: '90vh' }}
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-color)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {isEditing ? 'Redigera konto' : 'Lägg till konto'}
                </h2>
                <button 
                  onClick={handleCloseModal}
                  className="w-9 h-9 rounded-[10px] bg-[var(--surface-color)] hover:bg-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)] pl-1">Kontonamn</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="t.ex. SEB Lönekonto"
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-[12px] px-4 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] focus:bg-[var(--surface-color)] focus:border-accent/30 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)] pl-1">Saldo (kr)</label>
                  <input 
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-[12px] px-4 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] focus:bg-[var(--surface-color)] focus:border-accent/30 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/30"
                  />
                </div>
              </div>

              <div className="p-6 pt-0 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6">
                <button 
                  onClick={handleSave}
                  className="w-full bg-accent text-[var(--text-on-accent)] font-semibold text-base py-3.5 rounded-[12px] hover:bg-accent/90 transition-colors shadow-sm"
                >
                  Spara konto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
