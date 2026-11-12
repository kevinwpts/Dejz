import React, { useEffect, useState } from 'react';
import { Switch } from './ui/Switch';
import { getMarketingConsent, setMarketingConsent } from '../utils/marketingConsent';

/** Reglage i profilen: "Nyheter på mejl" (samtycke till nyhetsbrev, kan ändras när som helst) */
export const NewsletterToggle: React.FC = () => {
  const [checked, setChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getMarketingConsent().then((answer) => {
      setChecked(answer === true);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  return (
    <section className="ui-section">
      <div className="ui-admin-card">
        <div className="ui-admin-row-static">
          <div className="min-w-0 flex-1 pr-3">
            <span className="text-callout font-medium text-[var(--text-primary)] block">Nyheter på mejl</span>
            <span className="text-meta text-[var(--text-secondary)] block mt-0.5">
              Tips och nyheter från Dejz. Avsluta när du vill.
            </span>
          </div>
          <Switch
            checked={checked}
            aria-label="Nyheter på mejl"
            onChange={(next) => {
              setChecked(next);
              void setMarketingConsent(next, 'profil');
            }}
          />
        </div>
      </div>
    </section>
  );
};
