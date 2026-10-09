import React, { useState, useMemo } from 'react';
import { BottomSheet, Input } from './ui';
import { Search, Sparkles, Check } from 'lucide-react';
import { 
  ICONS8_CATEGORY_ICONS, 
  ICONS8_CATEGORY_GROUPS, 
  resolveIcons8Key, 
  getIcons8Url,
  CategoryColorIcon 
} from '../constants/icons8Categories';
import { EmptyState } from './EmptyState';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon: string;
  onSelectIcon: (iconKey: string) => void;
  categoryName?: string;
  t?: (key: any) => string;
}

export function IconPickerModal({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon,
  categoryName
}: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const resolvedSelectedKey = useMemo(() => {
    return resolveIcons8Key(selectedIcon, categoryName);
  }, [selectedIcon, categoryName]);

  // Filtered icons
  const filteredIcons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return ICONS8_CATEGORY_ICONS.filter(item => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Search query filter
      if (!q) return true;

      const nameMatch = item.name.toLowerCase().includes(q);
      const keyMatch = item.key.toLowerCase().includes(q);
      const keywordMatch = item.keywords.some(kw => kw.toLowerCase().includes(q));

      return nameMatch || keyMatch || keywordMatch;
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  const handleSelect = (iconKey: string) => {
    onSelectIcon(iconKey);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Välj kategoriikon"
      headerLeading={
        <div className="w-9 h-9 rounded-[var(--radius-button-sm,10px)] bg-black/5 dark:bg-white/5 text-[var(--text-primary)] flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
      }
      size="xl"
      zIndex={150}
    >
      {/* Search & Categories Bar */}
      <div className="p-4 pb-2 shrink-0 space-y-3">
        <Input
          variant="search"
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Sök ikon (t.ex. matkasse, bil, gym, hus, nöje)..."
        />

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {ICONS8_CATEGORY_GROUPS.map(cat => {
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-[var(--radius-button-sm,10px)] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold shadow-xs scale-[1.02]'
                    : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-color)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subheader info */}
      <div className="px-5 py-1.5 flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-medium shrink-0">
        <span>
          {activeCategory === 'all' 
            ? (searchQuery ? `Sökresultat för "${searchQuery}"` : 'Alla ikoner (Icons8 Color)') 
            : (ICONS8_CATEGORY_GROUPS.find(c => c.id === activeCategory)?.label || 'Kategori')}
        </span>
        <span className="opacity-75">
          {filteredIcons.length} ikoner
        </span>
      </div>

      {/* Icons Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar space-y-4">
        {filteredIcons.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Inga ikoner hittades"
            description='Prova söka på något annat, t.ex. "mat", "bil", "gym", "fika"'
            className="my-4"
          />
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-2.5 pb-6">
            {filteredIcons.map((item: CategoryColorIcon) => {
              const isSelected = resolvedSelectedKey === item.key;
              const iconUrl = getIcons8Url(item.key);

              return (
                <button
                  key={item.key}
                  onClick={() => handleSelect(item.key)}
                  className={`relative aspect-square rounded-[var(--radius-card,14px)] flex flex-col items-center justify-center gap-1.5 p-2 transition-all group cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--accent-color)]/10 border-2 border-[var(--accent-color)] ring-2 ring-[var(--accent-color)]/20 shadow-xs scale-[1.02]'
                      : 'bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-[var(--border-color)] hover:border-[var(--accent-color)]/40'
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center p-1 rounded-full bg-black/[0.02] dark:bg-white/[0.04]">
                    <img 
                      src={iconUrl} 
                      alt={item.name} 
                      width={34} 
                      height={34} 
                      className="w-full h-full object-contain pointer-events-none drop-shadow-2xs transition-transform group-hover:scale-110" 
                      loading="lazy" 
                    />
                  </div>
                  <span className="text-[10px] text-center truncate w-full px-0.5 opacity-90 group-hover:opacity-100 font-medium leading-tight text-[var(--text-primary)]">
                    {item.name.split('/')[0].trim()}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--accent-color)] text-[var(--on-accent)] rounded-full flex items-center justify-center shadow-xs">
                      <Check size={10} strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
