import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquareHeart, X } from 'lucide-react';
import { feedback } from '../utils/feedback';

interface FloatingFeedbackWidgetProps {
  onOpenFeedback: () => void;
  language?: string;
}

export function FloatingFeedbackWidget({ onOpenFeedback, language = 'sv' }: FloatingFeedbackWidgetProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check session storage on mount
    const dismissed = sessionStorage.getItem('dejz_hide_feedback_widget') === 'true';
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  if (isDismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    feedback.tap();
    setIsDismissed(true);
    sessionStorage.setItem('dejz_hide_feedback_widget', 'true');
  };

  const handleOpen = () => {
    feedback.tap();
    onOpenFeedback();
  };

  const getLabel = () => {
    if (language === 'en') return 'Feedback';
    if (language === 'no') return 'Tilbakemelding';
    if (language === 'da') return 'Feedback';
    if (language === 'fi') return 'Palaute';
    return 'Feedback';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="fixed bottom-[5.4rem] right-3.5 sm:right-5 z-40 select-none"
      >
        <div className="flex items-center bg-[var(--surface-color)]/90 backdrop-blur-xl border border-[var(--border-color)] text-[var(--text-primary)] rounded-full shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]">
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-2 pl-3.5 pr-2 py-2 text-label font-semibold tracking-tight cursor-pointer group"
          >
            <div className="relative flex items-center justify-center">
              <MessageSquareHeart size={15} strokeWidth={2.2} className="text-[var(--accent-color)] group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <span className="text-label font-medium text-[var(--text-primary)]">
              {getLabel()}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Stäng feedback-knapp"
            className="p-2 pr-2.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-l border-[var(--border-color)]/50"
          >
            <X size={12} strokeWidth={2.2} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
