import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Trash2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { suggestIcon } from '../utils/icons';
import { IconPickerModal } from './IconPickerModal';
import { CategoryIcon } from './CategoryIcon';

import { DEFAULT_CATEGORY_PALETTE } from '../utils/categoryColors';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'expense' | 'income';
  initialData: { name: string; icon: string; color?: string; index?: number } | null;
  onSave: (data: { name: string; icon: string; color?: string; index?: number }) => void;
  onDelete?: (index: number) => void;
  t: (key: TranslationKey) => string;
}

const PRESET_COLORS = [...DEFAULT_CATEGORY_PALETTE];

export function CategoryModal({ 
  isOpen, 
  onClose, 
  _type, 
  initialData, 
  onSave, 
  onDelete, 
  t 
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('receipt');
  const [color, setColor] = useState('#6658E8');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || 'receipt');
      setColor(initialData?.color || '#6658E8');
      setShowIconPicker(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isEdit = initialData?.index !== undefined;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon, color, index: initialData?.index });
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--bg-color)] w-full max-w-sm rounded-[28px] overflow-hidden flex flex-col relative border-none shadow-2xl font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-5 border-b border-black/[0.06] dark:border-white/[0.08]">
            <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">
              {isEdit ? t('edit') : t('newCategory')}
            </h2>
            <div className="flex items-center gap-2">
              {isEdit && onDelete && (
                <button 
                  type="button"
                  onClick={() => {
                    onDelete(initialData.index!);
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer hover:bg-rose-500/20"
                  aria-label={t('delete')}
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button 
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer border-none shadow-none"
                aria-label={t('close')}
              >
                <X size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Preview */}
            <div className="flex flex-col items-center justify-center">
              <button 
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 group cursor-pointer"
              >
                <div className="relative group-hover:ring-4 group-hover:ring-[var(--accent-color)]/20 transition-all rounded-[14px]">
                  <CategoryIcon 
                    icon={icon} 
                    color={color} 
                    size="xl" 
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[14px]">
                    <span className="text-xs font-medium text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">Ändra</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
                  Namn
                </label>
                <input 
                  type="text" 
                  placeholder={t('newCategory')}
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    if (val.length > 1 && (!initialData || val.length - initialData.name.length > 1)) {
                      setIcon(suggestIcon(val));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                  }}
                  className="w-full h-12 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-4 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent-color)]"
                />
              </div>

              {/* Color Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Kategorifärg
                  </label>
                  <span className="text-[10px] font-mono font-semibold text-[var(--text-tertiary)] uppercase opacity-70">
                    {color}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {PRESET_COLORS.map(c => {
                    const isSelected = color.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition-all relative cursor-pointer ${
                          isSelected 
                            ? 'scale-110 ring-2 ring-offset-2 ring-offset-[var(--bg-color)] ring-[var(--accent-color)]' 
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Välj färg ${c}`}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center text-white">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom color picker button */}
                  <label 
                    className="w-7 h-7 rounded-full border border-dashed border-black/20 dark:border-white/20 flex items-center justify-center cursor-pointer hover:border-[var(--accent-color)] transition-colors relative overflow-hidden bg-black/[0.04] dark:bg-white/[0.06] group" 
                    title="Anpassad färg"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-white/30 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim()}
                className="w-full h-12 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Check size={18} strokeWidth={2.5} />
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Icon Picker Overlay */}
        <IconPickerModal
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          selectedIcon={icon}
          onSelectIcon={(newIcon) => setIcon(newIcon)}
          categoryName={name}
          t={t}
        />
      </motion.div>
    </AnimatePresence>
  );
}
