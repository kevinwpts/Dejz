// Feedback från användare och enkel statistik till adminvyn.
import { supabase } from '../../supabaseClient';

const db = supabase;

export const feedbackData = {
  // --- Feedback ---
  async saveFeedback(userId: string, message: string) {
    const activeUserId = userId || 'demo-user';
    try {
      if (activeUserId === 'demo-user' || activeUserId.startsWith('demo-')) {
        const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
        demoFeedbacks.unshift({
          id: 'demo-' + Date.now(),
          user_id: activeUserId,
          message,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
        return;
      }
      const { error } = await db
        .from('feedback')
        .insert({
          user_id: activeUserId,
          message: message,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Supabase feedback insert error, saving to local store:', error);
        const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
        demoFeedbacks.unshift({
          id: 'local-' + Date.now(),
          user_id: activeUserId,
          message,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
      }
    } catch (e) {
      console.warn('Feedback fallback to local storage:', e);
      const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
      demoFeedbacks.unshift({
        id: 'local-' + Date.now(),
        user_id: activeUserId,
        message,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
    }
  },

  async getFeedbackList(): Promise<Array<{ id: string; user_id?: string; message: string; created_at: string }>> {
    try {
      const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
      const { data, error } = await db
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.warn('Could not fetch remote feedback:', error);
        return demoFeedbacks;
      }
      return [...(data || []), ...demoFeedbacks];
    } catch {
      return JSON.parse(localStorage.getItem('demo_feedback') || '[]');
    }
  },

  async deleteFeedback(id: string) {
    if (id.startsWith('demo-')) {
      const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]').filter((f: { id?: string }) => f.id !== id);
      localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
      return;
    }
    await db.from('feedback').delete().eq('id', id);
  },

  async getAdminStats(): Promise<{ totalUsers: number; dbHealthy: boolean; timestamp: string }> {
    try {
      const { count, error } = await db
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      return {
        totalUsers: error ? 1 : (count || 1),
        dbHealthy: !error,
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        totalUsers: 1,
        dbHealthy: false,
        timestamp: new Date().toISOString()
      };
    }
  },
};
