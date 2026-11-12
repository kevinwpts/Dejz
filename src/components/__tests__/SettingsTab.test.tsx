// @vitest-environment jsdom
// Inställningar: huvudlistan visas, raderna öppnar rätt undersida, och lönedagen går att ändra.
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// E-postbekräftelsen frågar Supabase – den visas inte i de här testerna
vi.mock('../EmailVerification', () => ({ EmailVerificationStatus: () => null }));

const { SettingsTab } = await import('../SettingsTab');

type Props = React.ComponentProps<typeof SettingsTab>;

function renderSettings(overrides: Partial<Props> = {}) {
  const props: Props = {
    connectedBank: null,
    connections: [],
    syncingBank: false,
    targetPayday: 25,
    weekendHandling: 'before',
    userEmail: 'elin@exempel.se',
    userName: 'Elin',
    onUpdatePayday: vi.fn(),
    onUpdateWeekendHandling: vi.fn(),
    onOpenBank: vi.fn(),
    onDisconnectBank: vi.fn(),
    onSyncBank: vi.fn(),
    onOpenAuth: vi.fn(),
    onSignOut: vi.fn(),
    onDeleteAccount: vi.fn(),
    onResetAccount: vi.fn(),
    onToggleExcludeInternalTransfers: vi.fn(),
    onSubViewChange: vi.fn(),
    onOpenSection: vi.fn(),
    sectionCounts: { goals: 2, receipts: 0, packages: 1 },
    ...overrides,
  };
  const user = userEvent.setup();
  render(<SettingsTab {...props} />);
  return { props, user };
}

/** En rad i listan, hittad på sin rubrik (fungerar även om raderna får aria-label) */
const row = (title: string) => {
  const el = screen.getByText(title).closest('button');
  if (!el) throw new Error(`Raden "${title}" är ingen knapp`);
  return el;
};

beforeEach(() => {
  // jsdom saknar scrollTo – inställningarna scrollar upp vid varje sidbyte
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

describe('inställningar – huvudlistan', () => {
  test('visar profil och alla huvudrader', () => {
    renderSettings();
    expect(screen.getByText('Elin')).toBeTruthy();
    expect(screen.getByText('elin@exempel.se')).toBeTruthy();
    for (const title of ['Sparmål', 'Kvitton', 'Väntar på paket', 'Lönedag', 'Kategorier', 'Betalsätt', 'Utseende', 'Data & säkerhet', 'Hjälp & feedback', 'Villkor & integritet', 'Logga ut']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  test('bankkopplingen lovas inte till vanliga användare – den visas som "Kommer snart"', () => {
    renderSettings();
    expect(screen.getByText('Bankkoppling')).toBeTruthy();
    expect(screen.getByText('Kommer snart')).toBeTruthy();
    expect(screen.queryByText('Bankkonton')).toBeNull();
    // Admin-raden syns bara för admin
    expect(screen.queryByText('Admin & test')).toBeNull();
  });

  test('med en ansluten bank kan man öppna Bankkonton', async () => {
    const { user, props } = renderSettings({ connectedBank: 'Swedbank' });
    expect(screen.getByText('Ansluten')).toBeTruthy();
    await user.click(row('Bankkonton'));
    expect(props.onSubViewChange).toHaveBeenCalledWith('bank');
  });

  test.each([
    ['Lönedag', 'period'],
    ['Kategorier', 'categories'],
    ['Betalsätt', 'paymentMethods'],
    ['Utseende', 'appearance'],
    ['Data & säkerhet', 'security'],
    ['Hjälp & feedback', 'feedback'],
    ['Villkor & integritet', 'legal'],
  ] as const)('"%s" öppnar undersidan %s', async (title, subView) => {
    const { user, props } = renderSettings();
    await user.click(row(title));
    expect(props.onSubViewChange).toHaveBeenCalledWith(subView);
  });

  test('profilraden öppnar profilen', async () => {
    const { user, props } = renderSettings();
    await user.click(row('Elin'));
    expect(props.onSubViewChange).toHaveBeenCalledWith('profile');
  });

  test('Sparmål/Kvitton/Paket öppnar sina sektioner och visar antal', async () => {
    const { user, props } = renderSettings();
    expect(row('Sparmål').textContent).toContain('2');
    await user.click(row('Sparmål'));
    await user.click(row('Väntar på paket'));
    expect(props.onOpenSection).toHaveBeenNthCalledWith(1, 'goals');
    expect(props.onOpenSection).toHaveBeenNthCalledWith(2, 'packages');
  });

  test('"Dölj egna överföringar" går att slå av', async () => {
    const { user, props } = renderSettings({ excludeInternalTransfers: true });
    const toggle = screen.getByRole('switch', { name: 'Dölj egna överföringar' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await user.click(toggle);
    expect(props.onToggleExcludeInternalTransfers).toHaveBeenCalledWith(false);
  });

  test('Logga ut frågar först och loggar ut först efter bekräftelse', async () => {
    const { user, props } = renderSettings();
    await user.click(row('Logga ut'));
    expect(props.onSignOut).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain('Logga ut?');

    // Avbryt stänger utan att logga ut
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(props.onSignOut).not.toHaveBeenCalled();

    await user.click(row('Logga ut'));
    const confirm = screen
      .getAllByRole('button', { name: 'Logga ut' })
      .find((b) => screen.getByRole('alertdialog').contains(b));
    if (!confirm) throw new Error('Ingen bekräftelseknapp');
    await user.click(confirm);
    expect(props.onSignOut).toHaveBeenCalledOnce();
  });

  test('utan inloggning visas Logga in i stället för Logga ut', async () => {
    const { user, props } = renderSettings({ userEmail: null, userName: null });
    expect(screen.queryByText('Logga ut')).toBeNull();
    expect(screen.getByText('Konto')).toBeTruthy();
    await user.click(row('Logga in'));
    expect(props.onOpenAuth).toHaveBeenCalledOnce();
  });
});

describe('inställningar – lönedag', () => {
  test('byt lönedag och helghantering', async () => {
    const { user, props } = renderSettings({ subView: 'period' });
    await user.click(screen.getByText('27', { selector: 'button > span' }));
    expect(props.onUpdatePayday).toHaveBeenCalledWith(27);

    const weekend = screen.getByRole('switch', { name: /Helghantering/ });
    expect(weekend.getAttribute('aria-checked')).toBe('true');
    await user.click(weekend);
    expect(props.onUpdateWeekendHandling).toHaveBeenCalledWith('none');
  });

  test('utan styrning från föräldern byter listan själv till undersidan', async () => {
    const { user } = renderSettings({ onSubViewChange: undefined });
    await user.click(row('Lönedag'));
    expect(screen.getByRole('switch', { name: /Helghantering/ })).toBeTruthy();
    expect(screen.queryByText('Logga ut')).toBeNull();
  });
});
