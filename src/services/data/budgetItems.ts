// Inkomstkällor och fasta utgifter: hämta, spara och ta bort.
import { supabase } from '../../supabaseClient';
import { Income, FixedExpense } from '../../types';
import {
  FixedExpenseInput,
  fixedExpenseFromRow,
  fixedExpenseToRow,
  incomeFromRow,
  incomeToRow,
} from '../budgetRows';

const db = supabase;

const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

export const budgetItemsData = {
  // --- Income Sources ---
  async getIncomeSources(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_incomes');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await db
      .from('income_sources')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map((i) => incomeFromRow(i));
  },

  async saveIncomeSource(userId: string, income: Income & { originalName?: string }) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_incomes');
      const list: Income[] = saved ? JSON.parse(saved) : [];
      const targetId = income.id && income.id.startsWith('demo-') ? income.id : `demo-inc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const updatedIncome = { ...income, id: targetId };
      const index = list.findIndex(i => i.id === income.id);
      if (index !== -1) {
        list[index] = updatedIncome;
      } else {
        list.push(updatedIncome);
      }
      localStorage.setItem('demo_incomes', JSON.stringify(list));
      return;
    }
    const { error } = await db
      .from('income_sources')
      .upsert(incomeToRow(userId, income));

    if (error) throw error;
  },

  async deleteIncomeSource(id: string, userId?: string, namesToDelete?: string[]) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_incomes');
      const list: Income[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(i => i.id !== id);
      localStorage.setItem('demo_incomes', JSON.stringify(filtered));
      return;
    }
    if (isUuid(id)) {
      await db
        .from('income_sources')
        .delete()
        .eq('id', id);
    }
    if (userId && Array.isArray(namesToDelete) && namesToDelete.length > 0) {
      const validNames = Array.from(new Set(namesToDelete.filter(Boolean)));
      if (validNames.length > 0) {
        await db
          .from('income_sources')
          .delete()
          .eq('user_id', userId)
          .in('name', validNames);
      }
    }
  },

  // --- Fixed Expenses ---
  async getFixedExpenses(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_fixed');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await db
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map((e) => fixedExpenseFromRow(e));
  },

  async saveFixedExpense(
    userId: string,
    expense: FixedExpenseInput
  ) {
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_fixed');
      const list: FixedExpense[] = saved ? JSON.parse(saved) : [];
      const targetId = expense.id && expense.id.startsWith('demo-') ? expense.id : `demo-exp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const updatedExpense = { ...expense, id: targetId };
      const index = list.findIndex(e => e.id === expense.id);
      if (index !== -1) {
        list[index] = updatedExpense;
      } else {
        list.push(updatedExpense);
      }
      localStorage.setItem('demo_fixed', JSON.stringify(list));
      return;
    }

    const { error } = await db
      .from('fixed_expenses')
      .upsert(fixedExpenseToRow(userId, expense));

    if (error) throw error;
  },

  async deleteFixedExpense(id: string, userId?: string, namesToDelete?: string[]) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_fixed');
      const list: FixedExpense[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(e => e.id !== id);
      localStorage.setItem('demo_fixed', JSON.stringify(filtered));
      return;
    }
    if (isUuid(id)) {
      await db
        .from('fixed_expenses')
        .delete()
        .eq('id', id);
    }
    if (userId && Array.isArray(namesToDelete) && namesToDelete.length > 0) {
      const validNames = Array.from(new Set(namesToDelete.filter(Boolean)));
      if (validNames.length > 0) {
        await db
          .from('fixed_expenses')
          .delete()
          .eq('user_id', userId)
          .in('name', validNames);
      }
    }
  },
};
