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
            <div className="bg-white dark:bg-[#242424] border border-[#E6E2D8] dark:border-[#383838] rounded-[26px] shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] dark:text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EFECE6] dark:bg-[#2D2D2D] hover:bg-[#EDE9DF] dark:hover:bg-[#383838] transition-all text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white cursor-pointer"
                >
                  <X size={16} strokeWidth={2} />
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
