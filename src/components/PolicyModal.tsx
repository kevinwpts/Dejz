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
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          >
            <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[24px] shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[var(--bg-color)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-all text-[var(--text-secondary)]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="text-[var(--text-secondary)] leading-relaxed">
                {content}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
