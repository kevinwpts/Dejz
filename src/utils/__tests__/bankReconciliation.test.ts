import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReconciliationPreview,
  linkManualTransactionWithBankTx,
  unlinkManualTransactionFromBankTx,
  applyPlannedOccasionOverride,
  createRefundAppTransaction,
  matchReservedToBookedTransactions,
} from '../bankReconciliationEngine';
import {
  analyzeBankTransactionsForOnboarding,
  analyzeBankForExistingBudget,
  getNormalizedBankTxAmount,
  getBankAccountTitle,
} from '../bankHistoryAnalyzer';
import { BankAccount, BankTransactionItem } from '../../services/bankService';
import { Config, FixedExpense, Frequency, Income, MonthlySaving, PaymentMethod, Transaction } from '../../types';

const mockConfig: Config = {
  payday: 25,
  paydayBeforeWeekend: false,
  currency: 'kr',
  language: 'sv',
  categories: [
    { name: 'Mat & dryck', icon: 'Utensils', color: 'var(--accent-color)', budget: null },
    { name: 'Shopping', icon: 'ShoppingBag', color: 'var(--accent-color)', budget: null },
    { name: 'Boende', icon: 'Home', color: 'var(--accent-color)', budget: null },
    { name: 'Hälsa', icon: 'Heart', color: 'var(--accent-color)', budget: null },
    { name: 'Nöje', icon: 'Film', color: 'var(--accent-color)', budget: null },
    { name: 'Övrigt', icon: 'MoreHorizontal', color: 'var(--accent-color)', budget: null },
  ],
};

const baseAccount: BankAccount = {
  id: 'acc-checking',
  connection_id: 'conn-seb',
  provider_account_uid: 'seb-uid-0753',
  iban: 'SE00000000000753',
  bban: '52340000753',
  name: 'Privatkonto',
  custom_name: null,
  owner_name: 'Anna Andersson',
  product: 'Privatkonto',
  currency: 'SEK',
  is_selected: true,
  include_in_budget: true,
  import_start_date: '2026-10-25',
  balance_amount: 45200,
  balance_currency: 'SEK',
  balance_type: 'ITAV',
  balance_label: 'Disponibelt belopp',
  last_synced_at: '2026-10-28T10:00:00Z',
  continuation_key: null,
};

const savingsAccount: BankAccount = {
  ...baseAccount,
  id: 'acc-savings',
  provider_account_uid: 'seb-uid-9999',
  bban: '52340009999',
  name: 'Sparkonto',
  product: 'Sparkonto',
};

function makeBankTx(overrides: Partial<BankTransactionItem> & { id: string }): BankTransactionItem {
  return {
    id: overrides.id,
    bank_account_id: overrides.bank_account_id || baseAccount.id,
    connection_id: overrides.connection_id || 'conn-seb',
    external_tx_key: overrides.external_tx_key || `ext_${overrides.id}`,
    entry_reference: overrides.entry_reference || null,
    transaction_id: overrides.transaction_id || overrides.id,
    booking_status: overrides.booking_status || 'BOOK',
    booking_date: overrides.booking_date !== undefined ? overrides.booking_date : '2026-10-26',
    value_date: overrides.value_date !== undefined ? overrides.value_date : null,
    transaction_date: overrides.transaction_date !== undefined ? overrides.transaction_date : '2026-10-26',
    amount: overrides.amount !== undefined ? overrides.amount : -100,
    currency: overrides.currency || 'SEK',
    credit_debit_indicator: overrides.credit_debit_indicator !== undefined ? overrides.credit_debit_indicator : 'DBIT',
    description: overrides.description || 'KÖP',
    counterparty_name: overrides.counterparty_name || null,
    remittance_info: overrides.remittance_info || [],
    bank_transaction_code: overrides.bank_transaction_code || null,
    reconciliation_status: overrides.reconciliation_status || 'unprocessed',
    linked_app_transaction_id: overrides.linked_app_transaction_id || null,
    linked_fixed_expense_id: overrides.linked_fixed_expense_id || null,
    linked_income_id: overrides.linked_income_id || null,
    linked_saving_id: overrides.linked_saving_id || null,
    linked_period_key: overrides.linked_period_key || null,
    replaced_by_bank_tx_id: overrides.replaced_by_bank_tx_id || null,
    reconciliation_note: overrides.reconciliation_note || null,
    created_at: overrides.created_at || '2026-10-26T12:00:00Z',
  };
}

