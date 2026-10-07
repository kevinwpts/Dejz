import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calendar, PieChart, Receipt, Sparkles, ChevronRight, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Config } from '../types';

interface GuidesViewProps {
  onBack: () => void;
  config: Config;
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
    imagePlaceholder?: string;
  }[];
}

export function GuidesView({ config }: GuidesViewProps) {
  const isEn = config.language === 'en';
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

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
          imagePlaceholder: isEn ? 'Screenshot: Add Expense Screen' : 'Skärmdump: Lägg till utgift',
        },
        {
          title: isEn ? '2. Check your daily budget' : '2. Håll koll på dagsbudgeten',
          description: isEn
            ? 'On the Today screen, the main number shows how much you can spend today without exceeding your budget for the rest of the period.'
            : 'På hemfliken visar det stora talet hur mycket du kan spendera idag för att pengarna ska räcka jämnt fram till nästa lön.',
          imagePlaceholder: isEn ? 'Screenshot: Today Screen & Daily Pot' : 'Skärmdump: Hemfliken med dagsbudget',
        },
      ],
    },
    {
      id: 'payday-cycle',
      title: isEn ? 'Payday Cycle & Daily Budget' : 'Löneperiod & Dagsbudget',
      subtitle: isEn ? 'How the 25th-to-24th cycle works' : 'Så fungerar lönedag till lönedag och din disponibla pott',
      icon: Calendar,
      readTime: '2 min',
      steps: [
        {
          title: isEn ? '1. Set your payday in Settings' : '1. Välj din lönedag i Inställningar',
          description: isEn
            ? 'Dejz calculates everything based on your salary cycle (e.g. the 25th) instead of standard calendar months.'
            : 'Dejz räknar allt från din faktiska lönedag (t.ex. den 25:e) istället för stela kalendermånader. Du kan även slå på justering för helgdagar.',
          imagePlaceholder: isEn ? 'Screenshot: Salary Settings' : 'Skärmdump: Löneinställningar',
        },
        {
          title: isEn ? '2. How the daily pot is calculated' : '2. Så räknas dagsbudgeten ut',
          description: isEn
            ? 'Total Income − Fixed Expenses − Monthly Savings = Disposable Pot. This pot is divided by the days remaining until your next salary.'
            : 'Total inkomst minus fasta utgifter och månadssparande ger din disponibla pott. Potten delas jämnt på antalet dagar kvar till nästa lön.',
          tip: isEn ? 'If you spend less today, your daily budget for future days automatically increases!' : 'Om du spenderar mindre idag ökar automatiskt din dagsbudget för kommande dagar!',
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
          imagePlaceholder: isEn ? 'Screenshot: Fixed Expenses List' : 'Skärmdump: Fasta utgifter',
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
          imagePlaceholder: isEn ? 'Screenshot: Category Budget Cards' : 'Skärmdump: Kategorikort & budget',
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20 max-w-md mx-auto font-sans"
    >
      {/* If a specific guide is opened */}
      {selectedGuide ? (
        <div className="space-y-5">
          {/* Top Back / Breadcrumb */}
          <button
            type="button"
            onClick={() => setSelectedGuideId(null)}
            className="text-xs font-semibold text-[var(--accent-color)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            ← {isEn ? 'Back to all guides' : 'Tillbaka till alla guider'}
          </button>

          {/* Guide Header */}
          <div className="p-5 rounded-[22px] bg-[var(--surface-color)] space-y-2 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-color)]">
              <selectedGuide.icon size={16} strokeWidth={2.5} />
              <span>{selectedGuide.readTime} {isEn ? 'read' : 'lästid'}</span>
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {selectedGuide.title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {selectedGuide.subtitle}
            </p>
          </div>

          {/* Guide Steps */}
          <div className="space-y-4">
            {selectedGuide.steps.map((step, idx) => (
              <div
                key={idx}
                className="p-5 rounded-[22px] bg-[var(--surface-color)] border border-black/[0.04] dark:border-white/[0.04] space-y-3"
              >
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {step.title}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {step.description}
                </p>

                {/* Screenshot Placeholder */}
                {step.imagePlaceholder && (
                  <div className="rounded-[16px] bg-black/[0.02] dark:bg-white/[0.03] border-2 border-dashed border-black/10 dark:border-white/10 p-6 flex flex-col items-center justify-center gap-2 text-center text-[var(--text-tertiary)]">
                    <ImageIcon size={24} strokeWidth={1.5} className="opacity-50" />
                    <span className="text-[11px] font-medium">
                      {step.imagePlaceholder}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {isEn ? '(Drop your screenshot here)' : '(Plats för skärmdump)'}
                    </span>
                  </div>
                )}

                {/* Tip box if any */}
                {step.tip && (
                  <div className="p-3 rounded-[14px] bg-[var(--accent-color)]/10 text-[var(--text-primary)] text-xs flex items-start gap-2">
                    <CheckCircle size={15} className="text-[var(--accent-color)] shrink-0 mt-0.5" />
                    <span className="leading-snug">{step.tip}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Guides Index List */
        <div className="space-y-4">
          <div className="p-5 rounded-[22px] bg-[var(--surface-color)] text-center space-y-2 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center mx-auto">
              <BookOpen size={22} strokeWidth={2} />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {isEn ? 'Guides & Instructions' : 'Guider & Instruktioner'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
              {isEn
                ? 'Learn how to get the most out of Dejz with our step-by-step guides.'
                : 'Lär dig hur du får ut det mesta av Dejz med våra enkla steg-för-steg-guider.'}
            </p>
          </div>

          <div className="space-y-2.5">
            {guides.map((g) => {
              const Icon = g.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGuideId(g.id)}
                  className="w-full p-4 rounded-[20px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-black/[0.04] dark:border-white/[0.04] transition-all flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] group shadow-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] text-[var(--accent-color)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[var(--text-primary)] block truncate">
                        {g.title}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] truncate block mt-0.5">
                        {g.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] shrink-0">
                    <span className="text-[11px] opacity-75">{g.readTime}</span>
                    <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
