import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, MessageSquare } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { useScrollLock } from '../hooks/useScrollLock';

interface FeedbackModalProps {
  onClose: () => void;
  onSubmit: (message: string) => void;
  t: (key: TranslationKey) => string;
}

export function FeedbackModal({ onClose, onSubmit, t }: FeedbackModalProps) {
  useScrollLock(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(message);
      onClose();
    } catch (error) {
      console.error('Failed to send feedback', error);
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="bg-white dark:bg-[#1C1C1C] w-full max-w-lg rounded-t-[28px] sm:rounded-[26px] border border-black/[0.08] dark:border-white/[0.08] relative shadow-2xl overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />
        
        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display uppercase tracking-wider text-[var(--text-primary)]">
                {t('sendFeedback')}
              </h2>
              <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {t('helpUsImprove')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-[#222222] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Stäng"
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-3.5 top-3.5 text-[var(--text-tertiary)] pointer-events-none">
                <MessageSquare size={17} />
              </div>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder={t('feedbackPlaceholder')} 
                className="w-full h-32 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] p-3.5 pl-10 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all resize-none focus:border-[var(--accent-color)]" 
              />
            </div>

            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={!message.trim() || isSubmitting}
              className="w-full h-12 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Send size={16} />
              <span>{isSubmitting ? t('sending') : t('sendFeedback')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
