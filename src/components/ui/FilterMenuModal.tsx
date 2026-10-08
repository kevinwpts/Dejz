import React from 'react';
import { BottomSheet, BottomSheetOption } from './BottomSheet';

export interface FilterMenuOption<T = string> {
  id: T;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface FilterMenuModalProps<T = string> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: FilterMenuOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  footerNode?: React.ReactNode;
}

export function FilterMenuModal<T = string>({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
  footerNode,
}: FilterMenuModalProps<T>) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="sm"
      bodyClassName="p-2 sm:p-2.5 space-y-0.5 overflow-y-auto custom-scrollbar"
      footer={footerNode}
    >
      {options.map((opt) => (
        <BottomSheetOption
          key={String(opt.id)}
          label={opt.label}
          subtitle={opt.subtitle}
          icon={opt.icon}
          badge={opt.badge}
          isSelected={opt.id === selectedId}
          onClick={() => {
            onSelect(opt.id);
            onClose();
          }}
        />
      ))}
    </BottomSheet>
  );
}
