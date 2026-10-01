import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Trash2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { suggestIcon } from '../utils/icons';
import { IconPickerModal } from './IconPickerModal';
import { CategoryIcon } from './CategoryIcon';
import { Button, IconButton } from './ui';

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
          className="bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-2xl w-full max-w-sm rounded-[28px] overflow-hidden flex flex-col relative border border-black/10 dark:border-white/10 shadow-2xl font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              {isEdit ? t('edit') : t('newCategory')}
            </h2>
            <div className="flex items-center gap-2">
              {isEdit && onDelete && (
                <IconButton 
                  icon={<Trash2 size={16} />}
                  onClick={() => {
                    onDelete(initialData.index!);
                    onClose();
                  }}
                  variant="danger"
                  size="sm"
                  aria-label={t('delete')}
                />
              )}
              <IconButton 
                icon={<X size={18} strokeWidth={2} />}
                onClick={onClose}
                variant="muted"
                size="sm"
                aria-label={t('close')}
              />
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Preview */}
            <div className="flex flex-col items-center justify-center">
              <button 
                onClick={() => setShowIconPicker(true)}
                className="flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 group cursor-pointer"
              >
                <div className="relative group-hover:ring-4 group-hover:ring-accent/20 transition-all rounded-[14px]">
                  <CategoryIcon 
                    icon={icon} 
                    color={color} 
                    size="xl" 
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[14px]">
                    <span className="text-xs font-medium text-[var(--text-on-accent)] bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">Ändra</span>
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
                  className="w-full h-[48px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-[var(--accent-color)] dark:focus:border-white/40 rounded-[16px] px-4 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all"
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
                            ? 'scale-110 ring-2 ring-offset-2 ring-offset-[var(--bg-color)] ring-accent' 
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
                    className="w-7 h-7 rounded-full border border-dashed border-[var(--border-color)] flex items-center justify-center cursor-pointer hover:border-accent transition-colors relative overflow-hidden bg-[var(--surface-muted)] group" 
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

              <Button
                onClick={handleSave}
                disabled={!name.trim()}
                variant="primary"
                fullWidth
                size="lg"
                icon={<Check size={18} strokeWidth={2.5} />}
              >
                {t('save')}
              </Button>
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
