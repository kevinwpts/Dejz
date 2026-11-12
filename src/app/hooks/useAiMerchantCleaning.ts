import React, { useEffect, useRef } from 'react';
import {
  IncomeItem,
  FixedExpenseItem,
  TransactionItem,
  getTransactionTime,
} from '../../components/HomeTab';
import { getLogoUrl, saveLearnedBrandDomain } from '../../utils/logo';
import { needsAiMerchantCleaning } from '../../utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import {
  saveCachedAppState,
  getMerchantAliases,
  resolveMerchantAlias,
  isGenericPlaceholderMerchant,
  normalizeMerchantKey,
  normalizeCategoryToValid,
  getStoredExpenseCategories,
  getStoredIncomeCategories,
} from '../../utils/appCache';
import { findMatchingFixedExpense, findMatchingIncome } from '../../utils/recurring';

import { sanitizeTransactionItem } from '../../app/transactionMapping';
import { apiUrl } from '../../utils/platform';

/** Skickar en omgång kryptiska bankrader till AI-tvätten. Ger `null` om servern svarar med fel. */
async function fetchMerchantCleaning(
  body: { items: unknown[]; expenseCategories: string[]; incomeCategories: string[] },
  signal: AbortSignal
) {
  const res = await fetch(apiUrl('/api/ai/clean-merchants'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return res.ok ? res.json() : null;
}

/**
 * Tyst AI-tvätt i bakgrunden: kryptiska bankrader (t.ex. "ZETTLE*GBG KAF") får ett riktigt
 * butiksnamn, kategori och logga. Flyttad från App.tsx.
 * Returnerar listan med redan tvättade namn, så att den kan rensas vid in-/utloggning.
 */
export function useAiMerchantCleaning({
  transactions,
  setTransactions,
  incomesRef,
  fixedExpensesRef,
  userIdRef,
  isDeletingAccountRef,
}: {
  transactions: TransactionItem[];
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  incomesRef: React.MutableRefObject<IncomeItem[]>;
  fixedExpensesRef: React.MutableRefObject<FixedExpenseItem[]>;
  userIdRef: React.MutableRefObject<string | null>;
  isDeletingAccountRef: React.MutableRefObject<boolean>;
}) {
  // Tyst AI-tvätt i bakgrunden för kryptiska/okända bankrader (t.ex. ZETTLE*GBG KAF, NYX*SVENSKA, KLARNA*84920)
  const aiCleanedKeysRef = useRef<Set<string>>(new Set());
  const aiCleanInFlightRef = useRef<boolean>(false);
  // Avbryter en pågående AI-tvätt om hooken avmonteras. Avbryts medvetet inte när
  // transaktionerna ändras – då skulle anropet startas om i onödan (kostar AI-anrop).
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (aiCleanInFlightRef.current || transactions.length === 0) return;

    const currentAliases = getMerchantAliases();
    const candidatesByKey = new Map<
      string,
      { key: string; rawText: string; amount: number; time: string; type: 'expense' | 'income' }
    >();

    for (const tx of transactions) {
      if (!tx || tx.isExcluded) continue;
      const rawSource = (
        tx.rawDescription ||
        tx.counterpartyName ||
        tx.note ||
        tx.title ||
        ''
      ).trim();
      if (!rawSource || rawSource.length < 2) continue;

      const normKey = normalizeMerchantKey(rawSource);
      if (!normKey || aiCleanedKeysRef.current.has(normKey)) continue;

      // Hoppa över om användaren eller tidigare AI-körning redan har sparat ett alias
      if (resolveMerchantAlias(rawSource, currentAliases)) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }

      // Hoppa över om den matchar en fast utgift eller fast inkomst
      if (
        tx.type !== 'income' &&
        fixedExpensesRef.current.length > 0 &&
        findMatchingFixedExpense(tx, fixedExpensesRef.current)
      ) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }
      if (
        tx.type === 'income' &&
        incomesRef.current.length > 0 &&
        findMatchingIncome(tx, incomesRef.current)
      ) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }

      const isUncategorizedOrMissingLogo =
        tx.category === 'Övrigt' ||
        !getLogoUrl(tx.title, tx.category) ||
        needsAiMerchantCleaning(rawSource, tx.title, tx.category);

      if (isUncategorizedOrMissingLogo) {
        if (!candidatesByKey.has(normKey)) {
          candidatesByKey.set(normKey, {
            key: normKey,
            rawText: rawSource,
            amount: tx.amount,
            time: getTransactionTime(tx),
            type: tx.type === 'income' ? 'income' : 'expense',
          });
        }
      } else {
        aiCleanedKeysRef.current.add(normKey);
      }
    }

    if (candidatesByKey.size === 0) return;

    const batchItems = Array.from(candidatesByKey.values()).slice(0, 35);
    for (const item of batchItems) {
      aiCleanedKeysRef.current.add(item.key);
    }

    aiCleanInFlightRef.current = true;
    const expenseCategories = getStoredExpenseCategories().map((c) => c.name);
    const incomeCategories = getStoredIncomeCategories().map((c) => c.name);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchMerchantCleaning(
      { items: batchItems, expenseCategories, incomeCategories },
      controller.signal
    )
      .then((data) => {
        if (
          isDeletingAccountRef.current ||
          !userIdRef.current ||
          !data ||
          !Array.isArray(data.results) ||
          data.results.length === 0
        ) {
          return;
        }

        let anySaved = false;
        for (const resItem of data.results) {
          const orig = candidatesByKey.get(resItem.key);
          if (!orig) continue;
          const cleanTrimmed = String(resItem.cleanName || '').trim();
          const domainTrimmed = String(resItem.domain || '').trim();
          if (isGenericPlaceholderMerchant(orig.rawText)) {
            continue;
          }
          const validCat = normalizeCategoryToValid(
            resItem.category,
            orig.type
          );
          // Spara inlärd domän (för företagslogga) och kategori utan att skriva över bankens transaktionsnamn!
          if (domainTrimmed || (validCat && validCat !== 'Övrigt')) {
            saveLearnedBrandDomain(orig.rawText, domainTrimmed, validCat);
            if (cleanTrimmed) {
              saveLearnedBrandDomain(cleanTrimmed, domainTrimmed, validCat);
            }
            anySaved = true;
          }
        }

        if (anySaved && !isDeletingAccountRef.current && userIdRef.current) {
          const updatedAliases = getMerchantAliases();
          setTransactions((prev) => {
            const next = deduplicateTransactions(
              prev.map((t) =>
                sanitizeTransactionItem(
                  t,
                  fixedExpensesRef.current,
                  incomesRef.current,
                  updatedAliases
                )
              )
            );
            saveCachedAppState({ transactions: next });
            return next;
          });
        }
      })
      .catch(() => {
        // Ignorera nätverksfel tyst i bakgrunden
      })
      .finally(() => {
        aiCleanInFlightRef.current = false;
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      });
  }, [transactions, fixedExpensesRef, incomesRef, isDeletingAccountRef, setTransactions, userIdRef]);

  return aiCleanedKeysRef;
}
