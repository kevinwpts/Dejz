import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Modal } from './ui';

interface FeedbackModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  t: (key: TranslationKey) => string;
}

export function FeedbackModal({ isOpen = true, onClose, onSubmit, t }: FeedbackModalProps) {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={t('sendFeedback')}
      subtitle={
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {t('helpUsImprove')}
        </span>
      }
      showCloseButton={true}
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      <div className="relative">
        <div className="absolute left-3.5 top-3.5 text-[var(--text-tertiary)] pointer-events-none">
          <MessageSquare size={17} strokeWidth={2} />
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
        <Send size={16} strokeWidth={2} />
        <span>{isSubmitting ? t('sending') : t('sendFeedback')}</span>
      </button>
    </Modal>
  );
}
