import React, { useState, useEffect } from 'react';
import { ArrowUp, Receipt, PiggyBank } from 'lucide-react';
import { Transaction, Config } from '../types';
import { getLogoUrl, findKnownBrandDomain, getInstantBrandLogo } from '../utils/logo';
import { ICON_MAP, getCategoryIconName, resolveLucideIcon, suggestIcon, isEmojiString } from '../utils/icons';
import { getEmojiSolidColor } from '../utils/ui';

export function TransactionLogo({ transaction, config, size = 'md' }: { transaction: Transaction, config?: Config, size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const [autoImgError, setAutoImgError] = useState(false);
  const title = transaction.merchant || transaction.note || transaction.category;

  // Reset errors when transaction identity changing data changes
  useEffect(() => {
    setImgError(false);
    setAutoImgError(false);
  }, [transaction.logo, transaction.merchant, transaction.note, transaction.category, transaction.icon]);
  
  // Find category for colors
  const searchCategory = (transaction.category || '').trim().toLowerCase();
  const category = config ? [...(config.categories || []), ...(config.incomeCategories || [])].find(
    c => c.name.trim().toLowerCase() === searchCategory
  ) : null;

  const containerSize = size === 'lg' ? 'w-16 h-16 rounded-full' : size === 'sm' ? 'w-10 h-10 rounded-full' : 'w-[46px] h-[46px] rounded-full';
  const iconSize = size === 'lg' ? 28 : size === 'sm' ? 17 : 21;

  const hasContent = !!(transaction.merchant || transaction.note || (transaction.logo && transaction.logo !== 'none') || (transaction.icon && transaction.icon !== 'none' && transaction.icon !== 'receipt'));

  if (!hasContent) {
    return (
      <div className={`${containerSize} flex items-center justify-center overflow-hidden flex-shrink-0 bg-transparent`} />
    );
  }

  // Savings pot icon (Special case)
  if (transaction.type === 'savings' || transaction.category === 'Spargris') {
    return (
      <div className={`${containerSize} flex items-center justify-center overflow-hidden flex-shrink-0 bg-accent/10 text-accent`}>
        <PiggyBank size={iconSize} strokeWidth={1.5} />
      </div>
    );
  }

  // Explicit Logo variables
  const explicitLogo = transaction.logo && transaction.logo !== 'none' ? transaction.logo : null;
  const isExplicitLogoUrl = explicitLogo && (explicitLogo.startsWith('http') || explicitLogo.startsWith('data:image') || explicitLogo.startsWith('/'));
  const isExplicitLogoEmoji = explicitLogo && isEmojiString(explicitLogo);

  // Premium Vector Brand Logo matching (Coop, ICA, Willys, SATS, SL, SJ, etc.)
  const instantVectorLogo = getInstantBrandLogo(transaction.merchant || '') ||
                            getInstantBrandLogo(transaction.note || '') ||
                            getInstantBrandLogo(title || '');

  // Brand Favicon (Fallback for other brand matches)
  const brandDomain = findKnownBrandDomain(transaction.merchant || '') ||
                      findKnownBrandDomain(transaction.note || '') ||
                      findKnownBrandDomain(title || '');
  const brandLogo = brandDomain ? `https://www.google.com/s2/favicons?domain=${brandDomain}&sz=128` : null;

  // Explicit Icon variables
  const explicitIcon = transaction.icon && transaction.icon !== 'none' && transaction.icon !== 'receipt' ? transaction.icon : null;

  // Helper for rendering icons/emojis in unified Lucide vector style
  const renderIconView = (val: string) => {
    const iconKey = resolveLucideIcon(val);
    const Icon = ICON_MAP[iconKey] || (transaction.type === 'income' ? ArrowUp : Receipt);
    const bgColor = category?.color || getEmojiSolidColor(val);
    return (
      <div 
        className={`${containerSize} flex items-center justify-center overflow-hidden flex-shrink-0`}
        style={{ backgroundColor: bgColor, color: '#fff' }}
      >
        <Icon size={iconSize} strokeWidth={1.75} />
      </div>
    );
  };

  // Step 1: Explicit Logo URL / Data URI
  if (isExplicitLogoUrl && !imgError) {
    return (
      <div className={`${containerSize} bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs`}>
        <img 
          src={explicitLogo!} 
          alt={title} 
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Step 2: Instant Premium Vector Brand Logo (high fidelity SVGs)
  if (instantVectorLogo && !imgError) {
    return (
      <div className={`${containerSize} bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs`}>
        <img 
          src={instantVectorLogo} 
          alt={title} 
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Step 3: Known Brand Logo Favicon fallback
  if (brandLogo && !imgError) {
    return (
      <div className={`${containerSize} bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs`}>
        <img 
          src={brandLogo} 
          alt={title} 
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Step 4: Explicit Logo Emoji
  if (isExplicitLogoEmoji) {
    return renderIconView(explicitLogo!);
  }

  // Step 5: Explicit Icon
  if (explicitIcon) {
    return renderIconView(explicitIcon);
  }

  // Step 6: Contextual Keyword-suggested Icon
  const contextualIcon = suggestIcon(title);
  if (contextualIcon && contextualIcon !== 'receipt') {
    return renderIconView(contextualIcon);
  }

  // Step 7: Auto Logo URL (Only if title looks like an explicit domain, e.g. "openai.com" or "google.se")
  const isExplicitDomain = title.includes('.') && !title.includes(' ');
  const autoLogoUrl = (isExplicitDomain && !autoImgError) ? getLogoUrl(title) : null;
  if (autoLogoUrl && !autoImgError) {
    return (
      <div className={`${containerSize} bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs`}>
        <img 
          src={autoLogoUrl} 
          alt={title} 
          className="w-full h-full object-cover rounded-full"
          onError={() => setAutoImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Step 8: Category Icon/Emoji Fallback
  if (config) {
    const categoryIconName = category?.icon || getCategoryIconName(transaction.category);
    if (categoryIconName) {
      return renderIconView(categoryIconName);
    }
  }

  // Step 9: Default Fallback
  const DefaultIcon = transaction.type === 'income' ? ArrowUp : Receipt;
  const bgColor = category?.color || getEmojiSolidColor(title);
  
  return (
    <div 
      className={`${containerSize} flex items-center justify-center overflow-hidden flex-shrink-0`}
      style={{ backgroundColor: bgColor, color: '#fff' }}
    >
      <DefaultIcon size={iconSize} strokeWidth={1.5} />
    </div>
  );
}