test('1. Reserverat köp med fel eller saknad teckenriktning normaliseras till negativt och hålls utanför ordinarie budget', () => {
  const reservedApple = makeBankTx({
    id: 'tx-res-apple',
    booking_status: 'PDNG',
    amount: 119, // SEB reserved store purchase with positive raw amount
    credit_debit_indicator: null,
    description: 'APPLE.COM/BILL',
    transaction_date: '2026-10-26',
    booking_date: null,
  });
  const reservedIca = makeBankTx({
    id: 'tx-res-ica',
    booking_status: 'PDNG',
    amount: 450,
    credit_debit_indicator: 'CRDT', // Misleading indicator on pending card reservation
    description: 'MAXI ICA STORMARKNAD',
    transaction_date: '2026-10-27',
    booking_date: null,
  });
  const reservedMcDonalds = makeBankTx({
    id: 'tx-res-mcd',
    booking_status: 'HOLD',
    amount: 95,
    credit_debit_indicator: null,
    description: 'MCDONALDS SVEAVAGEN',
    transaction_date: '2026-10-27',
    booking_date: null,
  });

  assert.equal(getNormalizedBankTxAmount(reservedApple), -119);
  assert.equal(getNormalizedBankTxAmount(reservedIca), -450);
  assert.equal(getNormalizedBankTxAmount(reservedMcDonalds), -95);

  const preview = buildReconciliationPreview({
    bankTransactions: [reservedApple, reservedIca, reservedMcDonalds],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [],
    existingFixedExpenses: [],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 8000,
  });

  assert.equal(preview.reservedItems.length, 3);
  assert.equal(preview.newTransactions.length, 0);
  assert.equal(preview.budgetImpact.netImpactOnRemaining, 0);
  assert.equal(preview.budgetImpact.projectedRemainingToSpend, 8000);
  assert.equal(preview.budgetImpact.reservedAmountOutsideBudget, 119 + 450 + 95);
});

test('2. Reservation som ersätts av bokfört köp (inklusive ändrat datum och belopp) dubbelräknas aldrig', () => {
  const reservedHotel = makeBankTx({
    id: 'tx-res-1',
    booking_status: 'PDNG',
    amount: -1000,
    description: 'CLARION HOTEL STOCKHOLM',
    transaction_date: '2026-10-25',
    booking_date: null,
  });
  const bookedHotel = makeBankTx({
    id: 'tx-book-1',
    booking_status: 'BOOK',
    amount: -1045, // Final booked amount changed slightly (e.g. minibar/tip)
    description: 'CLARION HOTEL STOCKHOLM',
    transaction_date: '2026-10-25',
    booking_date: '2026-10-27',
  });

  const replacements = matchReservedToBookedTransactions([reservedHotel, bookedHotel]);
  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].reservedTx.id, 'tx-res-1');
  assert.equal(replacements[0].bookedTx.id, 'tx-book-1');
  assert.equal(replacements[0].amountChanged, true);

  const preview = buildReconciliationPreview({
    bankTransactions: [reservedHotel, bookedHotel],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [],
    existingFixedExpenses: [],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 5000,
  });

  // Active reserved items should be 0 because it was replaced by the booked transaction
  assert.equal(preview.reservedItems.length, 0);
  assert.equal(preview.newTransactions.length, 1);
  assert.equal(preview.newTransactions[0].amount, 1045);
  assert.equal(preview.budgetImpact.projectedRemainingToSpend, 5000 - 1045);
});

