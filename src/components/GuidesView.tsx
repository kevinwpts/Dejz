import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calendar, PieChart, Receipt, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';
import { Config } from '../types';
import { Card } from './ui';

interface GuidesViewProps {
  onBack: () => void;
  config: Config;
  selectedGuideId?: string | null;
  onSelectGuide?: (id: string | null) => void;
}

interface GuideItem {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  readTime: string;
  steps: {
    title: string;
    description: string;
    tip?: string;
  }[];
}

export function GuidesView({ config, selectedGuideId: externalGuideId, onSelectGuide }: GuidesViewProps) {
  const isEn = config.language === 'en';
  const [internalGuideId, setInternalGuideId] = useState<string | null>(null);
  const selectedGuideId = externalGuideId !== undefined ? externalGuideId : internalGuideId;
  const handleSelectGuide = (id: string | null) => {
    if (onSelectGuide) {
      onSelectGuide(id);
    } else {
      setInternalGuideId(id);
    }
  };

  const guides: GuideItem[] = [
    {
      id: 'get-started',
      title: isEn ? 'Getting Started' : 'Kom igång med Dejz',
      subtitle: isEn ? 'The basics of logging and tracking' : 'Grunderna i hur du loggar köp och följer din ekonomi',
      icon: Sparkles,
      readTime: '2 min',
      steps: [
        {
          title: isEn ? '1. Log your first expense' : '1. Logga ditt första köp',
          description: isEn
            ? 'Tap the large green plus button at the bottom of the screen. Enter the amount, choose a category, and optionally attach a receipt.'
            : 'Tryck på den stora plusknappen längst ner i mitten. Skriv in beloppet, välj kategori och lägg till ett kvitto om du vill.',
          tip: isEn ? 'Tip: Use Quick Choices for your most common daily purchases.' : 'Tips: Använd snabbvalen för dina vanligaste återkommande köp som kaffe eller lunch.',
        },
        {
          title: isEn ? '2. See what is left until payday' : '2. Se vad som finns kvar till lön',
          description: isEn
            ? 'On the Home screen, the main number shows how much you have left to spend after all fixed bills, savings, and logged purchases are deducted.'
            : 'På hemfliken visar det stora beloppet exakt hur mycket du har kvar att röra dig med fram till nästa lön efter att räkningar, sparande och gjorda köp dragits av.',
        },
      ],
    },
    {
      id: 'payday-cycle',
      title: isEn ? 'Payday Cycle & Disposable Balance' : 'Löneperiod & Fritt utrymme',
      subtitle: isEn ? 'How the 25th-to-24th cycle works' : 'Så fungerar lönedag till lönedag och ditt fria utrymme',
      icon: Calendar,
      readTime: '2 min',
      steps: [
        {
          title: isEn ? '1. Set your payday in Settings' : '1. Välj din lönedag i Inställningar',
          description: isEn
            ? 'Dejz calculates everything based on your salary cycle (e.g. the 25th) instead of standard calendar months.'
            : 'Dejz räknar allt från din faktiska lönedag (t.ex. den 25:e) istället för stela kalendermånader. Du kan även slå på justering för helgdagar.',
        },
        {
          title: isEn ? '2. How your available balance is calculated' : '2. Så räknas ditt fria utrymme ut',
          description: isEn
            ? 'Total Income − Fixed Expenses − Monthly Savings = Disposable Balance for the period. Every purchase you log is deducted in real time.'
            : 'Total inkomst minus fasta utgifter och månadssparande ger ditt fria utrymme för perioden. Varje köp du registrerar dras av direkt.',
          tip: isEn ? 'Anything left unspent when your next payday arrives can be transferred to your piggy bank!' : 'Det som finns kvar när nästa lön kommer kan du föra över direkt till spargrisen!',
        },
      ],
    },
    {
      id: 'fixed-expenses',
      title: isEn ? 'Fixed Expenses & Savings' : 'Fasta utgifter & Sparande',
      subtitle: isEn ? 'Automate recurring bills and goals' : 'Hantera hyra, räkningar, abonnemang och sparmål',
      icon: PieChart,
      readTime: '3 min',
      steps: [
        {
          title: isEn ? '1. Add recurring expenses' : '1. Lägg in fasta månadskostnader',
          description: isEn
            ? 'Under the Budget tab, add rent, insurance, phone bills, and streaming services. You can choose monthly, quarterly, or annual frequency.'
            : 'Under Budget-fliken lägger du in hyra, försäkringar, el, mobilabonnemang och streaming. Du kan välja månadsvis, kvartalsvis eller årsvis fördelning.',
        },
        {
          title: isEn ? '2. Set up monthly savings' : '2. Automatiskt månadssparande',
          description: isEn
            ? 'Reserve money automatically for buffer savings, funds, or dream goals before you start spending.'
            : 'Sätt undan pengar automatiskt till buffert eller fonder varje månad så räknas det bort innan du börjar spendera din vardagsbudget.',
        },
      ],
    },
    {
      id: 'category-budgets',
      title: isEn ? 'Category Budgets' : 'Kategorier & Budget',
      subtitle: isEn ? 'Set limits on food, shopping & leisure' : 'Sätt tak på mat, restaurang och shopping',
      icon: BookOpen,
      readTime: '2 min',
      steps: [
        {
          title: isEn ? '1. Allocate your budget' : '1. Fördela budgeten per kategori',
          description: isEn
            ? 'Go to Settings → Budget & Categories. Tap any category card to set the target budget or change its icon and color.'
            : 'Gå till Profil → Budget & kategorier. Klicka på ett kort för att sätta ett budgetbelopp eller ändra namn, ikon och färg.',
        },
      ],
    },
    {
      id: 'receipts-debts',
      title: isEn ? 'Receipts & Debts' : 'Kvitton & Skyldigheter',
      subtitle: isEn ? 'Save digital receipts and keep track of IOUs' : 'Spara kvitton och håll koll på vem som är skyldig vem',
      icon: Receipt,
      readTime: '2 min',
      steps: [
        {
          title: isEn ? '1. Photo receipts' : '1. Spara kvitton digitalt',
          description: isEn
            ? 'Snap a photo of paper receipts or upload PDF receipts directly when logging an expense. All receipts are organized under Tools → Receipts.'
            : 'Fota kvitton eller ladda upp bilder direkt vid köpet. Alla kvitton samlas och är sökbara under Verktyg → Kvitton.',
        },
        {
          title: isEn ? '2. Track debts & shared expenses' : '2. Håll koll på utlägg',
          description: isEn
            ? 'Under Tools → Debts, quickly log when a friend owes you money or when you need to pay someone back.'
            : 'Under Verktyg → Skyldig lägger du snabbt in utlägg och ser direkt hur mycket du ska få tillbaka eller betala.',
        },
      ],
    },
  ];

  const selectedGuide = guides.find((g) => g.id === selectedGuideId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-section w-full font-sans"
    >
      {/* If a specific guide is opened */}
      {selectedGuide ? (
        <div className="flex flex-col gap-element">
          {/* Guide Intro Card */}
          <Card variant="default" padding="lg" className="space-y-1.5">
            <div className="flex items-center gap-2 text-secondary font-semibold text-[var(--accent-color)]">
              <selectedGuide.icon size={15} strokeWidth={2.2} />
              <span>{selectedGuide.readTime} {isEn ? 'read' : 'lästid'}</span>
            </div>
            <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
              {selectedGuide.subtitle}
            </p>
          </Card>

          {/* Guide Steps */}
          <Card variant="default" padding="none" className="divide-y divide-subtle overflow-hidden">
            {selectedGuide.steps.map((step, idx) => (
              <div
                key={idx}
                className="p-5 space-y-2.5"
              >
                <h3 className="text-body font-semibold text-[var(--text-primary)]">
                  {step.title}
                </h3>

                <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
                  {step.description}
                </p>

                {/* Tip box if any */}
                {step.tip && (
                  <div className="p-3 rounded-[var(--radius-card-nested,10px)] bg-[var(--accent-color)]/10 text-[var(--text-primary)] text-secondary flex items-start gap-2">
                    <CheckCircle size={15} className="text-[var(--accent-color)] shrink-0 mt-0.5" />
                    <span className="leading-snug">{step.tip}</span>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      ) : (
        /* Guides Index List */
        <Card variant="default" padding="none" className="divide-y divide-menu overflow-hidden">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSelectGuide(g.id)}
                className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon size={18} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-body-medium font-semibold text-[var(--text-primary)] block truncate">
                      {g.title}
                    </span>
                    <span className="text-secondary text-[var(--text-secondary)] truncate block mt-0.5">
                      {g.subtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-secondary font-medium text-[var(--text-secondary)] shrink-0">
                  <span className="text-label opacity-75">{g.readTime}</span>
                  <ChevronRight size={16} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform opacity-60" />
                </div>
              </button>
            );
          })}
        </Card>
      )}
    </motion.div>
  );
}
