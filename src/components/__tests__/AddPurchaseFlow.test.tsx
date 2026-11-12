// @vitest-environment jsdom
// "Lägg till köp": plusknappen i menyn → (prata in eller) Fyll i manuellt → Nytt köp → Spara.
// Testar den riktiga kopplingen i AppSheetsAndModals (via useApp) tillsammans med köpfönstret.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { AppContext } from '../../app/AppContext';
import { makeAppModel } from '../../test/appContext';
import type { TransactionItem } from '../../app/models';
import type { AppTab } from '../BottomNav';

vi.mock('../../utils/logo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/logo')>()),
  fetchLogoForName: vi.fn(async () => undefined),
}));

const { AppSheetsAndModals } = await import('../../app/components/AppSheetsAndModals');
const { TransactionModal } = await import('../modals/TransactionModal');
const { AddEntrySheet } = await import('../VoiceEntry');

type Prefill = { title: string; amount?: number } | null;

/** En liten "app" med riktigt state för de fält som flödet använder. */
function Harness({ onAdd }: { onAdd: (tx: Omit<TransactionItem, 'id'>) => void }) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [txPrefill, setTxPrefill] = useState<Prefill>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  const app = makeAppModel({
    isBalanceSheetOpen: false,
    setIsBalanceSheetOpen: vi.fn(),
    activeManualBalance: null,
    isAddSheetOpen,
    setIsAddSheetOpen,
    setSelectedTransaction,
    setTxPrefill,
    setIsTxModalOpen,
    activeTab,
    setActiveTab,
    setIsSearchModalOpen: vi.fn(),
    setIsNotificationsModalOpen: vi.fn(),
    setSettingsSubView: vi.fn(),
    settingsSubView: 'main',
    displayTransactions: [],
    fixedExpenses: [],
  });

  return (
    <AppContext value={app}>
      <AppSheetsAndModals />
      <TransactionModal
        isOpen={isTxModalOpen}
        initialTransaction={selectedTransaction}
        prefill={txPrefill}
        onClose={() => setIsTxModalOpen(false)}
        onSave={onAdd}
      />
    </AppContext>
  );
}

// Låtsad taligenkänning i webbläsaren
class FakeSpeechRecognition {
  static last: FakeSpeechRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = false;
  maxAlternatives = 1;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => {
    FakeSpeechRecognition.last = this;
  });
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  /** Låtsas att personen sa `text` och slutade prata */
  say(text: string) {
    const result = Object.assign([{ transcript: text }], { isFinal: true });
    this.onresult?.({ results: [result] });
    this.onend?.();
  }
}

afterEach(() => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
  FakeSpeechRecognition.last = null;
});

describe('lägga till ett köp', () => {
  test('utan taligenkänning: plusknappen öppnar "Nytt köp" direkt, Spara lägger till köpet', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<Harness onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Lägg till köp' }));
    expect(screen.getByText('Nytt köp')).toBeTruthy();

    await user.type(screen.getByPlaceholderText('Butik eller köp'), 'Ica Maxi');
    await user.type(screen.getByPlaceholderText('0'), '432');
    await user.click(screen.getByRole('button', { name: /Spara (köp|inkomst)/ }));

    expect(onAdd).toHaveBeenCalledOnce();
    expect(onAdd.mock.calls[0][0]).toMatchObject({ title: 'Ica Maxi', amount: 432, type: 'expense' });
  });

  test('med taligenkänning: plus → "Lägg till köp"-arket → Fyll i manuellt → tomt formulär', async () => {
    Object.assign(window, { SpeechRecognition: FakeSpeechRecognition });
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<Harness onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Lägg till köp' }));
    expect(screen.getByText('Tryck och prata')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Fyll i manuellt/ }));
    expect(screen.getByText('Nytt köp')).toBeTruthy();
    expect((screen.getByPlaceholderText('Butik eller köp') as HTMLInputElement).value).toBe('');
    expect(onAdd).not.toHaveBeenCalled();
  });

  test('med taligenkänning: "Ica 143 kronor" fyller i namn och belopp, inget sparas förrän Spara', async () => {
    Object.assign(window, { SpeechRecognition: FakeSpeechRecognition });
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<Harness onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Lägg till köp' }));
    await user.click(screen.getByRole('button', { name: 'Prata in köpet' }));
    expect(screen.getByText('Lyssnar …')).toBeTruthy();
    expect(FakeSpeechRecognition.last?.lang).toBe('sv-SE');

    act(() => FakeSpeechRecognition.last?.say('Ica 143 kronor'));

    expect((screen.getByPlaceholderText('Butik eller köp') as HTMLInputElement).value).toBe('Ica');
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe('143');
    expect(onAdd).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Spara (köp|inkomst)/ }));
    expect(onAdd.mock.calls[0][0]).toMatchObject({ title: 'Ica', amount: 143 });
  });
});

describe('"Lägg till köp"-arket', () => {
  const renderSheet = () => {
    const props = { onClose: vi.fn(), onResult: vi.fn(), onManual: vi.fn() };
    render(<AddEntrySheet isOpen {...props} />);
    return { ...props, user: userEvent.setup() };
  };

  test('blockerad mikrofon ger ett begripligt fel och inget köp', async () => {
    Object.assign(window, { SpeechRecognition: FakeSpeechRecognition });
    const { user, onResult } = renderSheet();
    await user.click(screen.getByRole('button', { name: 'Prata in köpet' }));
    act(() => {
      FakeSpeechRecognition.last?.onerror?.({ error: 'not-allowed' });
      FakeSpeechRecognition.last?.onend?.();
    });
    expect(screen.getByText(/Mikrofonen är blockerad/)).toBeTruthy();
    expect(onResult).not.toHaveBeenCalled();
  });

  test('bara ett belopp ("89 kr") ger ett köp utan namn', async () => {
    Object.assign(window, { SpeechRecognition: FakeSpeechRecognition });
    const { user, onResult } = renderSheet();
    await user.click(screen.getByRole('button', { name: 'Prata in köpet' }));
    act(() => FakeSpeechRecognition.last?.say('89 kr'));
    expect(onResult).toHaveBeenCalledWith({ title: '', amount: 89 });
  });

  test('"Fyll i manuellt" stänger av mikrofonen utan att skapa något köp', async () => {
    Object.assign(window, { SpeechRecognition: FakeSpeechRecognition });
    const { user, onResult, onManual } = renderSheet();
    await user.click(screen.getByRole('button', { name: 'Prata in köpet' }));
    const rec = FakeSpeechRecognition.last;
    await user.click(screen.getByRole('button', { name: /Fyll i manuellt/ }));
    expect(rec?.abort).toHaveBeenCalled();
    expect(onManual).toHaveBeenCalledOnce();
    act(() => rec?.onend?.()); // webbläsaren rapporterar slut efter avbrottet
    expect(onResult).not.toHaveBeenCalled();
  });
});
