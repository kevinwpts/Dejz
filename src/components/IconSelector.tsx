import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Upload, Check, Plus } from 'lucide-react';
import { fetchLogoForName, getInstantBrandLogo } from '../utils/logo';
import { uploadLogo } from '../services/storageService';
import { TranslationKey } from '../i18n';
import { suggestIcon, resolveLucideIcon, ICON_MAP } from '../utils/icons';
import { IconPickerModal } from './IconPickerModal';


interface IconSelectorProps {
  name: string;
  currentIcon: string;
  currentLogo?: string;
  autoLogo?: string;
  onIconChange: (icon: string) => void;
  onLogoChange: (url: string | undefined) => void;
  onRestoreAuto?: () => void;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
  isPro: boolean;
  userId?: string;
}

const QUICK_ICONS = ['utensils', 'shopping', 'home', 'car', 'drama', 'receipt', 'health', 'plane', 'baby', 'banknote', 'dumbbell', 'gamepad'];

export function IconSelector({ 
  name, 
  currentIcon, 
  currentLogo, 
  autoLogo,
  onIconChange, 
  onLogoChange, 
  onRestoreAuto,
  t, 
  isPro: _isPro, 
  userId 
}: IconSelectorProps) {
  const [fetchedLogo, setFetchedLogo] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestedEmoji = name && name.length >= 2 ? suggestIcon(name) : undefined;

  useEffect(() => {
    const fetchLogo = async () => {
      if (name && name.length >= 2) {
        const instant = getInstantBrandLogo(name);
        if (instant) {
          setFetchedLogo(instant);
          return;
        }
        const logo = await fetchLogoForName(name);
        setFetchedLogo(logo);
      } else {
        setFetchedLogo(undefined);
      }
    };
    fetchLogo();
  }, [name]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);
    try {
      const url = await uploadLogo(file, userId);
      if (url) {
        onLogoChange(url);
        onIconChange('none');
      }
    } catch (_error) {
      console.error('Upload failed', _error);
    } finally {
      setIsUploading(false);
    }
  };

  const isSelected = (emoji: string) => currentIcon === emoji && !currentLogo;
  const isLogoSelected = (url: string) => currentLogo === url;

  return (
    <div className="space-y-8 pb-4">
      {/* 1. Automated Suggestion / Current Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {t('suggested')}
          </label>
          {onRestoreAuto && (currentLogo || (currentIcon !== 'receipt' && currentIcon !== '🧾')) && (
            <button 
              onClick={onRestoreAuto}
              className="text-xs font-medium text-accent flex items-center gap-1 hover:opacity-70 transition-opacity"
            >
              <Sparkles size={12} strokeWidth={1.5} />
              {t('restoreToAuto')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* The "Auto" Logo if fetched */}
          {(fetchedLogo || autoLogo) && (
            <button
              onClick={() => {
                onLogoChange(fetchedLogo || autoLogo);
                onIconChange('none');
              }}
              className={`relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all border ${
                isLogoSelected(fetchedLogo || autoLogo || '')
                  ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                  : 'bg-[var(--surface-muted)] border-[var(--border-color)] hover:border-accent/50'
              }`}
            >
              <img src={fetchedLogo || autoLogo} alt="Logo" className="w-full h-full object-contain p-2 rounded-full" referrerPolicy="no-referrer" />
              {isLogoSelected(fetchedLogo || autoLogo || '') && (
                <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                   <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center text-[var(--text-on-accent)] scale-110 shadow-xs">
                      <Check size={12} strokeWidth={2} />
                   </div>
                </div>
              )}
            </button>
          )}

          {/* Suggested Emoji (if matches a category/keyword) */}
          
          {suggestedEmoji && suggestedEmoji !== 'receipt' && (
            <button
              onClick={() => {
                onIconChange(suggestedEmoji);
                onLogoChange(undefined);
              }}
              className={`relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all border ${
                isSelected(suggestedEmoji)
                  ? 'border-accent bg-accent/10 ring-2 ring-accent/20 text-accent'
                  : 'bg-[var(--surface-muted)] border-[var(--border-color)] hover:border-accent/50 text-[var(--text-primary)]'
              }`}
            >
              {(() => {
                const key = resolveLucideIcon(suggestedEmoji);
                const Icon = ICON_MAP[key] || Sparkles;
                return <Icon size={26} strokeWidth={1.75} />;
              })()}
              {isSelected(suggestedEmoji) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-[var(--text-on-accent)] scale-110 shadow-xs">
                  <Check size={12} strokeWidth={2} />
                </div>
              )}
            </button>
          )}


          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 h-16 rounded-[14px] border border-solid flex flex-col items-center justify-center gap-1 transition-all ${
              currentLogo && currentLogo !== fetchedLogo && currentLogo !== autoLogo
                ? 'border-accent bg-accent/5 text-accent '
                : 'bg-[var(--surface-muted)] border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-accent/50 hover:text-accent hover:bg-accent/5'
            }`}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : currentLogo && currentLogo !== fetchedLogo && currentLogo !== autoLogo ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                 <img src={currentLogo} alt="Custom" className="w-8 h-8 object-contain rounded-full" />
                 <span className="text-[10px] font-medium mt-0.5">{t('customLogo')}</span>
              </div>
            ) : (
              <>
                <Upload size={18} strokeWidth={1.5} className="opacity-40" />
                <span className="text-xs font-medium">{t('uploadLogo')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Snabbval Ikoner */}
      <div className="space-y-4">
        <label className="text-xs font-medium text-[var(--text-secondary)] px-1">
          Ikoner
        </label>
        <div className="grid grid-cols-4 gap-2.5">
          
          {QUICK_ICONS.map(iconKey => {
            const resolvedKey = resolveLucideIcon(iconKey);
            const Icon = ICON_MAP[resolvedKey] || Sparkles;
            const selected = isSelected(iconKey) || isSelected(resolvedKey);
            return (
            <button
              key={iconKey}
              onClick={() => {
                onIconChange(resolvedKey);
                onLogoChange(undefined);
              }}
              className={`relative aspect-square rounded-[14px] flex items-center justify-center text-[var(--text-primary)] transition-all border ${
                selected
                  ? 'border-accent bg-accent/10 ring-2 ring-accent/20 text-accent '
                  : 'bg-[var(--surface-muted)] border-[var(--border-color)] hover:border-accent/30'
              }`}
            >
              <Icon size={22} strokeWidth={1.75} />
              {selected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-[4px] flex items-center justify-center text-[var(--text-on-accent)] scale-110 shadow-xs">
                  <Check size={10} strokeWidth={2} />
                </div>
              )}
            </button>
          )})}

          
          <button
            onClick={() => setShowEmojiPicker(true)}
            className={`relative aspect-square rounded-[14px] flex items-center justify-center transition-all border border-solid ${
              !QUICK_ICONS.includes(currentIcon) && currentIcon !== 'none' && currentIcon !== 'receipt' && !currentLogo
                ? 'border-accent bg-accent/10 ring-2 ring-accent/20 text-accent'
                : 'bg-[var(--surface-muted)] border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-accent/50'
            }`}
          >
            
            {!QUICK_ICONS.includes(currentIcon) && currentIcon !== 'none' && currentIcon !== 'receipt' && !currentLogo ? (
              (() => {
                const key = resolveLucideIcon(currentIcon);
                const Icon = ICON_MAP[key] || Sparkles;
                return <Icon size={22} strokeWidth={1.75} />;
              })()
            ) : (
              <Plus size={20} strokeWidth={1.5} />
            )}

          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Icon & Emoji Picker Modal */}
      <IconPickerModal
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        selectedIcon={currentIcon}
        onSelectIcon={(iconKey) => {
          onIconChange(iconKey);
          onLogoChange(undefined);
        }}
      />
    </div>
  );
}
