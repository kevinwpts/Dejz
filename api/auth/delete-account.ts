import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId } = body;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing configuration' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request body' });
    }

    const supabaseAdmin = createClient(supabaseUrl as string, supabaseKey);

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Saknar autentisering för att radera kontot' });
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData?.user || authData.user.id !== userId) {
      return res.status(403).json({ error: 'Du har endast behörighet att radera ditt eget konto' });
    }

    console.log(`Starting full account deletion for user: ${userId}`);

    // 1. Delete all user data from public tables
    // We do this first to avoid foreign key issues if any exist
    const tables = ['transactions', 'fixed_expenses', 'income_sources', 'savings_goals', 'feedback', 'profiles'];
    
    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(table === 'profiles' ? 'id' : 'user_id', userId);
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        // We continue anyway to try to delete as much as possible
      }
    }

    // 2. Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return res.status(500).json({ error: 'Kunde inte radera användarkontot helt: ' + deleteAuthError.message });
    }

    console.log(`Successfully deleted account for user: ${userId}`);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: error.message });
  }
}
