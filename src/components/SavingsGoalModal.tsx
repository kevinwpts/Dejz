import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, Trash2, Check } from 'lucide-react';
import { SavingsGoal } from '../types';
import { TranslationKey } from '../i18n';
import { IconSelector } from './IconSelector';
import { fetchLogoForName } from '../utils/logo';
import { suggestIcon, isEmojiString, ICON_MAP } from '../utils/icons';
import { formatAmount, parseAmount } from '../utils/format';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) => void;
  onDelete?: (id: string) => void;
  editingGoal?: SavingsGoal | null;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
  currency: string;
  isPro: boolean;
  userId?: string;
}

export function SavingsGoalModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onDelete,
  editingGoal, 
  t, 
  currency,
  isPro,
  userId
}: SavingsGoalModalProps) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('target');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [_autoLogo, setAutoLogo] = useState<string | undefined>(undefined);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setTargetAmount(formatAmount(editingGoal.targetAmount));
      setDeadline(editingGoal.deadline || '');
      setIcon(editingGoal.icon || 'target');
      setLogo(editingGoal.logo);
      setIsManualSelection(!!(editingGoal.logo || (editingGoal.icon && editingGoal.icon !== 'target')));
    } else {
      setTitle('');
      setTargetAmount('');
      setDeadline('');
      setIcon('target');
      setLogo(undefined);
      setIsManualSelection(false);
    }
    setAutoLogo(undefined);
    setShowIconSelector(false);
  }, [editingGoal, isOpen]);

  // Auto-fetch logo/icon
  useEffect(() => {
    if (isManualSelection) return;

    const timer = setTimeout(async () => {
      if (title.length >= 2) {
        const fetchedLogo = await fetchLogoForName(title);
        if (fetchedLogo) {
          setLogo(fetchedLogo);
          setAutoLogo(fetchedLogo);
          setIcon('none');
        } else {
          const suggested = suggestIcon(title);
          setIcon(suggested || 'target');
          setLogo(undefined);
          setAutoLogo(undefined);
        }
      } else {
        setLogo(undefined);
        setAutoLogo(undefined);
        setIcon('target');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [title, isManualSelection]);

  const handleConfirm = () => {
    const amount = parseAmount(targetAmount);
    if (!title || isNaN(amount) || amount <= 0) return;

    onConfirm({
      title,
      targetAmount: amount,
      deadline: deadline || undefined,
      priority: editingGoal?.priority ?? 0,
      icon,
      logo,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle on Mobile */}
            <div className="w-10 h-1 bg-[var(--border-color)]/60 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

            {/* Header Section */}
            <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[var(--border-color)]/30">
              <div className="flex justify-start">
                <button
                  key="icon"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowIconSelector(true);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95 overflow-hidden bg-[var(--surface-muted)] border border-[var(--border-color)] shrink-0"
                >
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : isEmojiString(icon) ? (
                    icon
                  ) : (
                    (() => {
                      const Icon = ICON_MAP[icon] || Target;
                      return <Icon size={20} className="text-accent" />;
                    })()
                  )}
                </button>
              </div>
              <div className="flex justify-center overflow-hidden">
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] text-center truncate px-2">
                  {editingGoal ? t('editSavingsGoal') : t('newSavingsGoal')}
                </h2>
              </div>
              <button 
                onClick={onClose} 
                className="w-9 h-9 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-[var(--border-color)] rounded-full transition-all text-[var(--text-secondary)] active:scale-90 justify-self-end shrink-0 cursor-pointer"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">
                      {t('whatAreYouSavingFor')}
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('savingGoalExample')}
                        className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-[12px] px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] focus:bg-[var(--surface-color)] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">
                      Målbelopp
                    </label>
                    <div 
                      onClick={() => amountInputRef.current?.focus()}
                      className="bg-[var(--surface-muted)] rounded-[14px] py-6 px-6 flex items-center justify-between active:bg-[var(--surface-color)] transition-all cursor-pointer select-none border border-[var(--border-color)] focus-within:border-accent/40 focus-within:bg-[var(--surface-color)] group"
                    >
                      <div className="flex-1 flex justify-center translate-x-4">
                        <input
                          ref={amountInputRef}
                          type="text"
                          inputMode="decimal"
                          value={targetAmount}
                          onChange={(e) => setTargetAmount(formatAmount(e.target.value))}
                          placeholder="0"
                          className="w-full bg-transparent text-[var(--text-primary)] outline-none font-amount text-5xl font-bold text-center"
                        />
                      </div>
                      <span className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-full shrink-0 ml-4 group-focus-within:bg-accent/20 transition-colors">
                        {currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            {/* Action Footer */}
            <div className="shrink-0 p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom)+0.5rem)] sm:pb-5 border-t border-[var(--border-color)] bg-[var(--bg-color)] space-y-2.5">
              <button 
                onClick={handleConfirm} 
                disabled={!title || !targetAmount}
                className="accent-button-full gap-2 group relative overflow-hidden active:scale-[0.98] shadow-xs rounded-[12px] py-3.5 w-full"
              >
                <Check size={18} className="group-hover:scale-105 transition-transform stroke-[2.5px]" />
                <span className="relative z-10 font-semibold tracking-tight text-sm">{editingGoal ? t('saveChanges') : t('addSavingsGoal')}</span>
              </button>

              {editingGoal && onDelete && (
                <button
                  onClick={() => {
                    onDelete(editingGoal.id);
                    onClose();
                  }}
                  className="w-full bg-accent/10 text-accent py-3 rounded-[12px] font-semibold text-xs tracking-wide hover:bg-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  {t('deleteSavingsGoal')}
                </button>
              )}
            </div>

            {/* Compact Icon Selector Popover */}
            <AnimatePresence>
              {showIconSelector && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowIconSelector(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-[var(--bg-color)] w-full max-w-sm rounded-[28px] relative border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
                  >
                    <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[var(--border-color)] shrink-0">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                        <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">{t('chooseLogoOrIcon')}</p>
                      </div>
                      <button 
                        onClick={() => setShowIconSelector(false)}
                        className="w-9 h-9 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                      >
                        <X size={18} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 min-h-0">
                      <IconSelector
                        name={title}
                        currentLogo={logo}
                        currentIcon={icon}
                        onLogoChange={(newLogo) => {
                          setLogo(newLogo);
                          setIsManualSelection(true);
                          setShowIconSelector(false);
                        }}
                        onIconChange={(newIcon) => {
                          setIcon(newIcon);
                          setLogo(undefined);
                          setIsManualSelection(true);
                          setShowIconSelector(false);
                        }}
                        isPro={isPro}
                        userId={userId}
                        t={t}
                      />
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
