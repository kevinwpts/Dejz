import type { SetStateAction } from 'react';
import { PaymentMethodItem, saveStoredPaymentMethods } from '../../utils/cache/categories';
import React, { useState } from 'react';
import {
  ArrowCounterClockwise,
  CaretRight,
  Plus,
  Trash,
  Check,
  X,
} from '@phosphor-icons/react';
import { TransactionItem, FixedExpenseItem } from '../../app/models';
import { DEFAULT_PAYMENT_METHODS } from '../../constants';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PaymentMethodIcon, AVAILABLE_PAYMENT_METHOD_ICONS } from '../CategoryIcon';



export interface PaymentMethodsSettingsViewProps {
  paymentMethods: PaymentMethodItem[];
  setPaymentMethods: (value: SetStateAction<PaymentMethodItem[]>) => void;
  transactions: TransactionItem[];
  fixedExpenses: FixedExpenseItem[];
}

export const PaymentMethodsSettingsView: React.FC<PaymentMethodsSettingsViewProps> = ({
  paymentMethods,
  setPaymentMethods,
  transactions,
  fixedExpenses,
}) => {
  const [pmSheetMode, setPmSheetMode] = useState<'new' | 'edit' | null>(null);
  const [selectedPm, setSelectedPm] = useState<PaymentMethodItem | null>(null);
  const [pmFormName, setPmFormName] = useState('');
  const [pmFormIcon, setPmFormIcon] = useState('credit-card');
  const [pmDeleteConfirm, setPmDeleteConfirm] = useState(false);
  const [pmResetConfirm, setPmResetConfirm] = useState(false);

  const closePmSheet = () => {
    setPmSheetMode(null);
    setSelectedPm(null);
    setPmDeleteConfirm(false);
  };

  const handleSavePmSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pmFormName.trim();
    if (!trimmed) return;

    if (pmSheetMode === 'edit' && selectedPm) {
      const next = paymentMethods.map((m) =>
        m.id === selectedPm.id ? { ...m, name: trimmed, icon: pmFormIcon } : m
      );
      setPaymentMethods(next);
      saveStoredPaymentMethods(next);
      closePmSheet();
      return;
    }

    if (pmSheetMode === 'new') {
      if (paymentMethods.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
        closePmSheet();
        return;
      }
      const next: PaymentMethodItem[] = [
        ...paymentMethods,
        { id: `pm-${Date.now()}`, name: trimmed, icon: pmFormIcon, isCustom: true },
      ];
      setPaymentMethods(next);
      saveStoredPaymentMethods(next);
      closePmSheet();
    }
  };

  const handleDeleteMethod = () => {
    if (!selectedPm || paymentMethods.length <= 1) return;
    const next = paymentMethods.filter((m) => m.id !== selectedPm.id);
    setPaymentMethods(next);
    saveStoredPaymentMethods(next);
    closePmSheet();
  };

  const handleResetMethods = () => {
    setPaymentMethods(DEFAULT_PAYMENT_METHODS);
    saveStoredPaymentMethods(DEFAULT_PAYMENT_METHODS);
    setPmResetConfirm(false);
  };

  const pmUsageCounts: Record<string, number> = {};
  for (const tx of transactions) {
    const m = (tx.paymentMethod || '').toLowerCase().trim();
    if (m) pmUsageCounts[m] = (pmUsageCounts[m] || 0) + 1;
  }
  for (const f of fixedExpenses) {
    const m = (f.paymentMethod || 'Autogiro').toLowerCase().trim();
    if (m) pmUsageCounts[m] = (pmUsageCounts[m] || 0) + 1;
  }

  return (
    <div className="ui-page animate-slide-in-right">
      <div className="ui-admin-card">
        {paymentMethods.map((method) => {
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => {
                setSelectedPm(method);
                setPmFormName(method.name);
                setPmFormIcon(method.icon || method.id || 'credit-card');
                setPmDeleteConfirm(false);
                setPmSheetMode('edit');
              }}
              className="ui-admin-row"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <PaymentMethodIcon method={method.name} iconId={method.icon || method.id} size={20} />
                </span>
                <span className="ui-list-row-title-medium">
                  {method.name}
                </span>
              </div>
              <div className="ui-admin-right">
                <span className="ui-admin-chevron">
                  <CaretRight size={13} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setSelectedPm(null);
            setPmFormName('');
            setPmFormIcon('credit-card');
            setPmDeleteConfirm(false);
            setPmSheetMode('new');
          }}
          className="w-full ui-btn-primary"
        >
          <Plus size={15} weight="bold" />
          <span>Nytt betalsätt</span>
        </button>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setPmResetConfirm(true)}
            className="ui-reset-btn"
          >
            <ArrowCounterClockwise size={13} />
            <span>Återställ standardbetalsätt</span>
          </button>
        </div>

        <ConfirmDialog
          isOpen={pmResetConfirm}
          title="Återställ standardbetalsätt?"
          description="Dina egna betalsätt ersätts med standardvalen."
          confirmLabel="Återställ"
          variant="primary"
          onConfirm={handleResetMethods}
          onCancel={() => setPmResetConfirm(false)}
        />
      </div>

      <BottomSheet
        isOpen={pmSheetMode !== null}
        onClose={closePmSheet}
        contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
      >
        <div className="ui-sheet-header mb-4">
          <span className="ui-sheet-title">
            {pmSheetMode === 'new' ? 'Nytt betalsätt' : 'Redigera betalsätt'}
          </span>
          <button
            type="button" aria-label="Stäng"
            onClick={closePmSheet}
            className="ui-icon-btn"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSavePmSheet} className="space-y-4">
          <div className="ui-field-card">
            <label className="flex items-center gap-3.5 cursor-text">
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <PaymentMethodIcon
                  method={pmFormName || 'Betalsätt'}
                  iconId={pmFormIcon}
                  size={30}
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="ui-field-label block mb-0.5">
                  Namn på betalsätt
                </span>
                <input
                  type="text"
                  autoFocus={pmSheetMode === 'new'}
                  value={pmFormName}
                  onChange={(e) => setPmFormName(e.target.value)}
                  placeholder="Namn"
                  required
                  className="ui-field-input-lg"
                />
              </div>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="px-1 ui-field-label block">
              Välj ikon
            </span>
            <div className="grid grid-cols-6 gap-2 p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
              {AVAILABLE_PAYMENT_METHOD_ICONS.map((item) => {
                const isSelected = pmFormIcon === item.id;
                return (
                  <button
                    aria-label={item.label}
                    aria-pressed={isSelected}
                    key={item.id}
                    type="button"
                    title={item.label}
                    onClick={() => setPmFormIcon(item.id)}
                    className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-[var(--surface-color)] ring-2 ring-[var(--text-primary)] scale-[1.04]'
                        : 'bg-transparent hover:bg-[var(--surface-color)]'
                    }`}
                  >
                    <PaymentMethodIcon iconId={item.id} size={22} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="submit"
              className="ui-btn-primary"
            >
              <Check size={14} weight="bold" />
              <span>Spara betalsätt</span>
            </button>

            {pmSheetMode === 'edit' && paymentMethods.length > 1 && (
              <button
                type="button"
                onClick={() => setPmDeleteConfirm(true)}
                className="ui-btn-danger"
              >
                <Trash size={14} />
                <span>Ta bort betalsätt</span>
              </button>
            )}
          </div>

          <ConfirmDialog
            isOpen={pmDeleteConfirm}
            title="Ta bort betalsätt?"
            description={`${pmFormName || 'Betalsättet'} tas bort.`}
            confirmLabel="Ta bort"
            onConfirm={handleDeleteMethod}
            onCancel={() => setPmDeleteConfirm(false)}
          />
        </form>
      </BottomSheet>
    </div>
  );
};
