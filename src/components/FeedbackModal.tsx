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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[24px] border-t sm:border border-[var(--border-color)] relative shadow-2xl overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[var(--border-color)] rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />
        
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                {t('sendFeedback')}
              </h2>
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] tracking-wide mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                {t('helpUsImprove')}
              </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-[var(--surface-color)] hover:bg-[var(--border-color)] rounded-[10px] transition-all text-[var(--text-secondary)]">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <div className="absolute left-4 top-4 text-[var(--text-secondary)] opacity-40">
                <MessageSquare size={18} />
              </div>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder={t('feedbackPlaceholder')} 
                className="w-full h-32 bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-[12px] px-4 py-3.5 pl-11 text-[15px] font-semibold text-[var(--text-primary)] focus:bg-[var(--surface-color)] focus:border-accent/30 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/30 resize-none" 
              />
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={!message.trim() || isSubmitting}
              className="w-full bg-accent text-[var(--text-on-accent)] py-3.5 rounded-[12px] font-semibold text-sm tracking-wide active:scale-[0.98] transition-all relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Send size={16} className={isSubmitting ? 'div-pulse' : ''} />
                {isSubmitting ? t('sending') : t('sendFeedback')}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
