import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request' });
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
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(200).json({ active: false });
    }

    const customer = await stripe.customers.retrieve(profile.stripe_customer_id, {
      expand: ['subscriptions', 'default_payment_method']
    }) as any;

    const subscription = customer.subscriptions?.data[0];
    const paymentMethod = customer.default_payment_method as any;

    if (!subscription) {
      return res.status(200).json({ active: false });
    }

    res.status(200).json({
      active: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      amount: subscription.items.data[0].plan.amount,
      currency: subscription.items.data[0].plan.currency,
      interval: subscription.items.data[0].plan.interval,
      cardBrand: paymentMethod?.card?.brand,
      cardLast4: paymentMethod?.card?.last4,
    });
  } catch (error: any) {
    console.error('Fetch subscription details error:', error);
    res.status(500).json({ error: error.message });
  }
}
