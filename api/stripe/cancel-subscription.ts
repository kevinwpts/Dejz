import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId } = body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request body' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeKey || !supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing configuration' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
    const supabaseAdmin = createClient(supabaseUrl as string, supabaseKey);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({ error: 'Ingen aktiv prenumeration hittades' });
    }

    // Cancel at the end of the period
    const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update database status
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'canceling', // Custom status to show it's active until end of period
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    res.status(200).json({ success: true, subscription });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
}