test('3. Manuellt köp + bankköp (Apotea -231 kr <-> APOTEA.SE -231 kr) matchar 1-till-1, bevarar användardata och kan lossas', () => {
  const manualApotea: Transaction = {
    id: 'app-tx-apotea',
    amount: 231,
    category: 'Hälsa',
    merchant: 'Apotea',
    note: 'Recept och vitaminer',
    receiptUrl: 'https://example.com/receipt.jpg',
    receiptUrls: ['https://example.com/receipt.jpg'],
    splits: [
      { category: 'Hälsa', amount: 150 },
      { category: 'Shopping', amount: 81 },
    ],
    timestamp: new Date('2026-10-26T12:00:00Z').getTime(),
    type: 'expense',
    isBackdated: false,
    tags: [],
  };

  const bankApotea = makeBankTx({
    id: 'bank-tx-apotea',
    booking_status: 'BOOK',
    amount: -231,
    description: 'APOTEA.SE',
    transaction_date: '2026-10-26',
    booking_date: '2026-10-27',
  });

  const preview = buildReconciliationPreview({
    bankTransactions: [bankApotea],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [manualApotea],
    existingFixedExpenses: [],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 4000,
  });

  assert.equal(preview.matchedItems.length, 1);
  assert.equal(preview.matchedItems[0].matchKind, 'manual_tx');
  assert.equal(preview.matchedItems[0].manualTx?.id, 'app-tx-apotea');
  assert.equal(preview.matchedItems[0].budgetDelta, 0); // Already in budget!
  assert.equal(preview.newTransactions.length, 0);
  assert.equal(preview.budgetImpact.projectedRemainingToSpend, 4000);

  // Linking preserves user's category, note, receipts, and splits
  const linked = linkManualTransactionWithBankTx(manualApotea, bankApotea);
  assert.equal(linked.category, 'Hälsa');
  assert.equal(linked.note, 'Recept och vitaminer');
  assert.deepEqual(linked.receiptUrls, ['https://example.com/receipt.jpg']);
  assert.equal(linked.splits?.length, 2);
  assert.equal(linked.bankTransactionId, 'bank-tx-apotea');
  assert.equal(linked.originalBankDescription, 'APOTEA.SE');

  // Unlinking ("lossa") restores manual transaction cleanly
  const unlinked = unlinkManualTransactionFromBankTx(linked);
  assert.equal(unlinked.bankTransactionId, null);
  assert.equal(unlinked.category, 'Hälsa');
  assert.equal(unlinked.splits?.length, 2);
});

test('4. Två riktiga lika köp samma dag slås inte ihop till samma manuella post', () => {
  const manualCoffee: Transaction = {
    id: 'app-tx-coffee-1',
    amount: 45,
    category: 'Mat & dryck',
    merchant: 'Pressbyrån',
    timestamp: new Date('2026-10-26T08:00:00Z').getTime(),
    type: 'expense',
    isBackdated: false,
    tags: [],
  };

  const bankCoffee1 = makeBankTx({
    id: 'bank-coffee-1',
    external_tx_key: 'seb:acc:BOOK:2026-10-26:-45.00:PRESSBYRAN',
    amount: -45,
    description: 'PRESSBYRAN',
    booking_date: '2026-10-26',
  });
  const bankCoffee2 = makeBankTx({
    id: 'bank-coffee-2',
    external_tx_key: 'seb:acc:BOOK:2026-10-26:-45.00:PRESSBYRAN#2',
    amount: -45,
    description: 'PRESSBYRAN',
    booking_date: '2026-10-26',
  });

  const preview = buildReconciliationPreview({
    bankTransactions: [bankCoffee1, bankCoffee2],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [manualCoffee],
    existingFixedExpenses: [],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 3000,
  });

  // First coffee matches the 1 manual transaction; second coffee is NOT merged into the same manual tx
  assert.equal(preview.matchedItems.length, 1);
  assert.equal(preview.matchedItems[0].manualTx?.id, 'app-tx-coffee-1');
  // The second identical same-day purchase is surfaced separately (either in reviewItems or newTransactions)
  assert.equal(preview.newTransactions.length + preview.reviewItems.length, 1);
});

