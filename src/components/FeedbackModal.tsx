import React, { useState } from 'react';
import { Send, MessageSquare, Bug, Lightbulb, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Modal, Button, Pill } from './ui';
import { normalizeLanguage } from '../utils/nordic';

interface FeedbackModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void> | void;
  t: (key: TranslationKey) => string;
  language?: string;
}

type FeedbackType = 'bug' | 'idea' | 'other';

const contentMap: Record<string, {
  greeting: string;
  bio: string;
  bug: string;
  idea: string;
  other: string;
  placeholderBug: string;
  placeholderIdea: string;
  placeholderOther: string;
  thanksTitle: string;
  thanksDesc: string;
  closeBtn: string;
}> = {
  sv: {
    greeting: 'Hej! Jag skapade Dejz 👋',
    bio: '”Jag bygger Dejz för att göra det enklare att få koll på din ekonomi. Har du en idé, hittat ett fel eller saknar något? Jag vill gärna höra vad du tycker!”',
    bug: 'Rapportera fel',
    idea: 'Idé / Förslag',
    other: 'Övrigt',
    placeholderBug: 'Beskriv felet och vad som hände...',
    placeholderIdea: 'Vad för funktion eller förbättring saknar du?',
    placeholderOther: 'Skriv din feedback här...',
    thanksTitle: 'Tack för din feedback! ❤️',
    thanksDesc: 'Ditt meddelande har skickats direkt till mig. Det betyder jättemycket för att göra Dejz ännu bättre!',
    closeBtn: 'Stäng',
  },
  da: {
    greeting: 'Hej! Jeg skabte Dejz 👋',
    bio: '”Jeg bygger Dejz for at gøre det nemmere at få styr på din økonomi. Har du en idé, fundet en fejl eller mangler du noget? Jeg vil meget gerne høre hvad du synes!”',
    bug: 'Rapporter fejl',
    idea: 'Idé / Forslag',
    other: 'Andet',
    placeholderBug: 'Beskriv feilen og hvad der skete...',
    placeholderIdea: 'Hvilken funktion eller forbedring savner du?',
    placeholderOther: 'Skriv din feedback her...',
    thanksTitle: 'Tak for din feedback! ❤️',
    thanksDesc: 'Din besked er sendt direkte til mig. Det betyder rigtig meget for at gøre Dejz endnu bedre!',
    closeBtn: 'Luk',
  },
  no: {
    greeting: 'Hei! Jeg skapte Dejz 👋',
    bio: '”Jeg bygger Dejz for å gjøre det enklere å få oversikt over økonomien din. Har du en idé, funnet en feil eller savner noe? Jeg vil gjerne høre hva du mener!”',
    bug: 'Rapporter feil',
    idea: 'Idé / Forslag',
    other: 'Annet',
    placeholderBug: 'Beskriv feilen og hva som skjedde...',
    placeholderIdea: 'Hvilken funksjon eller forbedring savner du?',
    placeholderOther: 'Skriv din tilbakemelding her...',
    thanksTitle: 'Takk for tilbakemeldingen din! ❤️',
    thanksDesc: 'Meldingen din har blitt sendt direkte til meg. Det betyr utrolig mye for å gjøre Dejz enda bedre!',
    closeBtn: 'Lukk',
  },
  fi: {
    greeting: 'Hei! Minä loin Dejzin 👋',
    bio: '”Rakennan Dejziä, jotta talouden hallinta olisi helpompaa. Onko sinulla idea, löysitkö virheen tai kaipaatko jotain? Kuulen mielelläni mielipiteesi!”',
    bug: 'Ilmoita virheestä',
    idea: 'Idea / Ehdotus',
    other: 'Muu',
    placeholderBug: 'Kuvaile virhe ja mitä tapahtui...',
    placeholderIdea: 'Mitä toimintoa tai parannusta kaipaat?',
    placeholderOther: 'Kirjoita palautteesi tähän...',
    thanksTitle: 'Kiitos palautestasi! ❤️',
    thanksDesc: 'Viestisi on lähetetty suoraan minulle. Se merkitsee valtavasti Dejzin kehittämisessä!',
    closeBtn: 'Sulje',
  },
};

export function FeedbackModal({ isOpen = true, onClose, onSubmit, t, language = 'sv' }: FeedbackModalProps) {
  const norm = normalizeLanguage(language);
  const c = contentMap[norm] || contentMap.sv;

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      const typeLabel = feedbackType === 'bug' ? '[Bugg]' : feedbackType === 'idea' ? '[Idé/Förslag]' : '[Övrigt]';
      const formattedMessage = `${typeLabel} ${message.trim()}`;
      await onSubmit(formattedMessage);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to send feedback', error);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={t('sendFeedback')}
      showCloseButton={true}
      bodyClassName="p-5 sm:p-6 space-y-5"
    >
      {isSubmitted ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center">
            <CheckCircle2 size={32} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {c.thanksTitle}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              {c.thanksDesc}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={onClose}
              className="px-6"
            >
              {c.closeBtn}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Creator greeting & portrait card */}
          <div className="p-4 rounded-card-nested bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-start gap-3.5">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--border-color)] bg-[var(--surface-color)] flex items-center justify-center shadow-2xs shrink-0">
              {/* Neutral image placeholder: replace src with creator photo URL when available */}
              <img 
                src="/creator-avatar.jpg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                alt="Creator of Dejz"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[var(--accent-color)]/20 to-transparent text-[var(--text-primary)] font-black text-base select-none pointer-events-none">
                K
              </div>
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <h4 className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
                {c.greeting}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] font-normal leading-relaxed italic">
                {c.bio}
              </p>
            </div>
          </div>

          {/* Category selector pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
            <Pill
              active={feedbackType === 'bug'}
              onClick={() => setFeedbackType('bug')}
              icon={<Bug size={13} strokeWidth={2.2} />}
            >
              {c.bug}
            </Pill>

            <Pill
              active={feedbackType === 'idea'}
              onClick={() => setFeedbackType('idea')}
              icon={<Lightbulb size={13} strokeWidth={2.2} />}
            >
              {c.idea}
            </Pill>

            <Pill
              active={feedbackType === 'other'}
              onClick={() => setFeedbackType('other')}
              icon={<HeartHandshake size={13} strokeWidth={2.2} />}
            >
              {c.other}
            </Pill>
          </div>

          <div className="relative">
            <div className="absolute left-3.5 top-3.5 text-[var(--text-tertiary)] pointer-events-none">
              <MessageSquare size={17} strokeWidth={2} />
            </div>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder={
                feedbackType === 'bug'
                  ? c.placeholderBug
                  : feedbackType === 'idea'
                  ? c.placeholderIdea
                  : c.placeholderOther
              } 
              className="w-full h-32 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-[var(--radius-input,12px)] p-3.5 pl-10 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all resize-none focus:border-[var(--accent-color)]" 
            />
          </div>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleSubmit} 
            disabled={!message.trim() || isSubmitting}
            icon={<Send size={16} strokeWidth={2} />}
          >
            {isSubmitting ? t('sending') : t('sendFeedback')}
          </Button>
        </>
      )}
    </Modal>
  );
}
