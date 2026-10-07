import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users2, Copy, Check, Heart, UserCheck, MessageSquare, ShieldCheck } from 'lucide-react';
import { Config } from '../types';
import { Button } from './ui';

interface SharedBudgetViewProps {
  onBack: () => void;
  config: Config;
  setConfig: (config: Config) => void;
}

export function SharedBudgetView({ config, setConfig }: SharedBudgetViewProps) {
  const isEn = config.language === 'en';
  const isConnected = !!config.partnerConnected;

  const [copied, setCopied] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [partnerNameInput, setPartnerNameInput] = useState(config.partnerName || '');

  const myInviteCode = config.partnerInviteCode || 'DEJZ-8492';

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(myInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      // fallback
    }
  };

  const handleConnect = () => {
    if (!partnerCodeInput.trim()) return;
    setConfig({
      ...config,
      partnerConnected: true,
      partnerName: partnerNameInput.trim() || (isEn ? 'Partner' : 'Partner'),
    });
  };

  const handleDisconnect = () => {
    setConfig({
      ...config,
      partnerConnected: false,
      partnerName: undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20 max-w-md mx-auto font-sans"
    >
      {/* 1. Header Hero */}
      <div className="p-6 rounded-[24px] bg-[var(--surface-color)] text-center space-y-3 relative overflow-hidden border border-black/[0.04] dark:border-white/[0.04]">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <Heart size={26} strokeWidth={2} className="fill-rose-500/20" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Shared Budget with Partner' : 'Delad budget med partner'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
            {isEn
              ? 'Share grocery budgets, see who paid what, and stay in sync in real time.'
              : 'Dela matbudget, se vem som betalade vad och håll koll på hushållsekonomin tillsammans.'}
          </p>
        </div>
      </div>

      {/* 2. Connection Status */}
      {isConnected ? (
        <div className="space-y-4">
          {/* Connected Card */}
          <div className="p-5 rounded-[22px] bg-emerald-500/10 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <UserCheck size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
                    {isEn ? 'Connected' : 'Sammankopplad'}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {config.partnerName || (isEn ? 'Partner' : 'Partner')}
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-full">
                {isEn ? 'Active' : 'Aktiv'}
              </span>
            </div>

            {/* Quick Feature List */}
            <div className="space-y-2 pt-1 text-xs text-[var(--text-secondary)] border-t border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'Shared category budgets in real time' : 'Gemensamma kategoribudgetar i realtid'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'Payer avatar on every transaction' : 'Vem betalade-markering på alla köp'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'Comments and reactions' : 'Kommentarer och reaktioner'}</span>
              </div>
            </div>
          </div>

          <Button
            variant="danger"
            fullWidth
            onClick={handleDisconnect}
          >
            {isEn ? 'Disconnect partner' : 'Koppla från partner'}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Step 1: My Invite Code */}
          <div className="p-5 rounded-[22px] bg-[var(--surface-color)] space-y-3 border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-xs font-semibold text-[var(--text-secondary)] block">
              {isEn ? '1. Your invite code' : '1. Din inbjudningskod'}
            </span>

            <div className="flex items-center justify-between p-3 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
              <span className="text-base font-bold font-mono tracking-widest text-[var(--text-primary)]">
                {myInviteCode}
              </span>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-[10px] bg-[var(--accent-color)] text-[var(--on-accent)] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                <span>{copied ? (isEn ? 'Copied' : 'Kopierad') : (isEn ? 'Copy' : 'Kopiera')}</span>
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-tertiary)]">
              {isEn
                ? 'Send this code to your partner so they can join your shared budget.'
                : 'Skicka denna kod till din partner så kan ni ansluta direkt.'}
            </p>
          </div>

          {/* Step 2: Enter Partner's Code */}
          <div className="p-5 rounded-[22px] bg-[var(--surface-color)] space-y-3.5 border border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-xs font-semibold text-[var(--text-secondary)] block">
              {isEn ? '2. Or join your partner’s budget' : '2. Eller anslut med partnerns kod'}
            </span>

            <div className="space-y-2">
              <input
                type="text"
                value={partnerNameInput}
                onChange={(e) => setPartnerNameInput(e.target.value)}
                placeholder={isEn ? "Partner's name (e.g. Anna)" : "Partnerns namn (t.ex. Anna)"}
                className="w-full h-11 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-3.5 text-sm font-semibold text-[var(--text-primary)] outline-none"
              />

              <input
                type="text"
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                placeholder="DEJZ-XXXX"
                className="w-full h-11 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-3.5 text-sm font-mono font-bold tracking-wider text-[var(--text-primary)] outline-none placeholder:font-sans placeholder:font-normal"
              />
            </div>

            <Button
              variant="primary"
              fullWidth
              disabled={!partnerCodeInput.trim()}
              onClick={handleConnect}
            >
              {isEn ? 'Connect partner' : 'Koppla ihop'}
            </Button>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="p-3 rounded-[16px] bg-[var(--surface-color)] space-y-1">
              <Users2 size={16} className="mx-auto text-[var(--accent-color)]" />
              <span className="text-[10.5px] font-bold text-[var(--text-primary)] block">
                {isEn ? 'Shared pot' : 'Delad pott'}
              </span>
            </div>
            <div className="p-3 rounded-[16px] bg-[var(--surface-color)] space-y-1">
              <MessageSquare size={16} className="mx-auto text-[var(--accent-color)]" />
              <span className="text-[10.5px] font-bold text-[var(--text-primary)] block">
                {isEn ? 'Chat & notes' : 'Snabbchatt'}
              </span>
            </div>
            <div className="p-3 rounded-[16px] bg-[var(--surface-color)] space-y-1">
              <ShieldCheck size={16} className="mx-auto text-[var(--accent-color)]" />
              <span className="text-[10.5px] font-bold text-[var(--text-primary)] block">
                {isEn ? '100% Private' : '100% Privat'}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
