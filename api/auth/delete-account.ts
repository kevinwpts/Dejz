import { createClient } from '@supabase/supabase-js';
import { ApiRequest, ApiResponse, errorMessage, readJsonBody } from '../_http';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId } = readJsonBody<{ userId: string }>(req);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    // Aldrig med VITE_-prefix: sådana variabler kan hamna i den publika appen
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing configuration' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request body' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

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
    const tables = [
      'bank_transactions',
      'bank_accounts',
      'bank_provider_sessions',
      'bank_connections',
      'bank_auth_states',
      'transactions',
      'fixed_expenses',
      'income_sources',
      'savings_goals',
      'accounts',
      'feedback',
      'incomes',
      'monthly_savings',
      'notifications',
      'savings_pot_transactions',
      'user_settings',
      'email_verification',
      'marketing_consent',
      'user_activity',
      // Sist: flera tabeller ovan pekar på profiles. Allt försvinner också när auth-användaren
      // raderas nedan (on delete cascade), men vi städar uttryckligen ifall en koppling saknas.
      'profiles',
    ];
    
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
  } catch (error: unknown) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: errorMessage(error) });
  }
}
