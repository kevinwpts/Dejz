// @vitest-environment jsdom
// "Nytt sparmål": guiden steg för steg (namn → bild → mål → konto → hittills → per månad),
// beloppen via sifferknapparna, och vad som sparas när man trycker Skapa.
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavingsGoalsView } from '../SavingsGoalsView';
import { getSavingsGoals, saveSavingsGoals, type SavingsGoalItem } from '../../utils/cache/itemMeta';
import { makeAccount, normalizeText } from '../../test/fixtures';

/** Guidens fråga överst (den sista rubriken – listan bakom har egna rubriker) */
const heading = () => screen.getAllByRole('heading', { level: 2 }).at(-1)?.textContent;
/** En siffertangent i knappsatsen (texten, så att det fungerar även om knapparna får aria-label) */
const key = (digit: string) => screen.getByText(digit, { selector: 'button' });
const continueBtn = () => screen.getByRole('button', { name: 'Fortsätt' }) as HTMLButtonElement;
const bodyText = () => normalizeText(document.body.textContent);

function renderView(props: Partial<React.ComponentProps<typeof SavingsGoalsView>> = {}) {
  const onCreateMonthlySaving = vi.fn();
  const onGoalsChanged = vi.fn();
  const user = userEvent.setup();
  render(<SavingsGoalsView onCreateMonthlySaving={onCreateMonthlySaving} onGoalsChanged={onGoalsChanged} {...props} />);
  return { onCreateMonthlySaving, onGoalsChanged, user };
}

async function typeDigits(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const d of digits) await user.click(key(d));
}

