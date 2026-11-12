import React, { useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { isDemoMode } from '../../utils/demoUtils';
import { EmailVerificationStatus } from '../EmailVerification';
import {
  UserCircle,
  SignOut,
  CalendarBlank,
  ShieldCheck,
  CreditCard,
  ArrowsLeftRight,
  Tag,
  CaretRight,
  Sun,
  Moon,
  Wallet,
  ChatCircleText,
  LockKey,
  SlidersHorizontal,
  PiggyBank,
  Paperclip,
  Package,
} from '@phosphor-icons/react';
import type { SettingsSubView } from './subviews';

export interface SettingsMainListProps {
  hiddenAvatarInput: React.ReactNode;
  setSubView: (next: SettingsSubView) => void;
  userAvatar?: string | null;
  initialChar: string;
  userName?: string | null;
  userEmail: string | null;
  onOpenSection?: (section: "goals" | "receipts" | "packages") => void;
  sectionCounts: { goals?: number; receipts?: number; packages?: number; };
  bankEnabled: boolean;
  hasActiveBank: boolean;
  targetPayday: number;
  onToggleExcludeInternalTransfers?: (enabled: boolean) => void;
  excludeInternalTransfers: boolean;
  themeMode: "light" | "dark" | "system";
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export const SettingsMainList: React.FC<SettingsMainListProps> = ({
  hiddenAvatarInput,
  setSubView,
  userAvatar,
  initialChar,
  userName,
  userEmail,
  onOpenSection,
  sectionCounts,
  bankEnabled,
  hasActiveBank,
  targetPayday,
  onToggleExcludeInternalTransfers,
  excludeInternalTransfers,
  themeMode,
  onSignOut,
  onOpenAuth,
}) => {
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const rowTitleClass = 'ui-list-row-title block';
  return (
    <>
      {hiddenAvatarInput}

      {/* 1. Konto / Profil */}
      <div className="ui-admin-card">
        <button
          type="button"
          onClick={() => setSubView('profile')}
          className="ui-admin-row py-3.5"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-[var(--fill-grouped)] overflow-hidden flex items-center justify-center shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
              ) : initialChar ? (
                <span className="font-display font-semibold text-lg uppercase text-[var(--text-primary)]">
                  {initialChar}
                </span>
              ) : (
                <UserCircle size={26} weight="regular" className="text-[var(--text-secondary)]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="font-display font-semibold text-base tracking-[-0.01em] text-[var(--text-primary)] block truncate">
                {userName || 'Konto'}
              </span>
              <span className="text-footnote text-[var(--text-secondary)] mt-0.5 block truncate">
                {userEmail || 'Profil, namn och e-post'}
              </span>
              {userEmail && !isDemoMode() && <EmailVerificationStatus compact />}
            </div>
          </div>

          <span className="ui-admin-chevron">
            <CaretRight size={13} />
          </span>
        </button>
      </div>

      {/* 2. Mitt – sparmål, kvitton och paket */}
      {onOpenSection && (
        <section>
        <span className="ui-settings-label">Mina saker</span>
        <div className="ui-admin-card">
          {(
            [
              { id: 'goals', label: 'Sparmål', icon: PiggyBank },
              { id: 'receipts', label: 'Kvitton', icon: Paperclip },
              { id: 'packages', label: 'Väntar på paket', icon: Package },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const count = sectionCounts[item.id] || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenSection(item.id)}
                className="ui-admin-row"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="ui-admin-icon-slot">
                    <Icon size={18} weight="regular" />
                  </span>
                  <span className={rowTitleClass}>{item.label}</span>
                </div>
                <div className="ui-admin-right">
                  {count > 0 && <span className="ui-admin-value tabular-nums">{count}</span>}
                  <span className="ui-admin-chevron">
                    <CaretRight size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        </section>
      )}

      {/* 3. Ekonomi */}
      <section>
        <span className="ui-settings-label">Ekonomi</span>
        <div className="ui-admin-card">
          {/* Bankkonton – bara för admin tills bankkopplingen finns för alla */}
          {bankEnabled ? (
            <button
              type="button"
              onClick={() => setSubView('bank')}
              className="ui-admin-row"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <CreditCard size={18} weight="regular" />
                </span>
                <span className={rowTitleClass}>Bankkonton</span>
              </div>
              <div className="ui-admin-right">
                <span
                  className={`ui-admin-value ${
                    hasActiveBank
                      ? 'text-positive font-medium'
                      : ''
                  }`}
                >
                  {hasActiveBank ? 'Ansluten' : 'Anslut'}
                </span>
                <span className="ui-admin-chevron">
                  <CaretRight size={13} />
                </span>
              </div>
            </button>
          ) : (
            <div className="ui-admin-row cursor-default">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <CreditCard size={18} weight="regular" />
                </span>
                <span className={rowTitleClass}>Bankkoppling</span>
              </div>
              <div className="ui-admin-right">
                <span className="ui-admin-value">
                  Kommer snart
                </span>
              </div>
            </div>
          )}

          {/* Lönedag */}
          <button
            type="button"
            onClick={() => setSubView('period')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <CalendarBlank size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Lönedag</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-value">Den {targetPayday}:e</span>
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Kategorier */}
          <button
            type="button"
            onClick={() => setSubView('categories')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Tag size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Kategorier</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Betalsätt */}
          <button
            type="button"
            onClick={() => setSubView('paymentMethods')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Wallet size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Betalsätt</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Dölj egna överföringar */}
          <div className="ui-admin-row-static">
            <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
              <span className="ui-admin-icon-slot">
                <ArrowsLeftRight size={18} weight="regular" />
              </span>
              <div className="min-w-0 flex-1">
                <span className={rowTitleClass}>Dölj egna överföringar</span>
                <span className="text-footnote text-[var(--text-secondary)] mt-0.5 block">
                  Flytt mellan dina egna konton räknas inte som inkomst eller utgift
                </span>
              </div>
            </div>
            {onToggleExcludeInternalTransfers && (
              <button
                type="button"
                role="switch"
                aria-checked={excludeInternalTransfers}
                aria-label="Dölj egna överföringar"
                onClick={() => onToggleExcludeInternalTransfers(!excludeInternalTransfers)}
                className={`ui-switch ${
                  excludeInternalTransfers ? 'ui-switch-on' : 'ui-switch-off'
                }`}
              >
                <span
                  className={`ui-switch-thumb ${
                    excludeInternalTransfers ? 'ui-switch-thumb-on' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. App & konto */}
      <section>
        <span className="ui-settings-label">App & konto</span>
        <div className="ui-admin-card">
          {/* Utseende */}
          <button
            type="button"
            onClick={() => setSubView('appearance')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                {themeMode === 'dark' ? (
                  <Moon size={18} weight="regular" />
                ) : (
                  <Sun size={18} weight="regular" />
                )}
              </span>
              <span className={rowTitleClass}>Utseende</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-value">
                {themeMode === 'system'
                  ? 'System'
                  : themeMode === 'dark'
                  ? 'Mörkt'
                  : 'Ljust'}
              </span>
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Data & säkerhet */}
          <button
            type="button"
            onClick={() => setSubView('security')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <ShieldCheck size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Data & säkerhet</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Hjälp & feedback */}
          <button
            type="button"
            onClick={() => setSubView('feedback')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <ChatCircleText size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Hjälp & feedback</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Villkor & integritet */}
          <button
            type="button"
            onClick={() => setSubView('legal')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <LockKey size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Villkor & integritet</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Admin & test (Endast synlig för admin) */}
          {(userEmail || '').trim().toLowerCase() === 'kevinwpts@gmail.com' && (
            <button
              type="button"
              onClick={() => setSubView('admin')}
              className="ui-admin-row"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <SlidersHorizontal size={18} weight="regular" />
                </span>
                <span className={rowTitleClass}>Admin & test</span>
              </div>
              <div className="ui-admin-right">
                <span className="ui-admin-value">Scenarion & flöden</span>
                <span className="ui-admin-chevron">
                  <CaretRight size={13} />
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* 5. Logga ut / Logga in */}
      <div className="ui-admin-card">
        {userEmail ? (
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5">
              <span className="ui-admin-icon-slot text-negative">
                <SignOut size={18} weight="regular" />
              </span>
              <span className="ui-list-row-title text-negative">Logga ut</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5">
              <span className="ui-admin-icon-slot">
                <UserCircle size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Logga in</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmSignOut}
        title="Logga ut?"
        description="Du kan logga in igen när du vill. Dina uppgifter finns kvar."
        confirmLabel="Logga ut"
        variant="primary"
        onConfirm={() => {
          setConfirmSignOut(false);
          onSignOut();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </>
  );
};