test('5. Fast utgift (Spotify 129 kr) bekräftas för rätt betalningstillfälle och blir inte ett nytt rörligt köp', () => {
  const spotifyFixed: FixedExpense = {
    id: 'fixed-spotify',
    name: 'Spotify',
    amount: 129,
    category: 'Nöje',
    frequency: Frequency.MONTHLY,
    paymentMethod: PaymentMethod.KORTBETALNING,
    deductionDay: 27,
  };

  const bankSpotify = makeBankTx({
    id: 'bank-spotify-oct',
    amount: -129,
    description: 'SPOTIFY AB',
    booking_date: '2026-10-27',
  });

  const preview = buildReconciliationPreview({
    bankTransactions: [bankSpotify],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [],
    existingFixedExpenses: [spotifyFixed],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 6000,
  });

  assert.equal(preview.matchedItems.length, 1);
  assert.equal(preview.matchedItems[0].matchKind, 'fixed_expense');
  assert.equal(preview.matchedItems[0].fixedExpense?.id, 'fixed-spotify');
  assert.equal(preview.matchedItems[0].periodKey, '2026-10');
  assert.equal(preview.matchedItems[0].budgetDelta, 0);
  assert.equal(preview.newTransactions.length, 0);
  assert.equal(preview.budgetImpact.projectedRemainingToSpend, 6000);
});

test('6. Fast utgift med annat faktiskt belopp justerar periodens utfall med skillnaden utan att ändra framtida avtalsbelopp', () => {
  const elFixed: FixedExpense = {
    id: 'fixed-el',
    name: 'Vattenfall El',
    amount: 500,
    category: 'Boende',
    frequency: Frequency.MONTHLY,
    paymentMethod: PaymentMethod.AUTOGIRO,
    deductionDay: 28,
  };

  const bankEl = makeBankTx({
    id: 'bank-el-oct',
    amount: -640, // 140 kr higher than planned 500 kr
    description: 'BG 555-1234 VATTENFALL EL',
    booking_date: '2026-10-28',
  });

  const preview = buildReconciliationPreview({
    bankTransactions: [bankEl],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [],
    existingFixedExpenses: [elFixed],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 6000,
  });

  assert.equal(preview.matchedItems.length, 1);
  assert.equal(preview.matchedItems[0].matchKind, 'fixed_expense');
  assert.equal(preview.matchedItems[0].plannedAmount, 500);
  assert.equal(preview.matchedItems[0].actualAmount, 640);
  assert.equal(preview.matchedItems[0].budgetDelta, -140);
  assert.equal(preview.budgetImpact.projectedRemainingToSpend, 6000 - 140);

  // Applying the period override keeps base amount = 500 for future months while setting 2026-10 = 640
  const updatedFixed = applyPlannedOccasionOverride(elFixed, '2026-10', 640);
  assert.equal(updatedFixed.amount, 500);
  assert.equal(updatedFixed.periodOverrides?.['2026-10'], 640);
});

test('7. Faktisk lön stäms av mot planerad lön så att inkomsten inte räknas två gånger', () => {
  const plannedSalary: Income = {
    id: 'inc-salary',
    name: 'Lön',
    amount: 32000,
    deductionDay: 25,
  };

  const bankSalary = makeBankTx({
    id: 'bank-salary-oct',
    amount: 32850,
    credit_debit_indicator: 'CRDT',
    description: 'LÖN AKTIEBOLAGET',
    booking_date: '2026-10-25',
  });

  const preview = buildReconciliationPreview({
    bankTransactions: [bankSalary],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [],
    existingFixedExpenses: [],
    existingIncomes: [plannedSalary],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 10000,
  });

  assert.equal(preview.matchedItems.length, 1);
  assert.equal(preview.matchedItems[0].matchKind, 'income');
  assert.equal(preview.matchedItems[0].plannedAmount, 32000);
  assert.equal(preview.matchedItems[0].actualAmount, 32850);
  // Only the +850 kr difference affects the period's remaining pot, NOT +32850 kr!
  assert.equal(preview.matchedItems[0].budgetDelta, 850);
  assert.equal(preview.budgetImpact.projectedRemainingToSpend, 10850);
});

