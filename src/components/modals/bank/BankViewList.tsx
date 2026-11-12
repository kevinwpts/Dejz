// "Anslut bank" steg 1: anslutna banker, sökfält och lista med banker att välja.
import React, { useState } from 'react';
import { getConnectionDaysLeft } from '../../../services/bank/connectionExpiry';
import { Bank, MagnifyingGlass, SpinnerGap, ArrowClockwise, CaretRight } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import type { BankAspsp, BankConnection } from '../../../services/bank/types';
import { ItemLogo } from '../../ItemLogo';

export interface BankViewListProps {
  connections: BankConnection[];
  search: string;
  setSearch: (value: SetStateAction<string>) => void;
  loadingBanks: boolean;
  startingAuth: boolean;
  selectedBank: BankAspsp | null;
  filteredBanks: BankAspsp[];
  onSelectBank: (bank: BankAspsp, reconnectConnectionId?: string | null) => void;
  onOpenExistingAccountSelection: (conn: BankConnection) => void;
  onRetryLoad: () => void;
}

export const BankViewList: React.FC<BankViewListProps> = ({
  connections,
  search,
  setSearch,
  loadingBanks,
  startingAuth,
  selectedBank,
  filteredBanks,
  onSelectBank,
  onOpenExistingAccountSelection,
  onRetryLoad,
}) => {
  // Klockan läses en gång när vyn visas – inte under varje render
  const [nowMs] = useState(() => Date.now());
  return (
    <div className="space-y-4">
      {connections.length > 0 && (
        <div className="space-y-1.5">
          <span className="px-1 text-footnote font-medium text-[var(--text-secondary)] block">
            Anslutna banker
          </span>
          <div className="ui-sheet-group">
            {connections.map((conn) => {
              const daysLeft = getConnectionDaysLeft(conn, nowMs);
              const isExpired =
                conn.status === 'expired' || (daysLeft !== null && daysLeft <= 0);
              const isExpiringSoon =
                !isExpired &&
                (Boolean(conn.expiring_soon) || (daysLeft !== null && daysLeft <= 14));

              return (
                <div key={conn.id} className="ui-row">
                  <button
                    type="button"
                    onClick={() => onOpenExistingAccountSelection(conn)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <ItemLogo
                      name={conn.aspsp_name}
                      logoUrl={conn.aspsp_logo || undefined}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="ui-row-title">
                        {conn.aspsp_name}
                      </span>
                      {isExpired ? (
                        <span className="text-caption text-negative font-medium block">
                          Samtycket har gått ut
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="text-caption text-caution font-medium block">
                          Går ut om {daysLeft} d
                        </span>
                      ) : (
                        <span className="text-caption text-positive font-medium block">
                          Ansluten
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {(isExpired || isExpiringSoon) && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectBank(
                            {
                              name: conn.aspsp_name,
                              country: conn.aspsp_country || 'SE',
                              logo: conn.aspsp_logo,
                              bic: null,
                            },
                            conn.id
                          )
                        }
                        className="px-2.5 py-1 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Förnya
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenExistingAccountSelection(conn)}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <span>Konton</span>
                      <CaretRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="ui-input-icon"
        />
        <input
          aria-label="Sök bank"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sök bank..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[var(--fill-grouped)] text-base font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
        />
      </div>

      {/* Bank list */}
      {loadingBanks || startingAuth ? (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <SpinnerGap size={24} className="animate-spin text-[var(--text-primary)]" />
          <span>
            {startingAuth
              ? `Ansluter till ${selectedBank?.name}...`
              : 'Hämtar banker...'}
          </span>
        </div>
      ) : filteredBanks.length > 0 ? (
        <div className="ui-sheet-group max-h-72 overflow-y-auto overflow-x-hidden">
          {filteredBanks.map((bank) => (
            <button
              key={bank.name}
              type="button"
              onClick={() => onSelectBank(bank)}
              className="ui-row-btn"
            >
              <div className="flex items-center gap-3 min-w-0">
                {bank.logo ? (
                  <img
                    src={bank.logo}
                    alt={bank.name}
                    className="w-8 h-8 rounded-xl object-contain bg-white p-1 border border-black/5 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    <Bank size={16} className="text-[var(--text-secondary)]" />
                  </div>
                )}
                <span className="ui-row-title">
                  {bank.name}
                </span>
              </div>
              <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center space-y-2">
          <p className="text-xs text-[var(--text-muted)]">Inga banker hittades.</p>
          <button
            type="button"
            onClick={onRetryLoad}
            className="text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1 underline cursor-pointer"
          >
            <ArrowClockwise size={14} />
            <span>Försök igen</span>
          </button>
        </div>
      )}
    </div>
  );
};
