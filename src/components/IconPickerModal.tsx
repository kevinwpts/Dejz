import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Sparkles, Check } from 'lucide-react';
import { 
  ICON_MAP, 
  ICON_CATEGORIES, 
  ALL_ICONS_LIST,
  resolveLucideIcon
} from '../utils/icons';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon: string;
  onSelectIcon: (iconKey: string) => void;
  t?: (key: any) => string;
}

export function IconPickerModal({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon
}: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const resolvedSelectedKey = useMemo(() => {
    return resolveLucideIcon(selectedIcon);
  }, [selectedIcon]);

  // Filtered icons based on active category and search query
  const filteredIcons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return ALL_ICONS_LIST.filter(item => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Search query filter
      if (!q) return true;

      const matchesKey = item.key.toLowerCase().includes(q);
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesKeywords = item.keywords.some(k => k.toLowerCase().includes(q));

      return matchesKey || matchesName || matchesKeywords;
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  const handleSelect = (iconKey: string) => {
    onSelectIcon(iconKey);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="bg-[var(--bg-secondary)] w-full max-w-lg rounded-[28px] border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border-color)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                  Välj ikon
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-[var(--border-color)] rounded-full transition-colors text-[var(--text-secondary)] cursor-pointer"
              aria-label="Stäng"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Search & Categories Bar */}
          <div className="p-4 pb-2 shrink-0 space-y-3">
            <div className="relative">
              <Search 
                size={16} 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none opacity-60" 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Sök bland över 200+ stilrena ikoner..."
                className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] focus:border-accent/40 rounded-[14px] pl-9.5 pr-9 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-[4px] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-xs text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {ICON_CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id;
                const CatIcon = ICON_MAP[cat.icon];

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-accent text-[var(--text-on-accent)] font-semibold shadow-xs scale-[1.02]'
                        : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-color)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                    }`}
                  >
                    {CatIcon && <CatIcon size={13} strokeWidth={2} />}
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
                ? (searchQuery ? `Sökresultat för "${searchQuery}"` : 'Alla kategorier') 
                : (ICON_CATEGORIES.find(c => c.id === activeCategory)?.label || 'Kategori')}
            </span>
            <span className="opacity-75">
              {filteredIcons.length} ikoner
            </span>
          </div>

          {/* Icons Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
            {filteredIcons.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Inga ikoner hittades
                </p>
                <p className="text-xs text-[var(--text-secondary)] opacity-70">
                  Prova söka på något annat, t.ex. &quot;fika&quot;, &quot;bil&quot;, &quot;lön&quot;, &quot;gym&quot;
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-2.5 pb-6">
                {filteredIcons.map(item => {
                  const IconComponent = ICON_MAP[item.key];
                  if (!IconComponent) return null;
                  const isSelected = resolvedSelectedKey === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => handleSelect(item.key)}
                      className={`relative aspect-square rounded-[16px] flex flex-col items-center justify-center gap-1.5 p-2 transition-all group cursor-pointer select-none ${
                        isSelected
                          ? 'bg-accent/15 text-accent border border-accent ring-2 ring-accent/30 shadow-xs scale-[1.02]'
                          : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] hover:border-accent/40'
                      }`}
                    >
                      <IconComponent 
                        size={22} 
                        strokeWidth={1.75} 
                        className="transition-transform group-hover:scale-110"
                      />
                      <span className="text-[10px] text-center truncate w-full px-0.5 opacity-80 group-hover:opacity-100 font-medium leading-tight">
                        {item.name.split('/')[0].trim()}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center text-[var(--text-on-accent)] shadow-xs">
                          <Check size={10} strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>


        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