test('8. Egen överföring mellan konton samt sparöverföring som uppfyller avsatt sparande minskar inte disponibelt belopp en andra gång', () => {
  const plannedSaving: MonthlySaving = {
    id: 'sav-avanza',
    name: 'Avanza ISK',
    amount: 2000,
    deductionDay: 26,
    frequency: Frequency.MONTHLY,
  };

  const transferOut = makeBankTx({
    id: 'tx-trans-out',
    bank_account_id: baseAccount.id,
    amount: -5000,
    description: 'ÖVERFÖRING TILL SPARKONTO',
    booking_date: '2026-10-26',
  });
  const transferIn = makeBankTx({
    id: 'tx-trans-in',
    bank_account_id: savingsAccount.id,
    amount: 5000,
    credit_debit_indicator: 'CRDT',
    description: 'ÖVERFÖRING FRÅN PRIVATKONTO',
    booking_date: '2026-10-26',
  });
  const avanzaTransfer = makeBankTx({
    id: 'tx-avanza',
    bank_account_id: baseAccount.id,
    amount: -2000,
    description: 'AUTOGIRO AVANZA BANK',
    booking_date: '2026-10-26',
  });

  const preview = buildReconciliationPreview({
    bankTransactions: [transferOut, transferIn, avanzaTransfer],
    accounts: [baseAccount, savingsAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [],
    existingFixedExpenses: [],
    existingIncomes: [],
    existingMonthlySavings: [plannedSaving],
    config: mockConfig,
    currentRemainingToSpend: 7500,
  });

  // Neither the own-account transfer nor the budgeted Avanza saving becomes a new variable expense
  assert.equal(preview.newTransactions.length, 0);
  assert.equal(preview.budgetImpact.netImpactOnRemaining, 0);
  assert.equal(preview.budgetImpact.projectedRemainingToSpend, 7500);

  const savingMatch = preview.matchedItems.find((m) => m.matchKind === 'monthly_saving');
  assert.ok(savingMatch);
  assert.equal(savingMatch?.budgetDelta, 0);
});

test('9. Uppsagt abonnemang återaktiveras inte av historiska förslag och en enstaka transaktion behandlas inte som abonnemang', () => {
  const cancelledNetflix: FixedExpense = {
    id: 'fixed-netflix',
    name: 'Netflix',
    amount: 179,
    category: 'Nöje',
    frequency: Frequency.MONTHLY,
    paymentMethod: PaymentMethod.KORTBETALNING,
    isCancelled: true,
    cancelledAt: '2026-09-15',
  };

  const historyTxs: BankTransactionItem[] = [
    makeBankTx({
      id: 'nf-1',
      amount: -179,
      description: 'NETFLIX.COM',
      booking_date: '2026-07-10',
    }),
    makeBankTx({
      id: 'nf-2',
      amount: -179,
      description: 'NETFLIX.COM',
      booking_date: '2026-08-10',
    }),
    makeBankTx({
      id: 'nf-3',
      amount: -179,
      description: 'NETFLIX.COM',
      booking_date: '2026-09-10',
    }),
    // Single purchase at Clas Ohlson (must NOT become a recurring subscription)
    makeBankTx({
      id: 'single-clas',
      amount: -299,
      description: 'CLAS OHLSON',
      booking_date: '2026-10-12',
    }),
  ];

  const onboardingAnalysis = analyzeBankTransactionsForOnboarding(historyTxs, 25, false);
  assert.equal(
    onboardingAnalysis.detectedFixedExpenses.some((f) => f.name.toLowerCase().includes('clas ohlson')),
    false
  );

  const existingBudgetPlan = analyzeBankForExistingBudget({
    bankTransactions: historyTxs,
    userAccounts: [baseAccount],
    existingFixedExpenses: [cancelledNetflix],
    existingIncomes: [],
    existingAppTransactions: [],
    config: mockConfig,
  });

  assert.equal(
    existingBudgetPlan.fixedExpenseMatches.some((m) =>
      m.detected.name.toLowerCase().includes('netflix')
    ),
    false
  );
});

test('10. Upprepad synkronisering utan dubbletter (idempotens), exkluderade poster förblir exkluderade, och återbetalning minskar kategoriutgift', () => {
  const alreadyImportedPurchase = makeBankTx({
    id: 'tx-already-imported',
    amount: -350,
    description: 'ICA KVANTUM',
    booking_date: '2026-10-26',
    reconciliation_status: 'imported_tx',
    linked_app_transaction_id: 'app-tx-ica',
  });
  const excludedTx = makeBankTx({
    id: 'tx-excluded',
    amount: -500,
    description: 'SWISH LÅN KOMPIS',
    booking_date: '2026-10-26',
    reconciliation_status: 'excluded',
  });
  const refundTx = makeBankTx({
    id: 'tx-refund-hm',
    amount: 299,
    credit_debit_indicator: 'CRDT',
    description: 'ÅTERKÖP H&M HENNES & MAURITZ',
    booking_date: '2026-10-28',
  });

  const existingPurchaseInApp: Transaction = {
    id: 'app-tx-hm',
    amount: 499,
    category: 'Shopping',
    merchant: 'H&M',
    timestamp: new Date('2026-10-20T12:00:00Z').getTime(),
    type: 'expense',
    isBackdated: false,
    tags: [],
  };

  // First run with already-reconciled & excluded rows + a new refund
  const preview1 = buildReconciliationPreview({
    bankTransactions: [alreadyImportedPurchase, excludedTx, refundTx],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [existingPurchaseInApp],
    existingFixedExpenses: [],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 5000,
  });

  // Neither alreadyImportedPurchase nor excludedTx is processed again
  assert.equal(preview1.newTransactions.length, 0);
  assert.equal(preview1.reviewItems.length, 0);
  // Refund is matched against H&M purchase and increases remaining to spend by +299
  assert.equal(preview1.matchedItems.length, 1);
  assert.equal(preview1.matchedItems[0].matchKind, 'refund');
  assert.equal(preview1.matchedItems[0].budgetDelta, 299);
  assert.equal(preview1.budgetImpact.projectedRemainingToSpend, 5299);

  const refundAppTx = createRefundAppTransaction(refundTx, 'Shopping', existingPurchaseInApp);
  assert.equal(refundAppTx.type, 'expense');
  assert.equal(refundAppTx.amount, -299); // Negative expense offsets category spend without counting as income!
  assert.equal(refundAppTx.category, 'Shopping');

  // Second run after refund is marked 'refund_linked' -> 100% idempotent (zero items)
  const refundReconciled: BankTransactionItem = {
    ...refundTx,
    reconciliation_status: 'refund_linked',
    linked_app_transaction_id: 'app-tx-refund-hm',
  };
  const preview2 = buildReconciliationPreview({
    bankTransactions: [alreadyImportedPurchase, excludedTx, refundReconciled],
    accounts: [baseAccount],
    importStartDate: '2026-10-25',
    existingAppTransactions: [existingPurchaseInApp],
    existingFixedExpenses: [],
    existingIncomes: [],
    existingMonthlySavings: [],
    config: mockConfig,
    currentRemainingToSpend: 5299,
  });

  assert.equal(preview2.matchedItems.length, 0);
  assert.equal(preview2.newTransactions.length, 0);
  assert.equal(preview2.reviewItems.length, 0);
  assert.equal(preview2.budgetImpact.netImpactOnRemaining, 0);

  // Verify custom account name priority
  assert.equal(getBankAccountTitle(baseAccount), 'Privatkonto');
  assert.equal(
    getBankAccountTitle({ ...baseAccount, custom_name: 'Gemensamt matkonto' }),
    'Gemensamt matkonto'
  );
  assert.equal(
    getBankAccountTitle({
      ...baseAccount,
      name: '52340000753',
      product: null,
      aspsp_name: 'SEB',
    }),
    'SEB-konto · 0753'
  );
});
