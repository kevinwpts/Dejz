import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, Trash2, Check } from 'lucide-react';
import { SavingsGoal } from '../types';
import { TranslationKey } from '../i18n';
import { IconSelector } from './IconSelector';
import { fetchLogoForName } from '../utils/logo';
import { suggestIcon, isEmojiString, ICON_MAP } from '../utils/icons';
import { formatAmount, parseAmount } from '../utils/format';
import { Button, IconButton } from './ui';

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
            className="bg-white dark:bg-[#242424] w-full max-w-lg rounded-t-[28px] sm:rounded-[26px] border-t sm:border border-[#E6E2D8] dark:border-[#383838] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle on Mobile */}
            <div className="w-10 h-1 bg-[#D6D1C7] dark:bg-[#3D3D3D] rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

            {/* Header Section */}
            <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[#E6E2D8] dark:border-[#383838]">
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
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1917] dark:text-white text-center truncate px-2">
                  {editingGoal ? t('editSavingsGoal') : t('newSavingsGoal')}
                </h2>
              </div>
              <div className="flex justify-end">
                <IconButton 
                  icon={<X size={18} strokeWidth={2} />} 
                  onClick={onClose} 
                  variant="muted" 
                  size="sm" 
                  aria-label={t('close')}
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5">
                      {t('whatAreYouSavingFor')}
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('savingGoalExample')}
                        className="w-full h-[48px] bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] focus:border-[#1C1917] dark:focus:border-white rounded-[14px] px-4 text-sm font-semibold text-[#1C1917] dark:text-white placeholder-[#8C867C] dark:placeholder-[#71717A] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5">
                      Målbelopp
                    </label>
                    <div 
                      onClick={() => amountInputRef.current?.focus()}
                      className="bg-[#F7F5F0] dark:bg-[#2D2D2D] rounded-[14px] py-6 px-6 flex items-center justify-between transition-all cursor-pointer select-none border border-[#E6E2D8] dark:border-[#383838] focus-within:border-[#1C1917] dark:focus-within:border-white group"
                    >
                      <div className="flex-1 flex justify-center translate-x-4">
                        <input
                          ref={amountInputRef}
                          type="text"
                          inputMode="decimal"
                          value={targetAmount}
                          onChange={(e) => setTargetAmount(formatAmount(e.target.value))}
                          placeholder="0"
                          className="w-full bg-transparent text-[#1C1917] dark:text-white outline-none font-amount text-5xl font-bold text-center"
                        />
                      </div>
                      <span className="text-xs font-bold text-white bg-[#05B862] px-3 py-1.5 rounded-full shrink-0 ml-4 transition-colors">
                        {currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            {/* Action Footer */}
            <div className="shrink-0 p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom)+0.5rem)] sm:pb-5 border-t border-[var(--border-color)] bg-[var(--bg-color)] space-y-2.5">
              <Button 
                onClick={handleConfirm} 
                disabled={!title || !targetAmount}
                variant="primary"
                fullWidth
                size="lg"
                icon={<Check size={18} strokeWidth={2.5} />}
              >
                {editingGoal ? t('saveChanges') : t('addSavingsGoal')}
              </Button>

              {editingGoal && onDelete && (
                <Button
                  onClick={() => {
                    onDelete(editingGoal.id);
                    onClose();
                  }}
                  variant="danger"
                  fullWidth
                  size="md"
                  icon={<Trash2 size={16} />}
                >
                  {t('deleteSavingsGoal')}
                </Button>
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
                      <IconButton 
                        icon={<X size={18} strokeWidth={2} />}
                        onClick={() => setShowIconSelector(false)}
                        variant="muted"
                        size="sm"
                        aria-label={t('close')}
                      />
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
                        onRestoreAuto={() => {
                          setIsManualSelection(false);
                          setLogo(undefined);
                          setIcon('target');
                          setShowIconSelector(false);
                        }}
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
