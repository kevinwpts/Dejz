import React from 'react';
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
  rowTitleClass: "font-normal text-footnote sm:text-callout tracking-[-0.005em] leading-[1.35] text-[var(--text-primary)] block truncate";
  userName?: string | null;
  rowSubClass: "font-normal text-meta leading-[1.35] text-[var(--text-secondary)] mt-0.5 block truncate";
  userEmail: string | null;
  onOpenSection?: (section: "goals" | "receipts" | "packages") => void;
  sectionCounts: { goals?: number; receipts?: number; packages?: number; };
  sectionLabelClass: "px-1 pt-1.5 pb-0.5 text-callout sm:text-subhead font-semibold tracking-[-0.01em] text-[var(--text-primary)] block";
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
  rowTitleClass,
  userName,
  rowSubClass,
  userEmail,
  onOpenSection,
  sectionCounts,
  sectionLabelClass,
  bankEnabled,
  hasActiveBank,
  targetPayday,
  onToggleExcludeInternalTransfers,
  excludeInternalTransfers,
  themeMode,
  onSignOut,
  onOpenAuth,
}) => (
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
            <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
              ) : initialChar ? (
                <span className="font-display font-semibold text-xs uppercase text-[var(--text-primary)]">
                  {initialChar}
                </span>
              ) : (
                <UserCircle size={20} weight="regular" className="text-[var(--text-secondary)]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className={rowTitleClass}>{userName || 'Konto'}</span>
              <span className={rowSubClass}>
                {userEmail || 'Profil, namn och e-post'}
              </span>
              {userEmail && !isDemoMode() && <EmailVerificationStatus compact />}
            </div>
          </div>

          <span className="ui-admin-chevron">
            <CaretRight size={14} />
          </span>
        </button>
      </div>

      {/* 2. Mitt – sparmål, kvitton och paket */}
      {onOpenSection && (
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
      )}

      {/* 3. Ekonomi */}
      <section className="space-y-2">
        <span className={sectionLabelClass}>Ekonomi</span>
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
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-caption font-medium text-[var(--text-muted)]">
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
                <span className={rowSubClass}>
                  Räknar inte flytt mellan egna konton som inkomst eller utgift
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
      <section className="space-y-1.5">
        <span className={sectionLabelClass}>App & konto</span>
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
            onClick={onSignOut}
            className="ui-admin-row hover:bg-negative-solid/5"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 flex items-center justify-center text-negative shrink-0">
                <SignOut size={18} weight="regular" />
              </div>
              <span className="text-footnote sm:text-callout font-medium text-negative">
                Logga ut
              </span>
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
    </>
);
