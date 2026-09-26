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
      console.error('Failed to load accounts:', _error);
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
      currentBalance: Number(initialBalance) || 0,
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
      console.error('Error saving account:', _error);
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
      console.error('Error deleting account:', _error);
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6 font-sans"
    >
      <div className="flex items-center justify-between px-1">
        <button 
          type="button"
          onClick={onBack} 
          className="flex items-center gap-1.5 text-xs font-medium text-[#9CA6BC] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          <span>Tillbaka</span>
        </button>
        <button 
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#818cf8]/[0.16] hover:bg-[#818cf8]/[0.24] text-white border border-[#8B9CFF]/30 h-8 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus size={13} strokeWidth={2} />
          <span>Lägg till konto</span>
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Mina konton</h2>
          <p className="text-xs sm:text-[13px] text-[#9CA6BC] mt-1">Hantera dina saldon på dina olika bankkonton</p>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white/[0.045] backdrop-blur-[20px] rounded-[24px] p-5 sm:p-6 relative overflow-hidden border border-white/[0.03]">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] block mb-1.5">
            Totalt saldo
          </span>
          <div className="text-3xl sm:text-4xl font-semibold font-amount tabular-nums text-white">
            {totalBalance.toLocaleString('sv-SE')} <span className="text-base sm:text-lg font-normal text-[#9CA6BC]">kr</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-[#8B9CFF] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white/[0.035] backdrop-blur-[18px] rounded-[20px] p-8 flex flex-col items-center justify-center text-center border border-white/[0.025]">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.035] text-[#C7CDDC] flex items-center justify-center mb-3">
              <Wallet size={22} strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Inga konton än</h3>
            <p className="text-xs text-[#9CA6BC] max-w-xs mb-4">Lägg till ditt första konto för att hålla koll på dina saldon.</p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-8 px-3 rounded-full bg-[#818cf8]/[0.16] hover:bg-[#818cf8]/[0.24] text-white border border-[#8B9CFF]/30 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} strokeWidth={2} />
              <span>Lägg till konto</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {accounts.map(account => (
              <div 
                key={account.id}
                onClick={() => handleOpenEdit(account)}
                className="bg-white/[0.04] backdrop-blur-[18px] rounded-[18px] p-3.5 sm:p-4 transition-all cursor-pointer group flex items-center justify-between border border-white/[0.025] hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.04] border border-white/[0.035] flex items-center justify-center text-[#C7CDDC] shrink-0">
                    <Wallet size={16} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] sm:text-[14.5px] font-semibold text-white truncate tracking-tight">{account.name}</h3>
                    <p className="text-xs text-[#9CA6BC] font-medium mt-0.5">
                      <span className="font-amount tabular-nums text-white">{account.initialBalance.toLocaleString('sv-SE')}</span> <span className="text-[11px] font-normal text-[#9CA6BC]">kr</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => handleDelete(account.id, e)}
                    className="w-7 h-7 rounded-full bg-rose-500/[0.12] hover:bg-rose-500/[0.22] text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                    title="Radera konto"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronLeft className="text-[#9CA6BC] rotate-180" size={16} />
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
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-[#12131D] sm:rounded-[24px] rounded-t-[28px] rounded-b-none overflow-hidden shadow-2xl flex flex-col border border-white/[0.08]"
              style={{ maxHeight: '90vh' }}
            >
              <div className="flex items-center justify-between p-5 pb-4 border-b border-white/[0.06]">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {isEditing ? 'Redigera konto' : 'Lägg till konto'}
                </h2>
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-[#9CA6BC] hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] pl-0.5">Kontonamn</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="t.ex. SEB Lönekonto"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-[#8B9CFF] transition-all placeholder-[#9CA6BC]/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] pl-0.5">Saldo (kr)</label>
                  <input 
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-[#8B9CFF] transition-all placeholder-[#9CA6BC]/40 font-amount tabular-nums"
                  />
                </div>
              </div>

              <div className="p-5 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-5">
                <button 
                  type="button"
                  onClick={handleSave}
                  className="w-full bg-[#818cf8]/[0.22] hover:bg-[#818cf8]/[0.32] text-white border border-[#8B9CFF]/35 font-medium text-sm py-3 rounded-full transition-colors cursor-pointer"
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
