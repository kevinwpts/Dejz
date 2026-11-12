import { expect, Page, test } from '@playwright/test';

// Klicktester för det viktigaste i Dejz. Använder demoläget (påhittade "Elin", inget sparas i Supabase).

/** "−11 414 kr" → -11414, "+24 800 kr" → 24800 */
const kr = (text: string) => {
  const m = text.replace(/\u00a0|\u202f/g, ' ').match(/([\u2212+-]?)\s?(\d{1,3}(?: \d{3})*)\s?kr/);
  if (!m) throw new Error(`Hittade inget belopp i "${text}"`);
  const value = Number(m[2].replace(/ /g, ''));
  return m[1] === '\u2212' || m[1] === '-' ? -value : value;
};

/** Läser hemkortet: kvar, inkomst, fasta och rörligt */
async function readHomeCard(page: Page) {
  const text = (await page.locator('main').innerText()).replace(/\u00a0|\u202f/g, ' ');
  const after = (label: string) => {
    const i = text.indexOf(`\n${label}\n`);
    if (i === -1) throw new Error(`Hittade inte "${label}" på hemkortet`);
    return kr(text.slice(i + label.length + 2, i + label.length + 40));
  };
  const kvarMatch = text.match(/Kvar att spendera[\s\S]*?(−?\d{1,3}(?: \d{3})* kr)/);
  if (!kvarMatch) throw new Error('Hittade inte "Kvar att spendera"');
  return {
    kvar: kr(kvarMatch[1]),
    inkomst: after('Inkomst'),
    fasta: after('Fasta'),
    rorligt: after('Rörligt'),
  };
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function openDemo(page: Page, query = '') {
  await page.goto(`/?demo${query}`);
  await expect(page.getByText('Kvar att spendera').first()).toBeVisible({ timeout: 20_000 });
}

test('hemkortet: kvar = inkomst − fasta − rörligt', async ({ page }) => {
  const errors = collectErrors(page);
  await openDemo(page);
  const card = await readHomeCard(page);
  expect(card.inkomst).toBeGreaterThan(0);
  expect(card.kvar).toBe(card.inkomst + card.fasta + card.rorligt); // fasta och rörligt är negativa
  expect(errors).toEqual([]);
});

test('samma siffra för fasta utgifter på Hem och i fliken Fasta', async ({ page }) => {
  await openDemo(page);
  const { fasta } = await readHomeCard(page);
  await page.locator('nav button', { hasText: 'Fasta' }).first().click();
  const header = page.getByText('Fasta utgifter', { exact: true }).first();
  await expect(header).toBeVisible();
  const summaryText = (await page.locator('main').innerText()).replace(/\u00a0|\u202f/g, ' ');
  const i = summaryText.indexOf('Fasta utgifter');
  expect(kr(summaryText.slice(i, i + 40))).toBe(fasta);
});

test('ett nytt köp minskar "kvar" med exakt beloppet', async ({ page }) => {
  const errors = collectErrors(page);
  await openDemo(page);
  const before = await readHomeCard(page);

  await page.getByRole('button', { name: 'Lägg till köp' }).first().click();
  await page.getByRole('button', { name: 'Fyll i manuellt' }).click();
  await page.getByPlaceholder('Butik eller köp').fill('Testköp');
  await page.getByPlaceholder('0').first().fill('250');
  await page.getByRole('button', { name: 'Spara händelse' }).click();

  await expect
    .poll(async () => (await readHomeCard(page)).kvar, { timeout: 10_000 })
    .toBe(before.kvar - 250);
  const after = await readHomeCard(page);
  expect(after.rorligt).toBe(before.rorligt - 250);
  expect(after.fasta).toBe(before.fasta);
  expect(errors).toEqual([]);
});

test('alla flikar öppnas utan fel', async ({ page }) => {
  const errors = collectErrors(page);
  await openDemo(page);
  for (const tab of ['Historik', 'Analys', 'Fasta', 'Hem']) {
    await page.locator('nav button', { hasText: tab }).first().click();
    await page.waitForTimeout(500);
  }
  await expect(page.getByText('Kvar att spendera').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('introduktionen utan bank startar och går vidare efter namnet', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?demo&onboarding');
  const heading = page.locator('h1').first();
  await expect(heading).toHaveText(/Vad heter du/, { timeout: 20_000 });
  await page.locator('input').first().fill('Elin');
  await page.getByRole('button', { name: /Fortsätt/ }).first().click();
  await expect(heading).not.toHaveText(/Vad heter du/);
  expect(errors).toEqual([]);
});

test('en ny fast utgift dras av från "kvar" och syns i fliken Fasta', async ({ page }) => {
  const errors = collectErrors(page);
  await openDemo(page);
  const before = await readHomeCard(page);

  await page.locator('nav button', { hasText: 'Fasta' }).first().click();
  // Vänta tills fliken visas innan vi klickar (annars kan klicket hamna för tidigt)
  await expect(page.getByText('Fasta utgifter', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lägg till' }).nth(1)).toBeVisible();
  await page.getByRole('button', { name: 'Lägg till' }).nth(1).click();
  await expect(page.getByPlaceholder('Butik eller tjänst')).toBeVisible();
  await page.getByPlaceholder('Butik eller tjänst').fill('Testabonnemang');
  await page.getByPlaceholder('0').first().fill('500');
  await page.getByRole('button', { name: 'Spara fast utgift' }).click();
  await expect(page.getByText('Testabonnemang').first()).toBeVisible();

  await page.locator('nav button', { hasText: 'Hem' }).first().click();
  await expect
    .poll(async () => (await readHomeCard(page)).fasta, { timeout: 10_000 })
    .toBe(before.fasta - 500);
  const after = await readHomeCard(page);
  expect(after.kvar).toBe(before.kvar - 500);
  expect(after.rorligt).toBe(before.rorligt);
  expect(errors).toEqual([]);
});

test('ett nytt köp syns i Historik', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Lägg till köp' }).first().click();
  await page.getByRole('button', { name: 'Fyll i manuellt' }).click();
  await page.getByPlaceholder('Butik eller köp').fill('Historiktest');
  await page.getByPlaceholder('0').first().fill('99');
  await page.getByRole('button', { name: 'Spara händelse' }).click();
  await page.locator('nav button', { hasText: 'Historik' }).first().click();
  await expect(page.getByText('Historiktest').first()).toBeVisible();
});

test('profil och inställningar öppnas utan fel', async ({ page }) => {
  const errors = collectErrors(page);
  await openDemo(page);
  await page.getByRole('button', { name: 'Profil & inställningar' }).click();
  await expect(page.getByText('Lönedag').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('utm-länken sparas vid första besöket (och skrivs inte över)', async ({ page }) => {
  await page.goto('/?utm_source=TikTok&utm_campaign=lansering&demo');
  await expect(page.getByText('Kvar att spendera').first()).toBeVisible({ timeout: 20_000 });
  const first = await page.evaluate(() => JSON.parse(localStorage.getItem('dejz_first_touch_v1') || 'null'));
  expect(first?.utm_source).toBe('tiktok');
  expect(first?.utm_campaign).toBe('lansering');

  await page.goto('/?utm_source=instagram&demo');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('dejz_first_touch_v1') || 'null'));
  expect(after?.utm_source).toBe('tiktok');
});

test('hela introduktionen utan bank går att klicka igenom till hemskärmen', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?demo&onboarding');
  const heading = page.locator('h1').first();
  await expect(heading).toHaveText(/Vad heter du/, { timeout: 20_000 });
  await page.locator('input').first().fill('Elin');
  const steps = [/När får du lön/, /Vilka fasta inkomster/, /Vilka fasta utgifter/, /Kvar efter fasta/, /Hur mycket har du på kontot/];
  for (const next of steps) {
    await page.getByRole('button', { name: /Fortsätt/ }).last().click();
    await expect(heading).toHaveText(next);
  }
  await page.locator('input').first().fill('8000');
  await page.getByRole('button', { name: /Fortsätt|Klar|Öppna Dejz|Spara/ }).last().click();
  await expect(page.getByText('Kvar att spendera').first()).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('köp: förhandsvisning är bara läsning, Redigera byter namn och Avbryt ångrar', async ({ page }) => {
  const errors = collectErrors(page);
  await openDemo(page);
  await page.getByText('ICA Supermarket').first().click();
  const sheet = page.getByRole('dialog').or(page.locator('body'));

  // Namnet är text (ingen dold inmatningsruta) och det finns en tydlig Redigera-knapp
  await expect(sheet.getByRole('heading', { name: 'ICA Supermarket' })).toBeVisible();
  await page.getByRole('button', { name: 'Redigera', exact: true }).click();
  await expect(page.getByText('Redigera köp')).toBeVisible();

  // Avbryt: ändringen syns inte
  await page.getByPlaceholder('Butik eller köp').fill('Ska inte sparas');
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await expect(sheet.getByRole('heading', { name: 'ICA Supermarket' })).toBeVisible();

  // Spara: nya namnet syns
  await page.getByRole('button', { name: 'Redigera', exact: true }).click();
  await page.getByPlaceholder('Butik eller köp').fill('ICA Kvantum');
  await page.getByRole('button', { name: 'Spara ändringar' }).click();
  await page.getByRole('button', { name: 'Bara det här köpet' }).click();
  await expect(sheet.getByRole('heading', { name: 'ICA Kvantum' })).toBeVisible();
  expect(errors).toEqual([]);
});
