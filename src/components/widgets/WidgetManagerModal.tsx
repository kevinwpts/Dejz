import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Check, ArrowUp, ArrowDown, RotateCcw, LayoutGrid, EyeOff } from 'lucide-react';
import { Config, HomeWidgetConfig } from '../../types';
import { AVAILABLE_WIDGETS, DEFAULT_HOME_WIDGETS, getResolvedHomeWidgets } from '../../utils/widgetRegistry';
import { feedback } from '../../utils/feedback';
import { useScrollLock } from '../../hooks/useScrollLock';

interface WidgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  onSaveWidgets: (widgets: HomeWidgetConfig[]) => void;
}

export function WidgetManagerModal({
  isOpen,
  onClose,
  config,
  onSaveWidgets,
}: WidgetManagerModalProps) {
  useScrollLock(isOpen);
  const isEn = config.language === 'en';

  const [currentWidgets, setCurrentWidgets] = React.useState<HomeWidgetConfig[]>(() =>
    getResolvedHomeWidgets(config?.homeWidgets)
  );

  // Sync state whenever modal opens or external homeWidgets change
  React.useEffect(() => {
    if (isOpen) {
      setCurrentWidgets(getResolvedHomeWidgets(config?.homeWidgets));
    }
  }, [isOpen, config?.homeWidgets]);

  if (!isOpen) return null;

  const handleToggleWidget = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    feedback.selection();

    const updated = currentWidgets.map((w) => {
      if (w.id === id) {
        return { ...w, enabled: !w.enabled };
      }
      return w;
    });

    setCurrentWidgets(updated);
    onSaveWidgets(updated);
  };

  const handleMoveActive = (activeIdx: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
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

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    feedback.tap();
    setCurrentWidgets(DEFAULT_HOME_WIDGETS);
    onSaveWidgets(DEFAULT_HOME_WIDGETS);
  };

  // Group widgets into active (enabled) and available (disabled)
  const activeWidgetConfigs = currentWidgets.filter((w) => w.enabled);
  const inactiveWidgetConfigs = currentWidgets.filter((w) => !w.enabled);

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md select-none">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[var(--surface-color)] rounded-t-[28px] sm:rounded-[28px] border border-[var(--border-color)] shadow-2xl max-h-[88vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border-color)]/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0">
                <LayoutGrid size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight">
                  {isEn ? 'Customize home widgets' : 'Anpassa hemskärmens widgets'}
                </h3>
                <p className="text-[11.5px] text-[var(--text-secondary)]">
                  {isEn ? 'Top card, timeline & transactions are fixed.' : 'Huvudkort, tidslinje & transaktioner är fasta.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]/80 text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer"
              aria-label="Stäng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1">
            {/* Active Widgets Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    {isEn ? 'Active widgets' : 'Aktiva widgets'} ({activeWidgetConfigs.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-color)] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>{isEn ? 'Reset default' : 'Återställ'}</span>
                </button>
              </div>

              {activeWidgetConfigs.length > 0 ? (
                <div className="space-y-2">
                  {activeWidgetConfigs.map((widgetConfig, activeIdx) => {
                    const def = AVAILABLE_WIDGETS.find((w) => w.id === widgetConfig.id);
                    if (!def) return null;
                    const Icon = def.icon;

                    return (
                      <div
                        key={widgetConfig.id}
                        onClick={() => handleToggleWidget(widgetConfig.id)}
                        className="group flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/70 hover:border-[var(--border-color)] transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ backgroundColor: `${def.color}18`, color: def.color }}
                          >
                            <Icon size={17} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate">
                                {isEn ? def.titleEn : def.title}
                              </p>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                              {isEn ? def.descriptionEn : def.description}
                            </p>
                          </div>
                        </div>

                        {/* Order & Remove Controls */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Move up / down */}
                          <div className="flex flex-col gap-0.5 mr-1">
                            <button
                              type="button"
                              disabled={activeIdx === 0}
                              onClick={(e) => handleMoveActive(activeIdx, 'up', e)}
                              className="w-6 h-5 rounded flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                              title="Flytta upp"
                            >
                              <ArrowUp size={12} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={activeIdx === activeWidgetConfigs.length - 1}
                              onClick={(e) => handleMoveActive(activeIdx, 'down', e)}
                              className="w-6 h-5 rounded flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                              title="Flytta ner"
                            >
                              <ArrowDown size={12} strokeWidth={2.5} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleWidget(widgetConfig.id, e)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                          >
                            <EyeOff size={13} strokeWidth={2.2} />
                            <span>{isEn ? 'Remove' : 'Ta bort'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
                  {isEn ? 'No optional widgets active.' : 'Inga valbara widgets är aktiva just nu.'}
                </div>
              )}
            </div>

            {/* Inactive / Available Widgets Section */}
            {inactiveWidgetConfigs.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {isEn ? 'More widgets to add' : 'Fler tillgängliga widgets'} ({inactiveWidgetConfigs.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {inactiveWidgetConfigs.map((widgetConfig) => {
                    const def = AVAILABLE_WIDGETS.find((w) => w.id === widgetConfig.id);
                    if (!def) return null;
                    const Icon = def.icon;

                    return (
                      <div
                        key={widgetConfig.id}
                        onClick={() => handleToggleWidget(widgetConfig.id)}
                        className="group flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-muted)]/40 border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)]/60 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 opacity-80"
                            style={{ backgroundColor: `${def.color}15`, color: def.color }}
                          >
                            <Icon size={17} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate">
                              {isEn ? def.titleEn : def.title}
                            </p>
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                              {isEn ? def.descriptionEn : def.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleToggleWidget(widgetConfig.id, e)}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-color)] text-[var(--text-on-accent)] text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0"
                        >
                          <Plus size={14} strokeWidth={2.6} />
                          <span>{isEn ? 'Add' : 'Lägg till'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border-color)]/60 bg-[var(--surface-color)] flex justify-end shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--accent-color)] text-[var(--text-on-accent)] text-sm font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
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
