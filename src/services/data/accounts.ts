// Egna konton (inte bankkopplade): hämta, spara och ta bort.
import { supabase } from '../../supabaseClient';
import { Account } from '../../types';

const db = supabase;

export const accountsData = {
  // --- Accounts ---
  async getAccounts(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_accounts');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await db
      .from('accounts')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      name: a.name,
      initialBalance: Number(a.initial_balance),
      currentBalance: Number(a.current_balance),
      currency: a.currency
    }));
  },

  async saveAccount(userId: string, account: Account) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_accounts');
      const list: Account[] = saved ? JSON.parse(saved) : [];
      const targetId = account.id && account.id.startsWith('demo-') ? account.id : `demo-acc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const updatedAccount = { ...account, id: targetId };
      const index = list.findIndex(a => a.id === account.id);
      if (index !== -1) {
        list[index] = updatedAccount;
      } else {
        list.push(updatedAccount);
      }
      localStorage.setItem('demo_accounts', JSON.stringify(list));
      return;
    }
    const { error } = await db
      .from('accounts')
      .upsert({
        id: account.id.includes('-') ? account.id : undefined,
        user_id: userId,
        name: account.name,
        initial_balance: account.initialBalance,
        current_balance: account.currentBalance,
        currency: account.currency || 'kr',
      });
    
    if (error) throw error;
  },

  async deleteAccount(id: string) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_accounts');
      const list: Account[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(a => a.id !== id);
      localStorage.setItem('demo_accounts', JSON.stringify(filtered));
      return;
    }
    const { error } = await db
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};
