import React from 'react';
import { Bell } from '@phosphor-icons/react';
import { PeriodInfo } from '../../utils/periodEngine';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: PeriodInfo;
  kvarAttSpendera?: number;
  dagsbudget?: number;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">

      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center">
        <Bell size={22} className="text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-xs font-semibold text-[var(--text-primary)]">
          Inga nya notiser
        </p>
      </section>
    </div>
  );
};
