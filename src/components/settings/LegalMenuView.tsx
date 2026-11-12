import type { SettingsSubView } from './subviews';
import React from 'react';
import { CaretRight, Scales, FileText, LockKey, Cookie } from '@phosphor-icons/react';

export interface LegalMenuViewProps {
  setSubView: (next: SettingsSubView) => void;
}

export const LegalMenuView: React.FC<LegalMenuViewProps> = ({
  setSubView,
}) => {
  return (
    <div className="ui-page animate-slide-in-right">
      <div className="ui-admin-card">
        <button
          type="button"
          onClick={() => setSubView('privacy')}
          className="ui-admin-row"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="ui-admin-icon-slot">
              <LockKey size={18} weight="regular" />
            </span>
            <span className="ui-list-row-title">
              Integritetspolicy
            </span>
          </div>
          <span className="ui-admin-chevron">
            <CaretRight size={13} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('terms')}
          className="ui-admin-row"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="ui-admin-icon-slot">
              <FileText size={18} weight="regular" />
            </span>
            <span className="ui-list-row-title">
              Användarvillkor
            </span>
          </div>
          <span className="ui-admin-chevron">
            <CaretRight size={13} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('psd2')}
          className="ui-admin-row"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="ui-admin-icon-slot">
              <Scales size={18} weight="regular" />
            </span>
            <span className="ui-list-row-title">
              Open Banking (PSD2)
            </span>
          </div>
          <span className="ui-admin-chevron">
            <CaretRight size={13} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('cookies')}
          className="ui-admin-row"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="ui-admin-icon-slot">
              <Cookie size={18} weight="regular" />
            </span>
            <span className="ui-list-row-title">
              Cookies & lagring
            </span>
          </div>
          <span className="ui-admin-chevron">
            <CaretRight size={13} />
          </span>
        </button>
      </div>
    </div>
  );
};
