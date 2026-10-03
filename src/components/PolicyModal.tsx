import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export const PolicyModal = ({ isOpen, onClose, title, content }: PolicyModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-sans"
          >
            <div className="bg-white dark:bg-[#1C1C1C] border border-black/[0.08] dark:border-white/[0.08] rounded-[28px] shadow-2xl p-6 sm:p-7 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <h2 className="text-base sm:text-lg font-bold font-display uppercase tracking-wider text-[var(--text-primary)]">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-[#222222] hover:bg-black/10 dark:hover:bg-white/15 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Stäng"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
              <div className="text-[var(--text-secondary)] leading-relaxed text-sm space-y-4">
                {content}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
