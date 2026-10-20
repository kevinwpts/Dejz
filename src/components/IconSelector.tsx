import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Upload, Check, Plus } from 'lucide-react';
import { fetchLogoForName, getLogoUrl, getFallbackLogoUrl, sanitizeLogoUrl } from '../utils/logo';
import { getAutomaticMerchantLogo, isAutomaticMerchantLogo } from '../utils/resolver';
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
  const [fallbackLogo, setFallbackLogo] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Resolve automatic merchant logo from our central resolver or logo database
  const instantAuto = useMemo(() => {
    return getAutomaticMerchantLogo(name) || (name ? getLogoUrl(name) : undefined);
  }, [name]);

  useEffect(() => {
    let isCancelled = false;
    setFallbackLogo(undefined);
    const resolveLogo = async () => {
      if (instantAuto) {
        setFetchedLogo(instantAuto);
        return;
      }
      if (name && name.length >= 2) {
        const logo = await fetchLogoForName(name);
        if (!isCancelled) {
          setFetchedLogo(logo);
        }
      } else {
        if (!isCancelled) setFetchedLogo(undefined);
      }
    };
    resolveLogo();
    return () => {
      isCancelled = true;
    };
  }, [name, instantAuto]);

  const rawAutoMerchantLogo = fallbackLogo || instantAuto || fetchedLogo || autoLogo;
  const autoMerchantLogo = rawAutoMerchantLogo ? sanitizeLogoUrl(rawAutoMerchantLogo, name) : undefined;

  // 2. Custom User Logo: strictly separated from automatic merchant logos.
  // A corporate logo (McDonald's, Lidl, etc.) is NEVER a custom user logo.
  const isCurrentCustom = Boolean(currentLogo && !isAutomaticMerchantLogo(currentLogo, name));
  const [customUserLogo, setCustomUserLogo] = useState<string | undefined>(isCurrentCustom ? currentLogo : undefined);

  useEffect(() => {
    if (currentLogo && !isAutomaticMerchantLogo(currentLogo, name)) {
      setCustomUserLogo(currentLogo);
    }
  }, [currentLogo, name]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);
    try {
      const url = await uploadLogo(file, userId);
      if (url) {
        setCustomUserLogo(url);
        onLogoChange(url);
        onIconChange('none');
      }
    } catch (_error) {
      console.error('Upload failed', _error);
    } finally {
      setIsUploading(false);
    }
  };

  const suggestedEmoji = name && name.length >= 2 ? suggestIcon(name) : undefined;

  // 3. Selection States
  const hasManualIcon = Boolean(currentIcon && currentIcon !== 'none' && currentIcon !== 'receipt' && currentIcon !== '🧾');
  
  const isCustomLogoSelected = Boolean(
    customUserLogo && 
    currentLogo === customUserLogo && 
    !isAutomaticMerchantLogo(customUserLogo, name)
  );

  const isAutoLogoSelected = Boolean(
    autoMerchantLogo &&
    !isCustomLogoSelected &&
    !hasManualIcon &&
    (currentLogo === autoMerchantLogo ||
     (currentLogo && isAutomaticMerchantLogo(currentLogo, name)) ||
     !currentLogo)
  );

  const isIconSelected = (emoji: string) => {
    if (isAutoLogoSelected || isCustomLogoSelected) return false;
    const resolvedEmoji = resolveLucideIcon(emoji);
    const resolvedCurrent = resolveLucideIcon(currentIcon);
    return currentIcon === emoji || resolvedCurrent === resolvedEmoji;
  };

  return (
    <div className="space-y-8 pb-4">
      {/* 1. Automated Suggestion / Current Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-label font-medium text-[var(--text-secondary)]">
            {t('suggested')}
          </label>
          {onRestoreAuto && (currentLogo || hasManualIcon) && (
            <button 
              type="button"
              onClick={onRestoreAuto}
              className="text-label font-medium text-accent flex items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer"
            >
              <Sparkles size={12} strokeWidth={2} />
              {t('restoreToAuto')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Automatic Merchant Logo under "Förslag" */}
          {autoMerchantLogo && (
            <button
              type="button"
              onClick={() => {
                onLogoChange(autoMerchantLogo);
                onIconChange('none');
              }}
              className={`relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all border cursor-pointer ${
                isAutoLogoSelected
                  ? 'border-subtle dark:border-white ring-2 ring-control bg-white shadow-xs'
                  : 'bg-[var(--surface-muted)] border-[var(--border-color)] hover:border-subtle dark:hover:border-subtle'
              }`}
              title={name}
            >
              <img 
                src={autoMerchantLogo} 
                alt={name} 
                className="w-full h-full object-contain p-2 rounded-full" 
                referrerPolicy="no-referrer"
                onError={() => {
                  const fb = getFallbackLogoUrl(autoMerchantLogo, name);
                  if (fb && fb !== autoMerchantLogo && fb !== fallbackLogo) {
                    setFallbackLogo(fb);
                  }
                }}
              />
              {isAutoLogoSelected && (
                <div className="absolute inset-0 bg-black/10 dark:bg-black/30 flex items-center justify-center">
                  <div className="w-5 h-5 bg-[var(--accent-color)] text-[var(--on-accent)] rounded-full flex items-center justify-center scale-110 shadow-xs">
                    <Check size={12} strokeWidth={2.5} />
                  </div>
                </div>
              )}
            </button>
          )}

          {/* Suggested Emoji (if matches keyword/category) */}
          {suggestedEmoji && suggestedEmoji !== 'receipt' && (
            <button
              type="button"
              onClick={() => {
                onIconChange(suggestedEmoji);
                onLogoChange(undefined);
              }}
              className={`relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all border cursor-pointer ${
                isIconSelected(suggestedEmoji)
                  ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 ring-2 ring-[var(--accent-color)]/20 text-[var(--accent-color)]'
                  : 'bg-[var(--surface-muted)] border-[var(--border-color)] hover:border-[var(--accent-color)]/40 text-[var(--text-primary)]'
              }`}
            >
              {(() => {
                const key = resolveLucideIcon(suggestedEmoji);
                const Icon = ICON_MAP[key] || Sparkles;
                return <Icon size={26} strokeWidth={2} />;
              })()}
              {isIconSelected(suggestedEmoji) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent-color)] text-[var(--on-accent)] rounded-full flex items-center justify-center scale-110 shadow-xs">
                  <Check size={12} strokeWidth={2.5} />
                </div>
              )}
            </button>
          )}

          {/* Egen Logotyp / Upload Action - NEVER shows automatic merchant logo */}
          <button
            type="button"
            onClick={() => {
              if (customUserLogo && isCustomLogoSelected) {
                fileInputRef.current?.click();
              } else if (customUserLogo) {
                onLogoChange(customUserLogo);
                onIconChange('none');
              } else {
                fileInputRef.current?.click();
              }
            }}
            className={`flex-1 h-16 rounded-card-nested border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
              isCustomLogoSelected
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 ring-1 ring-[var(--accent-color)] text-[var(--accent-color)]'
                : 'bg-[var(--surface-muted)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)]/30'
            }`}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
            ) : customUserLogo && !isAutomaticMerchantLogo(customUserLogo, name) ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img src={customUserLogo} alt="Custom" className="w-8 h-8 object-contain rounded-full" />
                <span className="text-micro-label font-semibold mt-0.5">{t('customLogo')}</span>
                {isCustomLogoSelected && (
                  <div className="absolute top-1.5 right-2 w-4 h-4 bg-[var(--accent-color)] text-[var(--on-accent)] rounded-full flex items-center justify-center scale-90 shadow-xs">
                    <Check size={10} strokeWidth={2.5} />
                  </div>
                )}
              </div>
            ) : (
              <>
                <Upload size={18} strokeWidth={2} className="opacity-60" />
                <span className="text-label font-semibold">{t('uploadLogo')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Snabbval Ikoner */}
      <div className="space-y-4">
        <label className="text-label font-medium text-[var(--text-secondary)] px-1">
          Ikoner
        </label>
        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_ICONS.map(iconKey => {
            const resolvedKey = resolveLucideIcon(iconKey);
            const Icon = ICON_MAP[resolvedKey] || Sparkles;
            const selected = isIconSelected(iconKey);
            return (
              <button
                key={iconKey}
                type="button"
                onClick={() => {
                  onIconChange(resolvedKey);
                  onLogoChange(undefined);
                }}
                className={`relative aspect-square rounded-[var(--radius-button,12px)] flex items-center justify-center text-[var(--text-primary)] transition-all border cursor-pointer ${
                  selected
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 ring-2 ring-[var(--accent-color)]/20 text-[var(--accent-color)]'
                    : 'bg-[var(--surface-muted)] border-[var(--border-color)] hover:border-[var(--accent-color)]/30'
                }`}
              >
                <Icon size={22} strokeWidth={2} />
                {selected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-color)] text-[var(--on-accent)] rounded-full flex items-center justify-center scale-110 shadow-xs">
                    <Check size={10} strokeWidth={2.5} />
                  </div>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowEmojiPicker(true)}
            className={`relative aspect-square rounded-[var(--radius-button,12px)] flex items-center justify-center transition-all border border-solid cursor-pointer ${
              hasManualIcon && !QUICK_ICONS.includes(currentIcon) && !isAutoLogoSelected && !isCustomLogoSelected
                ? 'border-[var(--accent-color)] bg-[var(--accent-light)] ring-2 ring-[var(--accent-color)]/20 text-[var(--accent-color)]'
                : 'bg-[var(--surface-muted)] border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-subtle dark:hover:border-subtle'
            }`}
          >
            {hasManualIcon && !QUICK_ICONS.includes(currentIcon) && !isAutoLogoSelected && !isCustomLogoSelected ? (
              (() => {
                const key = resolveLucideIcon(currentIcon);
                const Icon = ICON_MAP[key] || Sparkles;
                return <Icon size={22} strokeWidth={2} />;
              })()
            ) : (
              <Plus size={20} strokeWidth={2} />
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
