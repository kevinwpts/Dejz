import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users2, Copy, Check, UserCheck } from 'lucide-react';
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-section w-full font-sans"
    >
      {/* 1. Compact Intro Description */}
      <Card variant="default" padding="md" className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
          <Users2 size={18} strokeWidth={2} />
        </div>
        <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
          {isEn
            ? 'Share grocery budgets, see who paid what, and stay in sync in real time.'
            : 'Dela matbudget, se vem som betalade vad och håll koll på hushållsekonomin tillsammans.'}
        </p>
      </Card>

      {/* 2. Connection Status */}
      {isConnected ? (
        <div className="space-y-[var(--card-gap)]">
          {/* Connected Card */}
          <Card variant="default" padding="md" className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center font-bold text-body shrink-0">
                <UserCheck size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="text-body-medium font-bold text-[var(--text-primary)] block truncate">
                  {config.partnerName || (isEn ? 'Partner' : 'Partner')}
                </span>
                <span className="text-secondary text-[var(--text-secondary)] block">
                  {isEn ? 'Connected to shared budget' : 'Sammankopplad med delad budget'}
                </span>
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
            <span className="text-label font-medium text-[var(--text-secondary)] block">
              {isEn ? 'Your invite code' : 'Din inbjudningskod'}
            </span>

            <div className="flex items-center justify-between p-2.5 pl-3.5 rounded-card-nested bg-[var(--surface-muted)] border-none">
              <span className="text-body font-bold font-mono tracking-widest text-[var(--text-primary)]">
                {myInviteCode}
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyCode}
                icon={copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
              >
                {copied ? (isEn ? 'Copied' : 'Kopierad') : (isEn ? 'Copy' : 'Kopiera')}
              </Button>
            </div>

            <p className="text-micro-label text-[var(--text-secondary)]">
              {isEn
                ? 'Send this code to your partner so they can join your shared budget.'
                : 'Skicka denna kod till din partner så kan ni ansluta direkt.'}
            </p>
          </Card>

          {/* Step 2: Enter Partner's Code */}
          <Card variant="default" padding="md" className="space-y-3">
            <span className="text-label font-medium text-[var(--text-secondary)] block">
              {isEn ? 'Join with partner code' : 'Anslut med partnerns kod'}
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
        </div>
      )}
    </motion.div>
  );
}
