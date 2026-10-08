import React, { useState, useEffect } from 'react';
import { Check, Trash2, Palette } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { suggestIcon } from '../utils/icons';
import { IconPickerModal } from './IconPickerModal';
import { CategoryIcon } from './CategoryIcon';
import { DEFAULT_CATEGORY_PALETTE } from '../utils/categoryColors';
import { Modal, IconButton } from './ui';

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

const PRESET_COLORS = [...DEFAULT_CATEGORY_PALETTE];

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
  const [color, setColor] = useState('#6658E8');
  const [budget, setBudget] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || 'receipt');
      setColor(initialData?.color || '#6658E8');
      setBudget(initialData?.budget !== undefined && initialData?.budget !== null ? String(initialData.budget) : '');
      setShowIconPicker(false);
    }
  }, [isOpen, initialData]);

  const isEdit = initialData?.index !== undefined;
  const isCustomSelected = !PRESET_COLORS.some((c) => c.toLowerCase() === color.toLowerCase());

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ 
      name: name.trim(), 
      icon, 
      color, 
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
            className="rounded-full transition-all active:scale-95 group cursor-pointer shadow-sm relative overflow-hidden"
            title="Välj ikon"
          >
            <CategoryIcon 
              icon={icon} 
              color={color}
              size="xl" 
              variant="primary" 
            />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
              {t('name')}
            </label>
            <input
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
              className="w-full h-11 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[8px] px-3.5 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent-color)]"
              placeholder={t('name')}
            />
          </div>

          {/* Budget Field (Only for expense categories when not hidden) */}
          {type !== 'income' && !hideBudget && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
                {t('budget')}
              </label>
              <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[8px] px-3.5 h-11 focus-within:border-[var(--accent-color)] transition-all">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent border-none text-sm font-bold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none font-amount tabular-nums"
                  placeholder="0"
                />
                <span className="text-xs font-bold text-[var(--text-secondary)] pl-2 select-none">
                  {currency}
                </span>
              </div>
            </div>
          )}

          {/* Color palette */}
          <div className="space-y-2">
            <div className="grid grid-cols-8 gap-2 bg-[var(--surface-muted)] p-2.5 rounded-[12px] border border-[var(--border-color)]">
              {/* Custom hex color input picker */}
              <div 
                className={`relative w-full aspect-square rounded-full border border-[var(--border-color)] cursor-pointer shadow-xs flex items-center justify-center group transition-all duration-200 active:scale-95 ${
                  isCustomSelected ? 'scale-110 ring-2 ring-white dark:ring-[#1C1C1C] shadow-md z-10' : 'hover:scale-105'
                }`}
                style={{ background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-20"
                  title="Välj anpassad färg"
                />
                <div 
                  className="w-6 h-6 rounded-full shadow-xs flex items-center justify-center z-10 transition-transform group-hover:scale-110 border border-black/5 dark:border-white/10"
                  style={{ 
                    backgroundColor: isCustomSelected ? color : 'var(--bg-card)',
                  }}
                >
                  {isCustomSelected ? (
                    <Check size={11} strokeWidth={3} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
                  ) : (
                    <Palette size={12} strokeWidth={2.5} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
                  )}
                </div>
              </div>
              {PRESET_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-full aspect-square rounded-full transition-transform active:scale-90 relative cursor-pointer ${
                      isSelected ? 'scale-110 shadow-sm ring-2 ring-white dark:ring-[#1C1C1C]' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Välj färg ${c}`}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full h-12 rounded-[8px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Check size={18} strokeWidth={2} />
            <span>{t('save')}</span>
          </button>
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
