import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users2, Copy, Check, UserCheck, MessageSquare, ShieldCheck } from 'lucide-react';
import { Config } from '../types';
import { Button, Card, Input } from './ui';

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
      className="space-y-[var(--card-gap)] pb-20 page-max mx-auto w-full font-sans"
    >
      {/* 1. Header Hero - Compact */}
      <Card variant="default" padding="md" className="text-center space-y-2 relative overflow-hidden">
        <div className="w-11 h-11 rounded-full bg-black/[0.04] dark:bg-white/[0.05] text-[var(--text-primary)] flex items-center justify-center mx-auto shrink-0">
          <Users2 size={20} strokeWidth={2} />
        </div>

        <div className="space-y-1">
          <h2 className="text-body-large font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Shared Budget with Partner' : 'Delad budget med partner'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] opacity-80 leading-relaxed max-w-xs mx-auto">
            {isEn
              ? 'Share grocery budgets, see who paid what, and stay in sync in real time.'
              : 'Dela matbudget, se vem som betalade vad och håll koll på hushållsekonomin tillsammans.'}
          </p>
        </div>
      </Card>

      {/* 2. Connection Status */}
      {isConnected ? (
        <div className="space-y-[var(--card-gap)]">
          {/* Connected Card */}
          <Card variant="default" padding="lg" className="bg-[var(--success-container)] border border-[var(--success-color)]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--success-color)] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <UserCheck size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-micro-label font-bold uppercase text-[var(--success-color)] block">
                    {isEn ? 'Connected' : 'Sammankopplad'}
                  </span>
                  <span className="text-body-medium font-bold text-[var(--text-primary)]">
                    {config.partnerName || (isEn ? 'Partner' : 'Partner')}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--success-container)] text-[var(--success-color)] px-2.5 py-0.5 rounded-full">
                {isEn ? 'Active' : 'Aktiv'}
              </span>
            </div>

            {/* Quick Feature List */}
            <div className="space-y-2 pt-2 text-xs text-[var(--text-secondary)] border-t border-[var(--success-color)]/20">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[var(--success-color)] shrink-0" />
                <span>{isEn ? 'Shared category budgets in real time' : 'Gemensamma kategoribudgetar i realtid'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[var(--success-color)] shrink-0" />
                <span>{isEn ? 'Payer avatar on every transaction' : 'Vem betalade-markering på alla köp'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[var(--success-color)] shrink-0" />
                <span>{isEn ? 'Comments and reactions' : 'Kommentarer och reaktioner'}</span>
              </div>
            </div>
          </Card>

          <Button
            variant="destructive"
            fullWidth
            onClick={handleDisconnect}
          >
            {isEn ? 'Disconnect partner' : 'Koppla från partner'}
          </Button>
        </div>
      ) : (
        <div className="space-y-[var(--card-gap)]">
          {/* Step 1: My Invite Code */}
          <Card variant="default" padding="md" className="space-y-2.5">
            <span className="text-micro-label font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
              {isEn ? '1. Your invite code' : '1. Din inbjudningskod'}
            </span>

            <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-card-nested,10px)] bg-black/[0.03] dark:bg-white/[0.04] border border-subtle">
              <span className="text-body font-bold font-mono tracking-widest text-[var(--text-primary)]">
                {myInviteCode}
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyCode}
                icon={copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
              >
                {copied ? (isEn ? 'Kopierad' : 'Kopierad') : (isEn ? 'Kopiera' : 'Kopiera')}
              </Button>
            </div>

            <p className="text-micro-label font-medium text-[var(--text-tertiary)]">
              {isEn
                ? 'Send this code to your partner so they can join your shared budget.'
                : 'Skicka denna kod till din partner så kan ni ansluta direkt.'}
            </p>
          </Card>

          {/* Step 2: Enter Partner's Code */}
          <Card variant="default" padding="md" className="space-y-3">
            <span className="text-micro-label font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
              {isEn ? '2. Join with partner code' : '2. Anslut med partnerns kod'}
            </span>

            <div className="space-y-2">
              <Input
                value={partnerNameInput}
                onChange={(e) => setPartnerNameInput(e.target.value)}
                placeholder={isEn ? "Partner's name (e.g. Anna)" : "Partnerns namn (t.ex. Anna)"}
              />

              <Input
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                placeholder="DEJZ-XXXX"
                className="font-mono font-bold tracking-wider"
              />
            </div>

            <Button
              variant="primary"
              fullWidth
              disabled={!partnerCodeInput.trim()}
              onClick={handleConnect}
            >
              {isEn ? 'Connect' : 'Koppla ihop'}
            </Button>
          </Card>

          {/* Value props */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Card variant="default" padding="sm" className="space-y-1 py-3">
              <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <Users2 size={14} strokeWidth={2} />
              </div>
              <span className="text-micro-label font-bold text-[var(--text-primary)] block">
                {isEn ? 'Shared pot' : 'Delad pott'}
              </span>
            </Card>
            <Card variant="default" padding="sm" className="space-y-1 py-3">
              <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <MessageSquare size={14} strokeWidth={2} />
              </div>
              <span className="text-micro-label font-bold text-[var(--text-primary)] block">
                {isEn ? 'Chat & notes' : 'Snabbchatt'}
              </span>
            </Card>
            <Card variant="default" padding="sm" className="space-y-1 py-3">
              <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <ShieldCheck size={14} strokeWidth={2} />
              </div>
              <span className="text-micro-label font-bold text-[var(--text-primary)] block">
                {isEn ? '100% Private' : '100% Privat'}
              </span>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}
