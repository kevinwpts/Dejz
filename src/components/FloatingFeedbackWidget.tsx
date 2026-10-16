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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Check session storage on mount
    const dismissed = sessionStorage.getItem('dejz_hide_feedback_widget') === 'true';
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  useEffect(() => {
    // Detect focused input fields or active virtual keyboard
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(false);
      }
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.innerHeight - window.visualViewport.height > 150;
        setIsKeyboardOpen(isShrunk);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  if (isDismissed || isKeyboardOpen) return null;

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
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-[5.5rem] right-4 sm:right-5 z-20 select-none pointer-events-auto"
      >
        <div className="flex items-center bg-[var(--surface-color)]/95 backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-full shadow-subtle overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 text-micro-label font-semibold tracking-tight cursor-pointer group"
          >
            <MessageSquareHeart size={13} strokeWidth={2.2} className="text-[var(--accent-color)] group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-micro-label font-bold text-[var(--text-primary)]">
              {getLabel()}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Stäng feedback-knapp"
            className="p-1 pr-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-l border-[var(--border-subtle)]"
          >
            <X size={10} strokeWidth={2.2} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