describe('nytt sparmål', () => {
  test('hela guiden: namn, mål 25 000, sparat 5 000, 2 000/mån → målet sparas och månadssparande skapas', async () => {
    const { user, onCreateMonthlySaving } = renderView();

    await user.click(screen.getByRole('button', { name: /Nytt sparmål/ }));
    expect(heading()).toBe('Vad sparar du till?');
    expect(continueBtn().disabled).toBe(true);
    await user.type(screen.getByPlaceholderText('Namn på målet'), 'Resa till Japan');
    await user.click(continueBtn());

    expect(heading()).toBe('Välj bild till ditt mål');
    await user.click(continueBtn());

    expect(heading()).toBe('Hur mycket behöver du spara?');
    expect(continueBtn().disabled).toBe(true);
    await typeDigits(user, '250009');
    await user.click(screen.getByRole('button', { name: 'Sudda' }));
    expect(bodyText()).toContain('25 000kr');
    await user.click(continueBtn());

    expect(heading()).toBe('Hur vill du följa sparandet?');
    await user.click(continueBtn()); // "Eget valt belopp" är förvalt

    expect(heading()).toBe('Hur mycket har du sparat hittills?');
    await typeDigits(user, '5000');
    await user.click(continueBtn());

    expect(heading()).toBe('Hur mycket sparar du varje månad?');
    await typeDigits(user, '2000');
    // (25 000 − 5 000) / 2 000 = 10 månader
    expect(screen.getByText('Du når målet om 10 månader')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Skapa sparmål' }));

    const goals: SavingsGoalItem[] = getSavingsGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ name: 'Resa till Japan', targetAmount: 25000, currentAmount: 5000 });
    expect(onCreateMonthlySaving).toHaveBeenCalledWith({
      goalId: goals[0].id,
      goalName: 'Resa till Japan',
      amount: 2000,
    });
    // Guiden stängs
    expect(screen.queryByText('Hur mycket sparar du varje månad?')).toBeNull();
  });

  test('"Hoppa över" månadssparandet skapar målet utan att dra pengar varje månad', async () => {
    const { user, onCreateMonthlySaving } = renderView();
    await user.click(screen.getByRole('button', { name: /Nytt sparmål/ }));
    await user.type(screen.getByPlaceholderText('Namn på målet'), 'Buffert');
    await user.click(continueBtn());
    await user.click(continueBtn());
    await typeDigits(user, '10000');
    await user.click(continueBtn());
    await user.click(continueBtn());
    // Steg 5: hoppa över "sparat hittills" → 0 kr
    await user.click(screen.getByRole('button', { name: 'Hoppa över' }));
    expect(heading()).toBe('Hur mycket sparar du varje månad?');
    await typeDigits(user, '500');
    await user.click(screen.getByRole('button', { name: 'Hoppa över' }));

    expect(getSavingsGoals()[0]).toMatchObject({ name: 'Buffert', targetAmount: 10000, currentAmount: 0 });
    expect(onCreateMonthlySaving).not.toHaveBeenCalled();
  });

  test('koppla till ett konto: startbeloppet blir kontots saldo och målet kan sparas direkt', async () => {
    const savings = makeAccount({ id: 'acc-spar', name: 'Sparkonto', balance: 7300.6, type: 'savings' });
    const { user } = renderView({ accounts: [savings] });
    await user.click(screen.getByRole('button', { name: /Nytt sparmål/ }));
    await user.type(screen.getByPlaceholderText('Namn på målet'), 'Buffert');
    await user.click(continueBtn());
    await user.click(continueBtn());
    await typeDigits(user, '20000');
    await user.click(continueBtn());

    await user.click(screen.getByText('Sparkonto'));
    await user.click(screen.getByRole('button', { name: 'Skapa sparmål' }));

    expect(getSavingsGoals()[0]).toMatchObject({
      targetAmount: 20000,
      currentAmount: 7301,
      linkedAccountId: 'acc-spar',
      linkedAccountName: 'Sparkonto',
    });
  });

  test('Tillbaka går ett steg bakåt, och Stäng stänger guiden', async () => {
    const { user } = renderView();
    await user.click(screen.getByRole('button', { name: /Nytt sparmål/ }));
    await user.type(screen.getByPlaceholderText('Namn på målet'), 'Bil');
    await user.click(continueBtn());
    expect(heading()).toBe('Välj bild till ditt mål');

    await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
    expect(heading()).toBe('Vad sparar du till?');
    // Namnet finns kvar
    expect((screen.getByPlaceholderText('Namn på målet') as HTMLInputElement).value).toBe('Bil');

    // Första steget har ingen tillbakapil – stängknappen stänger guiden
    await user.click(screen.getByRole('button', { name: 'Stäng' }));
    expect(screen.queryByText('Vad sparar du till?')).toBeNull();
    expect(getSavingsGoals()).toHaveLength(0);
  });

  test('tangentbordet fungerar också för beloppen (siffror, sudda och Enter)', async () => {
    const { user } = renderView();
    await user.click(screen.getByRole('button', { name: /Nytt sparmål/ }));
    await user.type(screen.getByPlaceholderText('Namn på målet'), 'Resa{Enter}');
    expect(heading()).toBe('Välj bild till ditt mål');
    await user.click(continueBtn());

    await user.keyboard('0012{Backspace}5000');
    // Inledande nollor försvinner: 0012 → 12 → 1 → 15000
    expect(bodyText()).toContain('15 000kr');
    await user.keyboard('{Enter}');
    expect(heading()).toBe('Hur vill du följa sparandet?');
  });

  test('beloppet stannar vid nio siffror', async () => {
    const { user } = renderView();
    await user.click(screen.getByRole('button', { name: /Nytt sparmål/ }));
    await user.type(screen.getByPlaceholderText('Namn på målet'), 'Hus');
    await user.click(continueBtn());
    await user.click(continueBtn());
    await typeDigits(user, '1234567890');
    expect(bodyText()).toContain('123 456 789kr');
  });

  test('ett befintligt mål visas i listan med sparat belopp och framsteg i procent', async () => {
    saveSavingsGoals([{ id: 'g1', name: 'Buffert', targetAmount: 20000, currentAmount: 5000 }]);
    const { user } = renderView();
    expect(screen.getByText('Buffert')).toBeTruthy();
    expect(bodyText()).toContain('25 %');
    // "Lägg till" öppnar guiden även när det redan finns mål
    await user.click(screen.getByRole('button', { name: /Lägg till/ }));
    expect(heading()).toBe('Vad sparar du till?');
  });
});
