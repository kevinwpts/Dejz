import React, { useState, useEffect } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { suggestIcon } from '../utils/icons';
import { IconPickerModal } from './IconPickerModal';
import { CategoryIcon } from './CategoryIcon';
import { DEFAULT_CATEGORY_PALETTE } from '../utils/categoryColors';
import { Modal, IconButton } from './ui';

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

  const isEdit = initialData?.index !== undefined;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon, color, index: initialData?.index });
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
                size="xl" 
                customBgColor={color} 
                whiteIcon 
                shape="squircle"
              />
            </div>
            <span className="text-xs font-semibold text-[var(--accent-color)] group-hover:underline">
              {t('changeIcon')}
            </span>
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
              className="w-full h-11 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-3.5 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent-color)]"
              placeholder={t('name')}
              autoFocus
            />
          </div>

          {/* Color palette */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
              {t('color')}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform active:scale-90 relative cursor-pointer ${
                      isSelected ? 'scale-110 shadow-xs ring-2 ring-white dark:ring-[#1C1C1C]' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Välj färg ${c}`}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <Check size={14} strokeWidth={2.5} />
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
