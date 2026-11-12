// Transaktioner (utgifter och inkomster): hämta, lägga till, ändra och ta bort.
import { supabase } from '../../supabaseClient';
import { Transaction } from '../../types';
import { getTransactionReceipts } from '../../utils/format';
import {
  TransactionInsert,
  TransactionRow,
  TransactionUpdate,
  transactionFromRow,
  transactionToRow,
} from '../transactionRows';

const db = supabase;

export const transactionsData = {
  // --- Transactions (Expenses/Incomes) ---
  async getTransactions(userId: string): Promise<Transaction[]> {
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_transactions');
      const parsed: Transaction[] = saved ? JSON.parse(saved) : [];
      return parsed.map((t) => {
        const urls = getTransactionReceipts(t);
        return {
          ...t,
          receiptUrl: urls[0],
          receiptUrls: urls,
        };
      });
    }
    const { data, error } = await db
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map((t) => transactionFromRow(t));
  },

  async addTransaction(
    userId: string,
    transaction: Omit<Transaction, 'id'>
  ): Promise<Transaction> {
    const normalizedReceipts = getTransactionReceipts(transaction);
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_transactions');
      const list = saved ? JSON.parse(saved) : [];
      const newTx: Transaction = {
        ...transaction,
        receiptUrl: normalizedReceipts[0],
        receiptUrls: normalizedReceipts,
        id: `demo-tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
      list.unshift(newTx);
      localStorage.setItem('demo_transactions', JSON.stringify(list));
      return newTx;
    }
    // First, ensure the profile exists to avoid foreign key violations
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      console.warn('[Data] Profile missing during transaction add, attempting repair...');
      await db
        .from('profiles')
        .upsert({ id: userId, dark_mode: false, theme_mode: 'light' });
    }

    const payload: TransactionInsert = { user_id: userId, ...transactionToRow(transaction, 'insert') };

    const res = await db.from('transactions').insert(payload).select();
    let data: TransactionRow[] | null = res.data;
    let error = res.error;

    // Samma bankköp finns redan (unikt bank-id): använd raden som redan är sparad
    if (error && error.code === '23505' && transaction.bankTransactionId) {
      const { data: existingRows } = await db
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .contains('tags', [`bank_tx:${transaction.bankTransactionId}`])
        .limit(1);
      if (existingRows && existingRows.length > 0) {
        data = existingRows;
        error = null;
      }
    }

    if (error) {
      console.error('[Supabase Error] addTransaction:', error);
      throw error;
    }
    if (!data || data.length === 0) throw new Error('Ingen data returnerades från databasen');

    return transactionFromRow(data[0], transaction);
  },

  async updateTransaction(
    id: string,
    transaction: Omit<Transaction, 'id'>
  ): Promise<Transaction> {
    const normalizedReceipts = getTransactionReceipts(transaction);
    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_transactions');
      const list: Transaction[] = saved ? JSON.parse(saved) : [];
      const index = list.findIndex((t) => t.id === id);
      const updatedTx: Transaction = {
        ...transaction,
        receiptUrl: normalizedReceipts[0],
        receiptUrls: normalizedReceipts,
        id,
      };
      if (index !== -1) {
        list[index] = updatedTx;
      } else {
        list.unshift(updatedTx);
      }
      localStorage.setItem('demo_transactions', JSON.stringify(list));
      return updatedTx;
    }

    const payload: TransactionUpdate = transactionToRow(transaction, 'update');

    const { data, error } = await db.from('transactions').update(payload).eq('id', id).select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Kunde inte uppdatera transaktionen');

    return transactionFromRow(data[0], transaction);
  },

  async deleteTransaction(id: string) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_transactions');
      const list: Transaction[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(t => t.id !== id);
      localStorage.setItem('demo_transactions', JSON.stringify(filtered));
      return;
    }
    const { error } = await db
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};
