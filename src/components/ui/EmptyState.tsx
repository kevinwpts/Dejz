// Tomt läge (inga kvitton, inga paket …): en lugn, enfärgad ikon i en rund ruta, rubrik, förklaring och valfri knapp.
// En enda ikon i textens färg – inga färgglada kluster. Samma utseende överallt i appen.
import React from 'react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

interface EmptyStateProps {
  icon: PhosphorIcon;
  title: string;
  description?: React.ReactNode;
  /** Valfri knapp under texten (t.ex. "Anslut bank") */
  action?: React.ReactNode;
  /** 'page' = fyller sidan (flikar), 'inline' = inne i ett kort eller ark */
  variant?: 'page' | 'inline';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'page',
}) => (
  <section
    className={`${variant === 'page' ? 'ui-empty-state-page' : 'ui-empty-state'} animate-fade-in`}
  >
    <span className="ui-empty-badge" aria-hidden="true">
      <Icon size={26} weight="regular" />
    </span>
    <p className="ui-empty-title">{title}</p>
    {description && <p className="ui-empty-sub">{description}</p>}
    {action && <div className="mt-6 w-full max-w-xs mx-auto">{action}</div>}
  </section>
);
