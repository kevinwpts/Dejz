import React from 'react';
import { Modal } from './ui';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export const PolicyModal = ({ isOpen, onClose, title, content }: PolicyModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      center
      size="xl"
      showCloseButton={true}
      bodyClassName="p-6 sm:p-7 space-y-4 text-[var(--text-secondary)] leading-relaxed text-sm"
    >
      {content}
    </Modal>
  );
};
