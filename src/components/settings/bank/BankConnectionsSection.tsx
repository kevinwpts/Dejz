// Bankinställningar: "Ansluten bank" – varje bankkoppling med status (ansluten / går ut / utgången)
import React, { useState } from 'react';
import { getConnectionDaysLeft } from '../../../services/bank/connectionExpiry';
import type { BankConnection } from '../../../services/bank/types';
import { BankLogo } from '../../BankLogo';

interface BankConnectionsSectionProps {
  connections: BankConnection[];
  connectedBank: string | null;
  onReconnect: (conn: BankConnection) => void;
  onSelectAccounts: (conn: BankConnection) => void;
}

export const BankConnectionsSection: React.FC<BankConnectionsSectionProps> = ({
  connections,
  connectedBank,
  onReconnect,
  onSelectAccounts,
}) => {
  // Klockan läses en gång när vyn visas – inte under varje render
  const [nowMs] = useState(() => Date.now());
  return (
    <section>
      <span className="ui-settings-label">Ansluten bank</span>
      <div className="ui-group-card">
        {connections.length > 0 ? (
          connections.map((conn) => {
            const computedDaysLeft = getConnectionDaysLeft(conn, nowMs);
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
                  <BankLogo name={conn.aspsp_name} />
                  <div className="min-w-0">
                    <span className="ui-row-title">{conn.aspsp_name}</span>
                    {isExpired ? (
                      <span className="text-footnote text-negative font-medium block mt-0.5">
                        Samtycket har gått ut · Förnya åtkomst
                      </span>
                    ) : isExpiringSoon ? (
                      <span className="text-footnote text-caution font-medium block mt-0.5">
                        Samtycke går ut om {computedDaysLeft}{' '}
                        {computedDaysLeft === 1 ? 'dag' : 'dagar'}
                      </span>
                    ) : (
                      <span className="text-footnote text-positive font-medium block mt-0.5">
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
                      className="ui-btn-sm-primary"
                    >
                      Förnya
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectAccounts(conn)}
                      className="ui-btn-sm"
                    >
                      Välj konton
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="ui-row">
            <div className="flex items-center gap-3 min-w-0">
              <BankLogo name={connectedBank || 'Bank'} />
              <div className="min-w-0">
                <span className="ui-row-title">{connectedBank}</span>
                <span className="text-footnote text-positive font-medium block mt-0.5">
                  Ansluten
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </section>
  );
};
