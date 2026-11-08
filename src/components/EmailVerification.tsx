import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, WarningCircle, SpinnerGap } from '@phosphor-icons/react';
import { confirmVerificationFromUrl, sendVerificationEmail, useEmailVerification } from '../utils/emailVerification';

/** Visas överst när man kommer från länken i verifieringsmejlet (dejz.se/verifiera?token=…) */
export const EmailVerifiedNotice: React.FC = () => {
  const [result, setResult] = useState<'verified' | 'invalid' | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void confirmVerificationFromUrl().then((r) => {
      if (!r) return;
      setResult(r);
      setTimeout(() => setResult(null), 6000);
    });
  }, []);

  if (!result) return null;
  const ok = result === 'verified';
  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-1/2 -translate-x-1/2 z-[400] w-[calc(100%-2rem)] max-w-sm animate-fade-in">
      <div className="px-4 py-3 rounded-2xl bg-[#16141F] text-white shadow-[0_16px_40px_-12px_rgba(22,20,31,0.45)] flex items-center gap-2.5">
        {ok ? (
          <CheckCircle size={20} weight="fill" className="text-emerald-400 shrink-0" />
        ) : (
          <WarningCircle size={20} weight="fill" className="text-amber-400 shrink-0" />
        )}
        <p className="text-[14px] font-medium">
          {ok ? 'Din e-post är verifierad ✓' : 'Länken har gått ut. Skicka en ny från profilen.'}
        </p>
      </div>
    </div>
  );
};

/** Liten statusrad i profilen: "Inte verifierad · Verifiera" eller "Verifierad" */
export const EmailVerificationStatus: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { status } = useEmailVerification();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (status === 'unknown') return null;

  if (status === 'verified') {
    if (compact) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle size={13} weight="fill" /> Verifierad e-post
      </span>
    );
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <WarningCircle size={12} weight="fill" /> E-post inte verifierad
      </span>
    );
  }

  const send = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sending) return;
    setSending(true);
    const r = await sendVerificationEmail();
    setSending(false);
    setMessage(
      r === 'sent'
        ? 'Mejl skickat! Kolla inkorgen – och skräpposten.'
        : r === 'wait'
        ? 'Vi skickade nyss ett mejl. Vänta en minut innan du provar igen.'
        : r === 'verified'
        ? 'Din e-post är redan verifierad ✓'
        : 'Det gick inte att skicka just nu. Försök igen om en stund.'
    );
  };

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-600 dark:text-amber-400">
          <WarningCircle size={13} weight="fill" /> E-post inte verifierad
        </span>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="px-3 py-1 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        >
          {sending && <SpinnerGap size={12} className="animate-spin" />}
          Verifiera
        </button>
      </div>
      {message && <p className="text-[12px] text-[var(--text-secondary)]">{message}</p>}
    </div>
  );
};
