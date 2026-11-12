// Bankinställningar: "Ansluten bank" – varje bankkoppling med status (ansluten / går ut / utgången)
import React from 'react';
import type { BankConnection } from '../../../services/bankService';
import { ItemLogo } from '../../ItemLogo';

interface BankConnectionsSectionProps {
  connections: BankConnection[];
  connectedBank: string | null;
  onReconnect: (conn: BankConnection) => void;
  onSelectAccounts: (conn: BankConnection) => void;
  onDisconnect: (connId: string) => void;
}

export const BankConnectionsSection: React.FC<BankConnectionsSectionProps> = ({
  connections,
  connectedBank,
  onReconnect,
  onSelectAccounts,
  onDisconnect,
}) => (
  <div className="space-y-1.5">
    <span className="px-2 ui-field-label block">
      Ansluten bank
    </span>
    <div className="ui-group-card">
      {connections.length > 0 ? (
        connections.map((conn) => {
          const validMs = conn.valid_until ? new Date(conn.valid_until).getTime() : NaN;
          const computedDaysLeft =
            conn.days_until_expiry !== undefined && conn.days_until_expiry !== null
              ? conn.days_until_expiry
              : !Number.isNaN(validMs)
              ? Math.ceil((validMs - Date.now()) / (24 * 60 * 60 * 1000))
              : null;
          const isExpired =
            conn.status === 'expired' ||
            (computedDaysLeft !== null && computedDaysLeft <= 0);
          const isExpiringSoon =
            !isExpired &&
            (Boolean(conn.expiring_soon) ||
              (computedDaysLeft !== null && computedDaysLeft <= 14));

          return (
            <div key={conn.id} className="ui-row">
              <div className="flex items-center gap-3 min-w-0">
                <ItemLogo
                  name={conn.aspsp_name}
                  logoUrl={conn.aspsp_logo || undefined}
                  size="md"
                />
                <div className="min-w-0">
                  <span className="ui-row-title">{conn.aspsp_name}</span>
                  {isExpired ? (
                    <span className="text-xs text-negative font-medium block">
                      Samtycket har gått ut · Förnya åtkomst
                    </span>
                  ) : isExpiringSoon ? (
                    <span className="text-xs text-caution font-medium block">
                      Samtycke går ut om {computedDaysLeft}{' '}
                      {computedDaysLeft === 1 ? 'dag' : 'dagar'}
                    </span>
                  ) : (
                    <span className="text-xs text-positive font-medium block">
                      Ansluten
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(isExpired || isExpiringSoon) ? (
                  <button
                    type="button"
                    onClick={() => onReconnect(conn)}
                    className="px-2.5 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Förnya
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectAccounts(conn)}
                    className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                  >
                    Välj konton
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDisconnect(conn.id)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                >
                  Koppla från
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="ui-row">
          <div className="flex items-center gap-3 min-w-0">
            <ItemLogo name={connectedBank || 'Bank'} size="md" />
            <div className="min-w-0">
              <span className="ui-row-title">{connectedBank}</span>
              <span className="text-xs text-positive font-medium block">
                Ansluten
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDisconnect('__default__')}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
          >
            Koppla från
          </button>
        </div>
      )}
    </div>
  </div>
);
