import { logError } from '../../utils/logger';
import type { SetStateAction } from 'react';
import React from 'react';
import { ArrowCounterClockwise, CaretRight, Trash, DownloadSimple } from '@phosphor-icons/react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface SecuritySettingsViewProps {
  handleExportGdprData: () => void;
  securityProcessing: boolean;
  setSecurityConfirmAction: (value: SetStateAction<"reset" | "delete" | null>) => void;
  securityConfirmAction: "reset" | "delete" | null;
  setSecurityProcessing: (value: SetStateAction<boolean>) => void;
  onDeleteAccount: () => void;
  onResetAccount: () => void;
}

export const SecuritySettingsView: React.FC<SecuritySettingsViewProps> = ({
  handleExportGdprData,
  securityProcessing,
  setSecurityConfirmAction,
  securityConfirmAction,
  setSecurityProcessing,
  onDeleteAccount,
  onResetAccount,
}) => {
  return (
    <div className="ui-page animate-slide-in-right">
      <div className="ui-admin-card">
        <button
          type="button"
          onClick={handleExportGdprData}
          className="ui-admin-row"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="ui-admin-icon-slot">
              <DownloadSimple size={18} weight="regular" />
            </span>
            <span className="ui-list-row-title">
              Ladda ner mina data
            </span>
          </div>
          <div className="ui-admin-right">
            <span className="ui-admin-chevron">
              <CaretRight size={13} />
            </span>
          </div>
        </button>

        <button
          type="button"
          disabled={securityProcessing}
          onClick={() => setSecurityConfirmAction('reset')}
          className="ui-admin-row disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="ui-admin-icon-slot">
              <ArrowCounterClockwise size={18} weight="regular" />
            </span>
            <span className="ui-list-row-title">
              Nollställ data
            </span>
          </div>
          <div className="ui-admin-right">
            <span className="ui-admin-chevron">
              <CaretRight size={13} />
            </span>
          </div>
        </button>
      </div>

      <div className="ui-admin-card">
        <button
          type="button"
          disabled={securityProcessing}
          onClick={() => setSecurityConfirmAction('delete')}
          className="ui-admin-row disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="ui-admin-icon-slot text-negative">
              <Trash size={18} weight="regular" />
            </span>
            <span className="ui-list-row-title text-negative">Radera konto</span>
          </div>
        </button>
      </div>

      <ConfirmDialog
        isOpen={securityConfirmAction !== null}
        loading={securityProcessing}
        title={securityConfirmAction === 'delete' ? 'Radera konto?' : 'Nollställ data?'}
        description={
          securityConfirmAction === 'delete'
            ? 'Ditt konto och all data tas bort. Detta går inte att ångra.'
            : 'Alla poster och bankkopplingar tas bort så att du kan börja om.'
        }
        confirmLabel={securityConfirmAction === 'delete' ? 'Radera konto' : 'Nollställ'}
        variant="danger"
        onConfirm={async () => {
          const action = securityConfirmAction;
          if (!action || securityProcessing) return;
          setSecurityProcessing(true);
          try {
            if (action === 'delete') {
              await onDeleteAccount();
            } else if (action === 'reset') {
              await onResetAccount();
            }
          } catch (err) {
            logError('Kunde inte utföra säkerhetsåtgärd', err);
          } finally {
            setSecurityProcessing(false);
            setSecurityConfirmAction(null);
          }
        }}
        onCancel={() => {
          if (!securityProcessing) {
            setSecurityConfirmAction(null);
          }
        }}
      />
    </div>
  );
};
