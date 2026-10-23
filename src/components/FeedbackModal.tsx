import React, { useState } from 'react';
import { Send, MessageSquare, Bug, Lightbulb, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Modal, Button, Pill, Card } from './ui';
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
    greeting: 'Hej, jag är personen bakom Dejz',
    bio: 'Jag bygger Dejz för att göra det enklare att få koll på sin ekonomi. Har du hittat ett fel eller har en idé? Jag vill gärna höra vad du tycker.',
    bug: 'Rapportera fel',
    idea: 'Idé / Förslag',
    other: 'Övrigt',
    placeholderBug: 'Beskriv felet och vad som hände...',
    placeholderIdea: 'Vad för funktion eller förbättring saknar du?',
    placeholderOther: 'Skriv din feedback här...',
    thanksTitle: 'Tack för din feedback',
    thanksDesc: 'Ditt meddelande har skickats direkt till mig. Det betyder mycket för att göra Dejz ännu bättre.',
    closeBtn: 'Stäng',
  },
  da: {
    greeting: 'Hej, jeg er personen bag Dejz',
    bio: 'Jeg bygger Dejz for at gøre det nemmere at få styr på din økonomi. Har du fundet en fejl eller har en idé? Jeg vil meget gerne høre hvad du synes.',
    bug: 'Rapporter fejl',
    idea: 'Idé / Forslag',
    other: 'Andet',
    placeholderBug: 'Beskriv fejlen og hvad der skete...',
    placeholderIdea: 'Hvilken funktion eller forbedring savner du?',
    placeholderOther: 'Skriv din feedback her...',
    thanksTitle: 'Tak for din feedback',
    thanksDesc: 'Din besked er sendt direkte til mig. Det betyder rigtig meget for at gøre Dejz endnu bedre.',
    closeBtn: 'Luk',
  },
  no: {
    greeting: 'Hei, jeg er personen bak Dejz',
    bio: 'Jeg bygger Dejz for å gjøre det enklere å få oversikt over økonomien din. Har du funnet en feil eller har en idé? Jeg vil gjerne høre hva du mener.',
    bug: 'Rapporter feil',
    idea: 'Idé / Forslag',
    other: 'Annet',
    placeholderBug: 'Beskriv feilen og hva som skjedde...',
    placeholderIdea: 'Hvilken funksjon eller forbedring savner du?',
    placeholderOther: 'Skriv din tilbakemelding her...',
    thanksTitle: 'Takk for tilbakemeldingen din',
    thanksDesc: 'Meldingen din har blitt sendt direkte til meg. Det betyr utrolig mye for å gjøre Dejz enda bedre.',
    closeBtn: 'Lukk',
  },
  fi: {
    greeting: 'Hei, minä olen Dejzin takana oleva henkilö',
    bio: 'Rakennan Dejziä, jotta talouden hallinta olisi helpompaa. Löysitkö virheen tai onko sinulla idea? Kuulen mielelläni mielipiteesi.',
    bug: 'Ilmoita virheestä',
    idea: 'Idea / Ehdotus',
    other: 'Muu',
    placeholderBug: 'Kuvaile virhe ja mitä tapahtui...',
    placeholderIdea: 'Mitä toimintoa tai parannusta kaipaat?',
    placeholderOther: 'Kirjoita palautteesi tähän...',
    thanksTitle: 'Kiitos palautteestasi',
    thanksDesc: 'Viestisi on lähetetty suoraan minulle. Se merkitsee valtavasti Dejzin kehittämisessä.',
    closeBtn: 'Sulje',
  },
  en: {
    greeting: 'Hi, I am the creator behind Dejz',
    bio: 'I am building Dejz to make personal finance simpler. Found a bug or have an idea? I would love to hear your thoughts.',
    bug: 'Report bug',
    idea: 'Idea / Suggestion',
    other: 'Other',
    placeholderBug: 'Describe the issue and what happened...',
    placeholderIdea: 'What feature or improvement would you like to see?',
    placeholderOther: 'Write your feedback here...',
    thanksTitle: 'Thank you for your feedback',
    thanksDesc: 'Your message has been sent directly to me. It means a lot in making Dejz even better.',
    closeBtn: 'Close',
  },
};

export function FeedbackModal({ isOpen = true, onClose, onSubmit, t, language = 'sv' }: FeedbackModalProps) {
  const norm = language === 'en' ? 'en' : normalizeLanguage(language);
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
      bodyClassName="p-4 sm:p-5 space-y-4"
    >
      {isSubmitted ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--surface-muted)] text-[var(--accent-color)] flex items-center justify-center">
            <CheckCircle2 size={32} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-page-title font-bold font-display text-[var(--text-primary)]">
              {c.thanksTitle}
            </h3>
            <p className="text-body text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              {c.thanksDesc}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="accent"
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
          <Card variant="muted" padding="md" className="flex items-center gap-3.5">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-[var(--border-divider)] bg-[var(--surface-color)] shrink-0">
              <img 
                src="/selfie.jpeg"
                alt="Skaparen av Dejz"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <h4 className="text-secondary font-bold font-display text-[var(--text-primary)] tracking-tight">
                {c.greeting}
              </h4>
              <p className="text-secondary text-[var(--text-secondary)] font-normal leading-normal">
                {c.bio}
              </p>
            </div>
          </Card>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 select-none">
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
              className="w-full h-28 bg-[var(--surface-muted)] border border-[var(--border-divider)] rounded-input p-3.5 pl-10 text-body font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all resize-none focus:border-[var(--accent-color)]" 
            />
          </div>

          <Button
            variant="accent"
            fullWidth
            size="lg"
            onClick={handleSubmit} 
            disabled={!message.trim() || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? t('sending') : t('sendFeedback')}
          </Button>
        </>
      )}
    </Modal>
  );
}
