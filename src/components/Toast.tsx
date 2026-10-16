import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { IconButton } from './ui';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const configMap = {
    success: {
      icon: <CheckCircle2 size={18} className="text-[var(--success-color)]" />,
      bgIcon: 'bg-[var(--surface-muted)] text-[var(--success-color)]',
    },
    error: {
      icon: <AlertCircle size={18} className="text-[var(--danger-color)]" />,
      bgIcon: 'bg-[var(--surface-muted)] text-[var(--danger-color)]',
    },
    info: {
      icon: <Info size={18} className="text-[var(--accent-color)]" />,
      bgIcon: 'bg-[var(--surface-muted)] text-[var(--accent-color)]',
    },
  };

  const current = configMap[toast.type] || configMap.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3.5 py-3.5 px-4 rounded-card-nested bg-[var(--surface-color)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-modal text-[var(--text-primary)] max-w-sm w-full pointer-events-auto relative overflow-hidden group"
    >
      <div className={`w-8 h-8 rounded-icon-button ${current.bgIcon} flex items-center justify-center shrink-0`}>
        {current.icon}
      </div>
      <p className="text-label font-semibold tracking-tight flex-1 leading-snug">
        {toast.message}
      </p>
      <IconButton
        variant="ghost"
        size="xs"
        shape="circle"
        onClick={() => onDismiss(toast.id)}
        aria-label="Stäng"
        icon={<X size={14} />}
      />
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-0 right-0 z-[200] flex flex-col items-center px-4 pointer-events-none gap-2.5">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
