import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Check, ArrowUp, ArrowDown, RotateCcw, 
  Search, Trash2, Smartphone, CheckCircle2
} from 'lucide-react';
import { Config, HomeWidgetConfig, HomeWidgetId } from '../../types';
import { AVAILABLE_WIDGETS, DEFAULT_HOME_WIDGETS, getResolvedHomeWidgets } from '../../utils/widgetRegistry';
import { feedback } from '../../utils/feedback';
import { useScrollLock } from '../../hooks/useScrollLock';

// Import live widgets for faithful iOS-style previews
import { MonthlyPulseWidget } from './MonthlyPulseWidget';
import { SavingsGoalsWidget } from './SavingsGoalsWidget';
import { DailySummaryWidget } from './DailySummaryWidget';
import { CategoryBudgetsWidget } from './CategoryBudgetsWidget';
import { RecentReceiptsWidget } from './RecentReceiptsWidget';

interface WidgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  onSaveWidgets: (widgets: HomeWidgetConfig[]) => void;
  stats?: any;
  selectedDate?: Date;
  allTransactions?: any[];
  attentionItems?: any[];
}

export function WidgetManagerModal({
  isOpen,
  onClose,
  config,
  onSaveWidgets,
  stats,
  selectedDate = new Date(),
  allTransactions = [],
  attentionItems = []
}: WidgetManagerModalProps) {
  useScrollLock(isOpen);
  const isEn = config?.language === 'en';

  const [activeTab, setActiveTab] = useState<'gallery' | 'active'>('gallery');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentWidgets, setCurrentWidgets] = useState<HomeWidgetConfig[]>(() =>
    getResolvedHomeWidgets(config?.homeWidgets)
  );

  // Per-widget size selection map
  const [widgetSizes, setWidgetSizes] = useState<Record<string, 'small' | 'medium' | 'large'>>({
    monthly_pulse: 'medium',
    savings_goals: 'medium',
    daily_summary: 'medium',
    category_budgets: 'medium',
    recent_receipts: 'medium',
    attention_items: 'medium'
  });

  useEffect(() => {
    if (isOpen) {
      const resolved = getResolvedHomeWidgets(config?.homeWidgets);
      setCurrentWidgets(resolved);

      // Populate current sizes from saved widget configs
      const sizeMap: Record<string, 'small' | 'medium' | 'large'> = {};
      resolved.forEach(w => {
        sizeMap[w.id] = w.size || 'medium';
      });
      setWidgetSizes(prev => ({ ...prev, ...sizeMap }));
    }
  }, [isOpen, config?.homeWidgets]);

  const filteredGalleryDefs = useMemo(() => {
    const available = AVAILABLE_WIDGETS.filter(w => w.id !== 'quick_expense');
    if (!searchQuery.trim()) return available;
    const q = searchQuery.toLowerCase();
    return available.filter(
      (w) => (isEn ? w.titleEn : w.title).toLowerCase().includes(q) ||
             (isEn ? w.descriptionEn : w.description).toLowerCase().includes(q)
    );
  }, [searchQuery, isEn]);

  if (!isOpen) return null;

  const handleAddOrUpdateWidget = (id: HomeWidgetId, size: 'small' | 'medium' | 'large') => {
    feedback.success();
    const updated = currentWidgets.map((w) => {
      if (w.id === id) {
        return { ...w, enabled: true, size };
      }
      return w;
    });

    setCurrentWidgets(updated);
    onSaveWidgets(updated);
  };

  const handleRemoveWidget = (id: HomeWidgetId, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    feedback.selection();

    const updated = currentWidgets.map((w) => {
      if (w.id === id) {
        return { ...w, enabled: false };
      }
      return w;
    });

    setCurrentWidgets(updated);
    onSaveWidgets(updated);
  };

  const handleMoveActive = (activeIdx: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    feedback.selection();

    const activeItems = currentWidgets.filter((w) => w.enabled);
    const inactiveItems = currentWidgets.filter((w) => !w.enabled);

    const targetIdx = direction === 'up' ? activeIdx - 1 : activeIdx + 1;
    if (targetIdx < 0 || targetIdx >= activeItems.length) return;

    const copy = [...activeItems];
    const [moved] = copy.splice(activeIdx, 1);
    copy.splice(targetIdx, 0, moved);

    const merged = [...copy, ...inactiveItems].map((w, idx) => ({ ...w, order: idx }));
    setCurrentWidgets(merged);
    onSaveWidgets(merged);
  };

  const handleUpdateSize = (id: HomeWidgetId, size: 'small' | 'medium' | 'large') => {
    feedback.selection();
    setWidgetSizes(prev => ({ ...prev, [id]: size }));
    const updated = currentWidgets.map((w) => {
      if (w.id === id) {
        return { ...w, size };
      }
      return w;
    });
    setCurrentWidgets(updated);
    onSaveWidgets(updated);
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    feedback.tap();
    setCurrentWidgets(DEFAULT_HOME_WIDGETS);
    onSaveWidgets(DEFAULT_HOME_WIDGETS);
  };

  const activeWidgetConfigs = currentWidgets.filter((w) => w.enabled);

  // Live Widget Renderer for iOS Preview Card
  const renderLiveWidgetPreview = (id: HomeWidgetId, size: 'small' | 'medium' | 'large') => {
    const scaleClass = size === 'small' ? 'max-w-[240px]' : size === 'large' ? 'w-full' : 'max-w-[420px]';

    return (
      <div className={`mx-auto transition-all duration-300 ${scaleClass} relative pointer-events-none`}>
        {id === 'monthly_pulse' && (
          <MonthlyPulseWidget stats={stats} config={config} language={config?.language || 'sv'} />
        )}

        {id === 'savings_goals' && (
          <SavingsGoalsWidget config={config} onNavigate={() => {}} />
        )}

        {id === 'daily_summary' && (
          <DailySummaryWidget config={config} selectedDate={selectedDate} stats={stats} />
        )}

        {id === 'category_budgets' && (
          <CategoryBudgetsWidget config={config} stats={stats} allTransactions={allTransactions} onNavigate={() => {}} />
        )}

        {id === 'recent_receipts' && (
          <RecentReceiptsWidget allTransactions={allTransactions} config={config} onNavigate={() => {}} />
        )}

        {id === 'attention_items' && (
          <div className="p-4 rounded-3xl bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">{isEn ? 'Action required' : 'Åtgärder som krävs'}</span>
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold flex items-center justify-center">
                {attentionItems.length || 1}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {isEn ? 'Alerts for unconfirmed bills or incomes' : 'Påminnelser om obekräftade eller fördröjda räkningar.'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl bg-[var(--bg-color)] rounded-t-[32px] sm:rounded-[32px] border border-[var(--border-color)] shadow-2xl max-h-[92vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border-color)]/60 bg-[var(--surface-color)] shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-accent/20 text-[var(--accent-color)] flex items-center justify-center shrink-0">
                  <Smartphone size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-[17px] font-extrabold text-[var(--text-primary)] tracking-tight">
                    {isEn ? 'Widget Gallery' : 'Widgetgalleri'}
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {isEn ? 'All widgets rendered in live iOS preview' : 'Alla widgets förhandsvisas direkt som hemskärmskort'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]/80 text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* iOS Style Tabs Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="p-1 rounded-2xl bg-[var(--surface-muted)]/60 flex items-center gap-1 flex-1">
                <button
                  type="button"
                  onClick={() => { feedback.tap(); setActiveTab('gallery'); }}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    activeTab === 'gallery'
                      ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isEn ? 'Gallery' : 'Galleriet'}
                </button>
                <button
                  type="button"
                  onClick={() => { feedback.tap(); setActiveTab('active'); }}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeTab === 'active'
                      ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{isEn ? 'Active' : 'Aktiva'}</span>
                  <span className="w-4 h-4 rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] text-[10px] font-extrabold flex items-center justify-center">
                    {activeWidgetConfigs.length}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--accent-color)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
                title={isEn ? 'Reset default' : 'Återställ till standard'}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {activeTab === 'gallery' ? (
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? 'Search widgets...' : 'Sök bland widgets...'}
                  className="w-full h-10 pl-9 pr-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] text-xs sm:text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)] shadow-2xs transition-all"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
              </div>

              {/* Feed of Live Preview Cards */}
              <div className="space-y-4">
                {filteredGalleryDefs.map((def) => {
                  const Icon = def.icon;
                  const isAdded = currentWidgets.find(w => w.id === def.id)?.enabled || false;
                  const currentSize = widgetSizes[def.id] || 'medium';

                  return (
                    <motion.div
                      key={def.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 sm:p-5 rounded-[28px] bg-[var(--surface-color)] border border-[var(--border-color)]/80 shadow-xs space-y-3.5 hover:border-[var(--border-color)] transition-all"
                    >
                      {/* Header with Icon, Title, Description and Added badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_2px_6px_rgba(0,0,0,0.1)] border border-white/20"
                            style={{ 
                              background: `linear-gradient(135deg, ${def.color}, ${def.color}dd)`, 
                              color: '#ffffff' 
                            }}
                          >
                            <Icon size={17} strokeWidth={2.4} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-[var(--text-primary)] leading-tight">
                              {isEn ? def.titleEn : def.title}
                            </h4>
                            <p className="text-[11px] font-medium text-[var(--text-secondary)] leading-snug mt-0.5">
                              {isEn ? def.descriptionEn : def.description}
                            </p>
                          </div>
                        </div>

                        {isAdded && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={12} />
                            {isEn ? 'Added' : 'Tillagd'}
                          </span>
                        )}
                      </div>

                      {/* Real Visual Live Preview Widget Card */}
                      <div className="py-1">
                        {renderLiveWidgetPreview(def.id, currentSize)}
                      </div>

                      {/* Bottom Control Bar: Size selector & Action Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[var(--border-color)]/50">
                        {/* Size Selector Pills */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mr-1">
                            {isEn ? 'Size:' : 'Storlek:'}
                          </span>
                          {(['small', 'medium', 'large'] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => {
                                feedback.selection();
                                handleUpdateSize(def.id, sz);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                currentSize === sz
                                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-2xs'
                                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {sz === 'small' ? (isEn ? 'S' : 'Liten') : sz === 'medium' ? (isEn ? 'M' : 'Mellan') : (isEn ? 'L' : 'Stor')}
                            </button>
                          ))}
                        </div>

                        {/* Primary Action Buttons */}
                        {isAdded ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleRemoveWidget(def.id, e)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 size={13} />
                              <span>{isEn ? 'Remove' : 'Ta bort'}</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddOrUpdateWidget(def.id, currentSize)}
                            className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-color)] hover:opacity-90 text-[var(--text-on-accent)] font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>{isEn ? 'Add widget' : 'Lägg till widget'}</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Widgets Reorder Tab */
            <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  {isEn ? 'Active Widgets on Home Screen' : 'Aktiva widgets på hemskärmen'} ({activeWidgetConfigs.length})
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {isEn ? 'Use arrows to reorder' : 'Använd pilarna för att ändra ordning'}
                </span>
              </div>

              {activeWidgetConfigs.length > 0 ? (
                <div className="space-y-2.5">
                  {activeWidgetConfigs.map((widgetConfig, activeIdx) => {
                    const def = AVAILABLE_WIDGETS.find((w) => w.id === widgetConfig.id);
                    if (!def) return null;
                    const Icon = def.icon;
                    const currentSize = widgetConfig.size || 'medium';

                    return (
                      <div
                        key={widgetConfig.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] shadow-2xs gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_2px_6px_rgba(0,0,0,0.1)] border border-white/20"
                            style={{ 
                              background: `linear-gradient(135deg, ${def.color}, ${def.color}dd)`, 
                              color: '#ffffff' 
                            }}
                          >
                            <Icon size={18} strokeWidth={2.4} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {isEn ? def.titleEn : def.title}
                            </p>

                            {/* Size selector pills inline */}
                            <div className="flex items-center gap-1.5 mt-1">
                              {(['small', 'medium', 'large'] as const).map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => handleUpdateSize(widgetConfig.id, sz)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    currentSize === sz
                                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                                      : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  {sz === 'small' ? (isEn ? 'S' : 'Liten') : sz === 'medium' ? (isEn ? 'M' : 'Mellan') : (isEn ? 'L' : 'Stor')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex flex-col gap-0.5 mr-1">
                            <button
                              type="button"
                              disabled={activeIdx === 0}
                              onClick={(e) => handleMoveActive(activeIdx, 'up', e)}
                              className="w-7 h-6 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                              title={isEn ? 'Move up' : 'Flytta upp'}
                            >
                              <ArrowUp size={12} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={activeIdx === activeWidgetConfigs.length - 1}
                              onClick={(e) => handleMoveActive(activeIdx, 'down', e)}
                              className="w-7 h-6 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                              title={isEn ? 'Move down' : 'Flytta ner'}
                            >
                              <ArrowDown size={12} strokeWidth={2.5} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveWidget(widgetConfig.id, e)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all cursor-pointer active:scale-95"
                            title={isEn ? 'Remove widget' : 'Ta bort widget'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-3xl border border-dashed border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
                  {isEn ? 'No widgets added yet. Select widgets in the gallery.' : 'Inga aktiva widgets än. Välj widgets i galleriet för att lägga till.'}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border-color)]/60 bg-[var(--surface-color)] flex justify-end shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[var(--accent-color)] text-[var(--text-on-accent)] text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{isEn ? 'Done' : 'Klar'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
