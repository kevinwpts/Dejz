import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, MessageSquare } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { useScrollLock } from '../hooks/useScrollLock';
import { Button, IconButton } from './ui';

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
        className="bg-white dark:bg-[#353535] w-full max-w-lg rounded-t-[28px] sm:rounded-[26px] border border-black/[0.08] dark:border-white/[0.08] relative shadow-2xl overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />
        
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#1C1917] dark:text-white">
                {t('sendFeedback')}
              </h2>
              <p className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] tracking-wide mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#05B862]"></span>
                {t('helpUsImprove')}
              </p>
            </div>
            <IconButton
              icon={<X size={18} />}
              onClick={onClose}
              variant="muted"
              size="sm"
              aria-label="Stäng"
            />
          </div>

          <div className="space-y-5">
            <div className="relative">
              <div className="absolute left-4 top-4 text-[#8C867C] dark:text-[#71717A] pointer-events-none">
                <MessageSquare size={18} />
              </div>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder={t('feedbackPlaceholder')} 
                className="w-full h-32 bg-black/5 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus:border-[#1C1917] dark:focus:border-white rounded-[14px] px-4 py-3.5 pl-11 text-sm font-semibold text-[#1C1917] dark:text-white outline-none transition-all placeholder-[#8C867C] dark:placeholder-[#71717A] resize-none" 
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={!message.trim()}
              loading={isSubmitting}
              variant="primary"
              fullWidth
              icon={<Send size={16} />}
            >
              {isSubmitting ? t('sending') : t('sendFeedback')}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
