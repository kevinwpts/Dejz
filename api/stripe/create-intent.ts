import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId, email, priceId, mode } = body;

    const missingVars = [];
    if (!process.env.STRIPE_SECRET_KEY) missingVars.push('STRIPE_SECRET_KEY');
    if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) missingVars.push('SUPABASE_URL or VITE_SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAdmin = createClient(supabaseUrl as string, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Get or create customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabaseUUID: userId },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    if (mode === 'subscription') {
      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
        trial_period_days: 7,
      });

      const invoice = subscription.latest_invoice as any;
      const paymentIntent = invoice?.payment_intent as any;
      const setupIntent = subscription.pending_setup_intent as any;

      res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret || setupIntent?.client_secret,
      });
    } else {
      // Lifetime payment (one-time)
      const price = await stripe.prices.retrieve(priceId);
      if (!price.unit_amount) throw new Error('Price amount not found');

      const paymentIntent = await stripe.paymentIntents.create({
        amount: price.unit_amount,
        currency: price.currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        metadata: { userId, type: 'lifetime' },
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
      });
    }
  } catch (error: any) {
    console.error('Create intent error:', error);
    res.status(500).json({ error: error.message });
  }
}
