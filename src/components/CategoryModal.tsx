import React, { useState, useEffect } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { CategoryIcon } from './CategoryIcon';
import { IconPickerModal } from './IconPickerModal';
import { suggestIcon } from '../utils/icons';
import { Modal, IconButton, Input, Button } from './ui';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'expense' | 'income';
  currency?: string;
  initialData: { name: string; icon: string; color?: string; budget?: number | null; index?: number } | null;
  onSave: (data: { name: string; icon: string; color?: string; budget?: number | null; index?: number }) => void;
  onDelete?: (index: number) => void;
  t: (key: TranslationKey) => string;
  hideBudget?: boolean;
}

export function CategoryModal({ 
  isOpen, 
  onClose, 
  type = 'expense',
  currency = 'kr',
  initialData, 
  onSave, 
  onDelete, 
  t,
  hideBudget = false
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('receipt');
  const [budget, setBudget] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || 'receipt');
      setBudget(initialData?.budget !== undefined && initialData?.budget !== null ? String(initialData.budget) : '');
      setShowIconPicker(false);
    }
  }, [isOpen, initialData]);

  const isEdit = initialData?.index !== undefined;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ 
      name: name.trim(), 
      icon, 
      color: initialData?.color || '#6658E8', 
      budget: type === 'expense' 
        ? (hideBudget ? (initialData?.budget ?? null) : (budget ? Number(budget) : null))
        : undefined,
      index: initialData?.index 
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        center
        size="xs"
        title={isEdit ? t('edit') : t('newCategory')}
        showCloseButton={true}
        headerRight={
          isEdit && onDelete ? (
            <IconButton
              icon={<Trash2 size={15} strokeWidth={2} />}
              onClick={() => {
                onDelete(initialData.index!);
                onClose();
              }}
              variant="danger"
              size="sm"
              aria-label={t('delete')}
            />
          ) : undefined
        }
        bodyClassName="p-5 sm:p-6 space-y-5"
      >
        {/* Preview / Icon selector */}
        <div className="flex flex-col items-center justify-center pt-1">
          <button 
            type="button"
            onClick={() => setShowIconPicker(true)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-card,14px)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all active:scale-95 group cursor-pointer relative"
            title="Tryck för att byta ikon"
          >
            <div className="relative">
              <CategoryIcon 
                icon={icon} 
                size="xl" 
                variant="primary"
                categoryName={name}
              />
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[var(--surface-color)] border border-subtle text-[10px] font-semibold text-[var(--text-secondary)] shadow-2xs group-hover:text-[var(--text-primary)]">
                Byt
              </div>
            </div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              Tryck för att välja ikon
            </span>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            label={t('name')}
            type="text"
            value={name}
            onChange={(e) => {
              const val = e.target.value;
              setName(val);
              if (!isEdit) {
                const suggested = suggestIcon(val);
                if (suggested) setIcon(suggested);
              }
            }}
            placeholder={t('name')}
          />

          {/* Budget Field (Only for expense categories when not hidden) */}
          {type !== 'income' && !hideBudget && (
            <Input
              label={t('budget')}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              variant="amount"
              currency={currency}
            />
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            variant="primary"
            fullWidth
            icon={<Check size={18} strokeWidth={2} />}
          >
            {t('save')}
          </Button>
        </div>
      </Modal>

      {/* Icon Picker Overlay */}
      <IconPickerModal
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        selectedIcon={icon}
        onSelectIcon={(newIcon) => setIcon(newIcon)}
        categoryName={name}
        t={t}
      />
    </>
  );
}
