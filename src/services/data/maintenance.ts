// Underhåll av data: nollställ spargrisen, byt namn på kategori och radera all användardata.
import { logError } from '../../utils/logger';
import { supabase } from '../../supabaseClient';
import { FixedExpense, Income, SavingsGoal, Transaction } from '../../types';
import { fromJson } from '../budgetRows';

const db = supabase;

export const maintenanceData = {
  async resetSavingsPot(userId: string) {    if (userId === 'demo-user') {
      const savedT = localStorage.getItem('demo_transactions');
      const listT: Transaction[] = savedT ? JSON.parse(savedT) : [];
      const filteredT = listT.filter(t => !['Spargris', 'Budgetökning'].includes(t.category));
      localStorage.setItem('demo_transactions', JSON.stringify(filteredT));

      const savedS = localStorage.getItem('demo_settings');
      if (savedS) {
        const config = JSON.parse(savedS);
        config.savingsPot = 0;
        localStorage.setItem('demo_settings', JSON.stringify(config));
      }
      return;
    }
    // 1. Delete all transactions with category 'Spargris' or 'Budgetökning'
    const { error: deleteError } = await db
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .in('category', ['Spargris', 'Budgetökning']);
    
    if (deleteError) throw deleteError;

    // 2. Reset savings_pot in profile
    const { error: profileError } = await db
      .from('profiles')
      .update({ savings_pot: 0 })
      .eq('id', userId);
    
    if (profileError) throw profileError;
  },

  distributeSavingsPot(totalPot: number, goals: SavingsGoal[]): SavingsGoal[] {
    if (!goals || goals.length === 0) return [];
    
    let remaining = totalPot;
    
    return (goals || []).map(goal => {
      if (!goal) return goal;
      if (goal.isCompleted) return goal; // Skip completed goals
      
      const target = Number(goal.targetAmount) || 0;
      const allocated = Math.min(remaining, target);
      remaining = Math.max(0, remaining - allocated);
      
      return {
        ...goal,
        currentAmount: allocated
      };
    });
  },

  async renameCategory(userId: string, type: 'income' | 'expense', oldName: string, newName: string): Promise<void> {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedOld || !trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) return;

    if (userId.startsWith('demo-')) {
      // 1. Transactions in localStorage
      const savedTx = localStorage.getItem('demo_transactions');
      if (savedTx) {
        try {
          const txList: Transaction[] = JSON.parse(savedTx);
          let txChanged = false;
          const updatedList = txList.map((t) => {
            let changed = false;
            let newCat = t.category;
            let newSplits = t.splits;

            const isMatchingType = type === 'income' ? t.type === 'income' : t.type !== 'income';
            if (isMatchingType && (t.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
              newCat = trimmedNew;
              changed = true;
            }

            if (t.splits && Array.isArray(t.splits)) {
              const nextSplits = t.splits.map((s) => {
                if ((s.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
                  changed = true;
                  return { ...s, category: trimmedNew };
                }
                return s;
              });
              if (changed) {
                newSplits = nextSplits;
              }
            }

            if (changed) {
              txChanged = true;
              return { ...t, category: newCat, splits: newSplits };
            }
            return t;
          });
          if (txChanged) {
            localStorage.setItem('demo_transactions', JSON.stringify(updatedList));
          }
        } catch (e) {
          logError('Error updating demo_transactions', e);
        }
      }

      // 2. Fixed expenses in localStorage
      if (type === 'expense') {
        const savedFixed = localStorage.getItem('demo_fixed');
        if (savedFixed) {
          try {
            const fixedList: FixedExpense[] = JSON.parse(savedFixed);
            const updated = fixedList.map((e) =>
              (e.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()
                ? { ...e, category: trimmedNew }
                : e
            );
            localStorage.setItem('demo_fixed', JSON.stringify(updated));
          } catch (e) {
            logError('Error updating demo_fixed', e);
          }
        }
      }

      // 3. Incomes in localStorage
      if (type === 'income') {
        const savedIncomes = localStorage.getItem('demo_incomes');
        if (savedIncomes) {
          try {
            const incList: Income[] = JSON.parse(savedIncomes);
            const updated = incList.map((i) =>
              (i.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()
                ? { ...i, category: trimmedNew }
                : i
            );
            localStorage.setItem('demo_incomes', JSON.stringify(updated));
          } catch (e) {
            logError('Error updating demo_incomes', e);
          }
        }
      }

      // 4. Quick choices in demo_settings
      const savedSettings = localStorage.getItem('demo_settings');
      if (savedSettings) {
        try {
          const cfg = JSON.parse(savedSettings);
          if (cfg.quickChoices) {
            cfg.quickChoices = cfg.quickChoices.map((qc: { category?: string }) =>
              (qc.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()
                ? { ...qc, category: trimmedNew }
                : qc
            );
            localStorage.setItem('demo_settings', JSON.stringify(cfg));
          }
        } catch (e) {
          logError('Error updating demo_settings quickChoices', e);
        }
      }

      return;
    }

    // Real Supabase persistence
    try {
      const txTypeFilter = type === 'income' ? 'income' : 'expense';

      // 1. Update transactions with matching category
      await db
        .from('transactions')
        .update({ category: trimmedNew })
        .eq('user_id', userId)
        .eq('type', txTypeFilter)
        .ilike('category', trimmedOld);

      // 2. Update splits inside transactions if present
      const { data: splitRows } = await db
        .from('transactions')
        .select('id, splits')
        .eq('user_id', userId)
        .not('splits', 'is', null);

      if (splitRows && splitRows.length > 0) {
        for (const row of splitRows) {
          if (Array.isArray(row.splits)) {
            let splitChanged = false;
            const updatedSplits = fromJson<{ category?: string }[]>(row.splits).map((s) => {
              if ((s.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
                splitChanged = true;
                return { ...s, category: trimmedNew };
              }
              return s;
            });
            if (splitChanged) {
              await db
                .from('transactions')
                .update({ splits: updatedSplits })
                .eq('id', row.id);
            }
          }
        }
      }

      // 3. Fixed expenses
      if (type === 'expense') {
        await db
          .from('fixed_expenses')
          .update({ category: trimmedNew })
          .eq('user_id', userId)
          .ilike('category', trimmedOld);
      }

      // 4. Income sources
      if (type === 'income') {
        await db
          .from('income_sources')
          .update({ category: trimmedNew })
          .eq('user_id', userId)
          .ilike('category', trimmedOld);
      }
    } catch (err) {
      logError('Error renaming category in Supabase', err);
      throw err;
    }
  },

  async deleteAllUserData(userId: string, includeProfile = false) {
    if (!userId || userId === 'demo-user' || userId === 'preview-user') {
      if (includeProfile) {
        localStorage.clear();
      }
      return;
    }

    // Wave 1: Clear nullable foreign-key references in parallel
    await Promise.allSettled([
      db
        .from('transactions')
        .update({
          refund_of_transaction_id: null,
          bank_transaction_id: null,
          bank_account_id: null,
          linked_fixed_expense_id: null,
          account_id: null,
        })
        .eq('user_id', userId),
      db
        .from('bank_transactions')
        .update({
          linked_transfer_bank_tx_id: null,
          replaced_by_bank_tx_id: null,
        })
        .eq('user_id', userId),
    ]);

    // Wave 2: Delete leaf tables in parallel (ett anrop per tabell så att varje anrop typkontrolleras)
    await Promise.allSettled([
      db.from('transactions').delete().eq('user_id', userId),
      db.from('bank_transactions').delete().eq('user_id', userId),
      db.from('bank_auth_states').delete().eq('user_id', userId),
      db.from('bank_provider_sessions').delete().eq('user_id', userId),
      db.from('fixed_expenses').delete().eq('user_id', userId),
      db.from('income_sources').delete().eq('user_id', userId),
      db.from('savings_goals').delete().eq('user_id', userId),
      db.from('feedback').delete().eq('user_id', userId),
    ]);

    // Wave 3: Delete parent account tables and clear profile preferences in parallel
    await Promise.allSettled([
      db.from('bank_accounts').delete().eq('user_id', userId),
      db.from('accounts').delete().eq('user_id', userId),
      db
        .from('profiles')
        .update({
          user_preferences: {},
          show_accounts_on_home: false,
          exclude_internal_transfers: true,
          categories: null,
          income_categories: null,
          my_swish_phone: null,
          swish_contacts: null,
        })
        .eq('id', userId),
    ]);

    await db.from('bank_connections').delete().eq('user_id', userId);

    if (includeProfile) {
      await db.from('profiles').delete().eq('id', userId);
    }
  },
};
