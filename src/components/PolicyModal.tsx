import React from 'react';
import { Modal } from './ui';

export interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content?: React.ReactNode;
}

export function PolicyModal({ isOpen, onClose, title, content }: PolicyModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4 text-body text-[var(--text-secondary)] leading-relaxed">
        {content || (
          <p>
            Vi värnar om din integritet och säkerhet. All data hanteras säkert och krypterat i enlighet med GDPR. Du har alltid full kontroll över dina uppgifter och kan när som helst exportera eller radera ditt konto i appens inställningar.
          </p>
        )}
      </div>
    </Modal>
  );
}
