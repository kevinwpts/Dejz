import React, { useState, useEffect, useRef } from 'react';
import { Target, Trash2, Check } from 'lucide-react';
import { SavingsGoal } from '../types';
import { TranslationKey } from '../i18n';
import { IconSelector } from './IconSelector';
import { fetchLogoForName } from '../utils/logo';
import { suggestIcon, isEmojiString, ICON_MAP } from '../utils/icons';
import { formatAmount, parseAmount } from '../utils/format';
import { Modal, Button, Input } from './ui';

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

  const headerLeftIcon = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setShowIconSelector(true);
      }}
      className="w-9 h-9 rounded-icon-button flex items-center justify-center text-card-title transition-all active:scale-95 overflow-hidden bg-black/[0.04] dark:bg-white/[0.06] border border-subtle shrink-0 text-[var(--accent-color)] cursor-pointer"
    >
      {logo ? (
        <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : isEmojiString(icon) ? (
        icon
      ) : (
        (() => {
          const Icon = ICON_MAP[icon] || Target;
          return <Icon size={18} className="text-[var(--accent-color)]" strokeWidth={2} />;
        })()
      )}
    </button>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2.5">
            {headerLeftIcon}
            <span className="truncate">{editingGoal ? t('editSavingsGoal') : t('newSavingsGoal')}</span>
          </div>
        }
        size="md"
        showCloseButton={true}
        bodyClassName="p-5 sm:p-6 space-y-4"
        footer={
          <div className="space-y-2.5 w-full">
            <Button
              type="button"
              variant="accent"
              size="md"
              fullWidth
              onClick={handleConfirm}
              disabled={!title || !targetAmount}
              icon={<Check size={18} strokeWidth={2} />}
            >
              {editingGoal ? t('saveChanges') : t('addSavingsGoal')}
            </Button>

            {editingGoal && onDelete && (
              <Button
                type="button"
                variant="danger"
                size="md"
                fullWidth
                onClick={() => {
                  onDelete(editingGoal.id);
                  onClose();
                }}
                icon={<Trash2 size={16} strokeWidth={2} />}
              >
                {t('deleteSavingsGoal')}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('whatAreYouSavingFor')}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('savingGoalExample')}
          />

          <div className="space-y-1.5">
            <label className="text-label font-semibold text-[var(--text-secondary)] ml-0.5">
              {t('targetAmount')}
            </label>
            <div 
              onClick={() => amountInputRef.current?.focus()}
              className="bg-black/[0.04] dark:bg-white/[0.06] border border-subtle rounded-input py-4 px-4 flex items-center justify-between transition-all cursor-pointer select-none group"
            >
              <div className="flex-1 flex justify-center translate-x-3">
                <input
                  ref={amountInputRef}
                  type="text"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(formatAmount(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-[var(--text-primary)] outline-none text-large-amount font-bold text-center tabular-nums"
                />
              </div>
              <span className="text-micro-label font-bold text-white bg-[var(--success-color)] px-3 py-1 rounded-full shrink-0 ml-3 transition-colors">
                {currency}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Icon Selector Popover Modal */}
      <Modal
        isOpen={showIconSelector}
        onClose={() => setShowIconSelector(false)}
        title={t('chooseIcon')}
        subtitle={t('chooseLogoOrIcon')}
        size="sm"
        center
        showCloseButton={true}
        zIndex={120}
        bodyClassName="p-6"
      >
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
      </Modal>
    </>
  );
}
